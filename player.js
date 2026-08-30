import * as THREE from 'three';

// Movimento de arena: aceleração, conservação de impulso e slide-hop.
const GRAVITY = -28;
const EYE_HEIGHT = 1.7;
const CROUCH_HEIGHT = 1.03;
const PLAYER_RADIUS = 0.4;

const WALK_SPEED = 7;
const SPRINT_SPEED = 11;
const TACTICAL_SPRINT_SPEED = 14.2;
const OWN_INK_SPEED = 13.2;
const MAX_MOMENTUM = 17;
const GROUND_ACCELERATION = 10;
const AIR_ACCELERATION = 1.6;
const GROUND_FRICTION = 9;
const SLIDE_FRICTION = 2.15;
const SLIDE_IMPULSE = 12.5;
const SLIDE_DURATION = 0.72;
const JUMP_SPEED = 8.8;
const TACTICAL_SPRINT_DURATION = 3.15;
const TACTICAL_SPRINT_RECOVERY = 4.25;
const TACTICAL_DOUBLE_TAP_MS = 330;

const BASE_FOV = 75;
const FAST_FOV = 84;
const MOUSE_SENSITIVITY = 0.0022;

/**
 * Controlador FPS com colisão circular contra as caixas do mapa.
 * A velocidade horizontal é persistente: saltar durante o slide mantém o impulso.
 */
export class PlayerController {
  constructor(camera, domElement, obstacles, isOwnInkAt = null, audio = null, spawnPosition = null) {
    this.camera = camera;
    this.domElement = domElement;
    this.obstacles = obstacles;
    this.isOwnInkAt = isOwnInkAt;
    this.audio = audio;

    this.yawObject = new THREE.Object3D();
    this.pitchObject = new THREE.Object3D();
    this.pitchObject.add(camera);
    this.yawObject.add(this.pitchObject);
    this.yawObject.position.copy(spawnPosition ?? new THREE.Vector3(0, EYE_HEIGHT, 27));
    this.yawObject.position.y = EYE_HEIGHT;

    this.velocity = new THREE.Vector3();
    this.onGround = true;
    this.currentHeight = EYE_HEIGHT;
    this.sprinting = false;
    this.tacticalSprinting = false;
    this.tacticalRemaining = 0;
    this.tacticalCooldown = 0;
    this.tacticalRequested = false;
    this.lastShiftTap = -Infinity;
    this.sliding = false;
    this.inkBoost = false;
    this.speed = 0;
    this.slideTimer = 0;
    this.wasCrouching = false;
    this.wasOnGround = true;
    this.footstepTimer = 0;

    this.keys = {};
    this.locked = false;
    this._lastMovementLabel = '';
    this.movementEl = document.getElementById('movement-status');

    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._moveDir = new THREE.Vector3();

    this._setupEvents();
  }

  get object() {
    return this.yawObject;
  }

