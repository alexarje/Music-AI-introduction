# Future Development — Planned Issues

The items below are ready to be created as GitHub Issues.
Copy each block as a new issue at: https://github.com/alexarje/Music-AI-introduction/issues/new

---

## #1 — Add more harmonisation modes (Lydian, Phrygian, Locrian)

**Labels:** enhancement

Expand the rule-based chord harmoniser with additional church modes and exotic scales.

**Current modes:** Major, Minor, Dorian, Mixolydian, Blues

**Proposed additions:**
- Lydian (raised 4th — bright, film-score feel)
- Phrygian (flattened 2nd — dark, flamenco)
- Locrian (diminished tonic)
- Harmonic minor
- Whole-tone scale
- Octatonic / diminished scale

Also add a **chord inversion** option (root / 1st / 2nd inversion) for smoother voice leading.

---

## #2 — Implement two-voice species counterpoint generator

**Labels:** enhancement

Add an interactive demo of first-species counterpoint:
- User plays a *cantus firmus* on the MIDI keyboard
- Algorithm generates a counter-melody following Fux's rules (no parallel 5ths/8ths, contrary motion preferred, etc.)
- Pure JavaScript — no external dependencies

---

## #3 — Add MIDI output — route generated notes to external synthesiser

**Labels:** enhancement

Use the Web MIDI API `MIDIOutput` interface to send generated notes to any hardware synth or DAW connected to the presenter's computer. Better sound quality for a lecture hall than the browser's built-in synthesis.

---

## #4 — Add automatic bass-line + chord accompaniment patterns

**Labels:** enhancement

When the user plays low notes on the keyboard:
1. Identify implied bass note and chord
2. Play chord voicing in the upper register
3. Arpeggiation pattern options: block chords, Alberti bass, walking bass, stride

Directly addresses the "adding chords when playing baseline" use case.

---

## #5 — Integrate Magenta Piano Genie for expressive 8-button demo

**Labels:** enhancement

Piano Genie (Simon et al., NeurIPS 2018) maps 8 coarse buttons to expressive piano notes via a neural network. Add as a demo slide to Section 2.

Reference: https://piano-genie.glitch.me

---

## #6 — Real-time pitch detection from microphone input

**Labels:** enhancement

- Pitch-detect singing/humming via Web Audio API (YIN / autocorrelation algorithm)
- Quantise to MIDI notes
- Feed into any demo (harmoniser, Markov, evolutionary)
- Great for audience participation

---

## #7 — Interactive Circle of Fifths chord progression visualisation

**Labels:** enhancement

SVG/Canvas circle of fifths that:
- Highlights the current key
- Shows diatonic chords with degree labels
- Animates in real-time as the user plays
- Displays common progressions (I–IV–V–I, ii–V–I, etc.)

---

## #8 — Interactive Genetic Algorithm (IGA) with audience ratings

**Labels:** enhancement

Extend the evolutionary demo with a mode where the audience rates melodies (1–5 stars) instead of using the automated fitness function. Modelled on GenJam (Biles 1994). Fitness = average audience rating.

---

## #9 — Export generated melodies as MIDI files

**Labels:** enhancement

Add a 💾 Download MIDI button to each demo panel. Lets users save output for further editing in a DAW. Implement a minimal Type-0 MIDI encoder in JavaScript.

---

## #10 — Mobile-friendly touch keyboard and responsive layout

**Labels:** enhancement

- Responsive CSS so the piano keyboard scales to viewport width
- Touch-friendly minimum key width (≥ 44 px) on phones/tablets
- Test on iOS Safari and Android Chrome

---

## #11 — Add slide about diffusion models for audio (AudioCraft, Stable Audio)

**Labels:** content

Add a slide to Section 2 covering the diffusion model wave in music generation (2022–2024):
- Riffusion (Stable Diffusion on spectrograms)
- AudioCraft / EnCodec (Meta)
- Stable Audio (Stability AI)
- UDIO / Suno (commercial products)

Include a comparison of generation speed, quality, and controllability vs transformer-based systems.

---

## #12 — Add interactive comparison/side-by-side demo slide

**Labels:** enhancement

A single slide where all three paradigms can be compared side-by-side:
- Same seed melody fed to harmoniser, Markov chain, and evolutionary algorithm
- Results played sequentially
- Students can evaluate which they prefer

---
