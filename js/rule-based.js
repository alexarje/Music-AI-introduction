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

    // Active note → array of all notes playing (including chord tones)
    this._active = new Map();

    // ---- Scale patterns (semitone intervals from root) ----
    this.SCALES = {
      major:    [0, 2, 4, 5, 7, 9, 11],
      minor:    [0, 2, 3, 5, 7, 8, 10],
      dorian:   [0, 2, 3, 5, 7, 9, 10],
      mixo:     [0, 2, 4, 5, 7, 9, 10],
      blues:    [0, 3, 5, 6, 7, 10]
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

  _chordFor(midiNote) {
    const degree    = this._scaleDegree(midiNote);
    const intervals = degree >= 0
      ? (this.CHORD_INTERVALS[this.mode] ?? this.CHORD_INTERVALS.major)[degree]
      : [0, 4, 7];              // default to major triad for chromatic notes
    return intervals.map(iv => midiNote + iv);
  }

  _chordLabel(midiNote) {
    const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const name   = NOTE_NAMES[midiNote % 12];
    const degree = this._scaleDegree(midiNote);
    if (degree < 0) return `${name} (chromatic → major triad)`;

    const degNames = this.DEGREE_NAMES[this.mode] ?? this.DEGREE_NAMES.major;
    const qualName = this.QUALITY_NAMES[this.mode] ?? this.QUALITY_NAMES.major;
    return `${name} ${qualName[degree]} — degree ${degNames[degree]}`;
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                           */
  /* ------------------------------------------------------------------ */

  setRoot(pitchClass) { this.rootPc = pitchClass; }
  setMode(mode)       { this.mode   = mode; }
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
