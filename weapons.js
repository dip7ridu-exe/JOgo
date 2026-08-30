import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE_POSITION = new THREE.Vector3(0.34, -0.29, -0.48);
const BASE_ROTATION = new THREE.Euler(-0.045, -0.055, -0.015);
const ADS_ROTATION = new THREE.Euler(-0.008, 0, 0);
const CENTER = new THREE.Vector2(0, 0);
const UP = new THREE.Vector3(0, 1, 0);

const SIGHT_PROFILES = {
  pistola: { lineY: 0.205, rearZ: 0.08, frontZ: -0.46, adsZ: -0.62, fov: 62, sensitivity: 0.68 },
  submetralhadora: { lineY: 0.255, rearZ: 0.1, frontZ: -0.58, adsZ: -0.72, fov: 61, sensitivity: 0.66 },
  rifle_de_assalto: { lineY: 0.265, rearZ: 0.1, frontZ: -0.7, adsZ: -0.79, fov: 59, sensitivity: 0.62 },
  espingarda: { lineY: 0.245, rearZ: 0.12, frontZ: -0.6, adsZ: -0.86, fov: 63, sensitivity: 0.7 },
  sniper: { lineY: 0.285, rearZ: 0.08, frontZ: -0.62, adsZ: -0.92, fov: 44, sensitivity: 0.42 },
};

const CATEGORY_LABELS = {
  pistola: 'PISTOLA',
  submetralhadora: 'SMG',
  rifle_de_assalto: 'RIFLE',
  espingarda: 'CANHÃO',
  sniper: 'PRECISÃO',
};

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function heldBetween(value, enterStart, enterEnd, exitStart, exitEnd) {
  return smoothstep(enterStart, enterEnd, value) * (1 - smoothstep(exitStart, exitEnd, value));
}

function weaponIcon(category) {
  const common = 'fill="currentColor"';
  const icons = {
    pistola: `<path ${common} d="M10 7h25v7H23l-3 8h-7l2-8h-5z"/><path ${common} d="M35 8h6v3h-6z" opacity=".55"/>`,
    submetralhadora: `<path ${common} d="M4 8h34v7H19l-3 7h-6l2-7H4z"/><path ${common} d="M38 10h7v3h-7z" opacity=".55"/>`,
    rifle_de_assalto: `<path ${common} d="M3 9h31l5 3-5 4H21l-4 6h-6l2-6H3z"/><path ${common} d="M34 11h11v3H34z" opacity=".6"/>`,
    espingarda: `<path ${common} d="M3 10h28l6 3-6 4H17l-4 5H8l2-5H3z"/><path ${common} d="M29 11h16v2H29z" opacity=".58"/>`,
    sniper: `<path ${common} d="M2 11h30l5 3-5 4H18l-4 4H9l2-4H2z"/><path ${common} d="M30 12h16v2H30z" opacity=".58"/><rect ${common} x="17" y="7" width="12" height="4" rx="2"/>`,
  };
  return `<svg viewBox="0 0 48 24" aria-hidden="true">${icons[category] ?? icons.pistola}</svg>`;
}

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

  const flash = new THREE.Group();
  const flashMaterials = [
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.98, depthTest: false, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: 0xffd057, transparent: true, opacity: 0.92, depthTest: false, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: 0xff783d, transparent: true, opacity: 0.82, depthTest: false, depthWrite: false }),
  ];
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.22, 5), flashMaterials[0]);
  core.rotation.x = -Math.PI / 2;
  core.position.z = -0.11;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.4, 6), flashMaterials[1]);
  flame.rotation.x = -Math.PI / 2;
  flame.position.z = -0.2;
  const sideFlame = new THREE.Mesh(new THREE.TetrahedronGeometry(0.09, 0), flashMaterials[2]);
  sideFlame.scale.set(1.45, 0.55, 2.15);
  sideFlame.position.z = -0.12;
  flash.add(core, flame, sideFlame);
  flash.visible = false;
  flash.traverse((child) => { if (child.isMesh) child.renderOrder = 30; });
  anchor.add(flash);
  group.add(anchor);
  group.userData.muzzle = anchor;
  group.userData.flash = flash;
  group.userData.flashMaterials = flashMaterials;
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
    new THREE.BoxGeometry(0.085, 0.17, 0.085),
    indicatorMaterial,
    [0.115, 0.015, -0.12],
    [0.12, 0, 0],
  );
  indicator.name = 'reservatorio-tinta-do-time';
  indicator.renderOrder = 22;
  group.userData.inkIndicator = indicator;
}

