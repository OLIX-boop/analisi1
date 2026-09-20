# Analisi Matematica 1 — guida di studio interattiva

Guida di studio per **Analisi Matematica 1**, Ingegneria Informatica, Politecnico di Milano
(a.a. 2026/27, scaglione Mon-Ret, Prof. Giulia Meglioli).

Copre la **prima parte del programma**, cioè quella della **prima prova in itinere**:

| Sezione | Argomento | Argomenti | Dim. allo scritto |
|---|---|---:|---:|
| 1 | Numeri reali e complessi | 23 | 4 |
| 2 | Funzioni, successioni e limiti | 29 | 5 |
| 3 | Serie numeriche | 12 | 5 |

## Cosa c'è dentro

- **Piano di studio** (`index.html`) — avanzamento per sezione, ripasso programmato, struttura della prova, calendario settimanale agganciato agli orari delle lezioni.
- **Tre pagine di teoria** (`sezioni/`) — definizioni, teoremi, dimostrazioni a passi coperti, **grafici interattivi** (piano di Argand, radici *n*-esime, visualizzatore ε–N, gerarchia degli infiniti, somme parziali…) e box di errori tipici.
- **Dimostrazioni** (`teoremi.html`) — le 14 richieste allo scritto più quelle da orale, ciascuna spezzata in passi da rivelare uno alla volta, con l'idea chiave e le trappole.
- **Quesiti teorici** (`quesiti.html`) — tutti e 66 i quesiti ufficiali della prima parte, con risposta modello, in modalità flashcard con **ripetizione dilazionata** (box di Leitner: 1, 2, 4, 8, 16, 32 giorni).
- **Palestra esercizi** (`esercizi.html`) — esercizi con suggerimenti progressivi e svolgimento completo, filtrabili per sezione, tema e difficoltà.
- **Simulazione d'esame** (`simulazione.html`) — 60 minuti, 32 punti, tre parti, con le soglie reali (≥7/14, ≥5/10, ≥15/32) e autovalutazione sulle parti aperte.

Tutti i progressi (argomenti spuntati, statistiche dei test, stato del ripasso) sono salvati in
`localStorage`: restano sul dispositivo, non vengono inviati da nessuna parte.

## Come si usa

Aprilo online su GitHub Pages, oppure in locale:

```bash
python -m http.server 8765
```

e vai su <http://localhost:8765>.

## Struttura

```
index.html              piano di studio / dashboard
sezioni/1-numeri.html   Sezione 1 · numeri reali e complessi
sezioni/2-successioni.html
sezioni/3-serie.html
teoremi.html            le dimostrazioni, a passi coperti
quesiti.html            i 66 quesiti teorici (flashcard + elenco)
esercizi.html           palestra con suggerimenti progressivi
simulazione.html        prova cronometrata
assets/css/style.css    tema chiaro/scuro, layout, componenti
assets/js/plot.js       motore di grafici su canvas (nessuna dipendenza)
assets/js/app.js        tema, KaTeX, reveal, progressi, quiz, flashcard, timer
assets/js/data/         i CONTENUTI, separati dalla presentazione:
    topics.js             programma → checklist e barre di avanzamento
    teoremi.js            enunciati e dimostrazioni passo per passo
    quesiti.js            i 66 quesiti con risposta modello
    esercizi.js           esercizi con hint e svolgimenti
    quiz.js               banca di domande a risposta multipla
```

I contenuti stanno tutti in `assets/js/data/`: per aggiungere materiale **non serve toccare l'HTML**.

### Aggiungere materiale quando escono nuovi appunti

- **nuovo argomento a programma** → aggiungi una voce in `topics.js` (la checklist e le percentuali si aggiornano da sole);
- **nuova dimostrazione** → un oggetto in `teoremi.js` con `steps: [{cue, body}]`;
- **nuovo esercizio** → un oggetto in `esercizi.js` con `hints: []` e `sol`;
- **nuova domanda a risposta multipla** → un oggetto in `quiz.js` (la risposta corretta va in `a`, le opzioni vengono mescolate a ogni giro).

Nei file dati le stringhe con LaTeX usano ``r`…` `` (`String.raw`), così i backslash non vanno raddoppiati.

## Dipendenze

Solo [KaTeX](https://katex.org) da CDN per le formule e Google Fonts. Tutto il resto — grafici,
flashcard, quiz, timer — è JavaScript scritto a mano, senza framework né build step.

## Materiale del corso

I PDF pubblicati dalla docente su WeBeep sono nella radice del repository e sono collegati
dalla dashboard. **Sono materiale didattico della Prof. Giulia Meglioli**: se preferisci non
ridistribuirli pubblicamente, toglili dal repository e i link semplicemente non funzioneranno.

## Note

Guida **non ufficiale**, scritta come supporto allo studio personale. In caso di discrepanza,
fanno fede il programma ufficiale, gli appunti delle lezioni e i testi indicati in bibliografia:

- [1] S. Biagi, F. Punzo, *Lezioni di Analisi Matematica 1*, Esculapio (2024)
- [2] G. Catino, F. Punzo, *Analisi Matematica 1. Esercizi Svolti e Quesiti Teorici*, Esculapio (2025)
