/* ============================================================
   srs.js — ripetizione dilazionata adattiva (SM-2 semplificato)
   Ogni scheda ha un proprio fattore di facilità: quelle che sbagli
   tornano presto e spesso, quelle che sai si allontanano nel tempo.
   Niente estrazioni casuali: l'ordine è deciso da ritardo, errori
   accumulati e difficoltà.
   ============================================================ */
(function () {
  'use strict';
  const AM = (window.AM = window.AM || {});
  const GIORNO = 86400000;
  const PREFIX = 'srs2:';

  function oggiISO(t) {
    const d = new Date(t === undefined ? Date.now() : t);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function mezzanotte(t) {
    const d = new Date(t === undefined ? Date.now() : t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  const S = {
    EF_MIN: 1.3, EF_MAX: 2.8,

    stato: function (id) {
      return AM.store.get(PREFIX + id, { ef: 2.5, iv: 0, reps: 0, lapses: 0, due: 0, seen: 0, ultimo: 0 });
    },
    salva: function (id, s) { AM.store.set(PREFIX + id, s); },

    /** g: 0 non la so · 1 incerto · 2 la so · 3 facile */
    voto: function (id, g) {
      const s = S.stato(id);
      s.seen = (s.seen || 0) + 1;
      s.ultimo = Date.now();

      if (g === 0) {
        s.lapses++; s.reps = 0; s.iv = 0;
        s.ef = Math.max(S.EF_MIN, s.ef - 0.20);
      } else if (g === 1) {
        s.reps++;
        s.iv = s.reps === 1 ? 1 : Math.max(1, Math.round(s.iv * 1.15));
        s.ef = Math.max(S.EF_MIN, s.ef - 0.15);
      } else if (g === 2) {
        s.reps++;
        s.iv = s.reps === 1 ? 1 : s.reps === 2 ? 3 : Math.round(s.iv * s.ef);
      } else {
        s.reps++;
        s.iv = s.reps === 1 ? 2 : s.reps === 2 ? 5 : Math.round(s.iv * s.ef * 1.25);
        s.ef = Math.min(S.EF_MAX, s.ef + 0.10);
      }
      s.iv = Math.min(s.iv, 180);
      s.due = s.iv === 0 ? Date.now() : mezzanotte() + s.iv * GIORNO;
      S.salva(id, s);
      return s;
    },

    scaduta: function (id) { return S.stato(id).due <= Date.now(); },
    mai_vista: function (id) { return S.stato(id).seen === 0; },

    /** quanto urge una scheda: ritardo + errori + difficoltà */
    priorita: function (id) {
      const s = S.stato(id);
      const ritardo = Math.max(0, (Date.now() - s.due) / GIORNO);
      return s.lapses * 10 + Math.min(ritardo, 30) + (2.6 - s.ef) * 6;
    },

    /**
     * Costruisce la sessione del giorno.
     * pool: [{id, tipo, ...}]  ·  opts: {tot, nuove}
     * Ordine: prima le scadute per priorità, poi le nuove in ordine di
     * programma; il tutto alternato per tipo, così non escono venti
     * definizioni di fila.
     */
    sessione: function (pool, opts) {
      opts = opts || {};
      const tot = opts.tot || 25;
      const maxNuove = opts.nuove !== undefined ? opts.nuove : 8;

      const scadute = pool.filter(function (x) { return !S.mai_vista(x.id) && S.scaduta(x.id); })
        .sort(function (a, b) { return S.priorita(b.id) - S.priorita(a.id); });

      const nuove = pool.filter(function (x) { return S.mai_vista(x.id); });  // già in ordine di programma

      const quanteNuove = Math.min(maxNuove, nuove.length, Math.max(0, tot - Math.min(scadute.length, tot)));
      const scelte = scadute.slice(0, tot - quanteNuove).concat(nuove.slice(0, quanteNuove));

      return S.alterna(scelte);
    },

    /** round-robin fra i tipi, preservando l'ordine dentro ciascun tipo */
    alterna: function (lista) {
      const per = {};
      lista.forEach(function (x) { (per[x.tipo] = per[x.tipo] || []).push(x); });
      const tipi = Object.keys(per);
      const out = [];
      let fatto = false;
      while (!fatto) {
        fatto = true;
        for (let i = 0; i < tipi.length; i++) {
          const b = per[tipi[i]];
          if (b.length) { out.push(b.shift()); fatto = false; }
        }
      }
      return out;
    },

    statistiche: function (pool) {
      let scadute = 0, nuove = 0, apprendimento = 0, consolidate = 0, viste = 0;
      let p1 = 0, p2 = 0, p3 = 0;
      pool.forEach(function (x) {
        const s = S.stato(x.id);
        if (s.seen === 0) { nuove++; return; }
        viste++;
        if (S.scaduta(x.id)) scadute++;
        if (s.iv >= 14) consolidate++; else apprendimento++;
        if (s.reps >= 1) p1++;
        if (s.reps >= 2) p2++;
        if (s.reps >= 3) p3++;
      });
      return {
        tot: pool.length, nuove: nuove, viste: viste, scadute: scadute,
        apprendimento: apprendimento, consolidate: consolidate,
        p1: p1, p2: p2, p3: p3
      };
    },

    /** le schede che ti stanno dando più filo da torcere */
    difficili: function (pool, n) {
      return pool.filter(function (x) { return S.stato(x.id).lapses > 0; })
        .sort(function (a, b) {
          const sa = S.stato(a.id), sb = S.stato(b.id);
          return (sb.lapses - sa.lapses) || (sa.ef - sb.ef);
        }).slice(0, n || 5);
    },

    /* ---------- serie di giorni consecutivi ---------- */
    serie: function () { return AM.store.get('srs2:serie', { giorni: 0, ultimo: '', record: 0 }); },
    registraGiorno: function () {
      const st = S.serie(), oggi = oggiISO();
      if (st.ultimo === oggi) return st;
      const ieri = oggiISO(Date.now() - GIORNO);
      st.giorni = (st.ultimo === ieri) ? st.giorni + 1 : 1;
      st.ultimo = oggi;
      st.record = Math.max(st.record || 0, st.giorni);
      AM.store.set('srs2:serie', st);
      return st;
    },
    fatteOggi: function () {
      const k = 'srs2:conte:' + oggiISO();
      return AM.store.get(k, 0);
    },
    contaOggi: function () {
      const k = 'srs2:conte:' + oggiISO();
      const v = AM.store.get(k, 0) + 1;
      AM.store.set(k, v);
      return v;
    },

    azzera: function (pool) {
      pool.forEach(function (x) { AM.store.del(PREFIX + x.id); });
      AM.store.del('srs2:serie');
    },

    oggiISO: oggiISO
  };

  AM.SRS = S;
})();
