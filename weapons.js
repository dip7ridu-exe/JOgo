import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE_POSITION = new THREE.Vector3(0.34, -0.29, -0.48);
const BASE_ROTATION = new THREE.Euler(-0.045, -0.055, -0.015);
const CENTER = new THREE.Vector2(0, 0);

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.48,
    metalness: options.metalness ?? 0.35,
    flatShading: true,
  });
}

function addMesh(group, geometry, meshMaterial, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = 20;
  group.add(mesh);
  return mesh;
}

function box(group, size, position, meshMaterial, rotation) {
  return addMesh(group, new THREE.BoxGeometry(...size), meshMaterial, position, rotation);
}

function cylinder(group, radius, length, position, meshMaterial, rotation = [Math.PI / 2, 0, 0], sides = 10) {
  return addMesh(
    group,
    new THREE.CylinderGeometry(radius, radius, length, sides),
    meshMaterial,
    position,
    rotation,
  );
}

function addMuzzle(group, position) {
  const anchor = new THREE.Object3D();
  anchor.name = 'muzzle';
  anchor.position.set(...position);

  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd27a,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), flashMaterial);
  flash.scale.set(0.7, 0.7, 1.8);
  flash.visible = false;
  flash.renderOrder = 30;
  anchor.add(flash);
  group.add(anchor);
  group.userData.muzzle = anchor;
  group.userData.flash = flash;
  return anchor;
}

function createPistol(colors) {
  const group = new THREE.Group();
  box(group, [0.17, 0.13, 0.48], [0, 0.05, -0.15], colors.metal);
  box(group, [0.16, 0.08, 0.34], [0, -0.045, -0.08], colors.main);
  box(group, [0.14, 0.28, 0.16], [0, -0.19, 0.015], colors.grip, [-0.15, 0, 0]);
  cylinder(group, 0.026, 0.28, [0, 0.055, -0.49], colors.dark);
  box(group, [0.035, 0.045, 0.035], [0, 0.14, -0.24], colors.accent);
  box(group, [0.032, 0.04, 0.025], [0, 0.14, 0.065], colors.accent);
  addMuzzle(group, [0, 0.055, -0.65]);
  return group;
}

function createSmg(colors) {
  const group = new THREE.Group();
  box(group, [0.22, 0.23, 0.57], [0, 0, -0.18], colors.main);
  box(group, [0.18, 0.11, 0.35], [0, 0.15, -0.18], colors.metal);
  box(group, [0.13, 0.3, 0.16], [0, -0.23, -0.11], colors.grip, [-0.12, 0, 0]);
  box(group, [0.12, 0.35, 0.13], [0, -0.24, -0.31], colors.dark, [0.08, 0, 0]);
  cylinder(group, 0.035, 0.38, [0, 0.08, -0.64], colors.metal);
  box(group, [0.2, 0.12, 0.3], [0, 0.015, 0.25], colors.dark);
  box(group, [0.045, 0.055, 0.22], [0, 0.225, -0.14], colors.accent);
  addMuzzle(group, [0, 0.08, -0.85]);
  return group;
}

function createRifle(colors) {
  const group = new THREE.Group();
  box(group, [0.2, 0.2, 0.63], [0, 0, -0.2], colors.main);
  box(group, [0.16, 0.1, 0.5], [0, 0.135, -0.31], colors.metal);
  box(group, [0.12, 0.31, 0.14], [0, -0.23, -0.08], colors.grip, [-0.18, 0, 0]);
  box(group, [0.13, 0.38, 0.18], [0, -0.25, -0.34], colors.accent, [0.1, 0, 0]);
  box(group, [0.18, 0.16, 0.45], [0, -0.01, 0.34], colors.dark);
  box(group, [0.11, 0.06, 0.76], [0, 0.06, -0.83], colors.metal);
  cylinder(group, 0.029, 0.48, [0, 0.06, -1.18], colors.dark);
  box(group, [0.04, 0.065, 0.5], [0, 0.205, -0.4], colors.accent);
  addMuzzle(group, [0, 0.06, -1.43]);
  return group;
}

