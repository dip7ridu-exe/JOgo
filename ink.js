import * as THREE from 'three';

export const TEAM_COLORS = [new THREE.Color(0x188cff), new THREE.Color(0xff3f9f)];
export const TEAM_NAMES = ['AZUL', 'ROSA'];

const TEAM_CSS = ['#188cff', '#ff3f9f'];
const SURFACE_SPLAT_LIMIT = 520;
const GRID_SIZE = 84;
const PAINT_TEXTURE_SIZE = 256;
const Z_AXIS = new THREE.Vector3(0, 0, 1);

/**
 * A cobertura do chão usa uma CanvasTexture dinâmica e a pontuação usa uma
 * grade Uint8Array. Somente paredes/caixas recebem círculos instanciados.
 * Isso imita o conceito de paint-map sem exigir shaders de Unity no browser.
 */
export class InkSystem {
  constructor(scene, mapSize, isPlayerLocked = () => true) {
    this.scene = scene;
    this.mapSize = mapSize;
    this.halfMap = mapSize / 2;
    this.isPlayerLocked = isPlayerLocked;
    this.teamIndex = 0;
    this.teamListeners = new Set();
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

    this._createSurfaceSplats(scene);
    this._createGroundPaintMap(scene);

    this.percentEls = [document.getElementById('blue-percent'), document.getElementById('pink-percent')];
    this.barEls = [document.getElementById('blue-bar'), document.getElementById('pink-bar')];
    this.activeTeamEl = document.getElementById('active-team');
    this.teamNameEl = document.getElementById('team-name');

    this.setTeam(0);
    this._updateHud();
  }

