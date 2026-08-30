import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE_POSITION = new THREE.Vector3(0.34, -0.29, -0.48);
const BASE_ROTATION = new THREE.Euler(-0.045, -0.055, -0.015);
const CENTER = new THREE.Vector2(0, 0);
const UP = new THREE.Vector3(0, 1, 0);

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

function addInkIndicator(group) {
  const indicatorMaterial = new THREE.MeshStandardMaterial({
    color: 0x188cff,
    emissive: 0x188cff,
    emissiveIntensity: 0.32,
    roughness: 0.3,
    metalness: 0.08,
    flatShading: true,
  });
  const indicator = addMesh(
    group,
    new THREE.BoxGeometry(0.07, 0.13, 0.07),
    indicatorMaterial,
    [0.115, 0.015, -0.12],
    [0.12, 0, 0],
  );
  indicator.name = 'reservatorio-tinta-do-time';
  indicator.renderOrder = 22;
  group.userData.inkIndicator = indicator;
}

function blockBetween(group, start, end, width, depth, meshMaterial) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const distance = direction.length();
  const geometry = new THREE.BoxGeometry(width, Math.max(0.02, distance), depth);
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = 21;
  group.add(mesh);
  return mesh;
}

function createArm(side, gripConfig, palette) {
  const arm = new THREE.Group();
  arm.name = side === 'left' ? 'braco-esquerdo' : 'braco-direito';

  const sleeve = material(palette.manga ?? '#343a40', { roughness: 0.96, metalness: 0.01 });
  const cuff = material(palette.punho ?? '#f3f4f6', { roughness: 0.9, metalness: 0 });
  const skin = material(palette.pele ?? '#a96542', { roughness: 0.88, metalness: 0 });
  const shoulder = new THREE.Vector3(...gripConfig.ombro);
  const elbow = new THREE.Vector3(...gripConfig.cotovelo);
  const hand = new THREE.Vector3(...gripConfig.mao);
  const cuffStart = elbow.clone().lerp(hand, 0.7);
  const wrist = elbow.clone().lerp(hand, 0.88);

  // Silhueta em blocos inspirada em FPS low-poly, criada especificamente para o JOgo.
  blockBetween(arm, shoulder, elbow, 0.15, 0.145, sleeve);
  blockBetween(arm, elbow, cuffStart, 0.135, 0.13, sleeve);
  blockBetween(arm, cuffStart, wrist, 0.145, 0.14, cuff);

  const palm = addMesh(
    arm,
    new THREE.BoxGeometry(0.125, 0.105, 0.16),
    skin,
    hand.toArray(),
    gripConfig.rotacaoMao ?? [Math.PI / 2, 0, 0],
  );
  palm.name = `${arm.name}-mao`;

  arm.userData.basePosition = arm.position.clone();
  arm.userData.baseRotation = arm.rotation.clone();
  return arm;
}

function addFirstPersonArms(model, config = {}) {
  const defaultGrips = {
    direita: {
      ombro: [0.48, -0.43, 0.2],
      cotovelo: [0.3, -0.34, 0.12],
      mao: [0.03, -0.1, 0.03],
      rotacaoMao: [Math.PI / 2, 0, 0],
    },
    esquerda: {
      ombro: [-0.4, -0.43, 0.17],
      cotovelo: [-0.24, -0.31, 0.04],
      mao: [-0.035, -0.06, -0.27],
      rotacaoMao: [Math.PI / 2, 0, 0],
    },
  };
  const grips = config.bracos ?? defaultGrips;
  const palette = config.aparenciaBracos ?? {};
  const armature = new THREE.Group();
  armature.name = 'bracos-primeira-pessoa';
  const rightArm = createArm('right', grips.direita ?? defaultGrips.direita, palette);
  const leftArm = createArm('left', grips.esquerda ?? defaultGrips.esquerda, palette);
  armature.add(rightArm, leftArm);
  model.add(armature);
  model.userData.arms = { armature, rightArm, leftArm };
}

