/* ===========================================================
   Fondamenti di Informatica - appunti
   Script condiviso: tema, colorazione codice, tracer passo-passo,
   widget interattivi, quiz.
   =========================================================== */
(function () {
  "use strict";

  const FI = (window.FI = {});
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ---------------------------------------------------------
     Tema chiaro / scuro
     --------------------------------------------------------- */
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("fi-theme"); } catch (e) {}
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }
    const btn = $(".theme-btn");
    if (!btn) return;
    const paint = () => {
      const cur = document.documentElement.getAttribute("data-theme");
      btn.textContent = cur === "dark" ? "☀" : cur === "light" ? "☾" : "◐";
      btn.title = "Tema: " + (cur || "automatico");
    };
    btn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "light" ? "dark" : cur === "dark" ? null : "light";
      if (next) document.documentElement.setAttribute("data-theme", next);
      else document.documentElement.removeAttribute("data-theme");
      try {
        if (next) localStorage.setItem("fi-theme", next);
        else localStorage.removeItem("fi-theme");
      } catch (e) {}
      paint();
    });
    paint();
  }

  /* ---------------------------------------------------------
     Colorazione sintattica del C
     --------------------------------------------------------- */
  const TYPES = ["int", "char", "float", "double", "unsigned", "signed", "const", "void", "long", "short", "struct", "typedef"];
  const KWS = ["return", "if", "else", "while", "do", "for", "switch", "case", "break", "continue", "default", "sizeof"];
  const CRE = new RegExp(
    [
      "(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)",
      "(^[ \\t]*#[A-Za-z]+)",
      "(\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*')",
      "\\b(" + TYPES.concat(KWS).join("|") + ")\\b",
      "\\b(\\d+\\.?\\d*)\\b",
      "\\b([A-Za-z_]\\w*)(?=\\s*\\()"
    ].join("|"),
    "gm"
  );

  function highlightC(src) {
    let out = "", last = 0, m;
    CRE.lastIndex = 0;
    while ((m = CRE.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      const txt = esc(m[0]);
      if (m[1]) out += '<span class="tok-com">' + txt + "</span>";
      else if (m[2]) out += '<span class="tok-pre">' + txt + "</span>";
      else if (m[3]) out += '<span class="tok-str">' + txt + "</span>";
      else if (m[4]) out += '<span class="' + (TYPES.indexOf(m[4]) >= 0 ? "tok-typ" : "tok-kw") + '">' + txt + "</span>";
      else if (m[5]) out += '<span class="tok-num">' + txt + "</span>";
      else if (m[6]) out += '<span class="tok-fn">' + txt + "</span>";
      else out += txt;
      last = m.index + m[0].length;
    }
    out += esc(src.slice(last));
    return out;
  }

  function initCode() {
    $$("pre > code.lang-c").forEach((c) => {
      c.innerHTML = highlightC(c.textContent.replace(/^\n/, "").replace(/\s+$/, ""));
    });
    $$(".pseudo").forEach((p) => {
      const t = p.textContent.replace(/^\n/, "").replace(/\s+$/, "");
      p.innerHTML = pseudoHi(t);
    });
  }

  const PKW = /\b(mentre|Mentre|MENTRE|se|Se|SE|altrimenti|Altrimenti|esegui|Esegui|finché|Finche|Leggi|leggi|Scrivi|scrivi|Acquisisci|acquisisci|Produci|produci|Stampa|stampa|Memorizza|memorizza|STOP|TERMINA|Fine ciclo|CICLO|ripeti|Ripeti|con successo|insuccesso)\b/g;

  function pseudoHi(t) {
    let s = esc(t);
    s = s.replace(/(\/\*[^*]*\*\/|«[^»]*»)/g, '<span class="cm">$1</span>');
    s = s.replace(PKW, '<span class="kw">$1</span>');
    return s;
  }

  /* ---------------------------------------------------------
     Tracer: motore di esecuzione passo-passo
     --------------------------------------------------------- */
  const ALGOS = {};
  FI.algo = (name, def) => { ALGOS[name] = def; };

  const MAXSTEPS = 4000;

  function Recorder(varNames) {
    this.frames = [];
    this.vars = {};
    this.out = [];
    this._extra = null;
    this.varNames = varNames || [];
  }
  Recorder.prototype.set = function (k, v) { this.vars[k] = v; return v; };
  Recorder.prototype.setAll = function (o) { Object.assign(this.vars, o); };
  Recorder.prototype.get = function (k) { return this.vars[k]; };
  Recorder.prototype.print = function (s) { this.out.push(String(s)); };
  Recorder.prototype.extra = function (o) { this._extra = o; };
  Recorder.prototype.step = function (line, note) {
    this.frames.push({
      line: line,
      note: note || "",
      vars: Object.assign({}, this.vars),
      out: this.out.slice(),
      extra: this._extra ? JSON.parse(JSON.stringify(this._extra)) : null
    });
    if (this.frames.length > MAXSTEPS) {
      const e = new Error("L'esecuzione supera " + MAXSTEPS + " passi: l'algoritmo probabilmente NON TERMINA con questi dati.");
      e.noTermination = true;
      throw e;
    }
  };

  function buildTracer(host) {
    const def = ALGOS[host.dataset.algo];
    if (!def) { host.textContent = "Algoritmo non trovato: " + host.dataset.algo; return; }

    host.classList.add("tracer");
    host.innerHTML =
      '<div class="tr-head">' + esc(def.title) + "</div>" +
      '<div class="tr-inputs"></div>' +
      '<div class="tr-body">' +
        '<ol class="tr-code"></ol>' +
        '<div class="tr-side">' +
          '<div class="tr-extrawrap" hidden><div class="tr-sect-t">Dati</div><div class="tr-extra"></div></div>' +
          '<div><div class="tr-sect-t">Contenitori (variabili)</div><div class="vars"></div></div>' +
          '<div><div class="tr-sect-t">Uscita</div><div class="tr-out"></div></div>' +
          '<div class="tr-note"></div>' +
        "</div>" +
      "</div>" +
      '<div class="tr-err" hidden></div>' +
      '<div class="tr-controls">' +
        '<button class="btn icon" data-a="first" title="Inizio">⏮</button>' +
        '<button class="btn icon" data-a="prev" title="Passo indietro">◀</button>' +
        '<button class="btn primary" data-a="play" style="min-width:86px">▶ Esegui</button>' +
        '<button class="btn icon" data-a="next" title="Passo avanti">▶|</button>' +
        '<button class="btn icon" data-a="last" title="Fine">⏭</button>' +
        '<input type="range" min="0" max="0" value="0">' +
        '<span class="tr-counter">0 / 0</span>' +
      "</div>";

    const inputsEl = $(".tr-inputs", host);
    const codeEl = $(".tr-code", host);
    const varsEl = $(".vars", host);
    const outEl = $(".tr-out", host);
    const noteEl = $(".tr-note", host);
    const errEl = $(".tr-err", host);
    const extraWrap = $(".tr-extrawrap", host);
    const extraEl = $(".tr-extra", host);
    const range = $('input[type=range]', host);
    const counter = $(".tr-counter", host);

    // campi di input
    const fields = {};
    (def.inputs || []).forEach((f) => {
      const w = document.createElement("div");
      w.className = "tr-field";
      const id = "f" + Math.random().toString(36).slice(2, 8);
      w.innerHTML =
        '<label for="' + id + '">' + esc(f.label || f.name) + "</label>" +
        '<input id="' + id + '" type="' + (f.type || "number") + '" value="' + esc(f.value) + '"' +
        (f.type === "text" ? ' class="wide"' : "") +
        (f.min !== undefined ? ' min="' + f.min + '"' : "") +
        (f.max !== undefined ? ' max="' + f.max + '"' : "") +
        (f.step !== undefined ? ' step="' + f.step + '"' : "") + ">";
      inputsEl.appendChild(w);
      fields[f.name] = $("input", w);
    });
    const runBtn = document.createElement("button");
    runBtn.className = "btn";
    runBtn.textContent = "↻ Ricalcola";
    inputsEl.appendChild(runBtn);
    if (!(def.inputs || []).length) inputsEl.hidden = true;

    // righe di pseudocodice
    def.code.forEach((ln, i) => {
      const li = document.createElement("li");
      li.innerHTML = '<span class="ln">' + i + "</span>" + pseudoHi(ln);
      codeEl.appendChild(li);
    });
    const lis = $$("li", codeEl);

    let frames = [], pos = 0, timer = null;

    function readInputs() {
      const o = {};
      (def.inputs || []).forEach((f) => {
        const raw = fields[f.name].value;
        o[f.name] = f.type === "text" ? raw : Number(raw);
      });
      return o;
    }

    function compute() {
      stop();
      const rec = new Recorder(def.vars);
      errEl.hidden = true;
      try {
        def.run(readInputs(), rec);
        frames = rec.frames;
      } catch (e) {
        frames = rec.frames;
        errEl.hidden = false;
        errEl.textContent = "⚠ " + e.message;
      }
      if (!frames.length) frames = [{ line: 0, note: "", vars: {}, out: [], extra: null }];
      range.max = frames.length - 1;
      pos = 0;
      render();
    }

    function render() {
      const f = frames[pos];
      const prev = pos > 0 ? frames[pos - 1] : null;
      lis.forEach((li, i) => {
        li.classList.toggle("on", i === f.line);
      });
      const active = lis[f.line];
      if (active && host.dataset.noscroll !== "1") {
        const r = active.getBoundingClientRect(), cr = codeEl.getBoundingClientRect();
        if (r.top < cr.top || r.bottom > cr.bottom) active.scrollIntoView({ block: "nearest" });
      }
      // variabili
      varsEl.innerHTML = (def.vars || Object.keys(f.vars))
        .map((v) => {
          const val = f.vars[v];
          const has = val !== undefined;
          const ch = prev && prev.vars[v] !== val;
          return (
            '<div class="varbox' + (ch ? " changed" : "") + (has ? "" : " undef") + '">' +
            '<div class="vn">' + esc(v) + "</div>" +
            '<div class="vv">' + (has ? esc(fmt(val)) : "—") + "</div></div>"
          );
        })
        .join("");
      outEl.textContent = f.out.join("\n") || " ";
      noteEl.innerHTML = f.note || "";
      if (f.extra && f.extra.arr) {
        extraWrap.hidden = false;
        extraEl.innerHTML = arrView(f.extra);
      } else if (f.extra && f.extra.html) {
        extraWrap.hidden = false;
        extraEl.innerHTML = f.extra.html;
      } else {
        extraWrap.hidden = true;
      }
      range.value = pos;
      counter.textContent = pos + " / " + (frames.length - 1);
    }

    function fmt(v) {
      if (typeof v === "number" && !Number.isInteger(v)) return String(Math.round(v * 1e6) / 1e6);
      return v;
    }

    function arrView(x) {
      const marks = x.marks || {};
      return (
        '<div class="arrview">' +
        x.arr
          .map((v, i) => {
            const cls = [];
            if (x.range && (i < x.range[0] || i > x.range[1])) cls.push("out");
            else if (x.range) cls.push("range");
            if (x.mid === i) cls.push("mid");
            if (x.hit === i) cls.push("hit");
            const lbl = Object.keys(marks).filter((k) => marks[k] === i).join(",");
            return (
              '<div class="acell ' + cls.join(" ") + '">' +
              '<div class="am">' + esc(lbl) + "</div>" +
              '<div class="av">' + esc(v) + "</div>" +
              '<div class="ai">' + i + "</div></div>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    function go(p) { pos = Math.max(0, Math.min(frames.length - 1, p)); render(); }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      const b = $('[data-a="play"]', host);
      if (b) b.textContent = "▶ Esegui";
    }
    function play() {
      const b = $('[data-a="play"]', host);
      if (timer) { stop(); return; }
      if (pos >= frames.length - 1) pos = 0;
      b.textContent = "⏸ Pausa";
      timer = setInterval(() => {
        if (pos >= frames.length - 1) { stop(); return; }
        go(pos + 1);
      }, 620);
    }

    host.addEventListener("click", (e) => {
      const b = e.target.closest("[data-a]");
      if (!b) return;
      const a = b.dataset.a;
      if (a === "play") play();
      else { stop(); go(a === "first" ? 0 : a === "last" ? frames.length - 1 : a === "next" ? pos + 1 : pos - 1); }
    });
    range.addEventListener("input", () => { stop(); go(Number(range.value)); });
    runBtn.addEventListener("click", compute);
    Object.values(fields).forEach((i) =>
      i.addEventListener("keydown", (e) => { if (e.key === "Enter") compute(); })
    );

    compute();
  }

  /* ---------------------------------------------------------
     Definizione degli algoritmi
     --------------------------------------------------------- */

  // --- Scambio di due contenitori --------------------------
  FI.algo("scambio", {
    title: "Scambio del contenuto di due contenitori",
    inputs: [
      { name: "M", label: "M", value: 7 },
      { name: "N", label: "N", value: 12 }
    ],
    vars: ["M", "N", "T"],
    code: [
      "0. Leggi M, leggi N",
      "1. T ← N",
      "2. N ← M",
      "3. M ← T",
      "4. TERMINA"
    ],
    run(i, t) {
      t.set("M", i.M); t.set("N", i.N);
      t.step(0, "Situazione iniziale: <b>M=" + i.M + "</b>, <b>N=" + i.N + "</b>.");
      t.set("T", t.get("N"));
      t.step(1, "Salvo il valore di N nel contenitore temporaneo T, <b>prima</b> di sovrascrivere qualcosa.");
      t.set("N", t.get("M"));
      t.step(2, "Copio M in N: il vecchio valore di N non è perso, è in T.");
      t.set("M", t.get("T"));
      t.step(3, "Copio T (vecchio N) in M. Scambio completato.");
      t.step(4, "Fine: M=" + t.get("M") + ", N=" + t.get("N") + ".");
    }
  });

  // --- Divisione per sottrazioni ripetute -------------------
  FI.algo("divisione", {
    title: "Divisione intera per sottrazioni ripetute",
    inputs: [
      { name: "M", label: "M (dividendo)", value: 17, min: 0 },
      { name: "N", label: "N (divisore)", value: 5, min: 1 }
    ],
    vars: ["M", "N", "Q", "R"],
    code: [
      "1. Leggi M, leggi N",
      "2. R ← M",
      "3. Q ← 0",
      "4. mentre (R >= N) esegui",
      "4.1    R ← R - N",
      "4.2    Q ← Q + 1",
      "       Fine ciclo (vai a 4)",
      "5. Scrivi Q",
      "6. Scrivi R",
      "7. STOP"
    ],
    run(i, t) {
      if (i.N <= 0) throw new Error("Il divisore N deve essere > 0 (condizione di validità dei dati).");
      t.set("M", i.M); t.set("N", i.N);
      t.step(0, "Acquisisco i dati.");
      t.set("R", i.M); t.step(1, "Il resto parte dal dividendo.");
      t.set("Q", 0); t.step(2, "Il quoziente è un <b>contatore</b> di sottrazioni: parte da 0.");
      let it = 0;
      while (true) {
        const c = t.get("R") >= t.get("N");
        t.step(3, "Condizione <code>R >= N</code> → " + t.get("R") + " >= " + t.get("N") + " → <b>" + (c ? "VERA" : "FALSA") + "</b>" + (c ? ": posso ancora sottrarre." : ": esco dal ciclo."));
        if (!c) break;
        it++;
        t.set("R", t.get("R") - t.get("N"));
        t.step(4, "Iterazione " + it + ": sottraggo N dal resto.");
        t.set("Q", t.get("Q") + 1);
        t.step(5, "Conto la sottrazione appena fatta.");
        t.step(6, "Torno a valutare la condizione.");
      }
      t.print("Quoziente = " + t.get("Q"));
      t.step(7, "Produco il quoziente.");
      t.print("Resto = " + t.get("R"));
      t.step(8, "Produco il resto.");
      t.step(9, "Fine. Invariante verificata: M = N·Q + R = " + t.get("N") + "·" + t.get("Q") + " + " + t.get("R") + " = " + i.M + ".");
    }
  });

  // --- Logaritmo intero -------------------------------------
  FI.algo("logaritmo", {
    title: "Logaritmo intero in base B (per divisioni ripetute)",
    inputs: [
      { name: "N", label: "N", value: 93017, min: 1 },
      { name: "B", label: "B (base)", value: 10, min: 2 }
    ],
    vars: ["N", "B", "R", "L"],
    code: [
      "1. Leggi N, leggi B",
      "2. R ← N",
      "3. L ← 0",
      "4. mentre (R >= B) esegui",
      "4.1    R ← R / B     /* divisione INTERA */",
      "4.2    L ← L + 1",
      "       Fine ciclo (vai a 4)",
      "5. Scrivi L",
      "6. STOP"
    ],
    run(i, t) {
      if (i.B < 2) throw new Error("La base B deve essere > 1.");
      t.set("N", i.N); t.set("B", i.B);
      t.step(0);
      t.set("R", i.N); t.step(1, "R è il <b>valore corrente</b>, che verrà ridotto a ogni giro.");
      t.set("L", 0); t.step(2, "L conta quante divisioni riesco a fare.");
      while (true) {
        const c = t.get("R") >= t.get("B");
        t.step(3, "<code>R >= B</code> → " + t.get("R") + " >= " + t.get("B") + " → <b>" + (c ? "VERA" : "FALSA") + "</b>");
        if (!c) break;
        t.set("R", Math.floor(t.get("R") / t.get("B")));
        t.step(4, "Divisione <b>intera</b>: la parte frazionaria viene scartata.");
        t.set("L", t.get("L") + 1);
        t.step(5);
        t.step(6);
      }
      t.print("log_" + i.B + "(" + i.N + ") = " + t.get("L"));
      t.step(7, "Risultato: " + i.B + "^" + t.get("L") + " ≤ " + i.N + " < " + i.B + "^" + (t.get("L") + 1) + ".");
      t.step(8, "Fine.");
    }
  });

  // --- Massimo di una sequenza ------------------------------
  FI.algo("massimo-seq", {
    title: "Massimo di una sequenza terminata da un valore negativo",
    inputs: [{ name: "seq", label: "sequenza letta (terminatore < 0)", type: "text", value: "3 17 5 42 8 -1" }],
    vars: ["N", "MAX"],
    code: [
      "1. MAX ← 0",
      "2. Leggi N",
      "3. mentre (N > 0) esegui",
      "3.1    se (N > MAX)",
      "3.1.1      MAX ← N",
      "           /* altrimenti non fare nulla */",
      "3.2    Leggi N",
      "       Fine ciclo (vai a 3)",
      "4. Scrivi MAX",
      "5. TERMINA"
    ],
    run(i, t) {
      const seq = i.seq.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
      if (seq.some(isNaN)) throw new Error("La sequenza deve contenere solo numeri.");
      let k = 0;
      const read = () => (k < seq.length ? seq[k++] : -1);
      t.set("MAX", 0);
      t.step(0, "MAX parte da 0: è il risultato da produrre se non arriva nessun valore positivo.");
      t.set("N", read());
      t.step(1, "Prima lettura, <b>fuori</b> dal ciclo.");
      while (true) {
        const c = t.get("N") > 0;
        t.step(2, "<code>N > 0</code> → " + t.get("N") + " > 0 → <b>" + (c ? "VERA" : "FALSA") + "</b>" + (c ? "" : ": il valore non positivo chiude la sequenza."));
        if (!c) break;
        const gt = t.get("N") > t.get("MAX");
        t.step(3, "<code>N > MAX</code> → " + t.get("N") + " > " + t.get("MAX") + " → <b>" + (gt ? "VERA" : "FALSA") + "</b>");
        if (gt) { t.set("MAX", t.get("N")); t.step(4, "Nuovo massimo provvisorio."); }
        else t.step(5, "MAX resta invariato.");
        t.set("N", read());
        t.step(6, "Leggo il valore successivo (lettura <b>in coda</b> al ciclo).");
        t.step(7);
      }
      t.print("MAX = " + t.get("MAX"));
      t.step(8);
      t.step(9, "Invariante: a ogni giro MAX contiene il massimo fra i valori letti finora.");
    }
  });

  // --- Euclide ----------------------------------------------
  FI.algo("euclide", {
    title: "Massimo comun divisore: algoritmo di Euclide",
    inputs: [
      { name: "M", label: "M", value: 144, min: 1 },
      { name: "N", label: "N", value: 54, min: 1 }
    ],
    vars: ["M", "N", "R", "T"],
    code: [
      "1. Leggi M, leggi N",
      "2. se (N > M)                 /* metto il maggiore in M */",
      "2.1    T ← M;  M ← N;  N ← T",
      "3. mentre (M % N ≠ 0) esegui",
      "3.1    R ← M % N",
      "3.2    M ← N",
      "3.3    N ← R",
      "       Fine ciclo (vai a 3)",
      "4. Scrivi N",
      "5. STOP"
    ],
    run(i, t) {
      if (i.M < 1 || i.N < 1) throw new Error("M e N devono essere maggiori di 0.");
      t.set("M", i.M); t.set("N", i.N);
      t.step(0);
      const sw = t.get("N") > t.get("M");
      t.step(1, "<code>N > M</code> → <b>" + (sw ? "VERA" : "FALSA") + "</b>");
      if (sw) {
        t.set("T", t.get("M")); t.set("M", t.get("N")); t.set("N", t.get("T"));
        t.step(2, "Scambio, così M ≥ N.");
      }
      while (true) {
        const r = t.get("M") % t.get("N");
        const c = r !== 0;
        t.step(3, "<code>M % N</code> = " + t.get("M") + " % " + t.get("N") + " = <b>" + r + "</b> → condizione " + (c ? "VERA" : "FALSA") + (c ? "" : ": N divide M, ho finito."));
        if (!c) break;
        t.set("R", r); t.step(4, "Proprietà: ogni divisore comune di M e N divide anche il resto R.");
        t.set("M", t.get("N")); t.step(5, "La coppia (M,N) diventa (N,R): numeri più piccoli, stesso MCD.");
        t.set("N", t.get("R")); t.step(6);
        t.step(7);
      }
      t.print("MCD = " + t.get("N"));
      t.step(8, "Il risultato è l'ultimo divisore, cioè N.");
      t.step(9, "Fine. Termina sempre perché il resto decresce strettamente e resta ≥ 0.");
    }
  });

  // --- Ricerca lineare --------------------------------------
  FI.algo("ricerca-lineare", {
    title: "Ricerca sequenziale in un array (non ordinato)",
    inputs: [
      { name: "arr", label: "array", type: "text", value: "12 5 6 1 7 9 3 11 14 8" },
      { name: "x", label: "valore cercato", value: 7 }
    ],
    vars: ["i", "MAX", "cercato"],
    code: [
      "1. i ← 0",
      "2. mentre (i < MAX  E  A[i] ≠ cercato) esegui",
      "2.1    i ← i + 1",
      "3. se (i < MAX)",
      "3.1    Scrivi «trovato in posizione i»",
      "    altrimenti",
      "3.2    Scrivi «non presente»",
      "4. STOP"
    ],
    run(i, t) {
      const A = i.arr.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
      if (A.some(isNaN)) throw new Error("L'array deve contenere solo numeri.");
      const MAX = A.length;
      t.set("MAX", MAX); t.set("cercato", i.x);
      t.set("i", 0);
      t.extra({ arr: A, range: [0, MAX - 1], mid: 0, marks: { i: 0 } });
      t.step(0, "Parto dalla prima posizione.");
      while (true) {
        const inRange = t.get("i") < MAX;
        const diff = inRange && A[t.get("i")] !== i.x;
        t.extra({ arr: A, range: [0, MAX - 1], mid: inRange ? t.get("i") : undefined, marks: { i: t.get("i") } });
        t.step(1,
          "<code>i &lt; MAX</code> → " + (inRange ? "VERA" : "<b>FALSA</b> (array finito)") +
          (inRange ? " &nbsp;·&nbsp; <code>A[" + t.get("i") + "] ≠ " + i.x + "</code> → " + A[t.get("i")] + " ≠ " + i.x + " → " + (diff ? "VERA" : "<b>FALSA</b>: trovato!") : "") +
          (inRange ? "" : "<br><b>Regola del risparmio (corto circuito)</b>: essendo falsa la prima clausola, il C non valuta A[i] — e non esce dall'array."));
        if (!(inRange && diff)) break;
        t.set("i", t.get("i") + 1);
        t.step(2, "Avanzo di una posizione.");
      }
      const found = t.get("i") < MAX;
      t.extra({ arr: A, range: [0, MAX - 1], hit: found ? t.get("i") : undefined, marks: { i: t.get("i") } });
      t.step(3, "<code>i &lt; MAX</code> → " + (found ? "VERA: sono uscito perché ho trovato il valore." : "FALSA: sono uscito perché l'array è finito."));
      if (found) { t.print("Trovato in posizione " + t.get("i")); t.step(4); }
      else { t.print("Non presente"); t.step(6); }
      t.step(7, "Costo: fino a " + MAX + " confronti (lineare in MAX).");
    }
  });

  // --- Ricerca binaria --------------------------------------
  FI.algo("ricerca-binaria", {
    title: "Ricerca dicotomica in una sequenza ordinata",
    inputs: [
      { name: "arr", label: "array ordinato", type: "text", value: "7 13 15 18 31 40 44" },
      { name: "x", label: "valore cercato", value: 31 }
    ],
    vars: ["Inizio", "Fine", "Media", "cercato"],
    code: [
      "1. Inizio ← 0                          /* prima posizione */",
      "2. Fine   ← N - 1                      /* ultima posizione */",
      "3. mentre (Inizio <= Fine) esegui      /* porzione non vuota */",
      "3.1    Media ← (Inizio + Fine) / 2     /* divisione intera */",
      "3.2    se (A[Media] == cercato)",
      "3.2.1      Scrivi Media e STOP",
      "       altrimenti",
      "3.2.2      se (cercato < A[Media])",
      "3.2.2.1        Fine ← Media - 1        /* prima metà, centro ESCLUSO */",
      "           altrimenti",
      "3.2.2.2        Inizio ← Media + 1      /* seconda metà, centro ESCLUSO */",
      "4. Scrivi -1                           /* assente */",
      "5. STOP"
    ],
    run(inp, t) {
      const A = inp.arr.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
      if (A.some(isNaN)) throw new Error("L'array deve contenere solo numeri.");
      for (let k = 1; k < A.length; k++)
        if (A[k] < A[k - 1]) throw new Error("La sequenza deve essere ORDINATA in senso crescente: è la precondizione dell'algoritmo.");
      const x = inp.x, N = A.length;
      t.set("cercato", x);
      const view = (mid, hit) => t.extra({
        arr: A,
        range: [t.get("Inizio"), t.get("Fine")],
        mid: mid,
        hit: hit,
        marks: { I: t.get("Inizio"), F: t.get("Fine"), M: mid }
      });

      t.set("Inizio", 0); view();
      t.step(0, "La porzione attuale è tutta la sequenza.");
      t.set("Fine", N - 1); view();
      t.step(1, "Le due posizioni <b>Inizio</b> e <b>Fine</b> delimitano la porzione in cui il valore può ancora trovarsi.");
      let iter = 0;
      while (true) {
        const c = t.get("Inizio") <= t.get("Fine");
        view();
        t.step(2, "<code>Inizio &lt;= Fine</code> → " + t.get("Inizio") + " &lt;= " + t.get("Fine") + " → <b>" + (c ? "VERA" : "FALSA") + "</b>" + (c ? ": la porzione contiene almeno un elemento." : ": porzione <b>vuota</b> → il valore è assente."));
        if (!c) break;
        iter++;
        const m = Math.floor((t.get("Inizio") + t.get("Fine")) / 2);
        t.set("Media", m); view(m);
        t.step(3, "Iterazione " + iter + ": centro = (" + t.get("Inizio") + "+" + t.get("Fine") + ")/2 = <b>" + m + "</b> (divisione intera).");
        const eq = A[m] === x;
        t.step(4, "<code>A[" + m + "] == " + x + "</code> → " + A[m] + " == " + x + " → <b>" + (eq ? "VERA" : "FALSA") + "</b>");
        if (eq) {
          view(m, m);
          t.print("Trovato in posizione " + m);
          t.step(5, "Trovato dopo <b>" + iter + "</b> confronti (su " + N + " elementi).");
          t.step(12, "Fine.");
          return;
        }
        const lt = x < A[m];
        t.step(7, "<code>" + x + " &lt; A[" + m + "]=" + A[m] + "</code> → <b>" + (lt ? "VERA" : "FALSA") + "</b>: il valore, se c'è, sta nella " + (lt ? "<b>prima</b>" : "<b>seconda</b>") + " metà.");
        if (lt) { t.set("Fine", m - 1); view(); t.step(8, "Scarto il centro e tutta la metà destra."); }
        else { t.set("Inizio", m + 1); view(); t.step(10, "Scarto il centro e tutta la metà sinistra."); }
      }
      t.print("Posizione -1 (non presente)");
      t.step(11, "Nota: alla fine <b>Inizio (" + t.get("Inizio") + ") &gt; Fine (" + t.get("Fine") + ")</b>, cioè le due posizioni si sono scavalcate.");
      t.step(12, "Fine. Confronti effettuati: " + iter + " ≈ log₂(" + N + ").");
    }
  });

  // --- Ricerca binaria ERRATA (non termina) -----------------
  FI.algo("ricerca-binaria-bug", {
    title: "Versione SBAGLIATA: le due metà coprono tutta la porzione",
    inputs: [
      { name: "arr", label: "array ordinato", type: "text", value: "2 5" },
      { name: "x", label: "valore cercato", value: 3 }
    ],
    vars: ["Inizio", "Fine", "Media", "cercato"],
    code: [
      "3. mentre (porzione non vuota) esegui",
      "3.1    Media ← (Inizio + Fine) / 2",
      "3.2    se (A[Media] == cercato) → STOP con successo",
      "3.3    se (cercato < A[Media])",
      "3.3.1      Fine ← Media        /* ⚠ il centro NON viene escluso */",
      "       altrimenti",
      "3.3.2      Inizio ← Media      /* ⚠ il centro NON viene escluso */"
    ],
    run(inp, t) {
      const A = inp.arr.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
      const x = inp.x;
      t.set("cercato", x); t.set("Inizio", 0); t.set("Fine", A.length - 1);
      const view = (m) => t.extra({ arr: A, range: [t.get("Inizio"), t.get("Fine")], mid: m, marks: { I: t.get("Inizio"), F: t.get("Fine"), M: m } });
      let n = 0;
      while (n < 12) {
        n++;
        view();
        t.step(0, "Porzione attuale: da " + t.get("Inizio") + " a " + t.get("Fine") + ".");
        const m = Math.floor((t.get("Inizio") + t.get("Fine")) / 2);
        t.set("Media", m); view(m);
        t.step(1, "Centro = " + m + ".");
        if (A[m] === x) { t.print("trovato"); t.step(2, "Trovato."); return; }
        t.step(2, "<code>A[" + m + "]=" + A[m] + " ≠ " + x + "</code>");
        if (x < A[m]) { t.set("Fine", m); view(); t.step(4, "Fine ← Media: la porzione <b>non si riduce mai</b> a zero."); }
        else { t.set("Inizio", m); view(); t.step(6, "Inizio ← Media: la porzione <b>non si riduce mai</b> a zero."); }
      }
      throw new Error("Ciclo infinito: la porzione resta larga 1 elemento e la condizione di uscita non si verifica mai. Non è un algoritmo!");
    }
  });

  // --- Potenza (ciclo a conteggio) --------------------------
  FI.algo("potenza", {
    title: "Elevamento a potenza (ciclo a conteggio)",
    inputs: [
      { name: "b", label: "base", value: 3 },
      { name: "e", label: "esponente", value: 4, min: 0 }
    ],
    vars: ["base", "esponente", "potenza", "contatore"],
    code: [
      "potenza = 1;",
      "contatore = 0;",
      "while (contatore < esponente) {",
      "    potenza = potenza * base;",
      "    contatore = contatore + 1;",
      "}",
      "printf(\"%d alla %d: %d\", base, esponente, potenza);"
    ],
    run(i, t) {
      t.set("base", i.b); t.set("esponente", i.e);
      t.set("potenza", 1); t.step(0, "Elemento neutro del prodotto: la potenza con esponente 0 vale 1.");
      t.set("contatore", 0); t.step(1, "Conto quante moltiplicazioni ho già fatto.");
      while (true) {
        const c = t.get("contatore") < t.get("esponente");
        t.step(2, "<code>contatore &lt; esponente</code> → " + t.get("contatore") + " &lt; " + t.get("esponente") + " → <b>" + (c ? "VERA" : "FALSA") + "</b>");
        if (!c) break;
        t.set("potenza", t.get("potenza") * t.get("base"));
        t.step(3, "Invariante: potenza = base^contatore (dopo l'incremento).");
        t.set("contatore", t.get("contatore") + 1);
        t.step(4);
        t.step(5);
      }
      t.print(i.b + " alla " + i.e + ": " + t.get("potenza"));
      t.step(6, "Se l'esponente è 0 il corpo del ciclo viene eseguito <b>zero volte</b>: il risultato è 1.");
    }
  });

  // --- Rappresentazione in base -----------------------------
  FI.algo("cifre-base", {
    title: "Cifre di un numero naturale in una base (array di cifre)",
    inputs: [
      { name: "n", label: "n", value: 2026, min: 0 },
      { name: "b", label: "base", value: 2, min: 2, max: 16 }
    ],
    vars: ["n", "base", "i"],
    code: [
      "i = MAX - 1;                    /* ultima posizione */",
      "while (n > 0 && i >= 0) {",
      "    SequenzaCifre[i] = n % base;  /* cifra meno significativa */",
      "    n = n / base;                 /* divisione intera */",
      "    i = i - 1;                    /* retrocedo */",
      "}",
      "i = i + 1;",
      "while (i < MAX) { printf(\"%d\", SequenzaCifre[i]); i = i + 1; }"
    ],
    run(inp, t) {
      const MAX = 12;
      const S = new Array(MAX).fill("·");
      t.set("n", inp.n); t.set("base", inp.b);
      t.set("i", MAX - 1);
      t.extra({ arr: S, marks: { i: MAX - 1 } });
      t.step(0, "Riempio l'array <b>dal fondo</b>, perché la prima cifra che ottengo è quella meno significativa.");
      while (true) {
        const c = t.get("n") > 0 && t.get("i") >= 0;
        t.step(1, "<code>n &gt; 0 && i &gt;= 0</code> → <b>" + (c ? "VERA" : "FALSA") + "</b>");
        if (!c) break;
        S[t.get("i")] = t.get("n") % t.get("base");
        t.extra({ arr: S, mid: t.get("i"), marks: { i: t.get("i") } });
        t.step(2, "Resto della divisione = cifra: <b>" + S[t.get("i")] + "</b>");
        t.set("n", Math.floor(t.get("n") / t.get("base")));
        t.step(3, "Elimino la cifra appena estratta dividendo per la base.");
        t.set("i", t.get("i") - 1);
        t.extra({ arr: S, marks: { i: t.get("i") } });
        t.step(4);
        t.step(5);
      }
      t.set("i", t.get("i") + 1);
      t.extra({ arr: S, range: [t.get("i"), MAX - 1], marks: { i: t.get("i") } });
      t.step(6, "Torno sulla prima cifra scritta: da qui in poi l'array è pieno.");
      let s = "";
      for (let k = t.get("i"); k < MAX; k++) s += S[k];
      t.print(inp.n + " in base " + inp.b + " = " + (s || "0"));
      t.step(7, "Stampo <b>dall'inizio alla fine</b>: le cifre escono nell'ordine giusto.");
    }
  });

  // --- Massimi locali ---------------------------------------
  FI.algo("massimi-locali", {
    title: "Azzerare gli elementi che non sono massimi locali",
    inputs: [{ name: "arr", label: "array", type: "text", value: "10 7 5 5 1 7 7 8 6 9" }],
    vars: ["i", "prec"],
    code: [
      "prec = A[0];",
      "if (A[0] <= A[1]) A[0] = 0;              /* primo elemento */",
      "for (i = 1; i < N-1; i++)                /* elementi interni */",
      "    if (A[i] <= prec || A[i] <= A[i+1]) {",
      "        prec = A[i];",
      "        A[i] = 0;",
      "    }",
      "    else prec = A[i];",
      "if (A[N-1] <= prec) A[N-1] = 0;          /* ultimo elemento */"
    ],
    run(inp, t) {
      const A = inp.arr.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
      if (A.length < 3) throw new Error("Servono almeno 3 elementi.");
      const N = A.length;
      const view = (i) => t.extra({ arr: A.slice(), mid: i, marks: { i: i } });
      t.set("prec", A[0]); view(0);
      t.step(0, "<b>prec</b> conserva il valore <b>originario</b> dell'elemento precedente, che potrebbe essere stato azzerato.");
      if (A[0] <= A[1]) A[0] = 0;
      view(0);
      t.step(1, "Il primo elemento ha un solo vicino: A[1].");
      for (let i = 1; i < N - 1; i++) {
        t.set("i", i); view(i);
        t.step(2, "Esamino A[" + i + "].");
        const cond = A[i] <= t.get("prec") || A[i] <= A[i + 1];
        t.step(3, "<code>A[" + i + "]=" + A[i] + " ≤ prec=" + t.get("prec") + "</code> oppure <code>≤ A[" + (i + 1) + "]=" + A[i + 1] + "</code> → <b>" + (cond ? "VERA: non è massimo locale" : "FALSA: è massimo locale") + "</b>");
        if (cond) {
          t.set("prec", A[i]); t.step(4, "Salvo il valore originario <b>prima</b> di distruggerlo.");
          A[i] = 0; view(i); t.step(5, "Azzero.");
        } else { t.set("prec", A[i]); view(i); t.step(7, "Lascio invariato, ma aggiorno comunque prec."); }
      }
      t.set("i", N - 1); view(N - 1);
      if (A[N - 1] <= t.get("prec")) A[N - 1] = 0;
      view(N - 1);
      t.print("[" + A.join(", ") + "]");
      t.step(8, "L'ultimo elemento ha un solo vicino: quello precedente, letto da <b>prec</b>. Restano solo i massimi locali.");
    }
  });

  // --- Palindroma -------------------------------------------
  FI.algo("palindroma", {
    title: "Verifica se una stringa è palindroma",
    inputs: [{ name: "s", label: "parola", type: "text", value: "ingegneria" }],
    vars: ["i", "j"],
    code: [
      "j = 0;",
      "while (j < 30 && Str[j] != '\\0') j++;   /* cerco il terminatore */",
      "j--;                                     /* ultimo carattere utile */",
      "i = 0;",
      "while (i < j && Str[i] == Str[j]) {",
      "    j--;",
      "    i++;",
      "}",
      "if (i >= j) printf(\"palindroma\"); else printf(\"non palindroma\");"
    ],
    run(inp, t) {
      const S = inp.s.split("").concat(["\\0"]);
      const view = (i, j) => t.extra({ arr: S, mid: i, hit: j, marks: { i: i === undefined ? -1 : i, j: j === undefined ? -1 : j } });
      t.set("j", 0); view(undefined, 0);
      t.step(0);
      while (S[t.get("j")] !== "\\0") {
        t.step(1, "Scorro: Str[" + t.get("j") + "] = '" + S[t.get("j")] + "'");
        t.set("j", t.get("j") + 1); view(undefined, t.get("j"));
      }
      t.step(1, "Trovato il terminatore <code>'\\0'</code> in posizione " + t.get("j") + ".");
      t.set("j", t.get("j") - 1); view(undefined, t.get("j"));
      t.step(2, "Arretro di uno: ultimo carattere <b>utile</b>.");
      t.set("i", 0); view(0, t.get("j"));
      t.step(3, "Due indici che si avvicinano dalle estremità.");
      while (true) {
        const c = t.get("i") < t.get("j") && S[t.get("i")] === S[t.get("j")];
        view(t.get("i"), t.get("j"));
        t.step(4, "<code>i &lt; j</code> → " + (t.get("i") < t.get("j")) + (t.get("i") < t.get("j") ? " &nbsp;·&nbsp; <code>'" + S[t.get("i")] + "' == '" + S[t.get("j")] + "'</code> → " + (S[t.get("i")] === S[t.get("j")]) : "") );
        if (!c) break;
        t.set("j", t.get("j") - 1); t.step(5);
        t.set("i", t.get("i") + 1); t.step(6);
        t.step(7);
      }
      const ok = t.get("i") >= t.get("j");
      t.print(ok ? "palindroma" : "non palindroma");
      t.step(8, ok ? "Gli indici si sono incontrati (o scavalcati) senza trovare differenze." : "Uscito per <b>differenza</b> fra i caratteri.");
    }
  });

  /* ---------------------------------------------------------
     Widget: tabella di verità interattiva
     --------------------------------------------------------- */
  function buildTruth(host) {
    host.classList.add("playground");
    host.innerHTML =
      '<div class="truth">' +
      '<div class="switches">' +
      '<button class="sw" data-v="a"><span class="dot"></span>C1</button>' +
      '<button class="sw" data-v="b"><span class="dot"></span>C2</button>' +
      "</div>" +
      '<div class="tvals"></div>' +
      '<div style="font-size:.82rem;color:var(--text-soft)">Clicca le due condizioni per cambiarne il valore di verità.</div>' +
      "</div>";
    const st = { a: false, b: false };
    const paint = () => {
      $$(".sw", host).forEach((s) => s.classList.toggle("on", st[s.dataset.v]));
      const rows = [
        ["!C1", !st.a],
        ["C1 && C2", st.a && st.b],
        ["C1 || C2", st.a || st.b],
        ["!(C1 && C2)", !(st.a && st.b)],
        ["!C1 || !C2", !st.a || !st.b]
      ];
      $(".tvals", host).innerHTML = rows
        .map((r) => '<div class="tval ' + (r[1] ? "t" : "f") + '"><b>' + esc(r[0]) + "</b> = " + (r[1] ? "VERO (1)" : "FALSO (0)") + "</div>")
        .join("");
    };
    host.addEventListener("click", (e) => {
      const s = e.target.closest(".sw");
      if (!s) return;
      st[s.dataset.v] = !st[s.dataset.v];
      paint();
    });
    paint();
  }

  /* ---------------------------------------------------------
     Widget: espressioni, tipi e conversioni
     --------------------------------------------------------- */
  function buildCasting(host) {
    host.classList.add("playground");
    host.innerHTML =
      '<div class="pg-row">' +
      '<div class="tr-field"><label>int n</label><input type="number" data-k="n" value="7"></div>' +
      '<div class="tr-field"><label>int m</label><input type="number" data-k="m" value="2"></div>' +
      '<div class="tr-field"><label>float x</label><input type="number" step="0.01" data-k="x" value="2.13"></div>' +
      "</div>" +
      '<div class="pg-table tbl-scroll"></div>';
    const calc = () => {
      const g = (k) => Number($('[data-k="' + k + '"]', host).value);
      const n = Math.trunc(g("n")), m = Math.trunc(g("m")), x = g("x");
      const idiv = m === 0 ? "ERRORE: divisione per zero" : String(Math.trunc(n / m));
      const imod = m === 0 ? "ERRORE: divisione per zero" : String(n % m);
      const rows = [
        ["n / m", "int", idiv, "divisione INTERA: la parte frazionaria viene troncata"],
        ["n % m", "int", imod, "resto della divisione intera"],
        ["(float)n / m", "float", m === 0 ? "inf" : String(round(n / m)), "un operando è float → l'altro viene promosso"],
        ["n * x", "float", String(round(n * x)), "int promosso a float, risultato float"],
        ["(int)(n * x)", "int", String(Math.trunc(n * x)), "casting esplicito: troncamento verso lo zero"],
        ["y = n * x", "int", String(Math.trunc(n * x)), "con y dichiarata int: l'assegnamento tronca il valore"],
        ["z = n", "float", round(n).toFixed(6), "con z dichiarata float: conversione senza perdita"]
      ];
      $(".pg-table", host).innerHTML =
        "<table style='margin:0'><tr><th>espressione</th><th>risultato</th><th>tipo</th><th>perché</th></tr>" +
        rows
          .map((r) =>
            "<tr><td><code>" + esc(r[0]) + "</code></td><td><b>" + esc(r[2]) + "</b></td>" +
            "<td><code>" + r[1] + "</code></td><td style='font-size:.9em;color:var(--text-soft)'>" + esc(r[3]) + "</td></tr>")
          .join("") +
        "</table>";
    };
    const round = (v) => Math.round(v * 1e6) / 1e6;
    $$("input", host).forEach((i) => i.addEventListener("input", calc));
    calc();
  }

  /* ---------------------------------------------------------
     Widget: printf / scanf
     --------------------------------------------------------- */
  function buildPrintf(host) {
    host.classList.add("playground");
    host.innerHTML =
      '<div class="pg-row">' +
      '<div class="tr-field" style="flex:1"><label>formato</label><input class="wide" data-k="f" style="width:100%" value="n vale %d, meta\' = %d\\nx = %.2f, iniziale = %c"></div>' +
      "</div>" +
      '<div class="pg-row">' +
      '<div class="tr-field"><label>int n</label><input type="number" data-k="n" value="18"></div>' +
      '<div class="tr-field"><label>float x</label><input type="number" step="0.01" data-k="x" value="3.14159"></div>' +
      '<div class="tr-field"><label>char c</label><input type="text" data-k="c" value="A" maxlength="1" style="width:60px"></div>' +
      "</div>" +
      '<div style="font-size:.8rem;color:var(--text-soft);margin-bottom:8px">Argomenti disponibili, nell\'ordine: <code>n</code>, <code>n/2</code>, <code>x</code>, <code>c</code>. Prova a togliere o aggiungere segnaposto e guarda che succede.</div>' +
      '<div class="pg-out"></div>';
    const calc = () => {
      const v = (k) => $('[data-k="' + k + '"]', host).value;
      const n = Math.trunc(Number(v("n"))) || 0, x = Number(v("x")) || 0, c = v("c") || " ";
      const args = [n, Math.trunc(n / 2), x, c];
      let ai = 0, warn = "";
      let out = v("f")
        .replace(/\\n/g, "\n").replace(/\\t/g, "\t")
        .replace(/%%/g, "\u0000")
        .replace(/%(\.\d+)?([dfcs])/g, (mm, prec, kind) => {
          if (ai >= args.length) { warn = "\n⚠ Più segnaposto che argomenti: in C stamperesti spazzatura dalla memoria."; return "?"; }
          const a = args[ai++];
          if (kind === "d") return String(Math.trunc(Number(a)));
          if (kind === "f") return Number(a).toFixed(prec ? Number(prec.slice(1)) : 6);
          if (kind === "c") return String(a)[0] || "";
          return String(a);
        })
        .replace(/\u0000/g, "%");
      if (ai < args.length) warn += "\n⚠ Argomenti in più rispetto ai segnaposto: vengono ignorati.";
      $(".pg-out", host).textContent = out + warn;
    };
    $$("input", host).forEach((i) => i.addEventListener("input", calc));
    calc();
  }

  /* ---------------------------------------------------------
     Widget: codici ASCII
     --------------------------------------------------------- */
  function buildAscii(host) {
    host.classList.add("playground");
    host.innerHTML =
      '<div class="pg-row">' +
      '<div class="tr-field"><label>carattere</label><input type="text" data-k="c" value="r" maxlength="1" style="width:70px"></div>' +
      "</div><div class=\"pg-out\"></div>";
    const calc = () => {
      const c = $('[data-k="c"]', host).value || " ";
      const code = c.charCodeAt(0);
      const isLow = c >= "a" && c <= "z", isUp = c >= "A" && c <= "Z";
      const delta = "A".charCodeAt(0) - "a".charCodeAt(0);
      const lines = [
        "'" + c + "'  ha codice ASCII  " + code,
        "",
        "'A' - 'a'  =  " + "A".charCodeAt(0) + " - " + "a".charCodeAt(0) + "  =  " + delta + "   (costante per TUTTE le lettere)",
        "",
        isLow
          ? "'" + c + "' + 'A' - 'a'  =  " + code + " + (" + delta + ")  =  " + (code + delta) + "  =  '" + String.fromCharCode(code + delta) + "'   → maiuscolo"
          : isUp
          ? "'" + c + "' è già maiuscolo: lo lascio invariato"
          : "'" + c + "' non è una lettera alfabetica: la condizione (c>='a' && c<='z') || (c>='A' && c<='Z') è FALSA",
        "",
        "condizione \"è minuscola\":  ('" + c + "' >= 'a' && '" + c + "' <= 'z')  →  " + (isLow ? "VERA" : "FALSA")
      ];
      $(".pg-out", host).textContent = lines.join("\n");
    };
    $$("input", host).forEach((i) => i.addEventListener("input", calc));
    calc();
  }

  /* ---------------------------------------------------------
     Widget: confronto di costo lineare vs dicotomica
     --------------------------------------------------------- */
  function buildCost(host) {
    host.classList.add("playground");
    host.innerHTML =
      '<div class="pg-row"><div class="tr-field" style="flex:1;min-width:200px"><label>numero di elementi N</label>' +
      '<input type="range" min="1" max="24" value="10" data-k="e" style="width:100%"></div></div>' +
      '<div class="pg-out"></div>';
    const calc = () => {
      const e = Number($('[data-k="e"]', host).value);
      const N = Math.pow(2, e);
      const lin = N, dic = e + 1;
      $(".pg-out", host).textContent =
        "N = 2^" + e + " = " + N.toLocaleString("it-IT") + " elementi\n\n" +
        "ricerca sequenziale : fino a " + lin.toLocaleString("it-IT") + " confronti\n" +
        "ricerca dicotomica  : al più " + dic + " confronti\n\n" +
        "rapporto: " + Math.round(lin / dic).toLocaleString("it-IT") + " volte meno lavoro";
    };
    $$("input", host).forEach((i) => i.addEventListener("input", calc));
    calc();
  }

  /* ---------------------------------------------------------
     Quiz
     --------------------------------------------------------- */
  function initQuiz() {
    $$(".q").forEach((q) => {
      const correct = Number(q.dataset.correct);
      $$(".opt", q).forEach((btn, i) => {
        btn.addEventListener("click", () => {
          if (q.classList.contains("answered")) return;
          q.classList.add("answered");
          $$(".opt", q).forEach((b, j) => {
            b.disabled = true;
            if (j === correct) b.classList.add("right");
            else if (j === i) b.classList.add("wrong");
          });
        });
      });
    });
  }

  /* ---------------------------------------------------------
     Indice automatico della pagina
     --------------------------------------------------------- */
  function initTOC() {
    $$(".toc").forEach((toc, n) => {
      const scope = toc.closest(".chapter") || document.querySelector("main") || document;
      const hs = $$("h2", scope);
      if (!hs.length) { toc.hidden = true; return; }
      const ol = document.createElement("ol");
      hs.forEach((h, i) => {
        if (!h.id) h.id = "s" + n + "-" + i;
        const li = document.createElement("li");
        li.innerHTML = '<a href="#' + h.id + '">' + esc(h.textContent) + "</a>";
        ol.appendChild(li);
      });
      toc.appendChild(ol);
    });
  }

  /* ---------------------------------------------------------
     Navigazione fra i capitoli
     Tutto sta in una sola pagina: cambiare capitolo non carica un
     nuovo documento, cambia solo quale sezione è visibile. Così la
     navigazione resta dentro l'app anche sul telefono.
     --------------------------------------------------------- */
  const WIDGETS = { truth: buildTruth, casting: buildCasting, printf: buildPrintf, ascii: buildAscii, cost: buildCost };

  function buildWidgets(root) {
    $$("[data-algo]", root).forEach(buildTracer);
    $$("[data-widget]", root).forEach((el) => {
      const f = WIDGETS[el.dataset.widget];
      if (f) f(el);
    });
  }

  function initRouter() {
    const chapters = $$(".chapter");
    const links = $$(".topbar nav a");
    if (!chapters.length) { buildWidgets(document); return; }

    const home = document.getElementById("home") || chapters[0];
    const built = Object.create(null);
    const BASE = document.title;

    // la posizione di scorrimento la decidiamo noi, non il ripristino automatico
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}

    function route() {
      const id = decodeURIComponent((location.hash || "").replace(/^#/, ""));
      const el = id ? document.getElementById(id) : null;
      let chapter = home, target = null;
      if (el) {
        if (el.classList.contains("chapter")) chapter = el;
        else { chapter = el.closest(".chapter") || home; target = el; }
      }

      chapters.forEach((c) => { c.hidden = c !== chapter; });

      if (!built[chapter.id]) { built[chapter.id] = 1; buildWidgets(chapter); }

      links.forEach((a) => {
        if (a.getAttribute("href") === "#" + chapter.id) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });

      const t = chapter.dataset.title;
      document.title = t && chapter !== home ? t + " — " + BASE : BASE;

      // il browser può tentare un proprio salto (ancora nativa o ripristino
      // della posizione dello storico): riapplichiamo dopo di lui
      const place = () => {
        if (target) target.scrollIntoView({ block: "start", behavior: "instant" });
        else window.scrollTo({ top: 0, behavior: "instant" });
      };
      place();
      requestAnimationFrame(place);
    }

    window.addEventListener("hashchange", route);
    // un tocco sulla voce di menu del capitolo corrente riporta in cima
    links.forEach((a) =>
      a.addEventListener("click", () => {
        if (a.getAttribute("href") === location.hash) window.scrollTo({ top: 0, behavior: "instant" });
      })
    );
    route();
  }

  /* ---------------------------------------------------------
     Avvio
     --------------------------------------------------------- */
  /* consultazione anche senza connessione (solo su http/https) */
  function initOffline() {
    if (!("serviceWorker" in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  function boot() {
    initTheme();
    initCode();
    initTOC();
    initQuiz();
    initRouter();
    initOffline();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
