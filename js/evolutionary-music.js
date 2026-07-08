/**
 * Evolutionary Music Composer — Genetic Algorithm
 *
 * Evolves a population of melodies using selection, crossover, and mutation.
 * The fitness function rewards musical properties (step-wise motion,
 * good range, variety, and ending on the tonic).
 */
class EvolutionaryComposer {
  constructor(audio) {
    this.audio      = audio;
    this.running    = false;
    this.generation = 0;
    this.popSize    = 24;
    this.length     = 16;
    this.mutRate    = 0.08;
    this.population = [];
    this.best       = null;
    this.bestFit    = 0;
    this.fitHistory = [];
    this.avgHistory = [];

    // C major pentatonic + passing tones — pleasant results without extra rules
    this.POOL = [60,62,64,67,69,72,74,76,79,81,64,67,69,72];
  }

  /* ------------------------------------------------------------------ */
  /* Genetics                                                             */
  /* ------------------------------------------------------------------ */

  _random()  {
    return Array.from({ length: this.length },
      () => this.POOL[Math.floor(Math.random() * this.POOL.length)]
    );
  }

  fitness(mel) {
    let s = 0;

    // 1. Prefer stepwise motion (penalise leaps > minor third)
    for (let i = 1; i < mel.length; i++) {
      const iv = Math.abs(mel[i] - mel[i-1]);
      if      (iv === 0) s += 0.5;  // repetition — small bonus
      else if (iv <= 2)  s += 2.5;  // half/whole step
      else if (iv <= 4)  s += 1.0;  // minor/major third
      else               s -= 0.8;  // large leap
    }

    // 2. Pitch range: ideal is a 6th–10th
    const hi = Math.max(...mel), lo = Math.min(...mel);
    const range = hi - lo;
    s += (range >= 6 && range <= 12) ? 3 : -Math.abs(range - 9) * 0.4;

    // 3. Melodic variety (unique notes used)
    s += Math.min(new Set(mel).size, 8) * 0.4;

    // 4. End on tonic (C = pc 0)
    if (mel[mel.length - 1] % 12 === 0) s += 3;

    // 5. Start on tonic or fifth
    const startPc = mel[0] % 12;
    if (startPc === 0 || startPc === 7) s += 1.5;

    // 6. Arch contour: rise then fall
    const mid   = Math.floor(mel.length / 2);
    const avg1  = mel.slice(0, mid).reduce((a,b) => a+b) / mid;
    const avg2  = mel.slice(mid).reduce((a,b) => a+b) / (mel.length - mid);
    if (avg1 < avg2)     s += 1;  // ascending first half
    else if (avg1 > avg2) s += 1; // descending second half (both ok, penalise neither)

    // 7. Prefer not to start or end on black keys
    const endPc   = mel[mel.length - 1] % 12;
    const blackPcs = [1,3,6,8,10];
    if (!blackPcs.includes(startPc)) s += 0.5;
    if (!blackPcs.includes(endPc))   s += 0.5;

    return Math.max(0, s);
  }

  _select() {
    // Tournament selection (k=3)
    const k = 3;
    let best = null, bestF = -Infinity;
    for (let i = 0; i < k; i++) {
      const cand = this.population[Math.floor(Math.random() * this.population.length)];
      const f    = this.fitness(cand);
      if (f > bestF) { bestF = f; best = cand; }
    }
    return best;
  }

  _crossover(a, b) {
    const pt = 1 + Math.floor(Math.random() * (this.length - 2));
    return [...a.slice(0, pt), ...b.slice(pt)];
  }

  _mutate(mel) {
    return mel.map(n =>
      Math.random() < this.mutRate
        ? this.POOL[Math.floor(Math.random() * this.POOL.length)]
        : n
    );
  }

