/**
 * App — Main Initialization
 *
 * Wires together all the components after Reveal.js is ready.
 * Each demo is lazily activated when the user navigates to its slide.
 */

/* ------------------------------------------------------------------ */
/* Globals (set after DOMContentLoaded)                                 */
/* ------------------------------------------------------------------ */
let audio, midi, kbFallback;
let pitchDetector;
let harmonizer, pianoRB;
let counterpoint, pianoCP;
let markov,     pianoMK;
let neural,     pianoNN;
let pianoGenie, pianoPG;
let evo;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function unlockAudio() {
  if (audio) audio.start().catch(() => {});
}

function killAll() {
  audio?.killAll();
  harmonizer?.allNotesOff();
  pianoRB?.releaseAll();
  pianoCP?.releaseAll();
  pianoMK?.releaseAll();
  pianoNN?.releaseAll();
  pianoPG?.releaseAll();
  markov?.kill();
  neural?.kill();
  counterpoint?.kill();
  evo?.kill();
  pitchDetector?.stop();
  kbFallback?.releaseAllHeld();
  const micBtn = document.getElementById('mic-btn');
  if (micBtn) micBtn.textContent = 'MIC';

  const mkRecord = document.getElementById('mk-record');
  const mkStop = document.getElementById('mk-stop');
  const mkGenerate = document.getElementById('mk-generate');
  if (mkRecord) mkRecord.disabled = false;
  if (mkStop) mkStop.disabled = true;
  if (mkGenerate) mkGenerate.disabled = markov?.notes?.length > 0;

  const nnRecord = document.getElementById('nn-record');
  const nnStop = document.getElementById('nn-stop');
  const nnContinue = document.getElementById('nn-continue');
  if (nnRecord) nnRecord.disabled = false;
  if (nnStop) nnStop.disabled = true;
  if (nnContinue) nnContinue.disabled = !(neural?.seed?.length > 0);

  const evoStart = document.getElementById('evo-start');
  const evoStop = document.getElementById('evo-stop');
  if (evoStart) evoStart.disabled = false;
  if (evoStop) evoStop.disabled = true;

  const cpRecord = document.getElementById('cp-record');
  const cpStop = document.getElementById('cp-stop');
  if (cpRecord) cpRecord.disabled = false;
  if (cpStop) cpStop.disabled = true;
}

/* ------------------------------------------------------------------ */
/* Demo activation (called on slide-change)                             */
/* ------------------------------------------------------------------ */

let activeDemo = null;   // 'rule-based' | 'counterpoint' | 'markov' | 'neural' | 'piano-genie' | 'evo' | null

function activateDemo(name) {
  if (activeDemo === name) return;
  activeDemo = name;

  // Rewire MIDI/keyboard
  midi.noteOnListeners  = [];
  midi.noteOffListeners = [];

  if (name === 'rule-based') {
    midi.onNoteOn ((n, v) => harmonizer.noteOn(n, v));
    midi.onNoteOff(n     => harmonizer.noteOff(n));
    pianoRB.onNoteOn  = (n, v) => { unlockAudio(); harmonizer.noteOn(n, v); };
    pianoRB.onNoteOff =  n     => harmonizer.noteOff(n);
  }

  if (name === 'counterpoint') {
    midi.onNoteOn ((n, v) => { unlockAudio(); counterpoint.noteOn(n, v); });
    midi.onNoteOff(n     => counterpoint.noteOff(n));
    pianoCP.onNoteOn  = (n, v) => { unlockAudio(); counterpoint.noteOn(n, v); };
    pianoCP.onNoteOff =  n     => counterpoint.noteOff(n);
  }

  if (name === 'markov') {
    midi.onNoteOn ((n, v) => markov.noteOn(n, v));
    midi.onNoteOff(n     => markov.noteOff(n));
    pianoMK.onNoteOn  = (n, v) => { unlockAudio(); markov.noteOn(n, v); };
    pianoMK.onNoteOff =  n     => markov.noteOff(n);
  }

  if (name === 'neural') {
    midi.onNoteOn ((n, v) => neural.noteOn(n, v));
    midi.onNoteOff(n     => neural.noteOff(n));
    pianoNN.onNoteOn  = (n, v) => { unlockAudio(); neural.noteOn(n, v); };
    pianoNN.onNoteOff =  n     => neural.noteOff(n);
  }

  if (name === 'piano-genie') {
    midi.onNoteOn  = () => {};
    midi.onNoteOff = () => {};
  }

  if (name === 'evo') {
    // Evolutionary demo doesn't use keyboard input during evolution
    midi.onNoteOn  = () => {};
    midi.onNoteOff = () => {};
  }
}

