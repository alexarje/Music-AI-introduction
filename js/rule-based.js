/**
 * Rule-Based Chord Harmonizer
 *
 * Demonstrates two classic music-theory algorithms:
 *   1. Diatonic chord harmonizer – adds a full triad to any played note.
 *   2. Bass-line harmonizer      – plays a chord voicing when the user
 *                                  plays a low note (simulated bass).
 */
class RuleBasedHarmonizer {
  constructor(audio, piano) {
    this.audio   = audio;
    this.piano   = piano;
    this.enabled = false;

    // Current settings
    this.rootPc = 0;   // pitch class 0..11  (0 = C)
    this.mode   = 'major';
    this.inversion = 0; // 0 = root, 1 = first, 2 = second

    // Active note → array of all notes playing (including chord tones)
    this._active = new Map();

    // ---- Scale patterns (semitone intervals from root) ----
    this.SCALES = {
      major:    [0, 2, 4, 5, 7, 9, 11],
      minor:    [0, 2, 3, 5, 7, 8, 10],
      dorian:   [0, 2, 3, 5, 7, 9, 10],
      mixo:     [0, 2, 4, 5, 7, 9, 10],
      blues:    [0, 3, 5, 6, 7, 10],
      lydian:   [0, 2, 4, 6, 7, 9, 11],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      locrian:  [0, 1, 3, 5, 6, 8, 10],
      harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
      wholeTone: [0, 2, 4, 6, 8, 10],
      octatonic: [0, 2, 3, 5, 6, 8, 9, 11]
    };

    // Chord intervals for each diatonic scale degree
    this.CHORD_INTERVALS = {
      major: [
        [0, 4, 7],   // I   major
        [0, 3, 7],   // ii  minor
        [0, 3, 7],   // iii minor
        [0, 4, 7],   // IV  major
        [0, 4, 7, 10], // V  dominant 7th
        [0, 3, 7],   // vi  minor
        [0, 3, 6]    // vii° diminished
      ],
      minor: [
        [0, 3, 7],   // i   minor
        [0, 3, 6],   // ii° diminished
        [0, 4, 7],   // III major
        [0, 3, 7],   // iv  minor
        [0, 4, 7],   // V   major (harmonic minor leading tone)
        [0, 4, 7],   // VI  major
        [0, 4, 7]    // VII major
      ],
      dorian: [
        [0, 3, 7],   // i   minor
        [0, 3, 7],   // ii  minor
        [0, 4, 7],   // III major
        [0, 4, 7],   // IV  major
        [0, 3, 7],   // v   minor
        [0, 3, 6],   // vi° diminished
        [0, 4, 7]    // VII major
      ],
      mixo: [
        [0, 4, 7],   // I   major
        [0, 3, 7],   // ii  minor
        [0, 3, 6],   // iii° diminished
        [0, 4, 7],   // IV  major
        [0, 3, 7],   // v   minor
        [0, 3, 7],   // vi  minor
        [0, 4, 7]    // VII major
      ],
      blues: [
        [0, 3, 7],
        [0, 4, 7],
        [0, 3, 7],
        [0, 3, 7],
        [0, 4, 7],
        [0, 3, 7]
      ]
    };

    // Chord degree name labels
    this.DEGREE_NAMES = {
      major: ['I','ii','iii','IV','V','vi','vii°'],
      minor: ['i','ii°','III','iv','V','VI','VII'],
      dorian: ['i','ii','III','IV','v','vi°','VII'],
      mixo: ['I','ii','iii°','IV','v','vi','VII'],
      blues: ['I','II','III','IV','V','VI']
    };

    this.QUALITY_NAMES = {
      major: ['major','minor','minor','major','dom7','minor','diminished'],
      minor: ['minor','diminished','major','minor','major','major','major'],
      dorian: ['minor','minor','major','major','minor','diminished','major'],
      mixo: ['major','minor','diminished','major','minor','minor','major'],
      blues: ['minor','major','minor','minor','major','minor']
    };
  }

  /* ------------------------------------------------------------------ */
  /* Scale / degree helpers                                               */
  /* ------------------------------------------------------------------ */

