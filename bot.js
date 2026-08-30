import * as THREE from 'three';

const BOT_TEAM = 1;
const BOT_SPEED = 3.65;
const BOT_MAX_HEALTH = 100;
const BOT_RESPAWN_TIME = 2.8;
const BOT_SHOT_INTERVAL = 0.72;
const BOT_DAMAGE = 16;

/** Bot local simples: percorre rotas seguras, pinta o chão e atira com linha de visão. */
export class TerritoryBot {
  constructor({ scene, shootables, ink, player, obstacles, spawnPosition, waypoints, audio }) {
    this.scene = scene;
    this.shootables = shootables;
    this.ink = ink;
    this.player = player;
    this.obstacles = obstacles;
    this.spawnPosition = spawnPosition.clone();
    this.waypoints = waypoints.map((point) => point.clone());
    this.audio = audio;

    this.active = true;
    this.enabled = true;
    this.health = BOT_MAX_HEALTH;
    this.respawnRemaining = 0;
    this.paintCooldown = 0;
    this.shotCooldown = 0.6;
    this.flashRemaining = 0;
    this.waypointIndex = 1;
    this.onKilled = null;
    this.meshes = [];
    this.flashMaterials = [];

    this._direction = new THREE.Vector3();
    this._flatDirection = new THREE.Vector3();
    this._ray = new THREE.Ray();
    this._rayHit = new THREE.Vector3();
    this._origin = new THREE.Vector3();
    this._target = new THREE.Vector3();

    this.group = this._createModel();
    this.group.name = 'bot-pintor-rosa';
    this.group.position.copy(this.spawnPosition);
    scene.add(this.group);
    shootables.push(...this.meshes);

    this.healthEl = document.getElementById('bot-health');
    this.statusEl = document.getElementById('bot-status');
    this._updateHud();
  }

  setOnKilled(callback) {
    this.onKilled = callback;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this._setMuzzleFlash(false);
  }

  update(delta) {
    if (!this.enabled) return;
    if (!this.active) {
      this.respawnRemaining -= delta;
      if (this.respawnRemaining <= 0) this._respawn();
      else if (this.statusEl) this.statusEl.textContent = `RETORNA EM ${this.respawnRemaining.toFixed(1)}s`;
      return;
    }

    this.paintCooldown -= delta;
    this.shotCooldown -= delta;
    this._move(delta);
    this._paintRoute();
    this._tryShootPlayer();

    if (this.flashRemaining > 0) {
      this.flashRemaining -= delta;
      const pulse = Math.max(0.15, this.flashRemaining / 0.09);
      this.muzzleFlash.scale.setScalar(pulse);
      if (this.flashRemaining <= 0) this._setMuzzleFlash(false);
    }
  }

  takeDamage(amount, hitZone = 'body') {
    if (!this.active || !this.enabled) return { killed: false, damage: 0 };
    const damage = hitZone === 'head' ? amount * 1.55 : amount;
    this.health = Math.max(0, this.health - damage);
    this._flashHit();
    this._updateHud();
    if (this.health > 0) return { killed: false, damage };

    this.active = false;
    this.group.visible = false;
    this.respawnRemaining = BOT_RESPAWN_TIME;
    this._setMuzzleFlash(false);
    if (this.statusEl) this.statusEl.textContent = `ABATIDO · ${BOT_RESPAWN_TIME.toFixed(1)}s`;
    this.onKilled?.();
    return { killed: true, damage };
  }

  _createModel() {
    const group = new THREE.Group();
    const pink = new THREE.MeshStandardMaterial({ color: 0xff3f9f, roughness: 0.58, emissive: 0x22000f });
    const dark = new THREE.MeshStandardMaterial({ color: 0x18202a, roughness: 0.72, metalness: 0.08, emissive: 0x000000 });
    const skin = new THREE.MeshStandardMaterial({ color: 0x9a6048, roughness: 0.88, emissive: 0x000000 });
    const visor = new THREE.MeshStandardMaterial({ color: 0x75efff, roughness: 0.25, metalness: 0.38, emissive: 0x0d4752, emissiveIntensity: 0.8 });

    const addPart = (geometry, material, position, rotation = [0, 0, 0], hitZone = 'body') => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.userData.target = this;
      mesh.userData.hitZone = hitZone;
      mesh.userData.paintable = false;
      group.add(mesh);
      this.meshes.push(mesh);
      if (!this.flashMaterials.includes(material)) this.flashMaterials.push(material);
      return mesh;
    };

    addPart(new THREE.BoxGeometry(0.72, 0.92, 0.42), pink, [0, 1.18, 0]);
    addPart(new THREE.SphereGeometry(0.38, 12, 8), skin, [0, 1.92, 0.02], [0, 0, 0], 'head');
    addPart(new THREE.BoxGeometry(0.58, 0.15, 0.42), visor, [0, 1.96, 0.31], [0, 0, 0], 'head');
    addPart(new THREE.ConeGeometry(0.19, 0.82, 6), pink, [-0.3, 1.72, -0.2], [0, 0, -0.55], 'head');
    addPart(new THREE.ConeGeometry(0.19, 0.82, 6), pink, [0.3, 1.72, -0.2], [0, 0, 0.55], 'head');
    addPart(new THREE.BoxGeometry(0.18, 0.72, 0.2), dark, [-0.22, 0.42, 0]);
    addPart(new THREE.BoxGeometry(0.18, 0.72, 0.2), dark, [0.22, 0.42, 0]);
    addPart(new THREE.CylinderGeometry(0.24, 0.3, 0.12, 10), dark, [-0.22, 0.08, 0.08], [Math.PI / 2, 0, 0]);
    addPart(new THREE.CylinderGeometry(0.24, 0.3, 0.12, 10), dark, [0.22, 0.08, 0.08], [Math.PI / 2, 0, 0]);

