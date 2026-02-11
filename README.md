# 🃏 Hi-Lo Pro Card Counter & Bet Manager

Un'applicazione web leggera e veloce sviluppata in **JavaScript** per aiutare i giocatori di Blackjack a tenere traccia del conteggio delle carte utilizzando il sistema **Hi-Lo** con supporto multi-mazzo (da 1 a 8 mazzi francesi).

Include una gestione automatica della puntata suggerita in base al **True Count**.



## 🚀 Funzionalità

* **Conteggio Hi-Lo:** Traccia il *Running Count* in tempo reale.
* **True Count Automatico:** Calcola il *True Count* basandosi sui mazzi rimanenti effettivi (Formula: $RC / \text{Mazzi Rimanenti}$).
* **Bet Manager:** Calcola la puntata suggerita in unità di base in base al vantaggio attuale.
* **Supporto Multi-mazzo:** Gestisce da 1 a 8 mazzi.
* **Interfaccia Intuitiva:** Dark mode ottimizzata per la visibilità in ambienti poco illuminati.
* **Controlli da Tastiera:** Gestione rapida senza usare il mouse.

## 🛠️ Come utilizzarlo

1.  Scarica i file `index.html`, `style.css` e `script.js`.
2.  Mettili tutti nella stessa cartella.
3.  Apri `index.html` con il tuo browser web preferito (Chrome, Firefox, Edge, etc.).



## ⌨️ Scorciatoie da Tastiera

| Tasto | Azione |
| :--- | :--- |
| **2 - 9** | Registra carta di valore 2-9 |
| **0** | Registra carta 10 |
| **J, Q, K** | Registra Figure (-1) |
| **A** | Registra Asso (-1) |
| **↑ (Freccia Su)** | Aumenta numero di mazzi (Max 8) |
| **↓ (Freccia Giù)** | Diminuisci numero di mazzi (Min 1) |
| **R** | Reset completo del conteggio |

## 📐 Logica del Bet Manager

La puntata suggerita si basa sul `True Count` (TC):

* **TC < 1.5:** Puntata minima (1 unità base).
* **TC ≥ 1.5:** Punta `Math.floor(TC)` unità (es. se TC = 3.2, punta 3 unità).

## 📄 Note

* **Disclaimer:** Questo strumento è puramente educativo e informativo. Il conteggio delle carte non garantisce vincite e il Blackjack è un gioco d'azzardo.
* **Mazzi Rimanenti:** Il calcolo del True Count è estremamente preciso perché divide il *Running Count* per le carte rimanenti divise per 52, aggiornandosi a ogni carta.

## 🚨🚨 Importante

* **Testato su linux/windows; su altri sistemi operativi potrebbe non funzionare.**