  _setupEvents() {
    const overlay = document.getElementById('overlay');
    const overlayMessage = document.getElementById('overlay-message');

    const lock = () => {
      if (document.pointerLockElement === this.domElement) return;

      try {
        const request = this.domElement.requestPointerLock();
        if (request && typeof request.catch === 'function') {
          request.catch(() => {
            if (overlayMessage) overlayMessage.textContent = 'O navegador bloqueou o mouse. Clique novamente para tentar.';
          });
        }
      } catch (error) {
        console.error('Pointer Lock indisponível:', error);
        if (overlayMessage) overlayMessage.textContent = 'Não foi possível capturar o mouse neste navegador.';
      }
    };
    this.domElement.addEventListener('click', lock);
    if (overlay) overlay.addEventListener('click', lock);

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.domElement;
      if (overlay) overlay.style.display = this.locked ? 'none' : 'flex';
      if (!this.locked) {
        this.keys = {};
        this.sliding = false;
        if (overlayMessage) overlayMessage.textContent = 'Clique em qualquer lugar para voltar à arena';
      }
    });

    document.addEventListener('pointerlockerror', () => {
      if (overlayMessage) overlayMessage.textContent = 'O navegador não permitiu travar o mouse. Clique novamente.';
    });

    document.addEventListener('mousemove', (event) => {
      if (!this.locked) return;
      this.yawObject.rotation.y -= event.movementX * MOUSE_SENSITIVITY;
      this.pitchObject.rotation.x -= event.movementY * MOUSE_SENSITIVITY;
      const limit = Math.PI / 2 - 0.01;
      this.pitchObject.rotation.x = THREE.MathUtils.clamp(this.pitchObject.rotation.x, -limit, limit);
    });

    document.addEventListener('keydown', (event) => {
      this.keys[event.code] = true;
      if ((event.code === 'ShiftLeft' || event.code === 'ShiftRight') && !event.repeat) {
        const now = performance.now();
        if (now - this.lastShiftTap <= TACTICAL_DOUBLE_TAP_MS) this.tacticalRequested = true;
        this.lastShiftTap = now;
      }
      if (['Space', 'ControlLeft', 'ControlRight'].includes(event.code)) event.preventDefault();
    });
    document.addEventListener('keyup', (event) => { this.keys[event.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
  }

  update(delta) {
    if (!this.locked) return;

    const keys = this.keys;
    const crouching = !!(keys.ControlLeft || keys.ControlRight || keys.KeyC);
    const crouchPressed = crouching && !this.wasCrouching;
    const wantsSprint = !!(keys.ShiftLeft || keys.ShiftRight);
    const wantsJump = !!keys.Space;

    const inputX = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const inputZ = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);

    this._forward.set(0, 0, -1).applyQuaternion(this.yawObject.quaternion);
    this._forward.y = 0;
    this._forward.normalize();
    this._right.set(1, 0, 0).applyQuaternion(this.yawObject.quaternion);
    this._right.y = 0;
    this._right.normalize();

    this._moveDir.set(0, 0, 0)
      .addScaledVector(this._forward, inputZ)
      .addScaledVector(this._right, inputX);
    if (this._moveDir.lengthSq() > 1) this._moveDir.normalize();

    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.inkBoost = Boolean(crouching && this.isOwnInkAt?.(this.yawObject.position.x, this.yawObject.position.z));
    this.sprinting = wantsSprint && inputZ > 0 && !crouching;

    this.tacticalCooldown = Math.max(0, this.tacticalCooldown - delta);
    const canTacticalSprint = this.sprinting && !this.sliding && this.onGround;
    if (this.tacticalRequested) {
      if (canTacticalSprint && this.tacticalCooldown <= 0) {
        this.tacticalRemaining = TACTICAL_SPRINT_DURATION;
      }
      this.tacticalRequested = false;
    }
    this.tacticalSprinting = canTacticalSprint && this.tacticalRemaining > 0;
    if (this.tacticalSprinting) {
      this.tacticalRemaining = Math.max(0, this.tacticalRemaining - delta);
      if (this.tacticalRemaining <= 0) {
        this.tacticalSprinting = false;
        this.tacticalCooldown = TACTICAL_SPRINT_RECOVERY;
      }
    } else if (this.tacticalRemaining > 0 && (!wantsSprint || inputZ <= 0 || crouching)) {
      this.cancelTacticalSprint();
    }

    if (crouchPressed && this.onGround && this.speed >= WALK_SPEED * 0.82) {
      this.cancelTacticalSprint();
      this.sliding = true;
      this.slideTimer = SLIDE_DURATION;
      const slideDirection = this.speed > 0.1
        ? new THREE.Vector3(this.velocity.x, 0, this.velocity.z).normalize()
        : this._forward;
      if (this.speed < SLIDE_IMPULSE) {
        this.velocity.x = slideDirection.x * SLIDE_IMPULSE;
        this.velocity.z = slideDirection.z * SLIDE_IMPULSE;
      }
    }

    if (this.sliding) {
      this.slideTimer -= delta;
      if ((!crouching && this.slideTimer < SLIDE_DURATION - 0.12) || this.slideTimer <= 0 || this.speed < 4.5) {
        this.sliding = false;
      }
    }

    // Pular antes do atrito preserva o impulso de um slide-hop/bunny-hop.
    if (wantsJump && this.onGround) {
      this.velocity.y = JUMP_SPEED;
      this.onGround = false;
      this.sliding = false;
    }

    let targetSpeed = this.sprinting ? SPRINT_SPEED : WALK_SPEED;
    if (this.tacticalSprinting) targetSpeed = TACTICAL_SPRINT_SPEED;
    if (this.inkBoost) targetSpeed = OWN_INK_SPEED;
    if (this.sliding) targetSpeed = Math.max(targetSpeed, SLIDE_IMPULSE);

    if (this.onGround) {
      this._applyFriction(delta, this.sliding ? SLIDE_FRICTION : GROUND_FRICTION);
      this._accelerate(this._moveDir, targetSpeed, this.sliding ? 3.5 : GROUND_ACCELERATION, delta);
    } else {
      this._accelerate(this._moveDir, targetSpeed, AIR_ACCELERATION, delta);
    }

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontalSpeed > MAX_MOMENTUM) {
      const scale = MAX_MOMENTUM / horizontalSpeed;
      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }

    this._tryMove(this.velocity.x * delta, this.velocity.z * delta);

    this.velocity.y += GRAVITY * delta;
    this.yawObject.position.y += this.velocity.y * delta;

    const targetHeight = (crouching || this.sliding) ? CROUCH_HEIGHT : EYE_HEIGHT;
    this.currentHeight = THREE.MathUtils.lerp(this.currentHeight, targetHeight, Math.min(1, 12 * delta));
    if (this.yawObject.position.y <= this.currentHeight) {
      this.yawObject.position.y = this.currentHeight;
      this.velocity.y = 0;
      this.onGround = true;
    }

    if (!this.wasOnGround && this.onGround) this.audio?.playLanding(Math.min(1.25, 0.65 + this.speed * 0.035));

    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    const speedRatio = THREE.MathUtils.clamp((this.speed - WALK_SPEED) / (MAX_MOMENTUM - WALK_SPEED), 0, 1);
    const targetFov = THREE.MathUtils.lerp(BASE_FOV, FAST_FOV, speedRatio);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, 8 * delta));
    this.camera.updateProjectionMatrix();

    const lean = this.sliding ? -inputX * 0.07 : -inputX * Math.min(0.035, this.speed * 0.003);
    this.pitchObject.rotation.z = THREE.MathUtils.lerp(this.pitchObject.rotation.z, lean, Math.min(1, 10 * delta));

    this._updateFootsteps(delta);
    this._updateMovementHud();
    this.wasCrouching = crouching;
    this.wasOnGround = this.onGround;
  }

  cancelTacticalSprint() {
    if (this.tacticalRemaining <= 0 && !this.tacticalSprinting) return;
    this.tacticalRemaining = 0;
    this.tacticalSprinting = false;
    this.tacticalCooldown = Math.max(this.tacticalCooldown, TACTICAL_SPRINT_RECOVERY);
  }

  _updateFootsteps(delta) {
    const movingOnGround = this.onGround && this.speed > 1.4 && !this.sliding;
    if (!movingOnGround) {
      this.footstepTimer = 0;
      return;
    }

    const interval = this.tacticalSprinting ? 0.235 : (this.sprinting ? 0.285 : 0.41);
    this.footstepTimer += delta;
    if (this.footstepTimer < interval) return;
    this.footstepTimer %= interval;
    this.audio?.playFootstep({ speed: this.speed, tactical: this.tacticalSprinting });
  }

  _accelerate(direction, targetSpeed, acceleration, delta) {
    if (direction.lengthSq() === 0) return;
    const currentSpeed = this.velocity.x * direction.x + this.velocity.z * direction.z;
    const speedToAdd = targetSpeed - currentSpeed;
    if (speedToAdd <= 0) return;
    const accelerationStep = Math.min(acceleration * targetSpeed * delta, speedToAdd);
    this.velocity.x += direction.x * accelerationStep;
    this.velocity.z += direction.z * accelerationStep;
  }

  _applyFriction(delta, friction) {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed < 0.001) return;
    const nextSpeed = Math.max(0, speed - Math.max(speed, 2.5) * friction * delta);
    const scale = nextSpeed / speed;
    this.velocity.x *= scale;
    this.velocity.z *= scale;
  }

  _updateMovementHud() {
    if (!this.movementEl) return;
    let label = `${this.speed.toFixed(1)} m/s`;
    if (!this.onGround && this.speed > SPRINT_SPEED) label = `SLIDE-HOP · ${label}`;
    else if (this.sliding) label = `SLIDE · ${label}`;
    else if (this.inkBoost) label = `IMPULSO NA TINTA · ${label}`;
    else if (this.tacticalSprinting) label = `CORRIDA TÁTICA ${this.tacticalRemaining.toFixed(1)}s · ${label}`;
    else if (this.sprinting) label = `CORRIDA · ${label}`;
    if (label !== this._lastMovementLabel) {
      this.movementEl.textContent = label;
      this._lastMovementLabel = label;
    }
  }

  _tryMove(dx, dz) {
    const position = this.yawObject.position;

    const nextX = position.x + dx;
    if (!this._collides(nextX, position.z)) position.x = nextX;
    else this.velocity.x = 0;

    const nextZ = position.z + dz;
    if (!this._collides(position.x, nextZ)) position.z = nextZ;
    else this.velocity.z = 0;
  }

  _collides(x, z) {
    for (const box of this.obstacles) {
      const closestX = Math.max(box.min.x, Math.min(x, box.max.x));
      const closestZ = Math.max(box.min.z, Math.min(z, box.max.z));
      const dx = x - closestX;
      const dz = z - closestZ;
      if (dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS) return true;
    }
    return false;
  }
}
