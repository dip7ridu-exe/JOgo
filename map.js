import * as THREE from 'three';

const MAP_SIZE = 60;
const WALL_HEIGHT = 4;
const WALL_THICKNESS = 1;

/**
 * Cria um mapa de teste simples: chão com grid, 4 paredes no perímetro
 * e algumas caixas espalhadas para testar movimentação e colisão.
 * Retorna { obstacles } — lista de THREE.Box3 usada pelo PlayerController.
 */
export function createMap(scene) {
  const obstacles = [];
  const shootables = [];

  // --- luz e céu ---
  scene.background = new THREE.Color(0x8fc7f2);
  scene.fog = new THREE.Fog(0x8fc7f2, 40, 130);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(30, 45, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  scene.add(sun);

  // --- chão ---
  const groundGeo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x555b63 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.userData.surface = true;
  scene.add(ground);
  shootables.push(ground);

  const grid = new THREE.GridHelper(MAP_SIZE, MAP_SIZE, 0x9aa5b1, 0x6e7680);
  grid.position.y = 0.01;
  scene.add(grid);

  // --- paredes do perímetro (também servem de colisão) ---
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3c });

  function addBoxObstacle(x, y, z, w, h, d, material) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.surface = true;
    scene.add(mesh);
    obstacles.push(new THREE.Box3().setFromObject(mesh));
    shootables.push(mesh);
    return mesh;
  }

  const half = MAP_SIZE / 2;
  addBoxObstacle(0, WALL_HEIGHT / 2, -half, MAP_SIZE + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS, wallMat);
  addBoxObstacle(0, WALL_HEIGHT / 2, half, MAP_SIZE + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS, wallMat);
  addBoxObstacle(-half, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, MAP_SIZE, wallMat);
  addBoxObstacle(half, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, MAP_SIZE, wallMat);

  // --- caixas de teste (cobertura + colisão) ---
  const crateColors = [0xd88b3a, 0x5c9e5c, 0x4a7fb5, 0xb54a4a, 0xc9a227];
  const cratePositions = [
    [6, 4], [-6, -4], [10, -12], [-11, 9],
    [0, -16], [15, 5], [-15, -6], [2, 14],
  ];

  cratePositions.forEach(([x, z], i) => {
    const size = 2 + (i % 3);
    const mat = new THREE.MeshStandardMaterial({ color: crateColors[i % crateColors.length] });
    addBoxObstacle(x, size / 2, z, size, size, size, mat);
  });

  // --- alvos reativos para testar dano, cadência e precisão ---
  const targetPositions = [
    [0, -8], [-9, -16], [10, -20], [-18, 3], [18, -5],
  ];

  targetPositions.forEach(([x, z], index) => {
    const target = createTarget(scene, x, z, index);
    shootables.push(...target.meshes);
  });

  return { obstacles, shootables };
}

function createTarget(scene, x, z, index) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = Math.atan2(-x, 10 - z);
  scene.add(group);

  const accentColors = [0xff5d4a, 0x5de1ff, 0xffc857, 0xb889ff, 0x76e36d];
  const accent = accentColors[index % accentColors.length];
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.55,
    metalness: 0.15,
    emissive: 0x000000,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c232c,
    roughness: 0.72,
    emissive: 0x000000,
  });

  const state = {
    group,
    meshes: [],
    health: 100,
    active: true,
    flashTimer: null,
    takeDamage(amount, hitZone) {
      if (!this.active) return { killed: false, damage: 0 };

      const damage = hitZone === 'head' ? amount * 1.6 : amount;
      this.health -= damage;

      for (const mesh of this.meshes) mesh.material.emissive.setHex(0xffffff);
      clearTimeout(this.flashTimer);
      this.flashTimer = setTimeout(() => {
        for (const mesh of this.meshes) mesh.material.emissive.setHex(0x000000);
      }, 65);

      if (this.health > 0) return { killed: false, damage };

      this.active = false;
      this.group.visible = false;
      setTimeout(() => {
        this.health = 100;
        this.active = true;
        this.group.visible = true;
      }, 1500);
      return { killed: true, damage };
    },
  };

  function addPart(geometry, material, position, hitZone = 'body') {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.target = state;
    mesh.userData.hitZone = hitZone;
    group.add(mesh);
    state.meshes.push(mesh);
    return mesh;
  }

  addPart(new THREE.BoxGeometry(0.9, 1.15, 0.28), bodyMaterial, [0, 1.35, 0]);
  addPart(new THREE.SphereGeometry(0.3, 12, 8), bodyMaterial, [0, 2.2, 0], 'head');
  addPart(new THREE.BoxGeometry(0.14, 0.75, 0.14), darkMaterial, [-0.24, 0.45, 0]);
  addPart(new THREE.BoxGeometry(0.14, 0.75, 0.14), darkMaterial, [0.24, 0.45, 0]);
  addPart(new THREE.CylinderGeometry(0.5, 0.7, 0.16, 12), darkMaterial, [0, 0.08, 0]);

  return state;
}
