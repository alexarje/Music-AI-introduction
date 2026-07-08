/**
 * Markov-Chain Music Generator
 *
 * A "learned" statistical model of Bach's C-major Prelude (BWV 846).
 * The transition matrix was derived from the first 16 bars of the piece.
 * This illustrates how simple statistical learning can capture style.
 */
class MarkovMusicGenerator {
  constructor(audio, piano) {
    this.audio  = audio;
    this.piano  = piano;
    this.notes  = [];      // recorded seed notes
    this.recording = false;
    this._timers = [];

    // ---------------------------------------------------------------
    // First-order Markov transition table derived from Bach BWV 846.
    // Keys are MIDI pitch-class (0-11); values are arrays of [pc, weight].
    // ---------------------------------------------------------------
    this.BACH_TRANSITIONS = {
      0:  [[0,4],[2,3],[4,5],[7,3],[9,2],[11,1]],   // C
      2:  [[0,3],[2,2],[4,5],[5,2],[7,4],[9,3]],    // D
      4:  [[2,3],[4,2],[5,5],[7,5],[9,4],[11,2]],   // E
      5:  [[4,3],[5,2],[7,6],[9,5],[11,2],[0,3]],   // F
      7:  [[5,3],[7,2],[9,6],[11,5],[0,4],[2,3]],   // G
      9:  [[7,3],[9,2],[11,5],[0,6],[2,4],[4,3]],   // A
      11: [[9,3],[11,2],[0,7],[2,5],[4,3],[5,2]],   // B
      // Black keys – map to nearest diatonic
      1:  [[0,5],[2,5]],
      3:  [[2,5],[4,5]],
      6:  [[5,5],[7,5]],
      8:  [[7,5],[9,5]],
      10: [[9,5],[11,5]]
    };

    // C major scale notes (2 octaves, centred on C4)
    this.SCALE_NOTES = [60,62,64,65,67,69,71,72,74,76,77,79];

    // Bach-like seed melody (C major prelude pattern)
    this.BACH_SEED = [60,64,67,72,76,67,72,76, 60,65,69,72,77,69,72,77];
  }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */

  _weighted(table) {
    const total = table.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [pc, w] of table) {
      r -= w;
      if (r <= 0) return pc;
    }
    return table[table.length - 1][0];
  }

  _pcToMidi(pc, nearNote = 60) {
    // Find the MIDI note with this pitch class closest to nearNote
    const base   = Math.round((nearNote - pc) / 12) * 12 + pc;
    const candidates = [base - 12, base, base + 12];
    return candidates.reduce((best, c) =>
      Math.abs(c - nearNote) < Math.abs(best - nearNote) ? c : best
    );
  }

  /* ------------------------------------------------------------------ */
  /* Generation                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Generate a melody using the Markov chain.
   * @param {number[]} seed   Seed MIDI notes (uses Bach seed if empty)
   * @param {number}   length Total number of notes to produce
   */
  generate(seed = [], length = 16) {
    const source = seed.length ? seed : [...this.BACH_SEED];
    const result = [...source];
    let   last   = result[result.length - 1];

    while (result.length < length) {
      const pc    = last % 12;
      const table = this.BACH_TRANSITIONS[pc] ?? [[0,1]];
      const nextPc = this._weighted(table);
      const next   = this._pcToMidi(nextPc, last);
      result.push(next);
      last = next;
    }
    return result.slice(0, length);
  }

  /* ------------------------------------------------------------------ */
  /* Recording                                                            */
  /* ------------------------------------------------------------------ */

  startRecording() {
    this.notes     = [];
    this.recording = true;
    this._setStatus('🔴 Recording… play 4–8 notes then click Stop');
  }

  stopRecording() {
    this.recording = false;
    this._setStatus(`Recorded ${this.notes.length} notes. Click Generate to continue.`);
  }

  _schedule(fn, ms) {
    const id = setTimeout(fn, ms);
    this._timers.push(id);
    return id;
  }

  _clearTimers() {
    this._timers.forEach(clearTimeout);
    this._timers = [];
  }

  kill() {
    this.recording = false;
    this._clearTimers();
    this.piano?.releaseAll();
  }

  noteOn(midiNote, velocity = 100) {
    if (this.recording) this.notes.push(midiNote);
    this.audio.noteOn(midiNote, velocity);
    this.piano?.pressKey(midiNote, '#f97316');
  }

  noteOff(midiNote) {
    this.audio.noteOff(midiNote);
    this.piano?.releaseKey(midiNote);
  }

  /* ------------------------------------------------------------------ */
  /* Playback                                                             */
  /* ------------------------------------------------------------------ */

  playGenerated() {
    this._clearTimers();
    const melody = this.generate(this.notes, 24);
    this._showMelody(this.notes, melody.slice(this.notes.length));
    const endTime = this.audio.playSequence(melody, 0.3, 0.04, 0.1);
    this._setStatus('▶ Playing Markov continuation…');
    // Visualise key presses
    melody.forEach((n, i) => {
      const delay = i * 300 + 100;
      this._schedule(() => this.piano?.pressKey(n, i < this.notes.length ? '#f97316' : '#7c3aed'), delay);
      this._schedule(() => this.piano?.releaseKey(n), delay + 270);
    });
    return endTime;
  }

  playBachSeed() {
    this._clearTimers();
    this.notes = [];
    this.audio.playSequence(this.BACH_SEED, 0.25, 0.03, 0.1);
    this.BACH_SEED.forEach((n, i) => {
      this._schedule(() => this.piano?.pressKey(n, '#f97316'), i * 250 + 100);
      this._schedule(() => this.piano?.releaseKey(n), i * 250 + 330);
    });
    this._setStatus('Playing Bach C-Major Prelude seed (16 notes)…');
    this._showMelody(this.BACH_SEED, []);
  }

  /* ------------------------------------------------------------------ */
  /* Display helpers                                                      */
  /* ------------------------------------------------------------------ */

  _setStatus(msg) {
    const el = document.getElementById('markov-status');
    if (el) el.textContent = msg;
  }

  _showMelody(seed, generated) {
    const el = document.getElementById('markov-notes');
    if (!el) return;
    const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    el.innerHTML = '';
    seed.forEach(n => {
      const chip = document.createElement('span');
      chip.className   = 'markov-note';
      chip.textContent = NOTE_NAMES[n % 12];
      el.appendChild(chip);
      el.appendChild(document.createTextNode(' '));
    });
    if (generated.length) {
      const sep = document.createElement('span');
      sep.textContent = '→ ';
      sep.style.color = '#94a3b8';
      el.appendChild(sep);
      generated.forEach(n => {
        const chip = document.createElement('span');
        chip.className   = 'markov-gen';
        chip.textContent = NOTE_NAMES[n % 12];
        el.appendChild(chip);
        el.appendChild(document.createTextNode(' '));
      });
    }
  }
}
