/* ============================================================
   plot.js — mini motore di grafici interattivi su canvas
   Nessuna dipendenza. Legge i colori dal tema CSS corrente,
   quindi funziona sia in light sia in dark mode.
   ============================================================ */
(function (global) {
  'use strict';

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  const PALETTE = () => ({
    accent: cssVar('--accent', '#1f5fa8'),
    text:   cssVar('--text', '#16181d'),
    muted:  cssVar('--text-muted', '#5c6370'),
    faint:  cssVar('--text-faint', '#8a919e'),
    border: cssVar('--border', '#dcdfe6'),
    grid:   cssVar('--border', '#dcdfe6'),
    ok:     cssVar('--ok', '#1c7a4e'),
    warn:   cssVar('--warn', '#a8690a'),
    danger: cssVar('--danger', '#b3261e'),
    purple: cssVar('--purple', '#6b3fa0'),
    bg:     cssVar('--bg-elev', '#ffffff'),
    sunken: cssVar('--bg-sunken', '#eef0f4')
  });

  /** Tick "belli": 1, 2, 2.5, 5 × 10^k */
  function niceTicks(min, max, target) {
    const span = max - min;
    if (!(span > 0)) return [];
    const raw = span / (target || 8);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    let step;
    if (norm < 1.5) step = 1;
    else if (norm < 3) step = 2;
    else if (norm < 7) step = 5;
    else step = 10;
    step *= mag;
    const out = [];
    const start = Math.ceil(min / step) * step;
    for (let v = start; v <= max + step * 1e-9; v += step) {
      out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    }
    return out;
  }

  function fmt(v, step) {
    if (v === 0) return '0';
    const dec = Math.max(0, -Math.floor(Math.log10(Math.abs(step || 1))) );
    let s = v.toFixed(Math.min(dec, 6));
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  class Plot {
    constructor(canvas, opts) {
      opts = opts || {};
      this.cv = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
      if (!this.cv) throw new Error('plot: canvas non trovato');
      this.ctx = this.cv.getContext('2d');

      this.xmin = opts.xmin !== undefined ? opts.xmin : -5;
      this.xmax = opts.xmax !== undefined ? opts.xmax : 5;
      this.ymin = opts.ymin !== undefined ? opts.ymin : -3;
      this.ymax = opts.ymax !== undefined ? opts.ymax : 3;

      this.height = opts.height || 300;
      this.aspect = opts.aspect || null;      // se impostato, altezza = larghezza/aspect
      this.equal  = !!opts.equal;             // scala isometrica (piano complesso)
      this.pad = Object.assign({ l: 42, r: 14, t: 14, b: 30 }, opts.pad || {});
      this.showGrid = opts.grid !== false;
      this.showAxes = opts.axes !== false;
      this.xlabel = opts.xlabel || '';
      this.ylabel = opts.ylabel || '';
      this.xticks = opts.xticks || null;      // array custom [{v,label}] oppure numeri
      this.yticks = opts.yticks || null;

      this._drawFn = null;
      this._ro = null;
      this._resize();

      const self = this;
      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(() => { self._resize(); self.redraw(); });
        this._ro.observe(this.cv.parentElement || this.cv);
      } else {
        global.addEventListener('resize', () => { self._resize(); self.redraw(); });
      }
      Plot._instances.push(this);
    }

    _resize() {
      const parent = this.cv.parentElement;
      const cssW = Math.max(220, (parent ? parent.clientWidth : 600));
      let cssH = this.height;
      if (this.aspect) cssH = Math.round(cssW / this.aspect);
      cssH = Math.max(140, cssH);
      const dpr = global.devicePixelRatio || 1;
      this.cv.style.width = '100%';
      this.cv.style.height = cssH + 'px';
      this.cv.width = Math.round(cssW * dpr);
      this.cv.height = Math.round(cssH * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.W = cssW; this.H = cssH;
      this.pw = this.W - this.pad.l - this.pad.r;
      this.ph = this.H - this.pad.t - this.pad.b;
      if (this.equal) this._applyEqual();
    }

    _applyEqual() {
      // adatta ymin/ymax in modo che 1 unità x = 1 unità y
      const cx = (this.xmin + this.xmax) / 2;
      const cy = (this.ymin + this.ymax) / 2;
      const scale = this.pw / (this.xmax - this.xmin);
      const halfY = (this.ph / scale) / 2;
      this.ymin = cy - halfY; this.ymax = cy + halfY;
    }

    setWindow(w) {
      if (w.xmin !== undefined) this.xmin = w.xmin;
      if (w.xmax !== undefined) this.xmax = w.xmax;
      if (w.ymin !== undefined) this.ymin = w.ymin;
      if (w.ymax !== undefined) this.ymax = w.ymax;
      if (this.equal) this._applyEqual();
      return this;
    }

    /* --- trasformazioni --- */
    X(x) { return this.pad.l + (x - this.xmin) / (this.xmax - this.xmin) * this.pw; }
    Y(y) { return this.pad.t + (this.ymax - y) / (this.ymax - this.ymin) * this.ph; }
    invX(px) { return this.xmin + (px - this.pad.l) / this.pw * (this.xmax - this.xmin); }
    invY(py) { return this.ymax - (py - this.pad.t) / this.ph * (this.ymax - this.ymin); }

    col(c) {
      const p = PALETTE();
      return p[c] || c || p.accent;
    }

    /* --- ciclo di disegno --- */
    draw(fn) { this._drawFn = fn; this.redraw(); return this; }
    redraw() {
      if (!this._drawFn) return;
      this.clear();
      this._drawFn(this);
    }

    clear() {
      const p = PALETTE();
      this.ctx.save();
      this.ctx.clearRect(0, 0, this.W, this.H);
      this.ctx.fillStyle = p.bg;
      this.ctx.fillRect(0, 0, this.W, this.H);
      this.ctx.restore();
      if (this.showGrid) this.grid();
      if (this.showAxes) this.axes();
    }

    grid() {
      const c = this.ctx, p = PALETTE();
      const xt = this._xt(), yt = this._yt();
      c.save();
      c.strokeStyle = p.grid; c.lineWidth = 1; c.globalAlpha = .55;
      c.beginPath();
      xt.ticks.forEach(v => { const x = Math.round(this.X(v)) + .5; c.moveTo(x, this.pad.t); c.lineTo(x, this.pad.t + this.ph); });
      yt.ticks.forEach(v => { const y = Math.round(this.Y(v)) + .5; c.moveTo(this.pad.l, y); c.lineTo(this.pad.l + this.pw, y); });
      c.stroke();
      c.restore();
    }

    _xt() {
      if (Array.isArray(this.xticks)) {
        const ticks = this.xticks.map(t => (typeof t === 'object' ? t.v : t));
        return { ticks, labels: this.xticks.map(t => (typeof t === 'object' ? t.label : fmt(t, 1))), step: 1 };
      }
      const ticks = niceTicks(this.xmin, this.xmax, Math.max(4, Math.round(this.pw / 78)));
      const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
      return { ticks, labels: ticks.map(v => fmt(v, step)), step };
    }
    _yt() {
      if (Array.isArray(this.yticks)) {
        const ticks = this.yticks.map(t => (typeof t === 'object' ? t.v : t));
        return { ticks, labels: this.yticks.map(t => (typeof t === 'object' ? t.label : fmt(t, 1))), step: 1 };
      }
      const ticks = niceTicks(this.ymin, this.ymax, Math.max(3, Math.round(this.ph / 46)));
      const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
      return { ticks, labels: ticks.map(v => fmt(v, step)), step };
    }

    axes() {
      const c = this.ctx, p = PALETTE();
      const xt = this._xt(), yt = this._yt();
      const y0 = (this.ymin <= 0 && this.ymax >= 0) ? this.Y(0) : (this.ymin > 0 ? this.Y(this.ymin) : this.Y(this.ymax));
      const x0 = (this.xmin <= 0 && this.xmax >= 0) ? this.X(0) : this.X(this.xmin);

      c.save();
      c.strokeStyle = p.muted; c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(this.pad.l, Math.round(y0) + .5); c.lineTo(this.pad.l + this.pw, Math.round(y0) + .5);
      c.moveTo(Math.round(x0) + .5, this.pad.t); c.lineTo(Math.round(x0) + .5, this.pad.t + this.ph);
      c.stroke();

      c.fillStyle = p.faint;
      c.font = '11px ' + cssVar('--font-sans', 'sans-serif');
      c.textAlign = 'center'; c.textBaseline = 'top';
      xt.ticks.forEach((v, i) => {
        if (v === 0 && this.ymin <= 0 && this.ymax >= 0) return;
        c.fillText(xt.labels[i], this.X(v), Math.min(y0 + 5, this.pad.t + this.ph + 5));
      });
      c.textAlign = 'right'; c.textBaseline = 'middle';
      yt.ticks.forEach((v, i) => {
        if (v === 0 && this.xmin <= 0 && this.xmax >= 0) return;
        c.fillText(yt.labels[i], this.pad.l - 7, this.Y(v));
      });

      if (this.xlabel) {
        c.textAlign = 'right'; c.textBaseline = 'bottom';
        c.fillStyle = p.muted; c.font = 'italic 12px ' + cssVar('--font-serif', 'serif');
        c.fillText(this.xlabel, this.pad.l + this.pw, this.H - 2);
      }
      if (this.ylabel) {
        c.textAlign = 'left'; c.textBaseline = 'top';
        c.fillStyle = p.muted; c.font = 'italic 12px ' + cssVar('--font-serif', 'serif');
        c.fillText(this.ylabel, 3, 2);
      }
      c.restore();
    }

    /* --- primitive --- */
    _dash(c, o) { if (o && o.dash) c.setLineDash(Array.isArray(o.dash) ? o.dash : [5, 4]); else c.setLineDash([]); }

    fn(f, o) {
      o = o || {};
      const c = this.ctx;
      const from = o.from !== undefined ? o.from : this.xmin;
      const to   = o.to   !== undefined ? o.to   : this.xmax;
      c.save();
      c.strokeStyle = this.col(o.color); c.lineWidth = o.width || 2.2;
      c.lineJoin = 'round'; c.lineCap = 'round';
      c.globalAlpha = o.alpha !== undefined ? o.alpha : 1;
      this._dash(c, o);
      c.beginPath();
      const N = o.samples || Math.max(200, Math.round(this.pw * 2));
      let prevY = null, started = false;
      const bigJump = (this.ymax - this.ymin) * 1.6;
      for (let i = 0; i <= N; i++) {
        const x = from + (to - from) * i / N;
        let y;
        try { y = f(x); } catch (e) { y = NaN; }
        if (!isFinite(y)) { started = false; prevY = null; continue; }
        // taglia fuori scala per evitare tratti verticali spuri
        if (prevY !== null && Math.abs(y - prevY) > bigJump) { started = false; }
        const px = this.X(x), py = this.Y(Math.max(this.ymin - 10, Math.min(this.ymax + 10, y)));
        if (!started) { c.moveTo(px, py); started = true; } else { c.lineTo(px, py); }
        prevY = y;
      }
      c.stroke();
      c.restore();
      return this;
    }

    /** area sottesa tra la curva e l'asse x (per integrali / somme) */
    area(f, a, b, o) {
      o = o || {};
      const c = this.ctx;
      c.save();
      c.fillStyle = this.col(o.color); c.globalAlpha = o.alpha !== undefined ? o.alpha : .18;
      c.beginPath();
      c.moveTo(this.X(a), this.Y(0));
      const N = 240;
      for (let i = 0; i <= N; i++) {
        const x = a + (b - a) * i / N;
        let y = f(x); if (!isFinite(y)) y = 0;
        c.lineTo(this.X(x), this.Y(Math.max(this.ymin, Math.min(this.ymax, y))));
      }
      c.lineTo(this.X(b), this.Y(0));
      c.closePath(); c.fill();
      c.restore();
      return this;
    }

    /** banda orizzontale y ∈ [a,b] — utile per gli intorni (L-ε, L+ε) */
    hband(a, b, o) {
      o = o || {};
      const c = this.ctx;
      c.save();
      c.fillStyle = this.col(o.color); c.globalAlpha = o.alpha !== undefined ? o.alpha : .14;
      c.fillRect(this.pad.l, this.Y(b), this.pw, Math.abs(this.Y(a) - this.Y(b)));
      c.restore();
      return this;
    }
    vband(a, b, o) {
      o = o || {};
      const c = this.ctx;
      c.save();
      c.fillStyle = this.col(o.color); c.globalAlpha = o.alpha !== undefined ? o.alpha : .14;
      c.fillRect(this.X(a), this.pad.t, Math.abs(this.X(b) - this.X(a)), this.ph);
      c.restore();
      return this;
    }

    hline(y, o) {
      o = o || {}; const c = this.ctx;
      c.save(); c.strokeStyle = this.col(o.color); c.lineWidth = o.width || 1.5;
      c.globalAlpha = o.alpha !== undefined ? o.alpha : 1;
      this._dash(c, o);
      c.beginPath(); c.moveTo(this.pad.l, this.Y(y)); c.lineTo(this.pad.l + this.pw, this.Y(y)); c.stroke();
      c.restore(); return this;
    }
    vline(x, o) {
      o = o || {}; const c = this.ctx;
      c.save(); c.strokeStyle = this.col(o.color); c.lineWidth = o.width || 1.5;
      c.globalAlpha = o.alpha !== undefined ? o.alpha : 1;
      this._dash(c, o);
      c.beginPath(); c.moveTo(this.X(x), this.pad.t); c.lineTo(this.X(x), this.pad.t + this.ph); c.stroke();
      c.restore(); return this;
    }

    seg(x1, y1, x2, y2, o) {
      o = o || {}; const c = this.ctx;
      c.save(); c.strokeStyle = this.col(o.color); c.lineWidth = o.width || 1.8;
      c.globalAlpha = o.alpha !== undefined ? o.alpha : 1;
      c.lineCap = 'round'; this._dash(c, o);
      c.beginPath(); c.moveTo(this.X(x1), this.Y(y1)); c.lineTo(this.X(x2), this.Y(y2)); c.stroke();
      c.restore(); return this;
    }

    arrow(x1, y1, x2, y2, o) {
      o = o || {};
      this.seg(x1, y1, x2, y2, o);
      const c = this.ctx;
      const px1 = this.X(x1), py1 = this.Y(y1), px2 = this.X(x2), py2 = this.Y(y2);
      const ang = Math.atan2(py2 - py1, px2 - px1), s = o.head || 8;
      c.save(); c.fillStyle = this.col(o.color); c.globalAlpha = o.alpha !== undefined ? o.alpha : 1;
      c.beginPath(); c.moveTo(px2, py2);
      c.lineTo(px2 - s * Math.cos(ang - .4), py2 - s * Math.sin(ang - .4));
      c.lineTo(px2 - s * Math.cos(ang + .4), py2 - s * Math.sin(ang + .4));
      c.closePath(); c.fill(); c.restore();
      return this;
    }

    dot(x, y, o) {
      o = o || {}; const c = this.ctx;
      c.save();
      c.globalAlpha = o.alpha !== undefined ? o.alpha : 1;
      c.beginPath(); c.arc(this.X(x), this.Y(y), o.r || 3.6, 0, 2 * Math.PI);
      if (o.hollow) {
        c.fillStyle = PALETTE().bg; c.fill();
        c.strokeStyle = this.col(o.color); c.lineWidth = o.width || 2; c.setLineDash([]); c.stroke();
      } else {
        c.fillStyle = this.col(o.color); c.fill();
        if (o.ring) { c.strokeStyle = PALETTE().bg; c.lineWidth = 1.6; c.stroke(); }
      }
      c.restore(); return this;
    }

    /** successione: punti (n, a_n) con steli opzionali */
    seq(a, o) {
      o = o || {};
      const from = o.from !== undefined ? o.from : 1;
      const to   = o.to   !== undefined ? o.to   : Math.floor(this.xmax);
      for (let n = from; n <= to; n++) {
        const y = a(n);
        if (!isFinite(y)) continue;
        if (o.stem) this.seg(n, 0, n, y, { color: o.color, width: 1, alpha: .3 });
        if (y >= this.ymin && y <= this.ymax) this.dot(n, y, { color: o.color, r: o.r || 3.2, ring: true });
      }
      return this;
    }

    text(x, y, s, o) {
      o = o || {}; const c = this.ctx, p = PALETTE();
      c.save();
      c.fillStyle = this.col(o.color) || p.text;
      c.font = (o.italic ? 'italic ' : '') + (o.bold ? '700 ' : '') + (o.size || 12) + 'px ' +
               (o.serif ? cssVar('--font-serif', 'serif') : cssVar('--font-sans', 'sans-serif'));
      c.textAlign = o.align || 'left';
      c.textBaseline = o.baseline || 'bottom';
      const px = this.X(x) + (o.dx || 0), py = this.Y(y) + (o.dy || 0);
      if (o.halo) {
        c.strokeStyle = p.bg; c.lineWidth = 3.5; c.lineJoin = 'round';
        c.strokeText(s, px, py);
      }
      c.fillText(s, px, py);
      c.restore(); return this;
    }

    /** etichetta in pixel assoluti (angolo del grafico) */
    label(px, py, s, o) {
      o = o || {}; const c = this.ctx, p = PALETTE();
      c.save();
      c.fillStyle = this.col(o.color) || p.muted;
      c.font = (o.bold ? '700 ' : '') + (o.size || 12) + 'px ' + cssVar('--font-sans', 'sans-serif');
      c.textAlign = o.align || 'left'; c.textBaseline = o.baseline || 'top';
      if (o.halo) { c.strokeStyle = p.bg; c.lineWidth = 3.5; c.lineJoin = 'round'; c.strokeText(s, px, py); }
      c.fillText(s, px, py);
      c.restore(); return this;
    }

    /** legenda in alto a destra */
    legend(items, o) {
      o = o || {};
      const c = this.ctx, p = PALETTE();
      const pad = 8, lh = 17;
      c.save();
      c.font = '12px ' + cssVar('--font-sans', 'sans-serif');
      let w = 0;
      items.forEach(it => { w = Math.max(w, c.measureText(it.label).width); });
      w += 26 + pad * 2;
      const h = items.length * lh + pad * 2;
      const x = o.left ? this.pad.l + 8 : this.pad.l + this.pw - w - 8;
      const y = o.bottom ? this.pad.t + this.ph - h - 8 : this.pad.t + 8;
      c.fillStyle = p.bg; c.globalAlpha = .88;
      c.fillRect(x, y, w, h);
      c.globalAlpha = 1; c.strokeStyle = p.border; c.lineWidth = 1;
      c.strokeRect(x + .5, y + .5, w, h);
      items.forEach((it, i) => {
        const yy = y + pad + i * lh + lh / 2;
        c.strokeStyle = this.col(it.color); c.lineWidth = 2.4;
        c.setLineDash(it.dash ? [4, 3] : []);
        c.beginPath(); c.moveTo(x + pad, yy); c.lineTo(x + pad + 18, yy); c.stroke();
        c.setLineDash([]);
        c.fillStyle = p.text; c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillText(it.label, x + pad + 24, yy);
      });
      c.restore(); return this;
    }

    /* --- interazione --- */
    onPointer(cb) {
      const self = this;
      const handler = (ev) => {
        const r = self.cv.getBoundingClientRect();
        const t = ev.touches ? ev.touches[0] : ev;
        const px = t.clientX - r.left, py = t.clientY - r.top;
        cb({ px, py, x: self.invX(px), y: self.invY(py), type: ev.type, ev });
      };
      ['mousemove', 'mousedown', 'click'].forEach(t => this.cv.addEventListener(t, handler));
      this.cv.addEventListener('touchstart', (e) => { handler(e); }, { passive: true });
      this.cv.addEventListener('touchmove', (e) => { handler(e); }, { passive: true });
      return this;
    }

    /** trascinamento libero nel piano: cb({x, y}) in coordinate mondo */
    onDrag(cb) {
      const self = this; let down = false;
      const pos = (ev) => {
        const r = self.cv.getBoundingClientRect();
        const t = ev.touches && ev.touches.length ? ev.touches[0] : ev;
        return {
          x: Math.max(self.xmin, Math.min(self.xmax, self.invX(t.clientX - r.left))),
          y: Math.max(self.ymin, Math.min(self.ymax, self.invY(t.clientY - r.top)))
        };
      };
      this.cv.style.cursor = 'grab';
      this.cv.addEventListener('mousedown', e => { down = true; self.cv.style.cursor = 'grabbing'; cb(pos(e)); e.preventDefault(); });
      global.addEventListener('mousemove', e => { if (down) cb(pos(e)); });
      global.addEventListener('mouseup', () => { down = false; self.cv.style.cursor = 'grab'; });
      this.cv.addEventListener('touchstart', e => { down = true; cb(pos(e)); }, { passive: true });
      this.cv.addEventListener('touchmove', e => { if (down) { cb(pos(e)); e.preventDefault(); } }, { passive: false });
      this.cv.addEventListener('touchend', () => { down = false; });
      return this;
    }

    /** trascinamento di un valore lungo x (restituisce x mondo) */
    onDragX(cb) {
      const self = this; let down = false;
      const upd = (ev) => {
        const r = self.cv.getBoundingClientRect();
        const t = ev.touches ? ev.touches[0] : ev;
        cb(Math.max(self.xmin, Math.min(self.xmax, self.invX(t.clientX - r.left))));
      };
      this.cv.style.cursor = 'ew-resize';
      this.cv.addEventListener('mousedown', e => { down = true; upd(e); });
      global.addEventListener('mousemove', e => { if (down) upd(e); });
      global.addEventListener('mouseup', () => { down = false; });
      this.cv.addEventListener('touchstart', e => { down = true; upd(e); }, { passive: true });
      this.cv.addEventListener('touchmove', e => { if (down) { upd(e); e.preventDefault(); } }, { passive: false });
      this.cv.addEventListener('touchend', () => { down = false; });
      return this;
    }
  }

  Plot._instances = [];
  Plot.redrawAll = function () { Plot._instances.forEach(p => { try { p.redraw(); } catch (e) {} }); };
  Plot.niceTicks = niceTicks;

  /* --------- helper: slider legato a un grafico --------- */
  function slider(id, onInput) {
    const el = document.getElementById(id);
    if (!el) return null;
    const out = document.querySelector('[data-out="' + id + '"]');
    const upd = () => {
      const v = parseFloat(el.value);
      if (out) out.textContent = el.dataset.fmt ? el.dataset.fmt.replace('%', v) : v;
      onInput(v);
    };
    el.addEventListener('input', upd);
    upd();
    return el;
  }

  global.Plot = Plot;
  global.plotSlider = slider;

  // Ridisegna tutto quando cambia il tema
  document.addEventListener('themechange', () => Plot.redrawAll());
})(window);