function createShotgun(colors) {
  const group = new THREE.Group();
  box(group, [0.21, 0.2, 0.55], [0, 0, -0.06], colors.metal);
  box(group, [0.19, 0.2, 0.48], [0, -0.015, 0.43], colors.grip);
  box(group, [0.14, 0.28, 0.16], [0, -0.22, 0.05], colors.grip, [-0.15, 0, 0]);
  cylinder(group, 0.045, 0.95, [0, 0.075, -0.78], colors.dark);
  cylinder(group, 0.033, 0.72, [0, -0.025, -0.66], colors.accent);
  box(group, [0.2, 0.18, 0.36], [0, -0.035, -0.55], colors.main);
  for (let i = 0; i < 5; i++) {
    box(group, [0.215, 0.025, 0.025], [0, 0.055, -0.42 - i * 0.065], colors.dark);
  }
  addMuzzle(group, [0, 0.075, -1.28]);
  return group;
}

function createSniper(colors) {
  const group = new THREE.Group();
  box(group, [0.18, 0.19, 0.68], [0, 0, -0.17], colors.main);
  box(group, [0.17, 0.17, 0.62], [0, -0.015, 0.46], colors.grip);
  box(group, [0.12, 0.3, 0.15], [0, -0.22, 0], colors.dark, [-0.18, 0, 0]);
  box(group, [0.11, 0.31, 0.16], [0, -0.23, -0.31], colors.accent, [0.07, 0, 0]);
  cylinder(group, 0.033, 1.2, [0, 0.07, -1.05], colors.metal);
  cylinder(group, 0.048, 0.23, [0, 0.07, -1.68], colors.dark);
  cylinder(group, 0.085, 0.48, [0, 0.25, -0.27], colors.dark);
  cylinder(group, 0.1, 0.08, [0, 0.25, -0.52], colors.accent);
  cylinder(group, 0.1, 0.08, [0, 0.25, -0.02], colors.accent);
  box(group, [0.035, 0.12, 0.16], [0, 0.145, -0.28], colors.metal);
  addMuzzle(group, [0, 0.07, -1.82]);
  return group;
}

function createFallbackModel(definition) {
  const palette = definition.cores ?? {};
  const colors = {
    main: material(palette.principal ?? '#48515d'),
    metal: material(palette.metal ?? '#1d242c', { metalness: 0.7, roughness: 0.3 }),
    grip: material(palette.empunhadura ?? '#20252a', { roughness: 0.85, metalness: 0.05 }),
    dark: material('#0c1117', { metalness: 0.58, roughness: 0.36 }),
    accent: material(palette.detalhe ?? '#ff8a3d', { metalness: 0.25, roughness: 0.42 }),
  };

  const builders = {
    pistola: createPistol,
    submetralhadora: createSmg,
    rifle_de_assalto: createRifle,
    espingarda: createShotgun,
    sniper: createSniper,
  };
  const model = (builders[definition.categoria] ?? createPistol)(colors);
  model.name = definition.id;
  model.visible = false;
  return model;
}

