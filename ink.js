import * as THREE from 'three';

const TEAM_COLORS = [new THREE.Color(0x22d3ee), new THREE.Color(0xff4f87)];
const TEAM_NAMES = ['CIANO', 'CORAL'];
const SPLAT_LIMIT = 900;
const GRID_SIZE = 84;
const Z_AXIS = new THREE.Vector3(0, 0, 1);

/** Tinta em um único InstancedMesh e placar de território em grade compacta. */
export class InkSystem {
  constructor(scene, mapSize, isPlayerLocked = () => true) {
    this.scene = scene;
    this.mapSize = mapSize;
    this.halfMap = mapSize / 2;
    this.isPlayerLocked = isPlayerLocked;
    this.teamIndex = 0;
    this.nextSplat = 0;
    this.grid = new Uint8Array(GRID_SIZE * GRID_SIZE);
    this.teamCells = [0, 0];

    this._normal = new THREE.Vector3();
    this._position = new THREE.Vector3();
    this._scale = new THREE.Vector3();
    this._quaternion = new THREE.Quaternion();
    this._twist = new THREE.Quaternion();
    this._matrix = new THREE.Matrix4();
    this._normalMatrix = new THREE.Matrix3();
    this._tangent = new THREE.Vector3();
    this._bitangent = new THREE.Vector3();

    const geometry = new THREE.CircleGeometry(1, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    this.splats = new THREE.InstancedMesh(geometry, material, SPLAT_LIMIT);
    this.splats.name = 'tinta-instanciada';
    this.splats.count = 0;
    this.splats.frustumCulled = false;
    this.splats.renderOrder = 4;
    this.splats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.splats);

    this.percentEls = [document.getElementById('cyan-percent'), document.getElementById('coral-percent')];
    this.barEls = [document.getElementById('cyan-bar'), document.getElementById('coral-bar')];
    this.activeTeamEl = document.getElementById('active-team');

    document.addEventListener('keydown', (event) => {
      if (event.code === 'KeyT' && !event.repeat && this.isPlayerLocked()) this.setTeam(1 - this.teamIndex);
    });
    this.setTeam(0);
    this._updateHud();
  }

  getActiveColor() {
    return TEAM_COLORS[this.teamIndex];
  }

  setTeam(index) {
    this.teamIndex = Math.abs(index) % TEAM_COLORS.length;
    document.body.dataset.team = String(this.teamIndex);
    if (this.activeTeamEl) this.activeTeamEl.textContent = `TINTA ${TEAM_NAMES[this.teamIndex]}`;
  }

  isOwnInkAt(x, z) {
    return this.getTeamAt(x, z) === this.teamIndex;
  }

  getTeamAt(x, z) {
    const cell = this._worldToCell(x, z);
    if (!cell) return -1;
    const value = this.grid[cell.y * GRID_SIZE + cell.x];
    return value === 0 ? -1 : value - 1;
  }

  getCoverage() {
    const total = this.grid.length;
    return this.teamCells.map((count) => (count / total) * 100);
  }

  paint(hit, radius = 1) {
    if (!hit?.object?.userData.paintable || !hit.face) return false;

    this._normalMatrix.getNormalMatrix(hit.object.matrixWorld);
    this._normal.copy(hit.face.normal).applyNormalMatrix(this._normalMatrix).normalize();

    const pieces = radius >= 1.5 ? 3 : 2;
    for (let piece = 0; piece < pieces; piece++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = piece === 0 ? 0 : radius * (0.22 + Math.random() * 0.25);
      const pieceRadius = piece === 0 ? radius : radius * (0.22 + Math.random() * 0.2);

      this._position.copy(hit.point).addScaledVector(this._normal, 0.018);
      if (piece > 0) {
        this._tangent.set(1, 0, 0);
        if (Math.abs(this._normal.x) > 0.85) this._tangent.set(0, 0, 1);
        this._tangent.cross(this._normal).normalize();
        this._bitangent.crossVectors(this._normal, this._tangent).normalize();
        this._position
          .addScaledVector(this._tangent, Math.cos(angle) * distance)
          .addScaledVector(this._bitangent, Math.sin(angle) * distance);
      }

      this._quaternion.setFromUnitVectors(Z_AXIS, this._normal);
      this._twist.setFromAxisAngle(Z_AXIS, Math.random() * Math.PI * 2);
      this._quaternion.multiply(this._twist);
      this._scale.set(pieceRadius * (0.82 + Math.random() * 0.32), pieceRadius * (0.72 + Math.random() * 0.4), 1);
      this._matrix.compose(this._position, this._quaternion, this._scale);

      const instance = this.nextSplat;
      this.splats.setMatrixAt(instance, this._matrix);
      this.splats.setColorAt(instance, TEAM_COLORS[this.teamIndex]);
      this.nextSplat = (this.nextSplat + 1) % SPLAT_LIMIT;
      this.splats.count = Math.min(SPLAT_LIMIT, this.splats.count + 1);
    }

    this.splats.instanceMatrix.needsUpdate = true;
    if (this.splats.instanceColor) this.splats.instanceColor.needsUpdate = true;
    if (this._normal.y > 0.68) this._paintTerritory(hit.point.x, hit.point.z, radius);
    return true;
  }

  _paintTerritory(worldX, worldZ, radius) {
    const min = this._worldToCell(worldX - radius, worldZ - radius, true);
    const max = this._worldToCell(worldX + radius, worldZ + radius, true);
    const radiusSq = radius * radius;

    for (let y = min.y; y <= max.y; y++) {
      for (let x = min.x; x <= max.x; x++) {
        const sampleX = ((x + 0.5) / GRID_SIZE) * this.mapSize - this.halfMap;
        const sampleZ = ((y + 0.5) / GRID_SIZE) * this.mapSize - this.halfMap;
        const dx = sampleX - worldX;
        const dz = sampleZ - worldZ;
        if (dx * dx + dz * dz > radiusSq) continue;

        const index = y * GRID_SIZE + x;
        const previous = this.grid[index];
        const next = this.teamIndex + 1;
        if (previous === next) continue;
        if (previous > 0) this.teamCells[previous - 1]--;
        this.grid[index] = next;
        this.teamCells[this.teamIndex]++;
      }
    }
    this._updateHud();
  }

  _worldToCell(x, z, clamp = false) {
    let cellX = Math.floor(((x + this.halfMap) / this.mapSize) * GRID_SIZE);
    let cellY = Math.floor(((z + this.halfMap) / this.mapSize) * GRID_SIZE);
    if (clamp) {
      cellX = THREE.MathUtils.clamp(cellX, 0, GRID_SIZE - 1);
      cellY = THREE.MathUtils.clamp(cellY, 0, GRID_SIZE - 1);
    } else if (cellX < 0 || cellX >= GRID_SIZE || cellY < 0 || cellY >= GRID_SIZE) {
      return null;
    }
    return { x: cellX, y: cellY };
  }

  _updateHud() {
    const coverage = this.getCoverage();
    coverage.forEach((percent, index) => {
      if (this.percentEls[index]) this.percentEls[index].textContent = `${percent.toFixed(1)}%`;
      if (this.barEls[index]) this.barEls[index].style.width = `${percent}%`;
    });
  }
}