  _createSurfaceSplats(scene) {
    const geometry = new THREE.CircleGeometry(1, 14);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    this.splats = new THREE.InstancedMesh(geometry, material, SURFACE_SPLAT_LIMIT);
    this.splats.name = 'tinta-vertical-instanciada';
    this.splats.count = 0;
    this.splats.frustumCulled = false;
    this.splats.renderOrder = 4;
    this.splats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.splats);
  }

  _createGroundPaintMap(scene) {
    this.paintCanvas = document.createElement('canvas');
    this.paintCanvas.width = PAINT_TEXTURE_SIZE;
    this.paintCanvas.height = PAINT_TEXTURE_SIZE;
    this.paintContext = this.paintCanvas.getContext('2d', { alpha: true });
    this.paintContext.clearRect(0, 0, PAINT_TEXTURE_SIZE, PAINT_TEXTURE_SIZE);

    this.paintTexture = new THREE.CanvasTexture(this.paintCanvas);
    this.paintTexture.colorSpace = THREE.SRGBColorSpace;
    this.paintTexture.minFilter = THREE.LinearFilter;
    this.paintTexture.magFilter = THREE.LinearFilter;
    this.paintTexture.generateMipmaps = false;

    const overlayMaterial = new THREE.MeshBasicMaterial({
      map: this.paintTexture,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.015,
      toneMapped: false,
    });
    this.groundOverlay = new THREE.Mesh(
      new THREE.PlaneGeometry(this.mapSize, this.mapSize),
      overlayMaterial,
    );
    this.groundOverlay.name = 'mapa-dinamico-de-tinta';
    this.groundOverlay.rotation.x = -Math.PI / 2;
    this.groundOverlay.position.y = 0.026;
    this.groundOverlay.renderOrder = 3;
    this.groundOverlay.frustumCulled = false;
    scene.add(this.groundOverlay);
  }

  getActiveColor() {
    return TEAM_COLORS[this.teamIndex];
  }

  getColor(teamIndex) {
    return TEAM_COLORS[this._normalizeTeam(teamIndex)];
  }

  onTeamChange(listener) {
    this.teamListeners.add(listener);
    listener(this.getActiveColor(), TEAM_NAMES[this.teamIndex], this.teamIndex);
    return () => this.teamListeners.delete(listener);
  }

  setTeam(index) {
    this.teamIndex = this._normalizeTeam(index);
    document.body.dataset.team = String(this.teamIndex);
    if (this.activeTeamEl) this.activeTeamEl.textContent = 'VOCÊ · TIME AZUL';
    if (this.teamNameEl) this.teamNameEl.textContent = TEAM_NAMES[this.teamIndex];
    for (const listener of this.teamListeners) {
      listener(this.getActiveColor(), TEAM_NAMES[this.teamIndex], this.teamIndex);
    }
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

  paint(hit, radius = 1, teamIndex = this.teamIndex) {
    if (!hit?.object?.userData.paintable || !hit.face) return false;
    const team = this._normalizeTeam(teamIndex);

    this._normalMatrix.getNormalMatrix(hit.object.matrixWorld);
    this._normal.copy(hit.face.normal).applyNormalMatrix(this._normalMatrix).normalize();
    if (this._normal.y > 0.68) {
      this.paintGroundAt(hit.point.x, hit.point.z, radius, team);
      return true;
    }

    this._paintVerticalSurface(hit.point, this._normal, radius, team);
    return true;
  }

  paintGroundAt(worldX, worldZ, radius = 1, teamIndex = this.teamIndex) {
    const team = this._normalizeTeam(teamIndex);
    if (!this._worldToCell(worldX, worldZ)) return false;
    this._drawGroundInk(worldX, worldZ, radius, team);
    this._paintTerritory(worldX, worldZ, radius, team);
    return true;
  }

  penalizeTeam(teamIndex, fraction = 0.14, recipientTeam = 1 - teamIndex) {
    const team = this._normalizeTeam(teamIndex);
    const recipient = this._normalizeTeam(recipientTeam);
    const owned = [];
    const value = team + 1;
    for (let index = 0; index < this.grid.length; index++) {
      if (this.grid[index] === value) owned.push(index);
    }
    const transferCount = Math.min(owned.length, Math.max(0, Math.round(owned.length * fraction)));
    for (let cursor = 0; cursor < transferCount; cursor++) {
      const swapIndex = cursor + Math.floor(Math.random() * (owned.length - cursor));
      [owned[cursor], owned[swapIndex]] = [owned[swapIndex], owned[cursor]];
      const index = owned[cursor];
      const x = index % GRID_SIZE;
      const y = Math.floor(index / GRID_SIZE);
      this.grid[index] = recipient + 1;
      this.teamCells[team]--;
      this.teamCells[recipient]++;
      const worldX = ((x + 0.5) / GRID_SIZE) * this.mapSize - this.halfMap;
      const worldZ = ((y + 0.5) / GRID_SIZE) * this.mapSize - this.halfMap;
      this._drawGroundInk(worldX, worldZ, this.mapSize / GRID_SIZE * 0.72, recipient, false);
    }
    this.paintTexture.needsUpdate = true;
    this._updateHud();
    return transferCount;
  }

  reset() {
    this.grid.fill(0);
    this.teamCells[0] = 0;
    this.teamCells[1] = 0;
    this.nextSplat = 0;
    this.splats.count = 0;
    this.splats.instanceMatrix.needsUpdate = true;
    this.paintContext.clearRect(0, 0, PAINT_TEXTURE_SIZE, PAINT_TEXTURE_SIZE);
    this.paintTexture.needsUpdate = true;
    this._updateHud();
  }

  _paintVerticalSurface(point, normal, radius, team) {
    const pieces = radius >= 1.5 ? 3 : 2;
    for (let piece = 0; piece < pieces; piece++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = piece === 0 ? 0 : radius * (0.22 + Math.random() * 0.25);
      const pieceRadius = piece === 0 ? radius : radius * (0.22 + Math.random() * 0.2);

      this._position.copy(point).addScaledVector(normal, 0.018);
      if (piece > 0) {
        this._tangent.set(1, 0, 0);
        if (Math.abs(normal.x) > 0.85) this._tangent.set(0, 0, 1);
        this._tangent.cross(normal).normalize();
        this._bitangent.crossVectors(normal, this._tangent).normalize();
        this._position
          .addScaledVector(this._tangent, Math.cos(angle) * distance)
          .addScaledVector(this._bitangent, Math.sin(angle) * distance);
      }

      this._quaternion.setFromUnitVectors(Z_AXIS, normal);
      this._twist.setFromAxisAngle(Z_AXIS, Math.random() * Math.PI * 2);
      this._quaternion.multiply(this._twist);
      this._scale.set(pieceRadius * (0.82 + Math.random() * 0.32), pieceRadius * (0.72 + Math.random() * 0.4), 1);
      this._matrix.compose(this._position, this._quaternion, this._scale);

      const instance = this.nextSplat;
      this.splats.setMatrixAt(instance, this._matrix);
      this.splats.setColorAt(instance, TEAM_COLORS[team]);
      this.nextSplat = (this.nextSplat + 1) % SURFACE_SPLAT_LIMIT;
      this.splats.count = Math.min(SURFACE_SPLAT_LIMIT, this.splats.count + 1);
    }
    this.splats.instanceMatrix.needsUpdate = true;
    if (this.splats.instanceColor) this.splats.instanceColor.needsUpdate = true;
  }

  _drawGroundInk(worldX, worldZ, radius, team, irregular = true) {
    const x = ((worldX + this.halfMap) / this.mapSize) * PAINT_TEXTURE_SIZE;
    const y = ((worldZ + this.halfMap) / this.mapSize) * PAINT_TEXTURE_SIZE;
    const pixelRadius = Math.max(1.5, (radius / this.mapSize) * PAINT_TEXTURE_SIZE);
    const context = this.paintContext;
    context.save();
    context.fillStyle = TEAM_CSS[team];
    context.globalCompositeOperation = 'source-over';
    context.beginPath();
    context.arc(x, y, pixelRadius, 0, Math.PI * 2);
    context.fill();

    if (irregular) {
      const satellites = radius >= 1.5 ? 5 : 3;
      for (let index = 0; index < satellites; index++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = pixelRadius * (0.62 + Math.random() * 0.52);
        const satelliteRadius = pixelRadius * (0.16 + Math.random() * 0.24);
        context.beginPath();
        context.arc(
          x + Math.cos(angle) * distance,
          y + Math.sin(angle) * distance,
          satelliteRadius,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }
    context.restore();
    this.paintTexture.needsUpdate = true;
  }

  _paintTerritory(worldX, worldZ, radius, team) {
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
        const next = team + 1;
        if (previous === next) continue;
        if (previous > 0) this.teamCells[previous - 1]--;
        this.grid[index] = next;
        this.teamCells[team]++;
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

  _normalizeTeam(index) {
    return Math.abs(Number(index) || 0) % TEAM_COLORS.length;
  }
}
