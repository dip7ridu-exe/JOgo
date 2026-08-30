import * as THREE from 'three';

// --- Parâmetros de movimentação (ajuste aqui para mudar a "sensação" do jogo) ---
const GRAVITY = -28;
const EYE_HEIGHT = 1.7;
const CROUCH_HEIGHT = 1.0;
const PLAYER_RADIUS = 0.4;

const WALK_SPEED = 6;
const SPRINT_SPEED = 10;
const CROUCH_SPEED = 3;
const JUMP_SPEED = 8.5;
const AIR_CONTROL = 0.85; // Krunker/COD permitem controlar a direção no ar

const BASE_FOV = 75;
const SPRINT_FOV = 82;
const MOUSE_SENSITIVITY = 0.0022;

/**
 * Controlador de câmera + movimentação em primeira pessoa.
 * yawObject = corpo do jogador (gira no eixo Y, é o que colide com o mapa)
 * pitchObject = "pescoço" (gira no eixo X, olha para cima/baixo)
 */
export class PlayerController {
  constructor(camera, domElement, obstacles) {
    this.camera = camera;
    this.domElement = domElement;
    this.obstacles = obstacles; // lista de THREE.Box3 usada para colisão

    this.yawObject = new THREE.Object3D();
    this.pitchObject = new THREE.Object3D();
    this.pitchObject.add(camera);
    this.yawObject.add(this.pitchObject);
    this.yawObject.position.set(0, EYE_HEIGHT, 10);

    this.velocity = new THREE.Vector3();
    this.onGround = true;
    this.currentHeight = EYE_HEIGHT;

    this.keys = {};
    this.locked = false;

    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._moveDir = new THREE.Vector3();
    this._wishDir = new THREE.Vector2();

    this._setupEvents();
  }

  get object() {
    return this.yawObject;
  }

  _setupEvents() {
    const overlay = document.getElementById('overlay');

    const lock = () => this.domElement.requestPointerLock();
    this.domElement.addEventListener('click', lock);
    if (overlay) overlay.addEventListener('click', lock);

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.domElement;
      if (overlay) overlay.style.display = this.locked ? 'none' : 'flex';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yawObject.rotation.y -= e.movementX * MOUSE_SENSITIVITY;
      this.pitchObject.rotation.x -= e.movementY * MOUSE_SENSITIVITY;
      const limit = Math.PI / 2 - 0.01;
      this.pitchObject.rotation.x = Math.max(-limit, Math.min(limit, this.pitchObject.rotation.x));
    });

    document.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
  }

  update(delta) {
    const keys = this.keys;
    const crouching = !!(keys['ControlLeft'] || keys['ControlRight'] || keys['KeyC']);
    const wantsSprint = !!(keys['ShiftLeft'] || keys['ShiftRight']);

    // direção desejada em espaço local (x = strafe, z = frente/trás)
    this._wishDir.set(0, 0);
    if (keys['KeyW']) this._wishDir.y -= 1;
    if (keys['KeyS']) this._wishDir.y += 1;
    if (keys['KeyA']) this._wishDir.x -= 1;
    if (keys['KeyD']) this._wishDir.x += 1;
    const moving = this._wishDir.lengthSq() > 0;
    if (moving) this._wishDir.normalize();

    const sprinting = wantsSprint && keys['KeyW'] && !crouching;

    let speed = WALK_SPEED;
    if (crouching) speed = CROUCH_SPEED;
    else if (sprinting) speed = SPRINT_SPEED;
    if (!this.onGround) speed *= AIR_CONTROL; // ar dá um pouco menos de controle

    this._forward.set(0, 0, -1).applyQuaternion(this.yawObject.quaternion);
    this._right.set(1, 0, 0).applyQuaternion(this.yawObject.quaternion);

    this._moveDir.set(0, 0, 0);
    this._moveDir.addScaledVector(this._forward, -this._wishDir.y);
    this._moveDir.addScaledVector(this._right, this._wishDir.x);
    if (this._moveDir.lengthSq() > 0) this._moveDir.normalize();

    this._tryMove(this._moveDir.x * speed * delta, this._moveDir.z * speed * delta);

    // pulo + gravidade
    if (keys['Space'] && this.onGround) {
      this.velocity.y = JUMP_SPEED;
      this.onGround = false;
    }
    this.velocity.y += GRAVITY * delta;
    this.yawObject.position.y += this.velocity.y * delta;

    const targetHeight = crouching ? CROUCH_HEIGHT : EYE_HEIGHT;
    this.currentHeight = THREE.MathUtils.lerp(this.currentHeight, targetHeight, 10 * delta);

    if (this.yawObject.position.y <= this.currentHeight) {
      this.yawObject.position.y = this.currentHeight;
      this.velocity.y = 0;
      this.onGround = true;
    }

    // FOV kick ao correr (efeito clássico de COD/Krunker)
    const targetFov = sprinting && moving ? SPRINT_FOV : BASE_FOV;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 8 * delta);
    this.camera.updateProjectionMatrix();
  }

  _tryMove(dx, dz) {
    const pos = this.yawObject.position;

    const nextX = pos.x + dx;
    if (!this._collides(nextX, pos.z)) pos.x = nextX;

    const nextZ = pos.z + dz;
    if (!this._collides(pos.x, nextZ)) pos.z = nextZ;
  }

  // colisão simples: trata o jogador como um círculo de raio PLAYER_RADIUS
  // contra caixas (Box3) do mapa — dá para "deslizar" nas paredes
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
