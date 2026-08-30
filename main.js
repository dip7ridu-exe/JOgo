import * as THREE from 'three';
import { createMap } from './map.js';
import { PlayerController } from './player.js';
import { WeaponSystem } from './weapons.js';
import { InkSystem } from './ink.js';
import { GameAudio } from './audio.js';

const canvas = document.getElementById('game');
const fpsEl = document.getElementById('fps');
const overlay = document.getElementById('overlay');
const overlayMessage = document.getElementById('overlay-message');

async function init() {
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    const maxPixelRatio = Math.min(window.devicePixelRatio, window.innerWidth < 900 ? 1.2 : 1.5);
    let pixelRatio = maxPixelRatio;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 1000);

    const { obstacles, shootables, mapSize, spawnPosition } = createMap(scene);
    const audio = new GameAudio();
    audio.bindUnlock(canvas, overlay);

    let player;
    const ink = new InkSystem(scene, mapSize, () => player?.locked ?? false);
    player = new PlayerController(
      camera,
      renderer.domElement,
      obstacles,
      (x, z) => ink.isOwnInkAt(x, z),
      audio,
      spawnPosition,
    );
    scene.add(player.object);

    const weapons = new WeaponSystem(camera, scene, shootables, ink, () => player.locked, audio);
    await weapons.init();

    const clock = new THREE.Clock();
    let frames = 0;
    let fpsTimer = 0;
    let lowFpsSamples = 0;
    let highFpsSamples = 0;
    let firstFrame = true;

    function animate() {
      requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);
      player.update(delta);
      weapons.update(delta, player);
      renderer.render(scene, camera);
      if (firstFrame) {
        // O mapa e estatico: a sombra pode ser reaproveitada nos quadros seguintes.
        renderer.shadowMap.autoUpdate = false;
        firstFrame = false;
      }

      frames++;
      fpsTimer += delta;
      if (fpsTimer >= 0.75) {
        const measuredFps = frames / fpsTimer;
        fpsEl.textContent = Math.round(measuredFps) + ' FPS';
        lowFpsSamples = measuredFps < 44 ? lowFpsSamples + 1 : 0;
        highFpsSamples = measuredFps > 57 ? highFpsSamples + 1 : 0;
        if (lowFpsSamples >= 3 && pixelRatio > 0.8) {
          pixelRatio = Math.max(0.8, pixelRatio - 0.15);
          renderer.setPixelRatio(pixelRatio);
          renderer.setSize(window.innerWidth, window.innerHeight, false);
          lowFpsSamples = 0;
        } else if (highFpsSamples >= 8 && pixelRatio < maxPixelRatio) {
          pixelRatio = Math.min(maxPixelRatio, pixelRatio + 0.05);
          renderer.setPixelRatio(pixelRatio);
          renderer.setSize(window.innerWidth, window.innerHeight, false);
          highFpsSamples = 0;
        }
        frames = 0;
        fpsTimer = 0;
      }
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    });
  } catch (error) {
    console.error('Não foi possível iniciar o JOgo:', error);
    overlay.classList.add('error');
    overlayMessage.textContent = 'Falha ao carregar o jogo. Rode o projeto por um servidor local e tente novamente.';
    document.querySelector('.start-hint').textContent = 'VEJA O CONSOLE PARA DETALHES';
  }
}

init();