  _scaleDegree(midiNote) {
    const scale = this.SCALES[this.mode] ?? this.SCALES.major;
    const pc    = ((midiNote - this.rootPc) % 12 + 12) % 12;
    return scale.indexOf(pc);   // -1 = chromatic note (not in scale)
  }

  _applyInversion(chord) {
    const inv = Math.max(0, Math.min(2, this.inversion | 0));
    if (inv === 0 || chord.length < 3) return chord;

    const out = chord.slice();
    for (let i = 0; i < inv && i < out.length; i++) out[i] += 12;
    out.sort((a, b) => a - b);
    return out;
  }

  _triadFromScaleSteps(midiNote) {
    const scale = this.SCALES[this.mode] ?? this.SCALES.major;
    const deg = this._scaleDegree(midiNote);
    if (deg < 0) return [midiNote, midiNote + 4, midiNote + 7];

    const pc = ((midiNote - this.rootPc) % 12 + 12) % 12;
    const step = (i) => scale[(deg + i) % scale.length];

    const pcs = [step(0), step(2), step(4)];
    const notes = [];
    let prev = midiNote - 1;
    pcs.forEach((targetPc) => {
      let d = (targetPc - pc + 12) % 12;
      let n = midiNote + d;
      while (n <= prev) n += 12;
      notes.push(n);
      prev = n;
    });
    return notes;
  }

  _chordFor(midiNote) {
    const degree = this._scaleDegree(midiNote);
    const byMode = this.CHORD_INTERVALS[this.mode];

    if (degree >= 0 && byMode && byMode[degree]) {
      return this._applyInversion(byMode[degree].map(iv => midiNote + iv));
    }

    return this._applyInversion(this._triadFromScaleSteps(midiNote));
  }

  _chordLabel(midiNote) {
    const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const name   = NOTE_NAMES[midiNote % 12];
    const degree = this._scaleDegree(midiNote);
    if (degree < 0) return `${name} (chromatic → major triad)`;

    const degNames = this.DEGREE_NAMES[this.mode];
    const qualName = this.QUALITY_NAMES[this.mode];
    const degLabel = degNames?.[degree] ?? `#${degree + 1}`;
    const qualLabel = qualName?.[degree] ?? 'triad';
    const invLabel = this.inversion === 1 ? ' (1st inv.)' : this.inversion === 2 ? ' (2nd inv.)' : '';
    return `${name} ${qualLabel}${invLabel} — degree ${degLabel}`;
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                           */
  /* ------------------------------------------------------------------ */

  setRoot(pitchClass) { this.rootPc = pitchClass; }
  setMode(mode)       { this.mode   = mode; }
  setInversion(inv)   { this.inversion = Math.max(0, Math.min(2, inv | 0)); }
  toggle()            { this.enabled = !this.enabled; return this.enabled; }

  noteOn(midiNote, velocity = 100) {
    if (!this.enabled) {
      this.audio.noteOn(midiNote, velocity);
      this.piano?.pressKey(midiNote, '#7c3aed');
      return;
    }

    const chord = this._chordFor(midiNote);
    this._active.set(midiNote, chord);

    chord.forEach((n, i) => {
      this.audio.noteOn(n, i === 0 ? velocity : Math.round(velocity * 0.75));
      this.piano?.pressKey(n, i === 0 ? '#7c3aed' : '#06b6d4');
    });

    this._setChordDisplay(this._chordLabel(midiNote));
  }

  noteOff(midiNote) {
    const chord = this._active.get(midiNote) ?? [midiNote];
    chord.forEach(n => {
      this.audio.noteOff(n);
      this.piano?.releaseKey(n);
    });
    this._active.delete(midiNote);
  }

  allNotesOff() {
    this._active.forEach((chord) => {
      chord.forEach(n => {
        this.audio.noteOff(n);
        this.piano?.releaseKey(n);
      });
    });
    this._active.clear();
  }

  _setChordDisplay(text) {
    const el = document.getElementById('rb-chord-name');
    if (el) el.textContent = text;
  }
}
