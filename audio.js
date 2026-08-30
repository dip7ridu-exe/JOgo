/**
 * Audio procedural original para o JOgo.
 *
 * Um unico AudioContext e um pequeno buffer de ruido geram passos, tiros,
 * impactos e recarga sem arquivos externos. Isso mantem o carregamento leve e
 * evita depender de assets com licencas diferentes em cada download.
 */
export class GameAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.enabled = true;
    this.stepSide = 1;
    this.statusEl = document.getElementById('audio-status');

    document.addEventListener('keydown', (event) => {
      if (event.code !== 'KeyM' || event.repeat) return;
      this.enabled = !this.enabled;
      if (this.master && this.context) {
        this.master.gain.setTargetAtTime(this.enabled ? 0.72 : 0, this.context.currentTime, 0.015);
      }
      this._updateStatus();
    });
    this._updateStatus();
  }

  bindUnlock(...elements) {
    const unlock = () => this.unlock();
    for (const element of elements) element?.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock, { passive: true });
  }

  async unlock() {
    if (!this.context) this._createContext();
    if (this.context?.state === 'suspended') await this.context.resume();
    this._updateStatus();
  }

  _createContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      this.enabled = false;
      this._updateStatus('INDISPONIVEL');
      return;
    }

    this.context = new AudioContextClass({ latencyHint: 'interactive' });
    this.master = this.context.createGain();
    this.master.gain.value = this.enabled ? 0.72 : 0;

    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 12;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.16;
    this.master.connect(compressor).connect(this.context.destination);

    const length = Math.floor(this.context.sampleRate * 0.55);
    this.noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const channel = this.noiseBuffer.getChannelData(0);
    let brown = 0;
    for (let index = 0; index < length; index++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.018 * white) / 1.018;
      channel[index] = THREE_SAFE_NOISE(white * 0.72 + brown * 2.2);
    }
  }

  playFootstep({ speed = 1, tactical = false, sliding = false } = {}) {
    if (!this._ready() || sliding) return;
    const now = this.context.currentTime;
    const strength = Math.min(1, 0.42 + speed * 0.045 + (tactical ? 0.18 : 0));
    const pan = this.stepSide * 0.09;
    this.stepSide *= -1;

    this._noiseBurst({
      start: now,
      duration: tactical ? 0.075 : 0.065,
      gain: 0.09 * strength,
      frequency: tactical ? 980 : 760,
      q: 0.72,
      type: 'bandpass',
      pan,
    });
    this._tone({
      start: now,
      duration: 0.075,
      frequency: tactical ? 92 : 76,
      endFrequency: 48,
      gain: 0.075 * strength,
      type: 'triangle',
      pan,
    });
  }

  playLanding(strength = 1) {
    if (!this._ready()) return;
    const now = this.context.currentTime;
    this._noiseBurst({ start: now, duration: 0.11, gain: 0.12 * strength, frequency: 520, q: 0.65 });
    this._tone({ start: now, duration: 0.13, frequency: 84, endFrequency: 38, gain: 0.12 * strength });
  }

  playGunshot(weapon = {}) {
    if (!this._ready()) return;
    const now = this.context.currentTime;
    const profiles = {
      pistola: { crack: 1680, body: 118, noise: 0.18, tail: 0.105 },
      submetralhadora: { crack: 2050, body: 105, noise: 0.14, tail: 0.075 },
      rifle_de_assalto: { crack: 1780, body: 88, noise: 0.2, tail: 0.12 },
      espingarda: { crack: 920, body: 58, noise: 0.32, tail: 0.22 },
      sniper: { crack: 2380, body: 52, noise: 0.3, tail: 0.3 },
    };
    const profile = profiles[weapon.categoria] ?? profiles.pistola;
    const jitter = 0.94 + Math.random() * 0.12;

    this._noiseBurst({
      start: now,
      duration: profile.tail,
      gain: profile.noise,
      frequency: profile.crack * jitter,
      q: 0.55,
      type: 'bandpass',
    });
    this._tone({
      start: now,
      duration: Math.min(0.19, profile.tail),
      frequency: profile.body * jitter,
      endFrequency: profile.body * 0.36,
      gain: weapon.categoria === 'espingarda' || weapon.categoria === 'sniper' ? 0.32 : 0.18,
      type: 'sawtooth',
    });
    this._tone({
      start: now,
      duration: 0.026,
      frequency: profile.crack * 1.7,
      endFrequency: profile.crack * 0.85,
      gain: 0.055,
      type: 'square',
    });
  }

  playImpact(distance = 12) {
    if (!this._ready()) return;
    const now = this.context.currentTime;
    const attenuation = Math.max(0.025, Math.min(0.095, 0.13 - distance * 0.0027));
    this._noiseBurst({ start: now, duration: 0.045, gain: attenuation, frequency: 1450, q: 1.25, type: 'bandpass' });
    this._tone({ start: now, duration: 0.05, frequency: 190, endFrequency: 95, gain: attenuation * 0.55 });
  }

  playDryFire() {
    if (!this._ready()) return;
    const now = this.context.currentTime;
    this._tone({ start: now, duration: 0.035, frequency: 850, endFrequency: 420, gain: 0.045, type: 'square' });
  }

  playReload(stage = 0) {
    if (!this._ready()) return;
    const now = this.context.currentTime;
    if (stage === 0) {
      this._noiseBurst({ start: now, duration: 0.04, gain: 0.035, frequency: 1750, q: 2.2, type: 'bandpass' });
      this._tone({ start: now + 0.045, duration: 0.05, frequency: 610, endFrequency: 310, gain: 0.032, type: 'square' });
      return;
    }
    if (stage === 1) {
      this._noiseBurst({ start: now, duration: 0.065, gain: 0.055, frequency: 720, q: 1.4, type: 'bandpass', pan: -0.08 });
      this._tone({ start: now, duration: 0.075, frequency: 185, endFrequency: 92, gain: 0.045, type: 'triangle', pan: -0.08 });
      return;
    }
    this._noiseBurst({ start: now, duration: 0.045, gain: 0.052, frequency: 2250, q: 2.8, type: 'bandpass', pan: 0.06 });
    this._tone({ start: now + 0.018, duration: 0.055, frequency: 920, endFrequency: 440, gain: 0.04, type: 'square', pan: 0.06 });
  }

  _ready() {
    return Boolean(this.enabled && this.context?.state === 'running' && this.master && this.noiseBuffer);
  }

  _noiseBurst({ start, duration, gain, frequency, q = 0.8, type = 'lowpass', pan = 0 }) {
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = 0.9 + Math.random() * 0.2;

    const filter = this.context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;

    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(Math.max(0.0001, gain), start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    const output = this._createPanner(pan);
    source.connect(filter).connect(envelope).connect(output).connect(this.master);
    source.start(start, Math.random() * 0.12, duration);
    source.stop(start + duration + 0.01);
  }

  _tone({ start, duration, frequency, endFrequency, gain, type = 'sine', pan = 0 }) {
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(18, endFrequency ?? frequency * 0.6), start + duration);

    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(Math.max(0.0001, gain), start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    const output = this._createPanner(pan);
    oscillator.connect(envelope).connect(output).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }

  _createPanner(value) {
    if (typeof this.context.createStereoPanner !== 'function') return this.context.createGain();
    const panner = this.context.createStereoPanner();
    panner.pan.value = value;
    return panner;
  }

  _updateStatus(forcedLabel = null) {
    if (!this.statusEl) return;
    const state = forcedLabel ?? (this.enabled ? (this.context?.state === 'running' ? 'ATIVO' : 'CLIQUE PARA ATIVAR') : 'MUDO');
    this.statusEl.textContent = `SOM ${state} · M`;
    this.statusEl.classList.toggle('muted', !this.enabled);
  }
}

function THREE_SAFE_NOISE(value) {
  return Math.max(-1, Math.min(1, value));
}
