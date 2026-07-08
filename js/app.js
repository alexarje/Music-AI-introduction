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
let harmonizer, pianoRB;
let markov,     pianoMK;
let neural,     pianoNN;
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
  pianoMK?.releaseAll();
  pianoNN?.releaseAll();
  markov?.kill();
  neural?.kill();
  evo?.kill();
  kbFallback?.releaseAllHeld();

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
}

/* ------------------------------------------------------------------ */
/* Demo activation (called on slide-change)                             */
/* ------------------------------------------------------------------ */

let activeDemo = null;   // 'rule-based' | 'markov' | 'neural' | 'evo' | null

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

  /* ---- Evolutionary ---- */
  const evoStart  = document.getElementById('evo-start');
  const evoStop   = document.getElementById('evo-stop');
  const evoPlay   = document.getElementById('evo-play');

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

  const killBtn = document.getElementById('kill-all-btn');
  if (killBtn) killBtn.addEventListener('click', killAll);
}

/* ------------------------------------------------------------------ */
/* Bootstrap                                                            */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ---- Core services ---- */
  audio     = new AudioEngine();
  midi      = new MIDIHandler();
  midi.bindStatusButton();
  kbFallback= new KeyboardInputFallback(midi);
  kbFallback.enable();

  const midiOk = await midi.init();
  if (!midiOk) {
    console.info('[App] No MIDI device — using keyboard fallback (Z=C4)');
  }

  /* ---- Rule-Based demo ---- */
  pianoRB   = new PianoKeyboard('piano-rb', { startNote: 48, endNote: 84 });
  harmonizer= new RuleBasedHarmonizer(audio, pianoRB);
  harmonizer.enabled = true;  // on by default

  /* ---- Markov demo ---- */
  pianoMK   = new PianoKeyboard('piano-mk', { startNote: 48, endNote: 84 });
  markov    = new MarkovMusicGenerator(audio, pianoMK);

  /* ---- Neural demo ---- */
  pianoNN   = new PianoKeyboard('piano-nn', { startNote: 48, endNote: 84 });
  neural    = new NeuralMusicDemo(audio, pianoNN);

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
    plugins: [ RevealHighlight, RevealNotes ]
  });

  Reveal.on('slidechanged', onSlideChanged);

  // Activate first demo slide if already there
  onSlideChanged({ currentSlide: Reveal.getCurrentSlide() });

  /* ---- Buttons ---- */
  bindButtons();

  /* ---- Unlock audio on first click anywhere ---- */
  document.addEventListener('click', unlockAudio, { once: true });
});