/* ------------------------------------------------------------------ */
/* Slide-change handler                                                 */
/* ------------------------------------------------------------------ */

function onSlideChanged(event) {
  const section = event.currentSlide;
  const demoId  = section?.dataset?.demo;
  if (demoId) activateDemo(demoId);
}

/* ------------------------------------------------------------------ */
/* Button handlers                                                      */
/* ------------------------------------------------------------------ */

function bindButtons() {
  /* ---- Rule-Based ---- */
  const rbToggle = document.getElementById('rb-toggle');
  const rbKey    = document.getElementById('rb-key');
  const rbMode   = document.getElementById('rb-mode');
  const rbInv    = document.getElementById('rb-inversion');
  const rbAccomp = document.getElementById('rb-accomp');
  const rbPattern= document.getElementById('rb-pattern');
  const rbSplit  = document.getElementById('rb-split');

  if (rbToggle) {
    rbToggle.addEventListener('click', () => {
      unlockAudio();
      const on = harmonizer.toggle();
      rbToggle.textContent = on ? '🎵 Harmonize ON' : '🎵 Harmonize OFF';
      rbToggle.className   = 'btn ' + (on ? 'btn-info' : 'btn-outline');
    });
  }
  if (rbKey)  rbKey.addEventListener('change',  () => harmonizer.setRoot(parseInt(rbKey.value)));
  if (rbMode) rbMode.addEventListener('change', () => harmonizer.setMode(rbMode.value));
  if (rbInv)  rbInv.addEventListener('change',  () => harmonizer.setInversion(parseInt(rbInv.value)));
  if (rbAccomp) rbAccomp.addEventListener('change', () => harmonizer.setAccompEnabled(rbAccomp.value === 'on'));
  if (rbPattern) rbPattern.addEventListener('change', () => harmonizer.setAccompPattern(rbPattern.value));
  if (rbSplit) rbSplit.addEventListener('change', () => harmonizer.setBassSplitNote(parseInt(rbSplit.value)));

  /* ---- Counterpoint ---- */
  const cpRecord = document.getElementById('cp-record');
  const cpStop = document.getElementById('cp-stop');
  const cpBach = document.getElementById('cp-bach');
  const cpGenerate = document.getElementById('cp-generate');
  const cpPlay = document.getElementById('cp-play');

  if (cpRecord) cpRecord.addEventListener('click', () => {
    unlockAudio();
    counterpoint.startRecording();
    cpRecord.disabled = true;
    cpStop.disabled = false;
  });
  if (cpStop) cpStop.addEventListener('click', () => {
    counterpoint.stopRecording();
    cpRecord.disabled = false;
    cpStop.disabled = true;
  });
  if (cpBach) cpBach.addEventListener('click', () => {
    unlockAudio();
    counterpoint.loadBachCantus();
  });
  if (cpGenerate) cpGenerate.addEventListener('click', () => {
    unlockAudio();
    counterpoint.generate();
  });
  if (cpPlay) cpPlay.addEventListener('click', () => {
    unlockAudio();
    counterpoint.playBoth(0.32);
  });
  const cpMidi = document.getElementById('cp-midi');
  if (cpMidi) cpMidi.addEventListener('click', () => {
    const { cantus, counter } = counterpoint.getExportVoices();
    if (!cantus.length) return;
    if (!counter.length) {
      MidiExport.download('cantus-firmus.mid', cantus, 0.32);
    } else {
      MidiExport.downloadDual('counterpoint.mid', cantus, counter, 0.32);
    }
  });

  /* ---- Markov ---- */
  const mkRecord  = document.getElementById('mk-record');
  const mkStop    = document.getElementById('mk-stop');
  const mkGenerate= document.getElementById('mk-generate');
  const mkBach    = document.getElementById('mk-bach');

  if (mkRecord) mkRecord.addEventListener('click', () => {
    unlockAudio();
    markov.startRecording();
    mkRecord.disabled   = true;
    mkStop.disabled     = false;
    mkGenerate.disabled = true;
  });
  if (mkStop) mkStop.addEventListener('click', () => {
    markov.stopRecording();
    mkRecord.disabled   = false;
    mkStop.disabled     = true;
    mkGenerate.disabled = false;
  });
  if (mkGenerate) mkGenerate.addEventListener('click', () => {
    unlockAudio();
    markov.playGenerated();
  });
  if (mkBach) mkBach.addEventListener('click', () => {
    unlockAudio();
    markov.playBachSeed();
  });
  const mkMidi = document.getElementById('mk-midi');
  if (mkMidi) mkMidi.addEventListener('click', () => {
    const notes = markov.getExportMelody();
    if (!notes.length) return;
    MidiExport.download('markov-melody.mid', notes, 0.3);
  });

  /* ---- Neural ---- */
  const nnLoad     = document.getElementById('nn-load');
  const nnRecord   = document.getElementById('nn-record');
  const nnStop     = document.getElementById('nn-stop');
  const nnContinue = document.getElementById('nn-continue');
  const nnBach     = document.getElementById('nn-bach');
  const nnTemp     = document.getElementById('nn-temperature');

  if (nnLoad) nnLoad.addEventListener('click', async () => {
    unlockAudio();
    nnLoad.disabled = true;
    await neural.loadModel();
    nnLoad.disabled = false;
  });
  if (nnRecord) nnRecord.addEventListener('click', () => {
    unlockAudio();
    neural.startRecording();
    nnRecord.disabled   = true;
    nnStop.disabled     = false;
    nnContinue.disabled = true;
  });
  if (nnStop) nnStop.addEventListener('click', () => {
    neural.stopRecording();
    nnRecord.disabled   = false;
    nnStop.disabled     = true;
    nnContinue.disabled = false;
  });
  if (nnContinue) nnContinue.addEventListener('click', async () => {
    unlockAudio();
    const temp = nnTemp ? parseFloat(nnTemp.value) : 1.1;
    nnContinue.disabled = true;
    await neural.continueWith(temp, 24);
    nnContinue.disabled = false;
  });
  if (nnBach) nnBach.addEventListener('click', () => {
    unlockAudio();
    neural.loadBachSeed();
  });
  const nnMidi = document.getElementById('nn-midi');
  if (nnMidi) nnMidi.addEventListener('click', () => {
    const notes = neural.getExportMelody();
    if (!notes.length) return;
    MidiExport.download('neural-melody.mid', notes, 0.35);
  });

  /* ---- Piano Genie ---- */
  document.querySelectorAll('.genie-btn').forEach((btn) => {
    const idx = parseInt(btn.dataset.btn, 10);
    btn.addEventListener('mousedown', () => { unlockAudio(); pianoGenie.pressButton(idx); });
    btn.addEventListener('mouseup', () => pianoGenie.releaseButton(idx));
    btn.addEventListener('mouseleave', () => pianoGenie.releaseButton(idx));
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); unlockAudio(); pianoGenie.pressButton(idx); }, { passive: false });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); pianoGenie.releaseButton(idx); }, { passive: false });
  });
  const pgReset = document.getElementById('pg-reset');
  if (pgReset) pgReset.addEventListener('click', () => pianoGenie.reset());

  /* ---- Evolutionary ---- */
  const evoStart  = document.getElementById('evo-start');
  const evoStop   = document.getElementById('evo-stop');
  const evoPlay   = document.getElementById('evo-play');
  const evoFitnessMode = document.getElementById('evo-fitness-mode');

  if (evoFitnessMode) {
    evoFitnessMode.addEventListener('change', () => evo.setFitnessMode(evoFitnessMode.value));
  }
  document.querySelectorAll('.evo-rate').forEach((btn) => {
    btn.addEventListener('click', () => {
      unlockAudio();
      evo.ratePending(parseInt(btn.dataset.stars, 10));
    });
  });

  if (evoStart) evoStart.addEventListener('click', () => {
    unlockAudio();
    evo.start(100);
    evoStart.disabled = true;
    evoStop.disabled  = false;
    document.getElementById('evo-status').textContent = 'Evolving…';
  });
  if (evoStop) evoStop.addEventListener('click', () => {
    evo.stop();
    evoStart.disabled = false;
    evoStop.disabled  = true;
  });
  if (evoPlay) evoPlay.addEventListener('click', () => {
    unlockAudio();
    evo.playBest(0.3);
  });
  const evoMidi = document.getElementById('evo-midi');
  if (evoMidi) evoMidi.addEventListener('click', () => {
    const notes = evo.getExportMelody();
    if (!notes.length) return;
    MidiExport.download('evolved-melody.mid', notes, 0.32);
  });

  const micBtn = document.getElementById('mic-btn');
  if (micBtn) {
    micBtn.addEventListener('click', async () => {
      unlockAudio();
      const on = await pitchDetector.toggle();
      micBtn.textContent = on ? 'MIC ✓' : 'MIC';
    });
  }

  const killBtn = document.getElementById('kill-all-btn');
  if (killBtn) killBtn.addEventListener('click', killAll);
}

