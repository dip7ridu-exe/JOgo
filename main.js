import * as THREE from 'three';
import { createMap } from './map.js';
import { PlayerController } from './player.js';

const canvas = document.getElementById('game');
const fpsEl = document.getElementById('fps');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const { obstacles } = createMap(scene);

const player = new PlayerController(camera, renderer.domElement, obstacles);
scene.add(player.object);

const clock = new THREE.Clock();
let frames = 0;
let fpsTimer = 0;

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  player.update(delta);
  renderer.render(scene, camera);

  frames++;
  fpsTimer += delta;
  if (fpsTimer >= 0.5) {
    fpsEl.textContent = Math.round(frames / fpsTimer) + ' FPS';
    frames = 0;
    fpsTimer = 0;
  }
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
