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
  scene.add(ground);

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
    scene.add(mesh);
    obstacles.push(new THREE.Box3().setFromObject(mesh));
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

  return { obstacles };
}
