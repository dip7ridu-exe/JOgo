import * as THREE from 'three';
import { createMap } from './map.js';
import { PlayerController } from './player.js';
import { WeaponSystem } from './weapons.js';
import { InkSystem } from './ink.js';

const canvas = document.getElementById('game');
const fpsEl = document.getElementById('fps');
const overlay = document.getElementById('overlay');
const overlayMessage = document.getElementById('overlay-message');

async function init() {
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 1000);

    const { obstacles, shootables, mapSize } = createMap(scene);

    let player;
    const ink = new InkSystem(scene, mapSize, () => player?.locked ?? false);
    player = new PlayerController(
      camera,
      renderer.domElement,
      obstacles,
      (x, z) => ink.isOwnInkAt(x, z),
    );
    scene.add(player.object);

    const weapons = new WeaponSystem(camera, scene, shootables, ink, () => player.locked);
    await weapons.init();

    const clock = new THREE.Clock();
    let frames = 0;
    let fpsTimer = 0;

    function animate() {
      requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);
      player.update(delta);
      weapons.update(delta, player);
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
  } catch (error) {
    console.error('Não foi possível iniciar o JOgo:', error);
    overlay.classList.add('error');
    overlayMessage.textContent = 'Falha ao carregar o jogo. Rode o projeto por um servidor local e tente novamente.';
    document.querySelector('.start-hint').textContent = 'VEJA O CONSOLE PARA DETALHES';
  }
}

init();
