/* ============================================================
   materie.js — registro delle materie
   Ogni corso dichiara il proprio programma in <materia>/data/topics.js
   e si registra qui. L'hub carica i topics di tutte le materie per
   mostrare l'avanzamento complessivo; le pagine di una materia
   caricano solo i propri.
   ============================================================ */
(function () {
  'use strict';
  const AM = (window.AM = window.AM || {});
  AM.MATERIE = AM.MATERIE || {};
  AM.TOPIC_INDEX = AM.TOPIC_INDEX || {};

  /**
   * m = { key, nome, sottotitolo, base, prefisso, icona, sezioni, nota }
   *   key       identificatore breve, usato anche come chiave di avanzamento
   *   base      percorso della materia rispetto alla radice del sito ("analisi/")
   *   prefisso  lettera iniziale degli id degli argomenti ("s" per s1-01, "g" per g1-01)
   *   sezioni   [{ n, slug, titolo, sommario, topics: [{id, t, mark, q}] }]
   */
  AM.registraMateria = function (m) {
    AM.MATERIE[m.key] = m;
    AM.SEZIONI = m.sezioni;   // comodo per le pagine della singola materia
    m.sezioni.forEach(function (s) {
      AM.TOPIC_INDEX[m.prefisso + s.n] = s.topics.map(function (t) { return t.id; });
    });
    AM.TOPIC_INDEX[m.key] = m.sezioni.reduce(function (acc, s) {
      return acc.concat(s.topics.map(function (t) { return t.id; }));
    }, []);
    return m;
  };

  AM.materia = function (key) { return AM.MATERIE[key]; };

  AM.contaArgomenti = function (key) {
    return (AM.TOPIC_INDEX[key] || []).length;
  };

  AM.contaFatti = function (key) {
    if (!AM.store) return 0;
    return (AM.TOPIC_INDEX[key] || []).filter(function (id) {
      return AM.store.get('topic:' + id, false);
    }).length;
  };

  /** Rende la checklist di una sezione dentro un contenitore. */
  AM.renderChecklist = function (sel, sezN, key) {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return;
    const sezioni = key ? (AM.MATERIE[key] || {}).sezioni : AM.SEZIONI;
    if (!sezioni) return;
    const mat = key ? AM.MATERIE[key]
      : Object.keys(AM.MATERIE).map(function (k) { return AM.MATERIE[k]; })
          .find(function (x) { return x.sezioni === sezioni; });
    const ql = (mat && mat.qLabel) || '';
    // etichette delle stelline: ufficiali per Analisi, redazionali altrove
    const lab = (mat && mat.markLabels) || { '*': 'dim. scritto', '**': 'dim. orale' };
    const s = sezioni.find(function (x) { return x.n === sezN; });
    if (!s) return;
    el.innerHTML = '<ul class="checklist">' + s.topics.map(function (t) {
      return '<li><input type="checkbox" id="cb-' + t.id + '" data-topic="' + t.id + '">' +
        '<label for="cb-' + t.id + '">' + t.t +
        (t.mark === '*' ? ' <span class="badge star">' + lab['*'] + '</span>'
          : t.mark === '**' ? ' <span class="badge star2">' + lab['**'] + '</span>' : '') +
        (t.q && t.q !== '—' ? ' <span class="badge">' + ql + t.q + '</span>' : '') +
        '</label></li>';
    }).join('') + '</ul>';
    el.querySelectorAll('input[data-topic]').forEach(function (cb) {
      cb.checked = AM.store.get('topic:' + cb.dataset.topic, false);
      cb.addEventListener('change', function () {
        AM.store.set('topic:' + cb.dataset.topic, cb.checked);
        AM.refreshProgress();
      });
    });
    AM.refreshProgress();
    AM.typeset(el);
  };
})();
