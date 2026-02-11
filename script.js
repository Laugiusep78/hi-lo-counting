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

    for (let i = 1; i <= 13; i++) {
        let label = i === 1 ? 'A' : i === 11 ? 'J' : i === 12 ? 'Q' : i === 13 ? 'K' : i;
        let left = (numDecks * 4) - (cardsPlayed[i] || 0);
        let p = (left / remaining) * 100;
        probs.push({ label, p });
    }

    const top = probs.sort((a,b) => b.p - a.p).slice(0, 3);
    probGrid.innerHTML = top.map(x => `
        <div class="prob-item">${x.label}: <b>${x.p.toFixed(1)}%</b></div>
    `).join('');
    probSection.style.display = 'grid';
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

updateDisplay();