/**
 * Piano Genie–style 8-button expressive demo (Issue #10)
 * Simplified browser demo inspired by Simon et al. (NeurIPS 2018).
 */
class PianoGenieDemo {
  constructor(audio) {
    this.audio = audio;
    this.piano = null;
    this.latent = 8;
    this._held = new Set();

    // Expressive pitch pool (C4–C6, weighted toward consonance)
    this.POOL = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84, 86];

    // Each button biases movement in latent space
    this.BUTTON_DELTA = [-3, -2, -1, 0, 0, 1, 2, 3];
  }

  setPiano(piano) {
    this.piano = piano;
  }

  pressButton(index) {
    const i = Math.max(0, Math.min(7, index | 0));
    this.latent = Math.max(0, Math.min(this.POOL.length - 1, this.latent + this.BUTTON_DELTA[i]));
    const note = this.POOL[this.latent];
    const vel = 70 + Math.min(40, Math.abs(this.BUTTON_DELTA[i]) * 8 + 10);

    this.audio.noteOn(note, vel);
    this.piano?.pressKey(note, '#f97316');
    this._held.add(note);
    this._setStatus(`Button ${i + 1} → ${this._name(note)} (latent ${this.latent})`);
  }

  releaseButton(index) {
    const notes = [...this._held];
    notes.forEach(n => {
      this.audio.noteOff(n);
      this.piano?.releaseKey(n);
    });
    this._held.clear();
  }

  reset() {
    this.latent = 8;
    this._setStatus('Latent reset — try the 8 buttons for expressive note choices.');
  }

  _name(n) {
    const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return NAMES[n % 12] + (Math.floor(n / 12) - 1);
  }

  _setStatus(msg) {
    const el = document.getElementById('pg-status');
    if (el) el.textContent = msg;
  }
}
