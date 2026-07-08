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

## Running locally

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

---

## MishMash – Centre for AI and Creativity

[MishMash](https://mishmash.no/) is a Norwegian national research centre dedicated to exploring the intersection of artificial intelligence and creativity, with a particular focus on music and the arts.

### About MishMash

MishMash was established in 2025 as one of six national AI research centres in Norway, funded by a substantial government grant. The centre is led by the University of Oslo (UiO) in partnership with the University of Agder (UiA), the University of Bergen (UiB), the Norwegian Academy of Music, and many other higher-education and cultural institutions across Norway.

With over 200 researchers from a wide range of fields, MishMash investigates:

- How AI impacts creative processes
- Development of innovative **co-creative AI systems** for music, arts, and culture
- Ethical, cultural, legal, and societal aspects of AI in creative domains
- New AI models for use in music, film, literature, and the broader creative industry

### Relevance to Music and AI

MishMash supports research and development at the frontier of human–AI collaboration in the arts. Activities include artistic performances (such as "AI in the Cathedral" combining music and dance), events, workshops, and fully funded research fellowships (PhD and postdoctoral) in AI and creativity.

For more information, visit [mishmash.no](https://mishmash.no/).
