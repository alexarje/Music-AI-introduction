/**
 * Neural Music Demo — Magenta.js MusicRNN
 *
 * Uses Google Magenta's MusicRNN (melody_rnn checkpoint) to continue
 * a seed melody recorded from the MIDI keyboard.
 *
 * Requires @magenta/music loaded via CDN (exposes window.mm).
 */
class NeuralMusicDemo {
  constructor(audio, piano) {
    this.audio     = audio;
    this.piano     = piano;
    this.rnn       = null;
    this.loading   = false;
    this.generating= false;
    this.recording = false;
    this.seed      = [];   // { pitch, startTime, endTime }
    this.seedStep  = 0;    // next start time (in steps of 0.5s)

    // Magenta checkpoint — hosted by Google, requires internet
    this.CHECKPOINT_URL =
      'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn';
  }

  /* ------------------------------------------------------------------ */
  /* Model lifecycle                                                      */
  /* ------------------------------------------------------------------ */

  async loadModel() {
    if (this.rnn || this.loading) return;
    if (typeof mm === 'undefined') {
      this._setStatus('⚠ Magenta.js not loaded — check your internet connection.');
      return;
    }
    this.loading = true;
    this._setStatus('<span class="spinner"></span>Loading neural network (melody_rnn)…');
    try {
      this.rnn = new mm.MusicRNN(this.CHECKPOINT_URL);
      await this.rnn.initialize();
      this._setStatus('✅ Model ready!  Record a seed melody then click <b>Continue</b>.');
    } catch (e) {
      console.error('[Magenta]', e);
      this._setStatus('❌ Failed to load model — see console. Using Markov fallback instead.');
      this.rnn = null;
    }
    this.loading = false;
  }

  /* ------------------------------------------------------------------ */
  /* Recording                                                            */
  /* ------------------------------------------------------------------ */

  startRecording() {
    this.seed      = [];
    this.seedStep  = 0;
    this.recording = true;
    this._setStatus('🔴 Recording… play 4–8 notes then click <b>Stop</b>.');
    this._updateSeedDisplay();
  }

  stopRecording() {
    this.recording = false;
    this._setStatus(`Recorded ${this.seed.length} notes. Click <b>Continue</b> to generate!`);
  }

  noteOn(midiNote, velocity = 100) {
    if (this.recording) {
      this.seed.push({
        pitch:     midiNote,
        startTime: this.seedStep * 0.5,
        endTime:   this.seedStep * 0.5 + 0.5
      });
      this.seedStep++;
      this._updateSeedDisplay();
    }
    this.audio.noteOn(midiNote, velocity);
    this.piano?.pressKey(midiNote, '#f97316');
  }

  noteOff(midiNote) {
    this.audio.noteOff(midiNote);
    this.piano?.releaseKey(midiNote);
  }

  /* ------------------------------------------------------------------ */
  /* Generation                                                           */
  /* ------------------------------------------------------------------ */

  async continueWith(temperature = 1.1, steps = 24) {
    if (this.generating) return;
    if (!this.rnn) {
      this._setStatus('⚠ Model not loaded yet — click <b>Load Model</b> first.');
      return;
    }
    if (this.seed.length === 0) {
      this._setStatus('⚠ No seed recorded — record some notes first!');
      return;
    }

    this.generating = true;
    this._setStatus('<span class="spinner"></span>Generating continuation…');

    try {
      const seedSeq = {
        notes:             this.seed,
        totalTime:         this.seed.length * 0.5,
        tempos:            [{ time: 0, qpm: 120 }],
        timeSignatures:    [{ time: 0, numerator: 4, denominator: 4 }],
        quantizationInfo:  { stepsPerQuarter: 4 }
      };

      const quantized   = mm.sequences.quantizeNoteSequence(seedSeq, 4);
      const continuation = await this.rnn.continueSequence(
        quantized, steps, temperature
      );

      this._setStatus('▶ Playing AI continuation…');
      this._playContinuation(continuation.notes);
    } catch (e) {
      console.error('[Magenta generation]', e);
      this._setStatus('❌ Generation failed — ' + e.message);
    }
    this.generating = false;
  }

  _playContinuation(notes) {
    // Show generated chips
    const cont = document.getElementById('nn-continuation');
    if (cont) {
      const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      cont.innerHTML = notes.map(n =>
        `<span class="generated-note-chip">${NOTE_NAMES[n.pitch % 12]}</span>`
      ).join(' ');
    }

    // Schedule audio + piano highlight
    notes.forEach(n => {
      const startMs = (this.seed.length * 0.5 + n.startTime) * 1000;
      const dur     = Math.max(0.08, n.endTime - n.startTime);
      this.audio.synth.triggerAttackRelease(
        AudioEngine.midiToFreq(n.pitch),
        dur,
        Tone.now() + 0.1 + n.startTime
      );
      setTimeout(() => {
        this.piano?.pressKey(n.pitch, '#7c3aed');
        setTimeout(() => this.piano?.releaseKey(n.pitch), dur * 1000 + 50);
      }, startMs);
    });
  }

  /** Pre-baked Bach-style seed: ascending scale with passing tones. */
  loadBachSeed() {
    this.seed = [60,62,64,65,67,65,64,62].map((p, i) => ({
      pitch:     p,
      startTime: i * 0.5,
      endTime:   i * 0.5 + 0.5
    }));
    this.seedStep = this.seed.length;
    this._updateSeedDisplay();
    this.audio.playSequence(this.seed.map(n => n.pitch), 0.3, 0.04);
    this._setStatus(`Loaded Bach-style seed (8 notes). Click <b>Continue</b>!`);
  }

  /* ------------------------------------------------------------------ */
  /* UI helpers                                                           */
  /* ------------------------------------------------------------------ */

  _setStatus(html) {
    const el = document.getElementById('nn-status');
    if (el) el.innerHTML = html;
  }

  _updateSeedDisplay() {
    const el = document.getElementById('nn-seed');
    if (!el) return;
    const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    el.innerHTML = this.seed.map(n =>
      `<span class="seed-note-chip">${NOTE_NAMES[n.pitch % 12]}</span>`
    ).join(' ') || '<span style="color:#475569">No notes yet</span>';
  }
}