export class WeaponSystem {
  constructor(camera, scene, shootables, isPlayerLocked) {
    this.camera = camera;
    this.scene = scene;
    this.shootables = shootables;
    this.isPlayerLocked = isPlayerLocked;
    this.loader = new GLTFLoader();

    this.root = new THREE.Group();
    this.root.position.copy(BASE_POSITION);
    this.root.rotation.copy(BASE_ROTATION);
    this.camera.add(this.root);

    this.weapons = [];
    this.models = [];
    this.ammo = [];
    this.currentIndex = 0;
    this.cooldown = 0;
    this.reloadRemaining = 0;
    this.fireHeld = false;
    this.recoil = 0;
    this.bobTime = 0;
    this.score = 0;
    this.flashRemaining = 0;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 120;
    this.worldOrigin = new THREE.Vector3();
    this.worldDirection = new THREE.Vector3();
    this.cameraRight = new THREE.Vector3();
    this.cameraUp = new THREE.Vector3();
    this.hitPoint = new THREE.Vector3();

    this.weaponNameEl = document.getElementById('weapon-name');
    this.weaponCategoryEl = document.getElementById('weapon-category');
    this.ammoEl = document.getElementById('ammo');
    this.reloadEl = document.getElementById('reload-status');
    this.slotsEl = document.getElementById('weapon-slots');
    this.scoreEl = document.getElementById('score');
    this.hitmarkerEl = document.getElementById('hitmarker');
    this.crosshairEl = document.getElementById('crosshair');

    this._setupEvents();
  }