/* ------------------------------------------------------------------ */
/* Circle of Fifths (Issue #12)                                         */
/* ------------------------------------------------------------------ */

function initCircleOfFifths() {
  const svg = document.getElementById('circle-of-fifths');
  const nodes = document.getElementById('cof-nodes');
  const keyEl = document.getElementById('cof-key');
  const chordsEl = document.getElementById('cof-chords');
  if (!svg || !nodes || !keyEl || !chordsEl) return;

  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  // Circle-of-fifths order (pitch classes)
  const ORDER = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

  const cx = 210, cy = 210, r = 170;
  nodes.innerHTML = '';
  ORDER.forEach((pc, i) => {
    const a = (i / ORDER.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-pc', String(pc));

    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', String(x));
    c.setAttribute('cy', String(y));
    c.setAttribute('r', '18');
    c.setAttribute('fill', 'rgba(148,163,184,0.14)');
    c.setAttribute('stroke', 'rgba(148,163,184,0.25)');
    c.setAttribute('stroke-width', '1.5');

    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(y + 5));
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', '12');
    t.setAttribute('font-family', 'system-ui, -apple-system, Segoe UI, Roboto, Arial');
    t.setAttribute('fill', 'currentColor');
    t.textContent = NOTE_NAMES[pc];

    g.appendChild(c);
    g.appendChild(t);
    nodes.appendChild(g);
  });

  const update = () => {
    const rootPc = harmonizer?.rootPc ?? 0;
    const mode = harmonizer?.mode ?? 'major';

    const modeName = mode === 'minor'
      ? 'minor'
      : mode === 'harmonicMinor'
        ? 'harmonic minor'
        : mode === 'wholeTone'
          ? 'whole tone'
          : mode === 'octatonic'
            ? 'octatonic'
            : mode;

    keyEl.textContent = `${NOTE_NAMES[rootPc]} ${modeName}`;

    // Highlight selected key on the circle (by pitch class).
    Array.from(nodes.querySelectorAll('g[data-pc]')).forEach((g) => {
      const pc = parseInt(g.getAttribute('data-pc'), 10);
      const circle = g.querySelector('circle');
      if (!circle) return;
      if (pc === rootPc) {
        circle.setAttribute('fill', 'rgba(6,182,212,0.35)');
        circle.setAttribute('stroke', 'rgba(6,182,212,0.7)');
        circle.setAttribute('stroke-width', '2');
      } else {
        circle.setAttribute('fill', 'rgba(148,163,184,0.14)');
        circle.setAttribute('stroke', 'rgba(148,163,184,0.25)');
        circle.setAttribute('stroke-width', '1.5');
      }
    });

    const degs = harmonizer?.DEGREE_NAMES?.[mode] ?? harmonizer?.DEGREE_NAMES?.major ?? ['I','ii','iii','IV','V','vi','vii°'];
    chordsEl.textContent = degs.join(' ');
  };

  // Update on selector changes (demo controls)
  document.getElementById('rb-key')?.addEventListener('change', update);
  document.getElementById('rb-mode')?.addEventListener('change', update);
  update();
}

