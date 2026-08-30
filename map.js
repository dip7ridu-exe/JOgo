import * as THREE from 'three';

const MAP_SIZE = 72;
const geometryCache = new Map();

/**
 * Arena urbana compacta inspirada na leitura do anexo: quatro conjuntos de
 * predios, corredores laterais, praca central, muros baixos, jardins e grades.
 * A geometria e original e usa materiais/geometrias compartilhados.
 */
export function createMap(scene) {
  const obstacles = [];
  const shootables = [];
  const fenceInstances = [];
  const hedgeInstances = [];
  const windowInstances = [];

  scene.background = new THREE.Color(0xaed8ed);
  scene.fog = new THREE.Fog(0xaed8ed, 46, 116);

  const materials = createMaterials();
  addLighting(scene);
  const addBox = (options) => addStaticBox(scene, obstacles, shootables, options);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE), materials.pavement);
  ground.name = 'piso-da-arena';
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.userData.surface = true;
  ground.userData.paintable = true;
  scene.add(ground);
  shootables.push(ground);

  // Faixas claras fazem os corredores parecerem calcadas sem criar colisores.
  addFloorStrip(scene, 0, -27.5, 60, 4.2, materials.lane);
  addFloorStrip(scene, 0, 27.5, 60, 4.2, materials.lane);
  addFloorStrip(scene, -28, 0, 4, 52, materials.lane);
  addFloorStrip(scene, 28, 0, 4, 52, materials.lane);

  const buildingDefinitions = [
    { x: -17, z: -16, w: 14, d: 9, h: 5.7, wall: materials.cream, roof: materials.blueRoof, accent: materials.blueTrim },
    { x: -22, z: -7.1, w: 5.8, d: 8.3, h: 4.2, wall: materials.warmWall, roof: materials.darkRoof, accent: materials.wood },
    { x: 13.5, z: -15, w: 15, d: 9.2, h: 5.25, wall: materials.greenWall, roof: materials.greenRoof, accent: materials.greenTrim },
    { x: 21, z: -7.2, w: 5.2, d: 7.2, h: 4.35, wall: materials.cream, roof: materials.darkRoof, accent: materials.wood },
    { x: -16.5, z: 15, w: 15, d: 10, h: 4.85, wall: materials.cream, roof: materials.blueRoof, accent: materials.blueTrim },
    { x: -8, z: 21, w: 7, d: 5, h: 3.7, wall: materials.warmWall, roof: materials.wood, accent: materials.darkRoof },
    { x: 14, z: 15, w: 12, d: 10, h: 5.15, wall: materials.cream, roof: materials.blueRoof, accent: materials.blueTrim },
    { x: 21.3, z: 8.3, w: 5.1, d: 5.8, h: 4, wall: materials.greenWall, roof: materials.greenRoof, accent: materials.greenTrim },
  ];
  for (const definition of buildingDefinitions) addBuilding(addBox, windowInstances, definition);

  // Praca central em S: cria confrontos curtos sem fechar as rotas circulares.
  addBox({ x: -3.8, y: 0.72, z: -5.4, w: 8.5, h: 1.44, d: 0.72, material: materials.concrete, name: 'muro-central-norte' });
  addBox({ x: 0.1, y: 0.72, z: -1.7, w: 0.72, h: 1.44, d: 6.8, material: materials.concrete, name: 'muro-central-oeste' });
  addBox({ x: 4.1, y: 0.72, z: 2, w: 8.7, h: 1.44, d: 0.72, material: materials.concrete, name: 'muro-central-sul' });

  // Coberturas deixam cada rota com opcoes de avanco e recuo.
  const coverDefinitions = [
    [-8.2, -4, 2.4, 1.8, 1.6, materials.wood],
    [8.7, -5.1, 2.3, 1.6, 1.8, materials.darkRoof],
    [-7.4, 6.2, 2.1, 1.5, 2.1, materials.greenTrim],
    [8.2, 6.5, 2.6, 1.7, 1.6, materials.wood],
    [-25, -23, 2, 1.5, 2.4, materials.darkRoof],
    [25, 22, 2.1, 1.6, 2.1, materials.greenTrim],
  ];
  coverDefinitions.forEach(([x, z, w, h, d, material], index) => {
    addBox({ x, y: h / 2, z, w, h, d, material, name: `cobertura-${index + 1}` });
  });

  addPlanter(addBox, hedgeInstances, -15.5, -27.6, 12, 1.1, materials);
  addPlanter(addBox, hedgeInstances, 14.5, -27.6, 13, 1.1, materials);
  addPlanter(addBox, hedgeInstances, -15, 27.6, 13, 1.1, materials);
  addPlanter(addBox, hedgeInstances, 15, 27.6, 13, 1.1, materials);
  addPlanter(addBox, hedgeInstances, -28, 8, 1.1, 10, materials);
  addPlanter(addBox, hedgeInstances, 28, -8, 1.1, 10, materials);

  // Perimetro baixo + grade visual instanciada. Um colisor por trecho, nao por barra.
  addFence(addBox, fenceInstances, 'x', -34.2, -34.2, 34.2, materials);
  addFence(addBox, fenceInstances, 'x', 34.2, -34.2, 34.2, materials);
  addFence(addBox, fenceInstances, 'z', -34.2, -34.2, 34.2, materials);
  addFence(addBox, fenceInstances, 'z', 34.2, -34.2, 34.2, materials);

  addInstances(scene, fenceInstances, new THREE.BoxGeometry(0.1, 2.15, 0.1), materials.fence, 'barras-da-grade');
  addInstances(scene, hedgeInstances, new THREE.BoxGeometry(1, 1, 1), materials.hedge, 'vegetacao-instanciada');
  addInstances(scene, windowInstances, new THREE.BoxGeometry(1, 1, 0.04), materials.window, 'janelas-instanciadas');

  return {
    obstacles,
    shootables,
    mapSize: MAP_SIZE,
    spawnPosition: new THREE.Vector3(0, 1.7, 27.8),
    botSpawnPosition: new THREE.Vector3(0, 0, -27.4),
    botWaypoints: [
      [0, -27.4], [0, -25.5], [23, -25.5], [26.75, -25.5], [26.75, -20.5],
      [26.75, 0], [26.75, 20.5], [26.75, 25.5], [4, 25.5], [4, 8], [0, 8],
      [0, 25.5], [-23, 25.5], [-26.75, 25.5], [-26.75, 20.5], [-26.75, 0],
      [-26.75, -20.5], [-26.75, -25.5], [-6, -25.5], [-6, -7], [4, -7],
      [4, -25.5], [0, -25.5],
    ].map(([x, z]) => new THREE.Vector3(x, 0, z)),
  };
}