function addWeaponSights(model, weapon) {
  const profile = SIGHT_PROFILES[weapon.categoria] ?? SIGHT_PROFILES.pistola;
  const sights = new THREE.Group();
  sights.name = weapon.categoria === 'sniper' ? 'luneta-prisma' : 'mira-de-ferro';
  const dark = material('#111820', { roughness: 0.46, metalness: 0.62 });
  const edge = material('#313b46', { roughness: 0.4, metalness: 0.55 });
  const accent = new THREE.MeshBasicMaterial({ color: 0x188cff, toneMapped: false });

  if (weapon.categoria === 'sniper') {
    cylinder(sights, 0.09, 0.54, [0, profile.lineY, -0.3], dark, [Math.PI / 2, 0, 0], 16);
    const rearRing = addMesh(sights, new THREE.TorusGeometry(0.095, 0.018, 8, 18), edge, [0, profile.lineY, -0.02]);
    const frontRing = addMesh(sights, new THREE.TorusGeometry(0.105, 0.019, 8, 18), edge, [0, profile.lineY, -0.58]);
    rearRing.rotation.set(0, 0, 0);
    frontRing.rotation.set(0, 0, 0);
    box(sights, [0.035, 0.12, 0.09], [-0.065, profile.lineY - 0.105, -0.2], dark);
    box(sights, [0.035, 0.12, 0.09], [0.065, profile.lineY - 0.105, -0.42], dark);
    const lens = addMesh(
      sights,
      new THREE.CircleGeometry(0.078, 20),
      new THREE.MeshBasicMaterial({ color: 0x224f61, transparent: true, opacity: 0.48, side: THREE.DoubleSide }),
      [0, profile.lineY, -0.005],
    );
    lens.renderOrder = 23;
  } else {
    box(sights, [0.19, 0.035, 0.045], [0, profile.lineY - 0.055, profile.rearZ], dark);
    box(sights, [0.038, 0.12, 0.045], [-0.077, profile.lineY - 0.005, profile.rearZ], dark);
    box(sights, [0.038, 0.12, 0.045], [0.077, profile.lineY - 0.005, profile.rearZ], dark);
    box(sights, [0.13, 0.035, 0.04], [0, profile.lineY - 0.055, profile.frontZ], edge);
    box(sights, [0.024, 0.115, 0.035], [0, profile.lineY - 0.006, profile.frontZ], dark);
    const bead = addMesh(
      sights,
      new THREE.SphereGeometry(0.018, 8, 6),
      accent,
      [0, profile.lineY + 0.048, profile.frontZ],
    );
    bead.renderOrder = 23;
  }

  model.add(sights);
  model.userData.sights = sights;
  model.userData.sightAccent = accent;
  model.userData.adsPosition = new THREE.Vector3(0, -profile.lineY, profile.adsZ);
  model.userData.aimFov = profile.fov;
  model.userData.aimSensitivity = profile.sensitivity;
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
  const magazine = model.getObjectByName('Magazine') ?? model.userData.inkIndicator;
  const action = model.getObjectByName('Slide')
    ?? model.getObjectByName('Bolt')
    ?? model.getObjectByName('Fore_Stock')
    ?? model.getObjectByName('Charging_Handle')
    ?? model.userData.weaponVisual;

  model.userData.animatedParts = {
    magazine: magazine ? {
      object: magazine,
      base: magazine.position.clone(),
      baseRotation: magazine.rotation.clone(),
    } : null,
    action: action ? {
      object: action,
      base: action.position.clone(),
      baseRotation: action.rotation.clone(),
    } : null,
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
    this.aimHeld = false;
    this.aimBlend = 0;
    this.reloadAudioStage = 0;
    this.enabled = true;
    this.impactBursts = [];
    this.currentPlayer = null;
    this._lastWeaponMode = '';

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 120;
    this.worldOrigin = new THREE.Vector3();
    this.worldDirection = new THREE.Vector3();
    this.cameraRight = new THREE.Vector3();
    this.cameraUp = new THREE.Vector3();
    this.hitPoint = new THREE.Vector3();

    this.weaponNameEl = document.getElementById('weapon-name');
    this.weaponCategoryEl = document.getElementById('weapon-category');
    this.weaponModeEl = document.getElementById('weapon-mode');
    this.ammoEl = document.getElementById('ammo');
    this.reloadEl = document.getElementById('reload-status');
    this.slotsEl = document.getElementById('weapon-slots');
    this.scoreEl = document.getElementById('score');
    this.hitmarkerEl = document.getElementById('hitmarker');
    this.crosshairEl = document.getElementById('crosshair');
    this.scopeOverlayEl = document.getElementById('scope-overlay');

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
      addWeaponSights(fallback, weapon);
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
      addWeaponSights(model, weapon);
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
      addWeaponSights(fallback, weapon);
      addFirstPersonArms(fallback, config);
      registerAnimatedParts(fallback);
      fallback.userData.asset = { formato: 'procedural-fallback' };
      return fallback;
    }
  }

  _setupEvents() {
    document.addEventListener('mousedown', (event) => {
      if (!this.enabled || !this.isPlayerLocked()) return;
      if (event.button === 2) {
        this.aimHeld = true;
        this.currentPlayer?.cancelTacticalSprint();
        return;
      }
      if (event.button !== 0) return;
      this.fireHeld = true;
      this._tryFire();
    });

    document.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.fireHeld = false;
      if (event.button === 2) this.aimHeld = false;
    });

    document.addEventListener('pointerlockchange', () => {
      if (!this.isPlayerLocked()) {
        this.fireHeld = false;
        this.aimHeld = false;
      }
    });

    document.addEventListener('keydown', (event) => {
      if (!this.enabled) return;
      if (event.repeat && event.code === 'KeyR') return;
      if (event.code === 'KeyR') this.reload();

      if (event.code.startsWith('Digit')) {
        const index = Number(event.code.slice(5)) - 1;
        if (index >= 0 && index < this.weapons.length) this.select(index);
      }
    });

    document.addEventListener('wheel', (event) => {
      if (!this.enabled || !this.isPlayerLocked() || this.weapons.length === 0) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex = (this.currentIndex + direction + this.weapons.length) % this.weapons.length;
      this.select(nextIndex);
    }, { passive: false });

    document.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.fireHeld = false;
    this.aimHeld = false;
    this.root.visible = enabled;
    if (!enabled) {
      document.body.classList.remove('aiming', 'scoped');
      this.currentPlayer && (this.currentPlayer.aiming = false);
    }
  }

  _renderSlots() {
    this.slotsEl.replaceChildren();
    this.weapons.forEach((weapon, index) => {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot';
      slot.dataset.index = String(index);
      slot.innerHTML = `
        <span class="slot-key">${index + 1}</span>
        <span class="weapon-glyph">${weaponIcon(weapon.categoria)}</span>
        <span class="slot-copy">
          <small>${CATEGORY_LABELS[weapon.categoria] ?? 'BLASTER'}</small>
          <strong>${weapon.nome}</strong>
          <i class="slot-meter"><b></b></i>
        </span>`;
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
    this.aimHeld = false;
    this.cooldown = immediate ? 0 : 0.16;
    this.recoil = immediate ? 0 : 0.12;
    this.fireAnimation = 0;
    this.equipProgress = immediate ? 1 : 0;

    const activeModel = this.models[index];
    const parts = activeModel.userData.animatedParts;
    if (parts?.magazine) {
      parts.magazine.object.position.copy(parts.magazine.base);
      parts.magazine.object.rotation.copy(parts.magazine.baseRotation);
    }
    if (parts?.action) {
      parts.action.object.position.copy(parts.action.base);
      parts.action.object.rotation.copy(parts.action.baseRotation);
    }
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
    this.aimHeld = false;
    this.reloadRemaining = weapon.tempoRecarga;
    this.reloadDuration = weapon.tempoRecarga;
    this.reloadAudioStage = 0;
    this.reloadEl.textContent = `REABASTECENDO TINTA ${this.reloadRemaining.toFixed(1)}s`;
    this.audio?.playReload(0);
  }

  update(delta, player) {
    this._updateImpactBursts(delta);
    if (this.weapons.length === 0) return;
    this.currentPlayer = player;
    const weapon = this.weapons[this.currentIndex];
    if (!this.enabled) {
      player.aiming = false;
      return;
    }

    const wantsAim = this.aimHeld
      && this.reloadRemaining <= 0
      && !player.sliding
      && !player.tacticalSprinting
      && player.alive;
    player.aiming = wantsAim;
    const model = this.models[this.currentIndex];
    player.aimFov = model.userData.aimFov ?? 62;
    player.aimSensitivityFactor = model.userData.aimSensitivity ?? 0.68;
    this.aimBlend = THREE.MathUtils.lerp(
      this.aimBlend,
      wantsAim ? 1 : 0,
      Math.min(1, delta * (wantsAim ? 13 : 17)),
    );
    document.body.classList.toggle('aiming', this.aimBlend > 0.72);
    const scoped = weapon.categoria === 'sniper' && wantsAim && this.aimBlend > 0.86;
    document.body.classList.toggle('scoped', scoped);
    this.root.visible = !scoped;

    this.cooldown = Math.max(0, this.cooldown - delta);
    this.idleTime += delta;
    this.equipProgress = Math.min(1, this.equipProgress + delta * 4.5);
    this.fireAnimation = Math.max(0, this.fireAnimation - delta * 11);

    if (this.reloadRemaining > 0) {
      this.reloadRemaining -= delta;
      if (this.reloadRemaining <= 0) {
        this.ammo[this.currentIndex] = weapon.capacidadeCarregador;
        this.reloadRemaining = 0;
        this.reloadDuration = 0;
        this.reloadEl.textContent = '';
        this._updateHud();
      } else {
        this.reloadEl.textContent = `REABASTECENDO TINTA ${this.reloadRemaining.toFixed(1)}s`;
      }
    }

    if (this.fireHeld && weapon.automatico && this.reloadRemaining <= 0) this._tryFire();

    const reloadProgress = this.reloadRemaining > 0 && this.reloadDuration > 0
      ? 1 - this.reloadRemaining / this.reloadDuration
      : 0;
    const reloadArc = Math.sin(reloadProgress * Math.PI);
    const magazineHold = heldBetween(reloadProgress, 0.12, 0.31, 0.67, 0.86);
    const handReach = heldBetween(reloadProgress, 0.06, 0.24, 0.78, 0.97);
    const magazineSwing = Math.sin(
      THREE.MathUtils.clamp((reloadProgress - 0.14) / 0.7, 0, 1) * Math.PI,
    );
    if (this.reloadRemaining > 0 && reloadProgress >= 0.3 && this.reloadAudioStage < 1) {
      this.reloadAudioStage = 1;
      this.audio?.playReload(1);
    }
    if (this.reloadRemaining > 0 && reloadProgress >= 0.73 && this.reloadAudioStage < 2) {
      this.reloadAudioStage = 2;
      this.audio?.playReload(2);
    }

    const equipEase = 1 - Math.pow(1 - this.equipProgress, 3);
    const parts = model.userData.animatedParts;
    if (parts?.magazine) {
      parts.magazine.object.position.copy(parts.magazine.base);
      parts.magazine.object.rotation.copy(parts.magazine.baseRotation);
      parts.magazine.object.position.x -= magazineSwing * 0.08;
      parts.magazine.object.position.y -= magazineHold * 0.28;
      parts.magazine.object.position.z += magazineSwing * 0.055;
      parts.magazine.object.rotation.x += magazineSwing * 0.14;
      parts.magazine.object.rotation.z += magazineSwing * 0.2;
    }
    if (parts?.action) {
      parts.action.object.position.copy(parts.action.base);
      parts.action.object.rotation.copy(parts.action.baseRotation);
      parts.action.object.position.z += this.fireAnimation * 0.032;
    }

    const { leftArm, rightArm } = model.userData.arms ?? {};
    if (leftArm) {
      leftArm.position.copy(leftArm.userData.basePosition);
      leftArm.position.x -= handReach * 0.12;
      leftArm.position.y -= magazineHold * 0.22;
      leftArm.position.z += handReach * 0.13;
      leftArm.rotation.copy(leftArm.userData.baseRotation);
      leftArm.rotation.x += reloadArc * 0.32;
      leftArm.rotation.y -= magazineSwing * 0.1;
      leftArm.rotation.z += reloadArc * 0.58;
    }
    if (rightArm) {
      rightArm.position.copy(rightArm.userData.basePosition);
      rightArm.position.z += this.fireAnimation * 0.012;
      rightArm.position.y -= reloadArc * 0.025;
      rightArm.rotation.copy(rightArm.userData.baseRotation);
      rightArm.rotation.x -= this.fireAnimation * 0.035;
      rightArm.rotation.z -= reloadArc * 0.1;
    }

    if (this.flashRemaining > 0) {
      this.flashRemaining -= delta;
      const flash = this.models[this.currentIndex].userData.flash;
      const pulse = THREE.MathUtils.clamp(this.flashRemaining / 0.075, 0.15, 1.15);
      flash.scale.set(pulse, pulse, pulse);
      flash.rotation.z += delta * 31;
      if (this.flashRemaining <= 0) flash.visible = false;
    }

    const moving = player.locked && player.speed > 0.6;
    const tactical = moving && player.tacticalSprinting;
    const sprinting = moving && player.sprinting;
    const sliding = moving && player.sliding;
    this.tacticalBlend = THREE.MathUtils.lerp(this.tacticalBlend, tactical ? 1 : 0, Math.min(1, delta * (tactical ? 10 : 14)));
    this.bobTime += delta * (tactical ? 15.5 : (sprinting ? 13 : 8));
    const aimStability = THREE.MathUtils.lerp(1, 0.18, this.aimBlend);
    const bobStrength = moving && player.onGround && !sliding
      ? (tactical ? 0.027 : (sprinting ? 0.018 : 0.009)) * aimStability
      : 0;
    const bobX = Math.cos(this.bobTime) * bobStrength;
    const bobY = Math.abs(Math.sin(this.bobTime)) * bobStrength;
    const breatheY = Math.sin(this.idleTime * 1.7) * THREE.MathUtils.lerp(0.0035, 0.0012, this.aimBlend);
    const aimSway = Math.sin(this.idleTime * 1.25) * 0.0016 * this.aimBlend;
    const tacticalSway = Math.sin(this.bobTime * 0.5) * 0.035 * this.tacticalBlend;

    this.recoil = THREE.MathUtils.lerp(this.recoil, 0, Math.min(1, delta * 13));
    const sprintDrop = (tactical ? 0.14 : (sprinting ? 0.09 : (sliding ? 0.12 : 0))) * (1 - this.aimBlend);
    const equipDrop = (1 - equipEase) * 0.34;
    const adsPosition = model.userData.adsPosition ?? new THREE.Vector3(0, -0.205, -0.62);
    const baseX = THREE.MathUtils.lerp(BASE_POSITION.x, adsPosition.x, this.aimBlend);
    const baseY = THREE.MathUtils.lerp(BASE_POSITION.y, adsPosition.y, this.aimBlend);
    const baseZ = THREE.MathUtils.lerp(BASE_POSITION.z, adsPosition.z, this.aimBlend);
    const targetX = baseX + bobX + aimSway + reloadArc * 0.085 - this.tacticalBlend * 0.11;
    const targetY = baseY - bobY - sprintDrop + breatheY - equipDrop - reloadArc * 0.115;
    const targetZ = baseZ + this.recoil + (sprinting ? 0.04 : 0) + this.tacticalBlend * 0.08 + reloadArc * 0.1;
    this.root.position.x = THREE.MathUtils.lerp(this.root.position.x, targetX, Math.min(1, delta * 14));
    this.root.position.y = THREE.MathUtils.lerp(this.root.position.y, targetY, Math.min(1, delta * 14));
    this.root.position.z = THREE.MathUtils.lerp(this.root.position.z, targetZ, Math.min(1, delta * 18));

    const baseRotX = THREE.MathUtils.lerp(BASE_ROTATION.x, ADS_ROTATION.x, this.aimBlend);
    const baseRotY = THREE.MathUtils.lerp(BASE_ROTATION.y, ADS_ROTATION.y, this.aimBlend);
    const baseRotZ = THREE.MathUtils.lerp(BASE_ROTATION.z, ADS_ROTATION.z, this.aimBlend);
    this.root.rotation.x = THREE.MathUtils.lerp(
      this.root.rotation.x,
      baseRotX - this.recoil * 0.42 + reloadArc * 0.22 + this.tacticalBlend * 1.02,
      Math.min(1, delta * 18),
    );
    this.root.rotation.y = THREE.MathUtils.lerp(
      this.root.rotation.y,
      baseRotY + (1 - equipEase) * 0.48 + reloadArc * 0.2 + tacticalSway,
      Math.min(1, delta * 15),
    );
    this.root.rotation.z = THREE.MathUtils.lerp(
      this.root.rotation.z,
      baseRotZ + bobX * 0.8 - (1 - equipEase) * 0.38 - reloadArc * 0.46 - this.tacticalBlend * 0.2,
      Math.min(1, delta * 12),
    );

    let mode = 'MODO LIVRE · RMB MIRAR';
    let modeState = 'free';
    if (this.reloadRemaining > 0) {
      mode = 'RECARREGANDO · R';
      modeState = 'reload';
    } else if (player.tacticalSprinting) {
      mode = 'CORRIDA TÁTICA';
      modeState = 'tactical';
    } else if (this.aimBlend > 0.6) {
      mode = weapon.categoria === 'sniper' ? 'LUNETA 4× · RMB' : 'MIRA DE FERRO · RMB';
      modeState = 'aim';
    }
    if (mode !== this._lastWeaponMode && this.weaponModeEl) {
      this.weaponModeEl.textContent = mode;
      this.weaponModeEl.dataset.state = modeState;
      this._lastWeaponMode = mode;
    }
  }

  _tryFire() {
    const weapon = this.weapons[this.currentIndex];
    if (!this.enabled
      || !this.currentPlayer?.alive
      || !weapon
      || this.cooldown > 0
      || this.reloadRemaining > 0
      || !this.isPlayerLocked()) return;

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
    model.userData.flash.visible = true;
    model.userData.flash.rotation.z = Math.random() * Math.PI;
    model.userData.flash.scale.setScalar(0.75 + Math.random() * 0.35);
    this.flashRemaining = 0.075;
    this.crosshairEl.classList.add('firing');
    clearTimeout(this.crosshairTimer);
    this.crosshairTimer = setTimeout(() => this.crosshairEl.classList.remove('firing'), 90);

    const pelletCount = weapon.projeteisPorTiro ?? 1;
    const damagePerPellet = weapon.dano / pelletCount;
    let impactPoint = null;
    let closestImpactDistance = Infinity;

    this.camera.getWorldPosition(this.worldOrigin);
    this.raycaster.setFromCamera(CENTER, this.camera);
    const baseDirection = this.raycaster.ray.direction.clone();
    this.cameraRight.set(1, 0, 0).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion()));
    this.cameraUp.set(0, 1, 0).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion()));

    for (let pellet = 0; pellet < pelletCount; pellet++) {
      this.worldDirection.copy(baseDirection);
      const baseSpread = weapon.dispersao ?? 0.004;
      const aimedSpreadFactor = weapon.categoria === 'espingarda' ? 0.64 : 0.28;
      const spread = baseSpread * THREE.MathUtils.lerp(1, aimedSpreadFactor, this.aimBlend);
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
      if (hit) {
        this.inkSystem?.paint(hit, weapon.raioTinta ?? 1);
        closestImpactDistance = Math.min(closestImpactDistance, hit.distance);
        if (!impactPoint || hit.distance < impactPoint.distance) {
          impactPoint = { point: hit.point.clone(), distance: hit.distance };
        }
      }

      if (hit?.object.userData.target) {
        const result = hit.object.userData.target.takeDamage(damagePerPellet, hit.object.userData.hitZone);
        this._showHitmarker(result.killed);
        if (result.killed) {
          this.score++;
          this.scoreEl.textContent = `ABATES ${this.score}`;
        }
      }
    }

    if (impactPoint) this._createImpactBurst(impactPoint.point, inkColor, weapon.categoria === 'espingarda' ? 11 : 7);
    if (Number.isFinite(closestImpactDistance)) this.audio?.playImpact(closestImpactDistance);
    this._updateHud();
  }

  _createImpactBurst(point, color, count) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      const offset = index * 3;
      positions[offset] = point.x;
      positions[offset + 1] = point.y + 0.025;
      positions[offset + 2] = point.z;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.75 + Math.random() * 1.65;
      velocities[offset] = Math.cos(angle) * speed;
      velocities[offset + 1] = 0.55 + Math.random() * 1.6;
      velocities[offset + 2] = Math.sin(angle) * speed;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const burst = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: color ?? 0x188cff,
        size: 0.12,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    burst.frustumCulled = false;
    this.scene.add(burst);
    this.impactBursts.push({ object: burst, velocities, age: 0, life: 0.22 });
  }

  _updateImpactBursts(delta) {
    for (let burstIndex = this.impactBursts.length - 1; burstIndex >= 0; burstIndex--) {
      const burst = this.impactBursts[burstIndex];
      burst.age += delta;
      const positions = burst.object.geometry.attributes.position.array;
      for (let index = 0; index < positions.length; index += 3) {
        positions[index] += burst.velocities[index] * delta;
        positions[index + 1] += burst.velocities[index + 1] * delta;
        positions[index + 2] += burst.velocities[index + 2] * delta;
        burst.velocities[index + 1] -= 8.5 * delta;
      }
      burst.object.geometry.attributes.position.needsUpdate = true;
      burst.object.material.opacity = Math.max(0, 1 - burst.age / burst.life);
      if (burst.age < burst.life) continue;
      this.scene.remove(burst.object);
      burst.object.geometry.dispose();
      burst.object.material.dispose();
      this.impactBursts.splice(burstIndex, 1);
    }
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
      const flashMaterials = model.userData.flashMaterials;
      if (flashMaterials?.[1]) flashMaterials[1].color.copy(color).offsetHSL(0, -0.08, 0.18);
      if (flashMaterials?.[2]) flashMaterials[2].color.copy(color);
      if (model.userData.sightAccent) model.userData.sightAccent.color.copy(color);
    }
  }

  _updateHud() {
    const weapon = this.weapons[this.currentIndex];
    if (!weapon) return;

    this.weaponNameEl.textContent = weapon.nome;
    this.weaponCategoryEl.textContent = CATEGORY_LABELS[weapon.categoria] ?? weapon.categoria.replaceAll('_', ' ').toUpperCase();
    this.ammoEl.innerHTML = `<strong>${String(this.ammo[this.currentIndex]).padStart(2, '0')}</strong><span>/ TANQUE</span>`;

    for (const slot of this.slotsEl.children) {
      const index = Number(slot.dataset.index);
      const capacity = this.weapons[index]?.capacidadeCarregador ?? 1;
      const ratio = THREE.MathUtils.clamp((this.ammo[index] ?? 0) / capacity, 0, 1);
      const meter = slot.querySelector('.slot-meter b');
      if (meter) meter.style.width = `${Math.round(ratio * 100)}%`;
      slot.classList.toggle('empty', ratio <= 0);
    }
  }
}