/* ------------------------------------------------------------------ */
/* Bootstrap                                                            */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ---- Core services ---- */
  audio     = new AudioEngine();
  midi      = new MIDIHandler();
  audio.midiOut = midi;
  midi.bindStatusButton();
  pitchDetector = new PitchDetector(midi);
  kbFallback= new KeyboardInputFallback(midi);
  kbFallback.enable();

  const midiOk = await midi.init();
  midi._updateOutputButton();
  if (!midiOk) {
    console.info('[App] No MIDI device — using keyboard fallback (Z=C4)');
  }

  /* ---- Rule-Based demo ---- */
  pianoRB   = new PianoKeyboard('piano-rb', { startNote: 48, endNote: 84 });
  harmonizer= new RuleBasedHarmonizer(audio, pianoRB);
  harmonizer.enabled = true;  // on by default

  /* ---- Counterpoint demo ---- */
  pianoCP = new PianoKeyboard('piano-cp', { startNote: 48, endNote: 84 });
  counterpoint = new SpeciesCounterpoint(audio, pianoCP);

  /* ---- Markov demo ---- */
  pianoMK   = new PianoKeyboard('piano-mk', { startNote: 48, endNote: 84 });
  markov    = new MarkovMusicGenerator(audio, pianoMK);

  /* ---- Neural demo ---- */
  pianoNN   = new PianoKeyboard('piano-nn', { startNote: 48, endNote: 84 });
  neural    = new NeuralMusicDemo(audio, pianoNN);

  /* ---- Piano Genie demo ---- */
  pianoPG = new PianoKeyboard('piano-pg', { startNote: 48, endNote: 84 });
  pianoGenie = new PianoGenieDemo(audio);
  pianoGenie.setPiano(pianoPG);

  /* ---- Evolutionary demo ---- */
  evo = new EvolutionaryComposer(audio);

  /* ---- Reveal.js ---- */
  Reveal.initialize({
    hash:           true,
    slideNumber:    'c/t',
    progress:       true,
    controls:       true,
    center:         false,
    transition:     'slide',
    width:          1280,
    height:         720,
    margin:         0.08,
    minScale:       0.2,
    maxScale:       1.6,
    plugins: [ RevealHighlight, RevealNotes ]
  });

  Reveal.on('slidechanged', onSlideChanged);

  // Activate first demo slide if already there
  onSlideChanged({ currentSlide: Reveal.getCurrentSlide() });

  /* ---- Buttons ---- */
  bindButtons();
  initCircleOfFifths();

  /* ---- Unlock audio on first click anywhere ---- */
  document.addEventListener('click', unlockAudio, { once: true });
});