function createMaterials() {
  const pavementTexture = createPavementTexture();
  return {
    pavement: new THREE.MeshStandardMaterial({ map: pavementTexture, color: 0xc98262, roughness: 0.96 }),
    lane: new THREE.MeshStandardMaterial({ color: 0x65717a, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -1 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xd9ceb0, roughness: 0.82 }),
    warmWall: new THREE.MeshStandardMaterial({ color: 0x9a6048, roughness: 0.88 }),
    greenWall: new THREE.MeshStandardMaterial({ color: 0x6f826c, roughness: 0.86 }),
    blueRoof: new THREE.MeshStandardMaterial({ color: 0x315f78, roughness: 0.64, metalness: 0.18 }),
    blueTrim: new THREE.MeshStandardMaterial({ color: 0x183e58, roughness: 0.56, metalness: 0.25 }),
    greenRoof: new THREE.MeshStandardMaterial({ color: 0x8ba733, roughness: 0.7 }),
    greenTrim: new THREE.MeshStandardMaterial({ color: 0x465b35, roughness: 0.72 }),
    darkRoof: new THREE.MeshStandardMaterial({ color: 0x34434b, roughness: 0.64, metalness: 0.2 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x76513b, roughness: 0.88 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xa7a79b, roughness: 0.94 }),
    planter: new THREE.MeshStandardMaterial({ color: 0xb4b09d, roughness: 0.9 }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x729b49, roughness: 1, flatShading: true }),
    fence: new THREE.MeshStandardMaterial({ color: 0x263a3c, roughness: 0.55, metalness: 0.48 }),
    window: new THREE.MeshStandardMaterial({ color: 0x7ec2ce, emissive: 0x10282e, emissiveIntensity: 0.18, roughness: 0.32, metalness: 0.18 }),
  };
}

function addLighting(scene) {
  scene.add(new THREE.HemisphereLight(0xf5fbff, 0x51605a, 1.45));
  const sun = new THREE.DirectionalLight(0xfff5df, 1.85);
  sun.position.set(28, 48, 18);
  sun.castShadow = true;
  const shadowSize = window.innerWidth < 900 ? 512 : 1024;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 95;
  sun.shadow.bias = -0.00025;
  scene.add(sun);
}

function addStaticBox(scene, obstacles, shootables, {
  x, y, z, w, h, d, material, name = 'estrutura', collider = true, paintable = true, castShadow = true,
}) {
  const key = `${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}`;
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(w, h, d);
    geometryCache.set(key, geometry);
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  mesh.userData.surface = true;
  mesh.userData.paintable = paintable;
  mesh.updateMatrixWorld(true);
  if (collider) obstacles.push(new THREE.Box3().setFromObject(mesh));
  if (paintable) shootables.push(mesh);
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  return mesh;
}

