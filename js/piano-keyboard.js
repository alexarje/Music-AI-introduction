/**
 * Piano Keyboard UI Component
 * Renders a clickable piano keyboard and visualises pressed keys.
 */
class PianoKeyboard {
  /**
   * @param {string} containerId
   * @param {object} opts
   * @param {number} [opts.startNote=48]  MIDI note number for first key (C3)
   * @param {number} [opts.endNote=84]    MIDI note number past the last key (C6, exclusive)
   * @param {function} [opts.onNoteOn]    callback(midiNote, velocity)
   * @param {function} [opts.onNoteOff]   callback(midiNote)
   */
  constructor(containerId, opts = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.startNote   = opts.startNote  ?? 48;
    this.endNote     = opts.endNote    ?? 84;
    this.onNoteOn    = opts.onNoteOn   ?? (() => {});
    this.onNoteOff   = opts.onNoteOff  ?? (() => {});
    this.keys        = {};          // midiNote -> DOM element
    this.mouseDown   = false;

    this._buildKeyboard();
    this._bindPointerEvents();
  }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */

  static isBlack(midiNote) {
    return [1, 3, 6, 8, 10].includes(midiNote % 12);
  }

  static noteName(midiNote) {
    const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    return NAMES[midiNote % 12] + (Math.floor(midiNote / 12) - 1);
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                            */
  /* ------------------------------------------------------------------ */

  _buildKeyboard() {
    this.container.innerHTML = '';
    this.container.className = 'piano-keyboard';

    const WHITE_W = 34, WHITE_H = 110;
    const BLACK_W = 20, BLACK_H =  68;

    // Count white keys to set container width
    const whites = [];
    for (let n = this.startNote; n < this.endNote; n++) {
      if (!PianoKeyboard.isBlack(n)) whites.push(n);
    }

    const totalW = whites.length * WHITE_W;
    this.container.style.width  = totalW + 'px';
    this.container.style.height = WHITE_H + 'px';

    // Render white keys first
    whites.forEach((n, idx) => {
      const el = document.createElement('div');
      el.className    = 'piano-key white-key';
      el.style.left   = idx * WHITE_W + 'px';
      el.style.top    = '0';
      el.style.width  = (WHITE_W - 1) + 'px';
      el.style.height = WHITE_H + 'px';
      el.dataset.note = n;
      if (n % 12 === 0) {
        const lbl = document.createElement('span');
        lbl.className   = 'key-label';
        lbl.textContent = PianoKeyboard.noteName(n);
        el.appendChild(lbl);
      }
      this.container.appendChild(el);
      this.keys[n] = el;
    });

    // Render black keys on top
    let whiteIdx = 0;
    for (let n = this.startNote; n < this.endNote; n++) {
      if (!PianoKeyboard.isBlack(n)) {
        whiteIdx++;
      } else {
        const el = document.createElement('div');
        el.className    = 'piano-key black-key';
        el.style.left   = (whiteIdx - 1) * WHITE_W + WHITE_W - BLACK_W / 2 + 'px';
        el.style.top    = '0';
        el.style.width  = BLACK_W + 'px';
        el.style.height = BLACK_H + 'px';
        el.style.zIndex = '2';
        el.dataset.note = n;
        this.container.appendChild(el);
        this.keys[n] = el;
      }
    }
  }

  _bindPointerEvents() {
    const noteFrom = el => el && parseInt(el.dataset.note, 10);

    this.container.addEventListener('mousedown', e => {
      const el = e.target.closest('.piano-key');
      if (!el) return;
      e.preventDefault();
      this.mouseDown = true;
      this.onNoteOn(noteFrom(el), 100);
    });

    this.container.addEventListener('mouseover', e => {
      if (!this.mouseDown) return;
      const el = e.target.closest('.piano-key');
      if (!el) return;
      this.onNoteOn(noteFrom(el), 100);
    });

    this.container.addEventListener('mouseleave', () => {
      if (!this.mouseDown) return;
      this.mouseDown = false;
      Object.keys(this.keys).forEach(n => this.releaseKey(parseInt(n, 10)));
    });

    document.addEventListener('mouseup', () => {
      if (!this.mouseDown) return;
      this.mouseDown = false;
      Object.keys(this.keys).forEach(n => this.releaseKey(parseInt(n, 10)));
    });

    // Touch support
    this.container.addEventListener('touchstart', e => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach(t => {
        const el = document.elementFromPoint(t.clientX, t.clientY)?.closest('.piano-key');
        if (el) this.onNoteOn(noteFrom(el), 100);
      });
    }, { passive: false });

    this.container.addEventListener('touchend', e => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach(t => {
        const el = document.elementFromPoint(t.clientX, t.clientY)?.closest('.piano-key');
        if (el) this.onNoteOff(noteFrom(el));
      });
    }, { passive: false });
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                           */
  /* ------------------------------------------------------------------ */

  pressKey(midiNote, color = '#7c3aed') {
    const el = this.keys[midiNote];
    if (!el) return;
    el.style.backgroundColor = color;
    el.classList.add('pressed');
  }

  releaseKey(midiNote) {
    const el = this.keys[midiNote];
    if (!el) return;
    el.style.backgroundColor = '';
    el.classList.remove('pressed');
  }

  releaseAll() {
    Object.keys(this.keys).forEach(n => this.releaseKey(parseInt(n, 10)));
  }
}
