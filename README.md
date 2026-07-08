# Music and AI — Introduction Slides

Interactive lecture slides built with [reveal.js](https://revealjs.com) covering three paradigms of music AI, each with a live, browser-based demo playable from a MIDI keyboard.

🌐 **Live slides:** <https://alexarje.github.io/Music-AI-introduction>

---

## Contents

| Section | Topic | Interactive Demo |
|---------|-------|-----------------|
| 1 | Rule-Based Approaches | Diatonic Chord Harmoniser |
| 2 | Learning-Based Approaches | Markov-chain Bach continuation + Magenta.js MusicRNN |
| 3 | Evolutionary Approaches | Genetic Algorithm melody evolution |

---

## Running Locally

Just open `index.html` in a modern browser (Chrome or Edge recommended for full Web MIDI API support).

```bash
# Or serve with any static server:
npx serve .
```

> **HTTPS required** for Web MIDI API and Magenta.js model loading.  
> GitHub Pages provides HTTPS automatically.

---

## Playing the Demos

### MIDI Keyboard
Connect any USB MIDI keyboard before opening the page. The browser will request MIDI access permission.

### Computer Keyboard Fallback
If no MIDI keyboard is available, use the QWERTY keyboard:

| Keys | Notes |
|------|-------|
| `Z S X D C V G B H N J M` | C4 C# D D# E F F# G G# A A# B |
| `Q 2 W 3 E R 5 T 6 Y 7 U` | C5 C# D D# E F F# G G# A A# B |
| `↑ / ↓` | Shift octave up / down |

---

## Tech Stack

- **[reveal.js](https://revealjs.com)** — HTML presentation framework
- **[Tone.js](https://tonejs.github.io)** — Web Audio synthesis
- **[Magenta.js](https://magenta.tensorflow.org/js)** — Neural network music (melody_rnn)
- **Web MIDI API** — real-time MIDI keyboard input

---

## GitHub Pages Deployment

The repository is configured to deploy automatically on every push to `main` via GitHub Actions (`.github/workflows/pages.yml`).

To enable GitHub Pages for a fork:

1. Go to **Settings → Pages**
2. Set **Source** to **GitHub Actions**
3. Push to `main` — the workflow will deploy automatically

---

## Contributing

See [Issues](../../issues) for planned improvements and ideas.