  async init() {
    const overlayMessage = document.getElementById('overlay-message');
    if (overlayMessage) overlayMessage.textContent = 'Carregando 5 modelos 3D...';

    const response = await fetch('./weapons.json');
    if (!response.ok) throw new Error(`weapons.json retornou HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data.armas) || data.armas.length < 1) {
      throw new Error('weapons.json não possui armas válidas');
    }

    this.weapons = data.armas.slice(0, 5);
    this.ammo = this.weapons.map((weapon) => weapon.capacidadeCarregador);
    this.models = await Promise.all(this.weapons.map(async (weapon) => {
      const model = await this._loadModel(weapon);
      this.root.add(model);
      return model;
    }));

    this._renderSlots();
    this.select(0, true);
    if (overlayMessage) overlayMessage.textContent = 'Clique em qualquer lugar para entrar no teste';
  }

  async _loadModel(weapon) {
    const config = weapon.modelo3D;
    if (!config?.arquivo) return createFallbackModel(weapon);

    try {
      const gltf = await this.loader.loadAsync(config.arquivo);
      const model = new THREE.Group();
      const visual = gltf.scene;

      model.name = weapon.id;
      visual.name = `${weapon.id}-glb`;
      visual.position.fromArray(config.posicao ?? [0, 0, 0]);
      visual.rotation.set(...(config.rotacao ?? [0, 0, 0]));
      visual.scale.fromArray(config.escala ?? [1, 1, 1]);

      visual.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = false;
        child.renderOrder = 20;
      });

      model.add(visual);
      addMuzzle(model, config.muzzle ?? [0, 0, -0.8]);
      model.userData.asset = {
        formato: 'glb',
        arquivo: config.arquivo,
        autor: 'Kenney',
        licenca: 'CC0 1.0',
      };
      model.visible = false;
      return model;
    } catch (error) {
      console.warn(`Falha ao carregar ${config.arquivo}; usando modelo reserva.`, error);
      const fallback = createFallbackModel(weapon);
      fallback.userData.asset = { formato: 'procedural-fallback' };
      return fallback;
    }
  }

  _setupEvents() {
    document.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || !this.isPlayerLocked()) return;
      this.fireHeld = true;
      this._tryFire();
    });

    document.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.fireHeld = false;
    });

    document.addEventListener('pointerlockchange', () => {
      if (!this.isPlayerLocked()) this.fireHeld = false;
    });

    document.addEventListener('keydown', (event) => {
      if (event.repeat && event.code === 'KeyR') return;
      if (event.code === 'KeyR') this.reload();

      if (event.code.startsWith('Digit')) {
        const index = Number(event.code.slice(5)) - 1;
        if (index >= 0 && index < this.weapons.length) this.select(index);
      }
    });

    document.addEventListener('wheel', (event) => {
      if (!this.isPlayerLocked() || this.weapons.length === 0) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex = (this.currentIndex + direction + this.weapons.length) % this.weapons.length;
      this.select(nextIndex);
    }, { passive: false });

    document.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  _renderSlots() {
    this.slotsEl.replaceChildren();
    this.weapons.forEach((weapon, index) => {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot';
      slot.dataset.index = String(index);
      slot.innerHTML = `<span>${index + 1}</span><strong>${weapon.nome}</strong>`;
      this.slotsEl.appendChild(slot);
    });
  }

  select(index, immediate = false) {
    if (!this.weapons[index] || (!immediate && index === this.currentIndex)) return;

    this.models.forEach((model, modelIndex) => {
      model.visible = modelIndex === index;
      model.userData.flash.visible = false;
    });
    this.flashRemaining = 0;
    this.currentIndex = index;
    this.reloadRemaining = 0;
    this.fireHeld = false;
    this.cooldown = immediate ? 0 : 0.16;
    this.recoil = immediate ? 0 : 0.12;

    for (const slot of this.slotsEl.children) {
      slot.classList.toggle('active', Number(slot.dataset.index) === index);
    }
    this._updateHud();
  }

  reload() {
    const weapon = this.weapons[this.currentIndex];
    if (!weapon || this.reloadRemaining > 0) return;
    if (this.ammo[this.currentIndex] >= weapon.capacidadeCarregador) return;

    this.fireHeld = false;
    this.reloadRemaining = weapon.tempoRecarga;
    this.reloadEl.textContent = `RECARREGANDO ${this.reloadRemaining.toFixed(1)}s`;
  }

  update(delta, player) {
    if (this.weapons.length === 0) return;

    this.cooldown = Math.max(0, this.cooldown - delta);

    if (this.reloadRemaining > 0) {
      this.reloadRemaining -= delta;
      if (this.reloadRemaining <= 0) {
        const weapon = this.weapons[this.currentIndex];
        this.ammo[this.currentIndex] = weapon.capacidadeCarregador;
        this.reloadRemaining = 0;
        this.reloadEl.textContent = '';
        this._updateHud();
      } else {
        this.reloadEl.textContent = `RECARREGANDO ${this.reloadRemaining.toFixed(1)}s`;
      }
    }

    const weapon = this.weapons[this.currentIndex];
    if (this.fireHeld && weapon.automatico && this.reloadRemaining <= 0) this._tryFire();

    if (this.flashRemaining > 0) {
      this.flashRemaining -= delta;
      if (this.flashRemaining <= 0) this.models[this.currentIndex].userData.flash.visible = false;
    }

    const moving = player.locked && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].some((key) => player.keys[key]);
    const sprinting = moving && player.keys.KeyW && (player.keys.ShiftLeft || player.keys.ShiftRight);
    this.bobTime += delta * (sprinting ? 13 : 8);
    const bobStrength = moving && player.onGround ? (sprinting ? 0.018 : 0.009) : 0;
    const bobX = Math.cos(this.bobTime) * bobStrength;
    const bobY = Math.abs(Math.sin(this.bobTime)) * bobStrength;

    this.recoil = THREE.MathUtils.lerp(this.recoil, 0, Math.min(1, delta * 13));
    const sprintDrop = sprinting ? 0.09 : 0;
    const targetX = BASE_POSITION.x + bobX;
    const targetY = BASE_POSITION.y - bobY - sprintDrop;
    const targetZ = BASE_POSITION.z + this.recoil + (sprinting ? 0.04 : 0);
    this.root.position.x = THREE.MathUtils.lerp(this.root.position.x, targetX, Math.min(1, delta * 14));
    this.root.position.y = THREE.MathUtils.lerp(this.root.position.y, targetY, Math.min(1, delta * 14));
    this.root.position.z = THREE.MathUtils.lerp(this.root.position.z, targetZ, Math.min(1, delta * 18));
    this.root.rotation.x = THREE.MathUtils.lerp(this.root.rotation.x, BASE_ROTATION.x - this.recoil * 0.42, Math.min(1, delta * 18));
    this.root.rotation.z = THREE.MathUtils.lerp(this.root.rotation.z, BASE_ROTATION.z + bobX * 0.8, Math.min(1, delta * 12));
  }

  _tryFire() {
    const weapon = this.weapons[this.currentIndex];
    if (!weapon || this.cooldown > 0 || this.reloadRemaining > 0 || !this.isPlayerLocked()) return;

    if (this.ammo[this.currentIndex] <= 0) {
      this.reload();
      return;
    }

    this.ammo[this.currentIndex]--;
    this.cooldown = 1 / weapon.cadenciaTiro;
    this.recoil = Math.min(0.24, this.recoil + (weapon.recuo ?? 0.07));

    const model = this.models[this.currentIndex];
    model.userData.flash.visible = true;
    model.userData.flash.rotation.z = Math.random() * Math.PI;
    this.flashRemaining = 0.045;
    this.crosshairEl.classList.add('firing');
    clearTimeout(this.crosshairTimer);
    this.crosshairTimer = setTimeout(() => this.crosshairEl.classList.remove('firing'), 90);

    const pelletCount = weapon.projeteisPorTiro ?? 1;
    const damagePerPellet = weapon.dano / pelletCount;
    let tracerEnd = null;

    this.camera.getWorldPosition(this.worldOrigin);
    this.raycaster.setFromCamera(CENTER, this.camera);
    const baseDirection = this.raycaster.ray.direction.clone();
    this.cameraRight.set(1, 0, 0).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion()));
    this.cameraUp.set(0, 1, 0).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion()));

    for (let pellet = 0; pellet < pelletCount; pellet++) {
      this.worldDirection.copy(baseDirection);
      const spread = weapon.dispersao ?? 0.004;
      this.worldDirection.addScaledVector(this.cameraRight, (Math.random() - 0.5) * spread);
      this.worldDirection.addScaledVector(this.cameraUp, (Math.random() - 0.5) * spread);
      this.worldDirection.normalize();

      this.raycaster.set(this.worldOrigin, this.worldDirection);
      const hit = this.raycaster
        .intersectObjects(this.shootables, false)
        .find((intersection) => {
          const target = intersection.object.userData.target;
          return !target || target.active;
        });
      const end = hit
        ? hit.point
        : this.hitPoint.copy(this.worldDirection).multiplyScalar(70).add(this.worldOrigin);
      if (pellet === 0) tracerEnd = end.clone();

      if (hit?.object.userData.target) {
        const result = hit.object.userData.target.takeDamage(damagePerPellet, hit.object.userData.hitZone);
        this._showHitmarker(result.killed);
        if (result.killed) {
          this.score++;
          this.scoreEl.textContent = `ALVOS ${this.score}`;
        }
      }
    }

    if (tracerEnd) this._createTracer(model.userData.muzzle, tracerEnd);
    this._updateHud();
  }

  _createTracer(muzzle, endPoint) {
    const startPoint = muzzle.getWorldPosition(new THREE.Vector3());
    const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
    const tracer = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.72 }),
    );
    this.scene.add(tracer);

    setTimeout(() => {
      this.scene.remove(tracer);
      tracer.geometry.dispose();
      tracer.material.dispose();
    }, 45);
  }

  _showHitmarker(killed) {
    this.hitmarkerEl.classList.remove('show', 'kill');
    void this.hitmarkerEl.offsetWidth;
    this.hitmarkerEl.classList.add('show');
    if (killed) this.hitmarkerEl.classList.add('kill');
    clearTimeout(this.hitmarkerTimer);
    this.hitmarkerTimer = setTimeout(() => this.hitmarkerEl.classList.remove('show', 'kill'), 120);
  }

  _updateHud() {
    const weapon = this.weapons[this.currentIndex];
    if (!weapon) return;

    this.weaponNameEl.textContent = weapon.nome;
    this.weaponCategoryEl.textContent = weapon.categoria.replaceAll('_', ' ').toUpperCase();
    this.ammoEl.innerHTML = `<strong>${String(this.ammo[this.currentIndex]).padStart(2, '0')}</strong><span>/ ∞</span>`;
  }
}