function registerAnimatedParts(model) {
  const magazine = model.getObjectByName('Magazine');
  const action = model.getObjectByName('Slide')
    ?? model.getObjectByName('Bolt')
    ?? model.getObjectByName('Fore_Stock')
    ?? model.getObjectByName('Charging_Handle')
    ?? model.userData.weaponVisual;

  model.userData.animatedParts = {
    magazine: magazine ? { object: magazine, base: magazine.position.clone() } : null,
    action: action ? { object: action, base: action.position.clone() } : null,
  };
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
  constructor(camera, scene, shootables, inkSystem, isPlayerLocked, audio = null) {
    // Mantém compatibilidade com a assinatura anterior nos testes/embeds.
    if (typeof inkSystem === 'function') {
      isPlayerLocked = inkSystem;
      inkSystem = null;
    }
    this.camera = camera;
    this.scene = scene;
    this.shootables = shootables;
    this.inkSystem = inkSystem;
    this.isPlayerLocked = isPlayerLocked;
    this.audio = audio;
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
    this.reloadDuration = 0;
    this.fireHeld = false;
    this.recoil = 0;
    this.fireAnimation = 0;
    this.equipProgress = 1;
    this.bobTime = 0;
    this.idleTime = 0;
    this.score = 0;
    this.flashRemaining = 0;
    this.tacticalBlend = 0;
    this.currentPlayer = null;

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

    this.inkSystem?.onTeamChange((color) => this._applyTeamColor(color));

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
    this._applyTeamColor(this.inkSystem?.getActiveColor());

    this._renderSlots();
    this.select(0, true);
    if (overlayMessage) overlayMessage.textContent = 'Clique em qualquer lugar para entrar no teste';
  }

  async _loadModel(weapon) {
    const config = weapon.modelo3D;
    if (!config?.arquivo) {
      const fallback = createFallbackModel(weapon);
      addInkIndicator(fallback);
      addFirstPersonArms(fallback, config);
      registerAnimatedParts(fallback);
      return fallback;
    }

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
      model.userData.weaponVisual = visual;
      addMuzzle(model, config.muzzle ?? [0, 0, -0.8]);
      addInkIndicator(model);
      addFirstPersonArms(model, config);
      registerAnimatedParts(model);
      model.userData.asset = {
        formato: 'glb',
        arquivo: config.arquivo,
        autor: config.autor ?? 'Kenney',
        licenca: config.licenca ?? 'CC0 1.0',
      };
      model.visible = false;
      return model;
    } catch (error) {
      console.warn(`Falha ao carregar ${config.arquivo}; usando modelo reserva.`, error);
      const fallback = createFallbackModel(weapon);
      addInkIndicator(fallback);
      addFirstPersonArms(fallback, config);
      registerAnimatedParts(fallback);
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
    this.reloadDuration = 0;
    this.fireHeld = false;
    this.cooldown = immediate ? 0 : 0.16;
    this.recoil = immediate ? 0 : 0.12;
    this.fireAnimation = 0;
    this.equipProgress = immediate ? 1 : 0;

    const activeModel = this.models[index];
    const parts = activeModel.userData.animatedParts;
    if (parts?.magazine) parts.magazine.object.position.copy(parts.magazine.base);
    if (parts?.action) parts.action.object.position.copy(parts.action.base);
    const { leftArm, rightArm } = activeModel.userData.arms ?? {};
    if (leftArm) {
      leftArm.position.copy(leftArm.userData.basePosition);
      leftArm.rotation.copy(leftArm.userData.baseRotation);
    }
    if (rightArm) {
      rightArm.position.copy(rightArm.userData.basePosition);
      rightArm.rotation.copy(rightArm.userData.baseRotation);
    }

    for (const slot of this.slotsEl.children) {
      slot.classList.toggle('active', Number(slot.dataset.index) === index);
    }
    this._updateHud();
  }

  reload() {
    const weapon = this.weapons[this.currentIndex];
    if (!weapon || this.reloadRemaining > 0) return;
    if (this.ammo[this.currentIndex] >= weapon.capacidadeCarregador) return;

    this.currentPlayer?.cancelTacticalSprint();
    this.fireHeld = false;
    this.reloadRemaining = weapon.tempoRecarga;
    this.reloadDuration = weapon.tempoRecarga;
    this.reloadEl.textContent = `REABASTECENDO TINTA ${this.reloadRemaining.toFixed(1)}s`;
    this.audio?.playReload();
  }

  update(delta, player) {
    if (this.weapons.length === 0) return;
    this.currentPlayer = player;

    this.cooldown = Math.max(0, this.cooldown - delta);
    this.idleTime += delta;
    this.equipProgress = Math.min(1, this.equipProgress + delta * 4.5);
    this.fireAnimation = Math.max(0, this.fireAnimation - delta * 11);

    if (this.reloadRemaining > 0) {
      this.reloadRemaining -= delta;
      if (this.reloadRemaining <= 0) {
        const weapon = this.weapons[this.currentIndex];
        this.ammo[this.currentIndex] = weapon.capacidadeCarregador;
        this.reloadRemaining = 0;
        this.reloadDuration = 0;
        this.reloadEl.textContent = '';
        this._updateHud();
      } else {
        this.reloadEl.textContent = `REABASTECENDO TINTA ${this.reloadRemaining.toFixed(1)}s`;
      }
    }

    const weapon = this.weapons[this.currentIndex];
    if (this.fireHeld && weapon.automatico && this.reloadRemaining <= 0) this._tryFire();

    const reloadProgress = this.reloadRemaining > 0 && this.reloadDuration > 0
      ? 1 - this.reloadRemaining / this.reloadDuration
      : 0;
    const reloadArc = Math.sin(reloadProgress * Math.PI);
    const magazineArc = reloadProgress > 0.14 && reloadProgress < 0.76
      ? Math.sin(((reloadProgress - 0.14) / 0.62) * Math.PI)
      : 0;
    const equipEase = 1 - Math.pow(1 - this.equipProgress, 3);
    const model = this.models[this.currentIndex];
    const parts = model.userData.animatedParts;
    if (parts?.magazine) {
      parts.magazine.object.position.copy(parts.magazine.base);
      parts.magazine.object.position.y -= magazineArc * 0.105;
    }
    if (parts?.action) {
      parts.action.object.position.copy(parts.action.base);
      parts.action.object.position.z += this.fireAnimation * 0.032;
    }

    const { leftArm, rightArm } = model.userData.arms ?? {};
    if (leftArm) {
      leftArm.position.copy(leftArm.userData.basePosition);
      leftArm.position.x -= magazineArc * 0.055;
      leftArm.position.y -= magazineArc * 0.12;
      leftArm.position.z += magazineArc * 0.075;
      leftArm.rotation.copy(leftArm.userData.baseRotation);
      leftArm.rotation.x += reloadArc * 0.18;
      leftArm.rotation.z += reloadArc * 0.38;
    }
    if (rightArm) {
      rightArm.position.copy(rightArm.userData.basePosition);
      rightArm.position.z += this.fireAnimation * 0.012;
      rightArm.rotation.copy(rightArm.userData.baseRotation);
      rightArm.rotation.x -= this.fireAnimation * 0.035;
    }

    if (this.flashRemaining > 0) {
      this.flashRemaining -= delta;
      if (this.flashRemaining <= 0) this.models[this.currentIndex].userData.flash.visible = false;
    }

    const moving = player.locked && player.speed > 0.6;
    const tactical = moving && player.tacticalSprinting;
    const sprinting = moving && player.sprinting;
    const sliding = moving && player.sliding;
    this.tacticalBlend = THREE.MathUtils.lerp(this.tacticalBlend, tactical ? 1 : 0, Math.min(1, delta * (tactical ? 10 : 14)));
    this.bobTime += delta * (tactical ? 15.5 : (sprinting ? 13 : 8));
    const bobStrength = moving && player.onGround && !sliding ? (tactical ? 0.027 : (sprinting ? 0.018 : 0.009)) : 0;
    const bobX = Math.cos(this.bobTime) * bobStrength;
    const bobY = Math.abs(Math.sin(this.bobTime)) * bobStrength;
    const breatheY = Math.sin(this.idleTime * 1.7) * 0.0035;
    const tacticalSway = Math.sin(this.bobTime * 0.5) * 0.035 * this.tacticalBlend;

    this.recoil = THREE.MathUtils.lerp(this.recoil, 0, Math.min(1, delta * 13));
    const sprintDrop = tactical ? 0.14 : (sprinting ? 0.09 : (sliding ? 0.12 : 0));
    const equipDrop = (1 - equipEase) * 0.34;
    const targetX = BASE_POSITION.x + bobX + reloadArc * 0.055 - this.tacticalBlend * 0.11;
    const targetY = BASE_POSITION.y - bobY - sprintDrop + breatheY - equipDrop - reloadArc * 0.09;
    const targetZ = BASE_POSITION.z + this.recoil + (sprinting ? 0.04 : 0) + this.tacticalBlend * 0.08;
    this.root.position.x = THREE.MathUtils.lerp(this.root.position.x, targetX, Math.min(1, delta * 14));
    this.root.position.y = THREE.MathUtils.lerp(this.root.position.y, targetY, Math.min(1, delta * 14));
    this.root.position.z = THREE.MathUtils.lerp(this.root.position.z, targetZ, Math.min(1, delta * 18));
    this.root.rotation.x = THREE.MathUtils.lerp(
      this.root.rotation.x,
      BASE_ROTATION.x - this.recoil * 0.42 + reloadArc * 0.16 + this.tacticalBlend * 1.02,
      Math.min(1, delta * 18),
    );
    this.root.rotation.y = THREE.MathUtils.lerp(
      this.root.rotation.y,
      BASE_ROTATION.y + (1 - equipEase) * 0.48 + reloadArc * 0.12 + tacticalSway,
      Math.min(1, delta * 15),
    );
    this.root.rotation.z = THREE.MathUtils.lerp(
      this.root.rotation.z,
      BASE_ROTATION.z + bobX * 0.8 - (1 - equipEase) * 0.38 - reloadArc * 0.28 - this.tacticalBlend * 0.2,
      Math.min(1, delta * 12),
    );
  }

  _tryFire() {
    const weapon = this.weapons[this.currentIndex];
    if (!weapon || this.cooldown > 0 || this.reloadRemaining > 0 || !this.isPlayerLocked()) return;

    if (this.ammo[this.currentIndex] <= 0) {
      this.audio?.playDryFire();
      this.reload();
      return;
    }

    this.currentPlayer?.cancelTacticalSprint();
    this.ammo[this.currentIndex]--;
    this.cooldown = 1 / weapon.cadenciaTiro;
    this.recoil = Math.min(0.24, this.recoil + (weapon.recuo ?? 0.07));
    this.fireAnimation = 1;
    this.audio?.playGunshot(weapon);

    const model = this.models[this.currentIndex];
    const inkColor = this.inkSystem?.getActiveColor();
    if (inkColor) model.userData.flash.material.color.copy(inkColor);
    model.userData.flash.visible = true;
    model.userData.flash.rotation.z = Math.random() * Math.PI;
    this.flashRemaining = 0.045;
    this.crosshairEl.classList.add('firing');
    clearTimeout(this.crosshairTimer);
    this.crosshairTimer = setTimeout(() => this.crosshairEl.classList.remove('firing'), 90);

    const pelletCount = weapon.projeteisPorTiro ?? 1;
    const damagePerPellet = weapon.dano / pelletCount;
    let tracerEnd = null;
    let closestImpactDistance = Infinity;

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

      if (hit) {
        this.inkSystem?.paint(hit, weapon.raioTinta ?? 1);
        closestImpactDistance = Math.min(closestImpactDistance, hit.distance);
      }

      if (hit?.object.userData.target) {
        const result = hit.object.userData.target.takeDamage(damagePerPellet, hit.object.userData.hitZone);
        this._showHitmarker(result.killed);
        if (result.killed) {
          this.score++;
          this.scoreEl.textContent = `ALVOS ${this.score}`;
        }
      }
    }

    if (tracerEnd) this._createTracer(model.userData.muzzle, tracerEnd, inkColor);
    if (Number.isFinite(closestImpactDistance)) this.audio?.playImpact(closestImpactDistance);
    this._updateHud();
  }

  _createTracer(muzzle, endPoint, color) {
    const startPoint = muzzle.getWorldPosition(new THREE.Vector3());
    const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
    const tracer = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: color ?? 0xffd27a, transparent: true, opacity: 0.78 }),
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

  _applyTeamColor(color) {
    if (!color) return;
    for (const model of this.models) {
      const indicatorMaterial = model.userData.inkIndicator?.material;
      if (indicatorMaterial) {
        indicatorMaterial.color.copy(color);
        indicatorMaterial.emissive.copy(color);
      }
      if (model.userData.flash?.material) model.userData.flash.material.color.copy(color);
    }
  }

  _updateHud() {
    const weapon = this.weapons[this.currentIndex];
    if (!weapon) return;

    this.weaponNameEl.textContent = weapon.nome;
    this.weaponCategoryEl.textContent = weapon.categoria.replaceAll('_', ' ').toUpperCase();
    this.ammoEl.innerHTML = `<strong>${String(this.ammo[this.currentIndex]).padStart(2, '0')}</strong><span>/ TANQUE</span>`;
  }
}
