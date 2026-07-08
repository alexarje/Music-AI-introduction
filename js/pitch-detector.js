/**
 * Real-time pitch detection from microphone (Issue #11)
 * Uses autocorrelation — quantises to nearest MIDI note.
 */
class PitchDetector {
  constructor(midiHandler) {
    this.midi = midiHandler;
    this.active = false;
    this.ctx = null;
    this.analyser = null;
    this.stream = null;
    this._raf = null;
    this._lastNote = null;
    this._lastFire = 0;
  }

  async toggle() {
    if (this.active) {
      this.stop();
      return false;
    }
    return this.start();
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[Pitch] getUserMedia not supported');
      return false;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.ctx = new AudioContext();
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      src.connect(this.analyser);
      this.active = true;
      this._loop();
      return true;
    } catch (e) {
      console.warn('[Pitch] Mic access denied:', e.message);
      return false;
    }
  }

  stop() {
    this.active = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this._lastNote !== null) {
      this.midi.fireNoteOff(this._lastNote);
      this._lastNote = null;
    }
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.ctx?.close();
    this.ctx = null;
  }

  _loop() {
    if (!this.active) return;
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    const freq = this._autoCorrelate(buf, this.ctx.sampleRate);
    if (freq > 0) {
      const midi = Math.round(69 + 12 * Math.log2(freq / 440));
      if (midi >= 0 && midi <= 127) {
        const now = performance.now();
        if (this._lastNote !== midi) {
          if (this._lastNote !== null) this.midi.fireNoteOff(this._lastNote);
          if (now - this._lastFire > 40) {
            this.midi.fireNoteOn(midi, 90);
            this._lastNote = midi;
            this._lastFire = now;
          }
        }
      }
    }
    this._raf = requestAnimationFrame(() => this._loop());
  }

  _autoCorrelate(buf, sampleRate) {
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    if (rms < 0.01) return -1;

    let r1 = 0;
    let r2 = buf.length - 1;
    const thres = 0.2;
    for (let i = 0; i < buf.length / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < buf.length / 2; i++) {
      if (Math.abs(buf[buf.length - i]) < thres) { r2 = buf.length - i; break; }
    }

    const trimmed = buf.slice(r1, r2);
    const size = trimmed.length;
    const c = new Array(size).fill(0);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size - i; j++) c[i] += trimmed[j] * trimmed[j + i];
    }
    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < size; i++) {
      if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    }
    if (maxpos <= 0) return -1;
    return sampleRate / maxpos;
  }
}
