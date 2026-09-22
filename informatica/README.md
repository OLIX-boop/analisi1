# Fondamenti di Informatica — appunti

Appunti personali del corso di **Fondamenti di Informatica** (Politecnico di Milano, A.A. 2025/26),
rielaborati in una pagina unica con **simulazioni eseguibili passo passo**.

👉 **[Leggi gli appunti online](https://olix-boop.github.io/fondamenti-informatica/)**

Su telefono conviene installarli: apri il link in Safari (o Chrome) → Condividi → **Aggiungi a Home**.
Si comportano come un'app, a schermo intero, e funzionano anche senza connessione una volta caricati.

## Capitoli

| | Capitolo | Contenuto |
|---|---|---|
| 1 | [Problemi, esecutori, algoritmi](https://olix-boop.github.io/fondamenti-informatica/#cap1) | la terna (I, O, R), l'esecutore, definizione e proprietà di algoritmo, memorizzazione nei contenitori, le tre strutture di controllo, diagrammi di flusso |
| 2 | [Catalogo di algoritmi](https://olix-boop.github.io/fondamenti-informatica/#cap2) | divisione per sottrazioni ripetute, logaritmo intero, massimo di una sequenza, Euclide, ricerca sequenziale e dicotomica |
| 3 | [La macchina astratta C](https://olix-boop.github.io/fondamenti-informatica/#cap3) | componenti, identificatori, dichiarazioni e tipi, espressioni, condizioni, corto circuito, conversioni di tipo |
| 4 | [Istruzioni e programmi in C](https://olix-boop.github.io/fondamenti-informatica/#cap4) | assegnamento, `scanf`/`printf`, `if`/`else`, `while`, `do-while`, `for`, programmi completi commentati |
| 5 | [Array e stringhe](https://olix-boop.github.io/fondamenti-informatica/#cap5) | array e indici, ricerca con variabile sentinella, rappresentazione in base, massimi locali, stringhe e terminatore `'\0'` |

## Le parti interattive

Ogni riquadro con il pallino arancione è un **esecutore simulato**: si cambiano i dati in ingresso e
si segue l'esecuzione passo per passo, vedendo a ogni passo la riga corrente, il contenuto dei
contenitori, l'uscita prodotta e una nota che spiega *perché* quel passo viene eseguito.

Fra le altre: la ricerca dicotomica con la vista dell'array e i marcatori Inizio/Media/Fine, la sua
versione sbagliata che entra davvero in ciclo infinito, e widget su tabelle di verità, conversioni di
tipo, formati di `printf` e codici ASCII.

## Struttura

```
index.html            tutta l'opera: un capitolo per <section class="chapter">
manifest.webmanifest  per l'installazione sulla schermata Home
assets/style.css      foglio di stile (tema chiaro/scuro)
assets/app.js         navigazione fra capitoli, simulazioni, widget, quiz
assets/icon-*.png     icone dell'app
```

Una sola pagina: cambiare capitolo non carica un nuovo documento, cambia solo quale sezione è
visibile (indirizzi del tipo `#cap3`). Così la navigazione resta dentro l'app anche sul telefono,
e il tasto Indietro continua a funzionare. Nessuna dipendenza esterna: basta aprire `index.html`
in un browser, anche senza connessione.

### Per aggiungere un capitolo

Una nuova `<section class="chapter" id="capN" data-title="…" hidden>` in `index.html`, una voce nella
`<nav>` e una scheda nella sezione `#home`. Gli `id` interni vanno prefissati (`cN-…`) per non
collidere con quelli degli altri capitoli. Le simulazioni si registrano in `assets/app.js` con
`FI.algo("nome", {…})` e si inseriscono con `<div data-algo="nome"></div>`.

## Da aggiungere

Argomenti del programma non ancora coperti: codifica binaria dell'informazione, sottoprogrammi,
memorizzazione persistente mediante file, allocazione dinamica della memoria, ricorsione.

---

Il materiale didattico del corso (slide e testi del docente) **non** è incluso in questo repository:
queste pagine sono una rielaborazione personale, non una ridistribuzione.
