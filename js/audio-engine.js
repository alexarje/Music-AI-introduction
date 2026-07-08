/**
 * Audio Engine — thin wrapper around Tone.js
 * Provides polyphonic piano-like synthesis.
 */
class AudioEngine {
  constructor() {
    this._started = false;
    this._held    = new Set();  // currently sustained MIDI notes

    // PolySynth with a warm triangle-based tone
    this.synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 16,
      oscillator: { type: 'triangle8' },
      envelope: {
        attack:  0.015,
        decay:   0.15,
        sustain: 0.45,
        release: 1.8
      },
      volume: -10
    });

    const reverb = new Tone.Reverb({ decay: 1.8, wet: 0.18 }).toDestination();
    const eq     = new Tone.EQ3({ low: 2, mid: 0, high: -2 }).connect(reverb);
    this.synth.connect(eq);
  }

  /** Must be called inside a user-gesture handler to unlock AudioContext. */
  async start() {
    if (this._started) return;
    await Tone.start();
    this._started = true;
  }

  /** Convert MIDI note number to frequency (Hz). */
  static midiToFreq(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  /** Convert MIDI note number to Tone.js note string (e.g. "C4"). */
  static midiToName(n) {
    const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    return NAMES[n % 12] + (Math.floor(n / 12) - 1);
  }

  noteOn(midiNote, velocity = 100) {
    if (this._held.has(midiNote)) return;
    this.synth.triggerAttack(
      AudioEngine.midiToFreq(midiNote),
      Tone.now(),
      velocity / 127
    );
    this._held.add(midiNote);
  }

  noteOff(midiNote) {
    if (!this._held.has(midiNote)) return;
    this.synth.triggerRelease(AudioEngine.midiToFreq(midiNote), Tone.now());
    this._held.delete(midiNote);
  }

  /** Play a set of MIDI notes for a given Tone.js duration string. */
  playChord(notes, duration = '2n') {
    const freqs = notes.map(AudioEngine.midiToFreq);
    this.synth.triggerAttackRelease(freqs, duration, Tone.now());
  }

  /**
   * Schedule a sequence of MIDI note numbers.
   * @param {number[]} notes      MIDI note numbers (-1 = rest)
   * @param {number}   noteLen    Duration of each note in seconds
   * @param {number}   [gap=0.03] Gap between notes
   * @param {number}   [startOffset=0.05] Seconds from now to start
   */
  playSequence(notes, noteLen = 0.35, gap = 0.03, startOffset = 0.05) {
    let t = Tone.now() + startOffset;
    notes.forEach(n => {
      if (n >= 0) {
        this.synth.triggerAttackRelease(
          AudioEngine.midiToFreq(n),
          Math.max(0.05, noteLen - gap),
          t
        );
      }
      t += noteLen;
    });
    return t; // returns the end time
  }
}
