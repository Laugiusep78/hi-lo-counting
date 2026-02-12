let runningCount = 0;
let numDecks = 1;
let cardsOut = 0;
let cardsPlayed = {};

function getDeckStats(decks) {
    return { total: decks * 52 };
}

let deckStats = getDeckStats(1);

function addCard(val) {
    const maxCards = numDecks * 4;
    if ((cardsPlayed[val] || 0) >= maxCards) return;

    // Hi-Lo Logic
    if (val >= 2 && val <= 6) runningCount++;
    else if (val >= 10 || val === 1) runningCount--;

    cardsPlayed[val] = (cardsPlayed[val] || 0) + 1;
    cardsOut++;

    updateDisplay();
}

function updateDisplay() {
    const remainingCards = Math.max(1, deckStats.total - cardsOut);
    const remainingDecks = remainingCards / 52;
    
    // True Count Calculation
    const trueCountValue = runningCount / remainingDecks;
    const tcRounded = Math.floor(trueCountValue * 10) / 10;

    document.getElementById('display').textContent = runningCount;
    document.getElementById('truecount').textContent = tcRounded;
    document.getElementById('cardsOut').textContent = `${cardsOut}/${deckStats.total}`;
    document.getElementById('deckDisplay').textContent = numDecks;

    // Gestione Puntata (Bet Manager)
    const baseUnit = parseFloat(document.getElementById('baseUnit').value) || 10;
    const betDisplay = document.getElementById('suggested-bet');
    const advice = document.getElementById('advice');

    if (tcRounded >= 1.5) {
        // Formula standard: (TC - 1) * Unità
        let units = Math.max(1, Math.floor(tcRounded));
        let betAmount = units * baseUnit;
        betDisplay.textContent = `Puntata: ${betAmount}€ (${units} Unità)`;
        betDisplay.style.color = "#ffd700";
        advice.textContent = "🔥 VANTAGGIO GIOCATORE";
        advice.style.color = "#4CAF50";
    } else {
        betDisplay.textContent = `Puntata: ${baseUnit}€ (1 Unità)`;
        betDisplay.style.color = "#ffffff";
        advice.textContent = "❄️ BANCO FAVORITO / NEUTRO";
        advice.style.color = "#f44336";
    }

    updateButtons();
    updateProbabilities(remainingCards);
}

function updateButtons() {
    document.querySelectorAll('.card-btn').forEach(btn => {
        const match = btn.onclick.toString().match(/addCard\((\d+)\)/);
        if (match) {
            const val = parseInt(match[1]);
            if ((cardsPlayed[val] || 0) >= numDecks * 4) btn.classList.add('used');
            else btn.classList.remove('used');
        }
    });
}

 function updateProbabilities(remaining) {
    const probSection = document.getElementById('probSection');
    const probGrid = document.getElementById('probGrid');
    let probs = [];

    // 1. Raccogliamo i dati di tutte le 13 carte
    for (let i = 1; i <= 13; i++) {
        let label = i === 1 ? 'A' : i === 11 ? 'J' : i === 12 ? 'Q' : i === 13 ? 'K' : i;
        let left = (numDecks * 4) - (cardsPlayed[i] || 0);
        let p = remaining > 0 ? (left / remaining) * 100 : 0;

        let typeClass = "neutral";
        if (i === 1 || i >= 10) typeClass = "bad";  // Alte (Rosse)
        else if (i >= 2 && i <= 6) typeClass = "good"; // Basse (Verdi)

        probs.push({ label, p, left, typeClass });
    }

    // 2. ORDINAMENTO: Dalla probabilità più alta alla più bassa
    probs.sort((a, b) => b.p - a.p);

    // 3. Renderizzazione della griglia ordinata
    probGrid.innerHTML = probs.map((x, index) => `
        <div class="prob-item ${x.typeClass}" style="${index === 0 ? 'border: 1px solid var(--gold); transform: scale(1.05);' : ''}">
            <span>${x.label}</span>
            <b>${x.p.toFixed(1)}%</b>
            <span class="prob-count">rimasti: ${x.left}</span>
            ${index === 0 ? '<small style="color:var(--gold); font-size:0.5rem;">TOP</small>' : ''}
        </div>
    `).join('');
    
    probSection.style.display = 'block';
}
function resetCount() {
    runningCount = 0; cardsOut = 0; cardsPlayed = {};
    deckStats = getDeckStats(numDecks);
    updateDisplay();
}

// GESTIONE TASTIERA (Frecce incluse)
document.addEventListener('keydown', (e) => {
    if (e.key === "ArrowUp") {
        numDecks = Math.min(numDecks + 1, 8);
        resetCount();
    } else if (e.key === "ArrowDown") {
        numDecks = Math.max(numDecks - 1, 1);
        resetCount();
    } else if (e.key.toLowerCase() === 'r') {
        resetCount();
    } else {
        const k = e.key.toLowerCase();
        if (k >= '2' && k <= '9') addCard(parseInt(k));
        else if (k === '0') addCard(10);
        else if (k === 'j') addCard(11);
        else if (k === 'q') addCard(12);
        else if (k === 'k') addCard(13);
        else if (k === '1' || k === 'a') addCard(1);
    }
});
function resetCount() {
            runningCount = 0;
            cardsOut = 0;
            lowOut = 0;
            highOut = 0;
            cardsPlayed = {};
            deckStats = getDeckStats(numDecks);
            updateDisplay();
            updateButtons();
            updateProbabilities();
        }

updateDisplay();
