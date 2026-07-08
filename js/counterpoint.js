/**
 * First-species counterpoint generator (Issue #7)
 *
 * User records a cantus firmus; algorithm generates an upper counter-melody
 * following simplified Fux-style voice-leading rules.
 */
class SpeciesCounterpoint {
  constructor(audio, piano) {
    this.audio = audio;
    this.piano = piano;

    this.cantus = [];
    this.counter = [];
    this.recording = false;
    this._timers = [];

    this.SCALE = [0, 2, 4, 5, 7, 9, 11];
    this.BACH_CF = [60, 62, 64, 65, 67, 65, 64, 62];
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

  startRecording() {
    this.cantus = [];
    this.counter = [];
    this.recording = true;
    this._setStatus('🔴 Recording cantus firmus — play 6–12 notes, then Stop.');
    this._updateDisplay();
  }

  stopRecording() {
    this.recording = false;
    this._setStatus(`Recorded ${this.cantus.length} notes. Click Generate counterpoint.`);
  }

  loadBachCantus() {
    this.cantus = [...this.BACH_CF];
    this.counter = [];
    this.recording = false;
    this._setStatus('Loaded Bach-style cantus firmus (8 notes).');
    this._updateDisplay();
  }

  noteOn(midiNote) {
    if (this.recording) {
      this.cantus.push(midiNote);
      this._updateDisplay();
    }
    this.audio.noteOn(midiNote, 90);
    this.piano?.pressKey(midiNote, '#7c3aed');
  }

  noteOff(midiNote) {
    this.audio.noteOff(midiNote);
    this.piano?.releaseKey(midiNote);
  }

  _intervalClass(lower, upper) {
    return ((upper - lower) % 12 + 12) % 12;
  }

  _isParallelPerfect(prevCf, prevCt, cf, ct) {
    const prev = this._intervalClass(prevCf, prevCt);
    const curr = this._intervalClass(cf, ct);
    if (prev !== 7 && prev !== 0) return false;
    if (curr !== prev) return false;

    const cfDir = Math.sign(cf - prevCf);
    const ctDir = Math.sign(ct - prevCt);
    return cfDir !== 0 && cfDir === ctDir;
  }

  _candidates(cfNote) {
    const notes = [];
    for (let n = cfNote + 5; n <= cfNote + 16; n++) {
      if (n > 127) break;
      if (!this.SCALE.includes(n % 12)) continue;
      if (n <= cfNote) continue;
      notes.push(n);
    }
    return notes.length ? notes : [cfNote + 12];
  }

  _scoreCandidate(cantus, counter, index, candidate) {
    const cf = cantus[index];
    let score = 0;

    if (candidate <= cf) score -= 50;
    if (index > 0) {
      const prevCf = cantus[index - 1];
      const prevCt = counter[index - 1];
      if (this._isParallelPerfect(prevCf, prevCt, cf, candidate)) return -1000;

      const cfLeap = Math.abs(cf - prevCf);
      const ctLeap = Math.abs(candidate - prevCt);
      const cfDir = Math.sign(cf - prevCf);
      const ctDir = Math.sign(candidate - prevCt);

      if (cfDir !== 0 && ctDir !== 0 && cfDir !== ctDir) score += 4;
      if (ctLeap <= 2) score += 3;
      else if (ctLeap <= 4) score += 1;
      else score -= 2;

      if (cfLeap > 4 && ctLeap > 4) score -= 3;
    } else {
      const startPc = candidate % 12;
      if (startPc === 0 || startPc === 7 || startPc === 4) score += 2;
    }

    const ic = this._intervalClass(cf, candidate);
    if (ic === 7 || ic === 0) score += 2;
    if (ic === 3 || ic === 4) score += 1;
    if (ic === 1 || ic === 6 || ic === 10) score -= 4;

    if (index === cantus.length - 1) {
      if (candidate % 12 === 0) score += 4;
      if (this._intervalClass(cf, candidate) === 7) score += 2;
    }

    return score;
  }

  generate() {
    if (this.cantus.length < 2) {
      this._setStatus('⚠ Need at least 2 cantus notes.');
      return [];
    }

    const counter = [];
    for (let i = 0; i < this.cantus.length; i++) {
      const cf = this.cantus[i];
      let best = null;
      let bestScore = -Infinity;

      for (const cand of this._candidates(cf)) {
        const s = this._scoreCandidate(this.cantus, counter, i, cand);
        if (s > bestScore) {
          bestScore = s;
          best = cand;
        }
      }
      counter.push(best ?? cf + 12);
    }

    this.counter = counter;
    this._setStatus('Generated counter-melody. Click Play both voices.');
    this._updateDisplay();
    return counter;
  }

  playBoth(noteLen = 0.35) {
    if (!this.cantus.length) {
      this._setStatus('Record or load a cantus firmus first.');
      return;
    }
    if (!this.counter.length) this.generate();

    this._clearTimers();
    this.piano?.releaseAll();

    const pairs = this.cantus.map((cf, i) => [cf, this.counter[i]]);
    pairs.forEach(([cf, ct], i) => {
      const delay = i * noteLen * 1000 + 80;
      this._schedule(() => {
        this.audio.noteOn(cf, 85);
        this.audio.noteOn(ct, 70);
        this.piano?.pressKey(cf, '#7c3aed');
        this.piano?.pressKey(ct, '#06b6d4');
        this._schedule(() => {
          this.audio.noteOff(cf);
          this.audio.noteOff(ct);
          this.piano?.releaseKey(cf);
          this.piano?.releaseKey(ct);
        }, noteLen * 1000 - 40);
      }, delay);
    });

    this._setStatus('▶ Playing cantus firmus + counterpoint…');
  }

  _noteName(n) {
    const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return NAMES[n % 12];
  }

  _updateDisplay() {
    const cfEl = document.getElementById('cp-cantus');
    const ctEl = document.getElementById('cp-counter');
    if (cfEl) {
      cfEl.innerHTML = this.cantus.length
        ? this.cantus.map(n => `<span class="seed-note-chip">${this._noteName(n)}</span>`).join(' ')
        : '<span style="color:#475569">No notes yet</span>';
    }
    if (ctEl) {
      ctEl.innerHTML = this.counter.length
        ? this.counter.map(n => `<span class="generated-note-chip">${this._noteName(n)}</span>`).join(' ')
        : '<span style="color:#475569">—</span>';
    }
  }

  _setStatus(msg) {
    const el = document.getElementById('cp-status');
    if (el) el.textContent = msg;
  }

  getExportVoices() {
    return { cantus: [...this.cantus], counter: [...this.counter] };
  }
}