    const blaster = new THREE.Group();
    blaster.position.set(0.43, 1.18, 0.38);
    blaster.rotation.set(-0.08, 0.12, -0.08);
    group.add(blaster);
    const blasterBody = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.24, 0.82), dark);
    blasterBody.userData.target = this;
    blasterBody.userData.hitZone = 'body';
    blasterBody.userData.paintable = false;
    blaster.add(blasterBody);
    this.meshes.push(blasterBody);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.62, 8), pink);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.62;
    barrel.userData.target = this;
    barrel.userData.hitZone = 'body';
    barrel.userData.paintable = false;
    blaster.add(barrel);
    this.meshes.push(barrel);

    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0, 0.98);
    blaster.add(this.muzzle);
    const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xff78bd, transparent: true, opacity: 0.94, depthWrite: false });
    this.muzzleFlash = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), flashMaterial);
    this.muzzleFlash.scale.set(0.65, 0.65, 1.7);
    this.muzzleFlash.visible = false;
    this.muzzle.add(this.muzzleFlash);
    return group;
  }

  _move(delta) {
    const waypoint = this.waypoints[this.waypointIndex];
    this._direction.subVectors(waypoint, this.group.position);
    this._direction.y = 0;
    const distance = this._direction.length();
    if (distance < 0.65) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      return;
    }
    this._direction.multiplyScalar(1 / Math.max(distance, 0.001));
    this.group.position.addScaledVector(this._direction, Math.min(distance, BOT_SPEED * delta));
    const targetRotation = Math.atan2(this._direction.x, this._direction.z);
    this.group.rotation.y = lerpAngle(this.group.rotation.y, targetRotation, Math.min(1, delta * 8));
    this.group.position.y = Math.abs(Math.sin(performance.now() * 0.006)) * 0.035;
    this.group.updateMatrixWorld(true);
  }

  _paintRoute() {
    if (this.paintCooldown > 0) return;
    this.paintCooldown = 0.17;
    const aheadX = this.group.position.x + this._direction.x * 0.65;
    const aheadZ = this.group.position.z + this._direction.z * 0.65;
    this.ink.paintGroundAt(aheadX, aheadZ, 1.08, BOT_TEAM);
  }

  _tryShootPlayer() {
    if (this.shotCooldown > 0 || !this.player.alive) return;
    this._origin.copy(this.group.position).add(new THREE.Vector3(0, 1.35, 0));
    this._target.copy(this.player.object.position);
    this._target.y -= 0.35;
    this._flatDirection.subVectors(this._target, this._origin);
    const distance = this._flatDirection.length();
    if (distance > 21 || distance < 2.2 || !this._hasLineOfSight(distance)) return;

    this.shotCooldown = BOT_SHOT_INTERVAL * (0.88 + Math.random() * 0.28);
    this.group.rotation.y = lerpAngle(
      this.group.rotation.y,
      Math.atan2(this._flatDirection.x, this._flatDirection.z),
      0.72,
    );
    this._setMuzzleFlash(true);
    this.flashRemaining = 0.09;
    this.audio?.playGunshot({ categoria: 'submetralhadora' });
    this.player.takeDamage(BOT_DAMAGE, 'BOT ROSA');
    this.ink.paintGroundAt(
      this.player.object.position.x + (Math.random() - 0.5) * 1.5,
      this.player.object.position.z + (Math.random() - 0.5) * 1.5,
      0.78,
      BOT_TEAM,
    );
  }

  _hasLineOfSight(distance) {
    this._flatDirection.normalize();
    this._ray.set(this._origin, this._flatDirection);
    for (const box of this.obstacles) {
      const hit = this._ray.intersectBox(box, this._rayHit);
      if (hit && hit.distanceTo(this._origin) < distance - 0.45) return false;
    }
    return true;
  }

  _flashHit() {
    for (const material of this.flashMaterials) {
      material.userData.originalEmissive ??= material.emissive?.clone();
      material.emissive?.setHex(0xffffff);
    }
    clearTimeout(this.hitFlashTimer);
    this.hitFlashTimer = setTimeout(() => {
      for (const material of this.flashMaterials) {
        if (material.emissive && material.userData.originalEmissive) {
          material.emissive.copy(material.userData.originalEmissive);
        }
      }
    }, 70);
  }

  _setMuzzleFlash(visible) {
    this.muzzleFlash.visible = visible;
    if (visible) {
      this.muzzleFlash.rotation.z = Math.random() * Math.PI;
      this.muzzleFlash.scale.setScalar(1);
      this.muzzleFlash.scale.z = 1.7;
    }
  }

  _respawn() {
    this.active = true;
    this.health = BOT_MAX_HEALTH;
    this.group.position.copy(this.spawnPosition);
    this.group.visible = true;
    this.respawnRemaining = 0;
    this.shotCooldown = 0.75;
    this._updateHud();
  }

  _updateHud() {
    if (this.healthEl) this.healthEl.style.width = `${this.health}%`;
    if (this.statusEl) this.statusEl.textContent = `BOT ROSA · ${Math.ceil(this.health)} HP`;
  }
}

function lerpAngle(from, to, amount) {
  let delta = (to - from + Math.PI) % (Math.PI * 2) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * amount;
}