function addFloorStrip(scene, x, z, width, depth, material) {
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  strip.position.set(x, 0.012, z);
  strip.rotation.x = -Math.PI / 2;
  strip.receiveShadow = true;
  strip.updateMatrix();
  strip.matrixAutoUpdate = false;
  scene.add(strip);
}

function addBuilding(addBox, windowInstances, { x, z, w, d, h, wall, roof, accent }) {
  addBox({ x, y: h / 2, z, w, h, d, material: wall, name: 'predio' });
  addBox({ x, y: h + 0.18, z, w: w + 0.34, h: 0.36, d: d + 0.34, material: roof, name: 'telhado', collider: false });
  addBox({ x, y: 0.48, z: z + d / 2 + 0.12, w: Math.min(3.2, w * 0.32), h: 0.96, d: 0.24, material: accent, name: 'entrada', collider: false });

  const frontCount = Math.max(2, Math.floor(w / 3.2));
  for (let index = 0; index < frontCount; index++) {
    const offset = THREE.MathUtils.lerp(-w * 0.35, w * 0.35, index / (frontCount - 1));
    pushInstance(windowInstances, x + offset, Math.min(2.55, h * 0.57), z + d / 2 + 0.03, 1.25, 1.05, 1, 0);
  }
  const sideCount = Math.max(2, Math.floor(d / 3.4));
  for (let index = 0; index < sideCount; index++) {
    const offset = THREE.MathUtils.lerp(-d * 0.3, d * 0.3, index / (sideCount - 1));
    pushInstance(windowInstances, x + w / 2 + 0.03, Math.min(2.55, h * 0.57), z + offset, 1.15, 1, 1, Math.PI / 2);
  }
}

function addPlanter(addBox, hedgeInstances, x, z, width, depth, materials) {
  addBox({ x, y: 0.28, z, w: width, h: 0.56, d: depth, material: materials.planter, name: 'jardineira' });
  const horizontal = width >= depth;
  const length = horizontal ? width : depth;
  const count = Math.max(1, Math.floor(length / 1.15));
  for (let index = 0; index < count; index++) {
    const offset = THREE.MathUtils.lerp(-length * 0.43, length * 0.43, count === 1 ? 0.5 : index / (count - 1));
    pushInstance(
      hedgeInstances,
      x + (horizontal ? offset : 0),
      0.78 + (index % 2) * 0.05,
      z + (horizontal ? 0 : offset),
      horizontal ? 0.95 : 0.78,
      0.7 + (index % 3) * 0.05,
      horizontal ? 0.78 : 0.95,
      0,
    );
  }
}

function addFence(addBox, instances, axis, coordinate, start, end, materials) {
  const horizontal = axis === 'x';
  const length = end - start;
  const x = horizontal ? 0 : coordinate;
  const z = horizontal ? coordinate : 0;
  addBox({
    x,
    y: 0.28,
    z,
    w: horizontal ? length : 0.62,
    h: 0.56,
    d: horizontal ? 0.62 : length,
    material: materials.concrete,
    name: 'base-da-grade',
  });
  for (let cursor = start; cursor <= end + 0.001; cursor += 1.22) {
    pushInstance(instances, horizontal ? cursor : coordinate, 1.58, horizontal ? coordinate : cursor, 1, 1, 1, 0);
  }
  for (const height of [0.92, 1.72, 2.35]) {
    addBox({
      x,
      y: height,
      z,
      w: horizontal ? length : 0.1,
      h: 0.1,
      d: horizontal ? 0.1 : length,
      material: materials.fence,
      name: 'travessa-da-grade',
      collider: false,
      paintable: false,
      castShadow: false,
    });
  }
}

function pushInstance(collection, x, y, z, sx, sy, sz, rotationY) {
  const matrix = new THREE.Matrix4();
  matrix.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0)),
    new THREE.Vector3(sx, sy, sz),
  );
  collection.push(matrix);
}

function addInstances(scene, matrices, geometry, material, name) {
  if (matrices.length === 0) return;
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  scene.add(mesh);
}

function createPavementTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = '#bd765c';
  context.fillRect(0, 0, 64, 64);
  context.strokeStyle = 'rgba(255,235,215,.22)';
  context.lineWidth = 1;
  for (let y = 0; y <= 64; y += 8) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(64, y);
    context.stroke();
  }
  for (let row = 0; row < 8; row++) {
    const offset = row % 2 ? 8 : 0;
    for (let x = offset; x <= 64; x += 16) {
      context.beginPath();
      context.moveTo(x, row * 8);
      context.lineTo(x, row * 8 + 8);
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}