  _step() {
    const scored = this.population
      .map(m => ({ m, f: this.fitness(m) }))
      .sort((a, b) => b.f - a.f);

    const topF = scored[0].f;
    const avgF = scored.reduce((s, x) => s + x.f, 0) / scored.length;

    if (topF > this.bestFit) {
      this.bestFit = topF;
      this.best    = [...scored[0].m];
    }

    this.fitHistory.push(topF);
    this.avgHistory.push(avgF);

    // Elitism: keep top 2, breed the rest
    const next = [scored[0].m, scored[1].m];
    while (next.length < this.popSize) {
      next.push(this._mutate(this._crossover(this._select(), this._select())));
    }
    this.population = next;
    this.generation++;

    return { top: scored[0].m, topF, avgF };
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                           */
  /* ------------------------------------------------------------------ */

  start(maxGenerations = 80) {
    if (this.running) return;
    this.running    = true;
    this.generation = 0;
    this.bestFit    = 0;
    this.best       = null;
    this.fitHistory = [];
    this.avgHistory = [];
    this.population = Array.from({ length: this.popSize }, () => this._random());

    const tick = () => {
      if (!this.running || this.generation >= maxGenerations) {
        this.running = false;
        this._setStatus(`Evolution complete — Generation ${this.generation}`);
        this._updateBtnState(false);
        return;
      }

      const { top, topF, avgF } = this._step();
      this._updateDisplay(top, topF, avgF);

      // Play the best melody every 10 generations
      if (this.generation % 10 === 0) {
        this.playMelody(top, 0.18);
      }

      setTimeout(tick, 90);
    };

    tick();
  }

  stop() {
    this.running = false;
    this._updateBtnState(false);
  }

  playBest(noteLen = 0.32) {
    if (!this.best) {
      this._setStatus('Start evolution first!');
      return;
    }
    this.playMelody(this.best, noteLen);
  }

  playMelody(mel, noteLen = 0.32) {
    const endTime = this.audio.playSequence(mel, noteLen, 0.04, 0.08);
    mel.forEach((n, i) => {
      const d = i * noteLen * 1000 + 80;
      setTimeout(() => {
        document.querySelectorAll('.piano-key[data-note="' + n + '"]')
          .forEach(el => { el.style.backgroundColor = '#10b981'; });
        setTimeout(() => {
          document.querySelectorAll('.piano-key[data-note="' + n + '"]')
            .forEach(el => {
              el.style.backgroundColor = '';
              el.classList.remove('pressed');
            });
        }, noteLen * 1000 - 50);
      }, d);
    });
    return endTime;
  }

  /* ------------------------------------------------------------------ */
  /* Display                                                              */
  /* ------------------------------------------------------------------ */

  _updateDisplay(top, topF, avgF) {
    const el = id => document.getElementById(id);
    if (el('evo-gen'))     el('evo-gen').textContent     = this.generation;
    if (el('evo-fitness')) el('evo-fitness').textContent = topF.toFixed(1);
    if (el('evo-avg'))     el('evo-avg').textContent     = avgF.toFixed(1);

    this._drawPianoRoll(top);
    this._drawFitnessChart();
  }

  _setStatus(msg) {
    const el = document.getElementById('evo-status');
    if (el) el.textContent = msg;
  }

  _updateBtnState(running) {
    const startBtn = document.getElementById('evo-start');
    const stopBtn  = document.getElementById('evo-stop');
    if (startBtn) startBtn.disabled = running;
    if (stopBtn)  stopBtn.disabled  = !running;
  }

  _drawPianoRoll(mel) {
    const c = document.getElementById('evo-roll');
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#07070f';
    ctx.fillRect(0, 0, W, H);

    if (!mel?.length) return;

    const lo = Math.min(...mel) - 1;
    const hi = Math.max(...mel) + 2;
    const range = hi - lo;
    const nw    = W / mel.length;

    mel.forEach((n, i) => {
      const x = i * nw;
      const y = H - ((n - lo) / range) * H * 0.9 - H * 0.05;
      const h = H / range;

      // Determine if this is a tonic note
      const isTonic = n % 12 === 0;
      ctx.fillStyle = isTonic ? '#10b981' : '#7c3aed';
      ctx.fillRect(x + 1, y, nw - 2, h);

      // Connecting line
      if (i > 0) {
        const px  = (i - 1) * nw + nw / 2;
        const py  = H - ((mel[i-1] - lo) / range) * H * 0.9 - H * 0.05 + h / 2;
        const cx2 = i * nw + nw / 2;
        const cy2 = y + h / 2;
        ctx.strokeStyle = 'rgba(124,58,237,0.4)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(cx2, cy2);
        ctx.stroke();
      }
    });
  }

  _drawFitnessChart() {
    const c = document.getElementById('evo-chart');
    if (!c || this.fitHistory.length < 2) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#07070f';
    ctx.fillRect(0, 0, W, H);

    const maxF  = Math.max(...this.fitHistory, 1);
    const xStep = W / (this.fitHistory.length - 1);

    const drawLine = (hist, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      hist.forEach((f, i) => {
        const x = i * xStep;
        const y = H - (f / maxF) * H * 0.88 - H * 0.05;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawLine(this.avgHistory, '#06b6d4');
    drawLine(this.fitHistory, '#10b981');

    // Legend
    ctx.font = '9px monospace';
    ctx.fillStyle = '#10b981'; ctx.fillText('Best', 4, 12);
    ctx.fillStyle = '#06b6d4'; ctx.fillText('Avg',  4, 23);
  }
}
