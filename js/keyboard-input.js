/**
 * Computer-Keyboard → MIDI Fallback
 *
 * Maps the QWERTY keyboard to piano notes so users without a MIDI
 * keyboard can still interact with the demos.
 *
 * Layout (inspired by standard DAW keyboard):
 *   Lower row (white keys):  z x c v b n m , . /
 *   Lower row (black keys):  s d   g h j
 *   Upper row (white keys):  q w e r t y u
 *   Upper row (black keys):  2 3   5 6 7
 *
 * z = C4 (MIDI 60)
 */
class KeyboardInputFallback {
  constructor(midiHandler, octaveOffset = 0) {
    this.midi        = midiHandler;
    this.octave      = octaveOffset;  // shift up/down with Z/X
    this.heldKeys    = new Set();

    // key → semitones above C4
    this.MAP = {
      'z': 0,  's': 1,  'x': 2,  'd': 3,  'c': 4,
      'v': 5,  'g': 6,  'b': 7,  'h': 8,  'n': 9,
      'j': 10, 'm': 11, ',': 12, 'l': 13, '.': 14,
      // upper octave
      'q': 12, '2': 13, 'w': 14, '3': 15, 'e': 16,
      'r': 17, '5': 18, 't': 19, '6': 20, 'y': 21,
      '7': 22, 'u': 23
    };

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);
  }

  enable() {
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup',   this._onKeyUp);
  }

  disable() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup',   this._onKeyUp);
  }

  _onKeyDown(e) {
    // Don't interfere with text inputs or reveal.js navigation
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.repeat) return;

    // Octave shift
    if (e.key === 'ArrowUp')   { this.octave = Math.min(this.octave + 1, 3); return; }
    if (e.key === 'ArrowDown') { this.octave = Math.max(this.octave - 1, -3); return; }

    const semitones = this.MAP[e.key.toLowerCase()];
    if (semitones === undefined) return;

    const midiNote = 60 + semitones + this.octave * 12;
    if (midiNote < 0 || midiNote > 127 || this.heldKeys.has(e.key)) return;

    this.heldKeys.add(e.key);
    this.midi.fireNoteOn(midiNote, 100);
  }

  _onKeyUp(e) {
    const semitones = this.MAP[e.key.toLowerCase()];
    if (semitones === undefined) return;

    const midiNote = 60 + semitones + this.octave * 12;
    this.heldKeys.delete(e.key);
    this.midi.fireNoteOff(midiNote);
  }
}
