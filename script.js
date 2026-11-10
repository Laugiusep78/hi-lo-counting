/**
 * Hi-Lo Pro & Bet
 * Card counter per il Blackjack — sistema Hi-Lo.
 *
 * Valori Hi-Lo:
 *   2–6  → +1
 *   7–9  →  0
 *   10, J, Q, K, A → −1
 *
 * True Count = Running Count / mazzi rimanenti
 */
(() => {
    'use strict';

    const STORAGE_KEY = 'hilo-pro-v1';
    const MIN_DECKS = 1;
    const MAX_DECKS = 8;
    const CARDS_PER_DECK = 52;
    const DEFAULT_BASE_UNIT = 10;

    const RANKS = [
        { value: 2, label: '2', hilo: 1, tone: 'low' },
        { value: 3, label: '3', hilo: 1, tone: 'low' },
        { value: 4, label: '4', hilo: 1, tone: 'low' },
        { value: 5, label: '5', hilo: 1, tone: 'low' },
        { value: 6, label: '6', hilo: 1, tone: 'low' },
        { value: 7, label: '7', hilo: 0, tone: 'neutral' },
        { value: 8, label: '8', hilo: 0, tone: 'neutral' },
        { value: 9, label: '9', hilo: 0, tone: 'neutral' },
        { value: 10, label: '10', hilo: -1, tone: 'high' },
        { value: 11, label: 'J', hilo: -1, tone: 'high' },
        { value: 12, label: 'Q', hilo: -1, tone: 'high' },
        { value: 13, label: 'K', hilo: -1, tone: 'high' },
        { value: 1, label: 'A', hilo: -1, tone: 'high' }
    ];

    const RANK_BY_VALUE = new Map(RANKS.map((rank) => [rank.value, rank]));
    const RANK_POSITION = new Map(RANKS.map((rank, index) => [rank.value, index]));
    const KEY_TO_VALUE = { j: 11, q: 12, k: 13, a: 1, '1': 1 };

    const nfDecimal = new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
    const nfMoney = new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    const el = {};

    let toastTimer = null;
    let state = defaultState();

    function defaultState() {
        return {
            decks: MIN_DECKS,
            baseUnit: DEFAULT_BASE_UNIT,
            played: {},
            history: []
        };
    }

    function clampInt(value, min, max, fallback) {
        const n = Number.parseInt(value, 10);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    }

    function round2(value) {
        return Math.round(value * 100) / 100;
    }

    function loadState() {
        const fallback = defaultState();

        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return fallback;

            const saved = JSON.parse(raw);
            const decks = clampInt(saved.decks, MIN_DECKS, MAX_DECKS, MIN_DECKS);
            const savedUnit = Number(saved.baseUnit);
            const baseUnit = Number.isFinite(savedUnit) && savedUnit >= 1
                ? Math.min(1_000_000, round2(savedUnit))
                : DEFAULT_BASE_UNIT;

            const perRank = decks * 4;
            const played = {};
            for (const rank of RANKS) {
                const count = clampInt(saved.played && saved.played[rank.value], 0, perRank, 0);
                if (count > 0) played[rank.value] = count;
            }

            let history = Array.isArray(saved.history)
                ? saved.history.filter((value) => RANK_BY_VALUE.has(value))
                : [];

            // Se la cronologia non combacia con le carte giocate, meglio perderla
            // che permettere un undo che falsa il conteggio.
            const historyCounts = {};
            for (const value of history) {
                historyCounts[value] = (historyCounts[value] || 0) + 1;
            }
            const consistent = RANKS.every(
                (rank) => (historyCounts[rank.value] || 0) === (played[rank.value] || 0)
            );
            if (!consistent) history = [];

            return { decks, baseUnit, played, history };
        } catch (error) {
            return fallback;
        }
    }

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                decks: state.decks,
                baseUnit: state.baseUnit,
                played: state.played,
                history: state.history
            }));
        } catch (error) {
            // Storage non disponibile (es. modalità privata): l'app funziona comunque.
        }
    }

    function getStats() {
        const total = state.decks * CARDS_PER_DECK;
        let out = 0;
        let running = 0;

        for (const rank of RANKS) {
            const count = state.played[rank.value] || 0;
            out += count;
            running += count * rank.hilo;
        }

        const remaining = Math.max(0, total - out);
        const remainingDecks = remaining / CARDS_PER_DECK;
        const trueCount = remainingDecks > 0 ? running / remainingDecks : 0;

        return { total, out, running, remaining, remainingDecks, trueCount };
    }

    function normalizeTrueCount(value) {
        return Math.abs(value) < 0.05 ? 0 : value;
    }

    function formatDecimal(value) {
        return nfDecimal.format(normalizeTrueCount(value));
    }

    function formatMoney(value) {
        return nfMoney.format(value);
    }

    function computeBet(trueCount) {
        if (trueCount >= 1.5) {
            const units = Math.max(1, Math.floor(trueCount));
            return { units, amount: round2(units * state.baseUnit) };
        }
        return { units: 1, amount: round2(state.baseUnit) };
    }

    function buildCardsGrid() {
        el.cardsGrid.innerHTML = RANKS.map((rank) => `
            <button type="button" class="card-btn ${rank.tone}" data-rank="${rank.value}"
                    aria-label="Aggiungi ${rank.label}">
                <span class="rank">${rank.label}</span>
                <span class="left" data-left aria-hidden="true"></span>
            </button>
        `).join('');
    }

    function render() {
        const stats = getStats();
        const trueCount = normalizeTrueCount(stats.trueCount);

        // Running count
        el.runningCount.textContent = stats.running;
        el.runningCount.dataset.tone = stats.running > 0 ? 'positive'
            : stats.running < 0 ? 'negative' : 'neutral';

        // Statistiche
        el.trueCount.textContent = formatDecimal(trueCount);
        el.trueCount.dataset.tone = trueCount > 0 ? 'positive'
            : trueCount < 0 ? 'negative' : 'neutral';
        el.cardsOut.innerHTML = `${stats.out}<small>/${stats.total}</small>`;
        el.deckCount.textContent = state.decks;

        renderAdvice(stats, trueCount);
        renderBet(trueCount);
        renderPenetration(stats);
        updateCardButtons();
        renderProbabilities(stats.remaining);

        el.deckMinus.disabled = state.decks <= MIN_DECKS;
        el.deckPlus.disabled = state.decks >= MAX_DECKS;
        el.unitMinus.disabled = state.baseUnit <= 1;
        el.unitPlus.disabled = state.baseUnit >= 1_000_000;
    }

    function renderAdvice(stats, trueCount) {
        let text;
        let tone;

        if (stats.out === 0) {
            text = 'In attesa di carte…';
            tone = 'neutral';
        } else if (stats.remaining === 0) {
            text = '🔄 Mazzo esaurito · fai un reset';
            tone = 'neutral';
        } else if (trueCount >= 2) {
            text = '🔥 Vantaggio giocatore';
            tone = 'good';
        } else if (trueCount >= 1.5) {
            text = '📈 Vantaggio lieve';
            tone = 'good';
        } else if (trueCount <= -1) {
            text = '❄️ Banco favorito';
            tone = 'bad';
        } else {
            text = '⚖️ Tavolo neutro';
            tone = 'neutral';
        }

        el.advice.textContent = text;
        el.advice.dataset.tone = tone;
    }

    function renderBet(trueCount) {
        const bet = computeBet(trueCount);
        const unitLabel = bet.units === 1 ? '1 unità' : `${bet.units} unità`;

        el.suggestedBet.innerHTML = `Puntata consigliata: <strong>${formatMoney(bet.amount)}</strong> ` +
            `<span class="bet-units">(${unitLabel})</span>`;
        el.suggestedBet.dataset.tone = bet.units > 1 ? 'good' : 'neutral';
    }

    function renderPenetration(stats) {
        const percent = stats.total > 0 ? (stats.out / stats.total) * 100 : 0;
        const rounded = Math.min(100, Math.round(percent));

        el.penetrationFill.style.width = `${percent}%`;
        el.penetrationFill.dataset.level = percent >= 75 ? 'high' : percent >= 40 ? 'mid' : 'low';
        el.penetrationBar.setAttribute('aria-valuenow', String(rounded));

        if (stats.out === 0) {
            el.penetrationLabel.textContent = 'Mazzo nuovo · 0% consumato';
            return;
        }

        const decksLeft = stats.remaining / CARDS_PER_DECK;
        const decksLabel = stats.remaining === 0 ? '0 mazzi' : `${formatDecimal(decksLeft)} mazzi`;
        el.penetrationLabel.textContent =
            `${rounded}% consumato · ${stats.remaining} carte (${decksLabel}) rimaste`;
    }

    function updateCardButtons() {
        const perRank = state.decks * 4;

        el.cardsGrid.querySelectorAll('[data-rank]').forEach((button) => {
            const value = Number(button.dataset.rank);
            const rank = RANK_BY_VALUE.get(value);
            const left = Math.max(0, perRank - (state.played[value] || 0));
            const exhausted = left === 0;

            button.disabled = exhausted;
            button.classList.toggle('used', exhausted);
            button.setAttribute('aria-label', `Aggiungi ${rank.label} (${left} rimaste)`);

            const badge = button.querySelector('[data-left]');
            if (badge) badge.textContent = left;
        });
    }

    function renderProbabilities(remaining) {
        const items = RANKS.map((rank) => {
            const left = Math.max(0, state.decks * 4 - (state.played[rank.value] || 0));
            const probability = remaining > 0 ? (left / remaining) * 100 : 0;
            return { ...rank, left, probability };
        }).sort((a, b) => b.probability - a.probability ||
            RANK_POSITION.get(a.value) - RANK_POSITION.get(b.value));

        // Evidenzia il "TOP" solo quando c'è una carta realmente più probabile
        // delle altre: con un mazzo nuovo sono tutte pari e non ha senso.
        const hasUniqueTop = items.length > 1 && items[0].probability > items[1].probability;

        el.probGrid.innerHTML = items.map((item, index) => {
            const isTop = index === 0 && hasUniqueTop && item.probability > 0;
            const leftLabel = item.left === 1 ? '1 rimasta' : `${item.left} rimaste`;

            return `
                <div class="prob-item ${item.tone}${isTop ? ' top' : ''}">
                    <span class="prob-rank">${item.label}</span>
                    <b>${item.probability.toFixed(1)}%</b>
                    <span class="prob-left">${leftLabel}</span>
                </div>
            `;
        }).join('');
    }

    function addCard(value) {
        const rank = RANK_BY_VALUE.get(value);
        if (!rank) return;

        const played = state.played[value] || 0;
        if (played >= state.decks * 4) {
            toast(`${rank.label}: tutte le copie sono già uscite`);
            return;
        }

        state.played[value] = played + 1;
        state.history.push(value);
        persist();
        render();
    }

    function undo() {
        if (state.history.length === 0) {
            toast('Nessuna carta da annullare');
            return;
        }

        const value = state.history.pop();
        const played = state.played[value] || 0;

        if (played > 1) state.played[value] = played - 1;
        else delete state.played[value];

        persist();
        render();
        toast(`Annullata: ${RANK_BY_VALUE.get(value).label}`);
    }

    function resetShoe() {
        const hadCards = state.history.length > 0;

        state.played = {};
        state.history = [];
        persist();
        render();
        toast(hadCards ? 'Conteggio azzerato' : 'Tavolo già pulito');
    }

    function changeDecks(delta) {
        const next = Math.min(MAX_DECKS, Math.max(MIN_DECKS, state.decks + delta));

        if (next === state.decks) {
            toast(delta > 0 ? `Massimo ${MAX_DECKS} mazzi` : `Minimo ${MIN_DECKS} mazzo`);
            return;
        }

        state.decks = next;
        state.played = {};
        state.history = [];
        persist();
        render();
        toast(`Mazzi: ${next} · conteggio azzerato`);
    }

    function stepBaseUnit(delta) {
        const next = Math.min(1_000_000, Math.max(1, round2(state.baseUnit + delta)));

        if (next === state.baseUnit) {
            toast(delta > 0 ? 'Limite massimo raggiunto' : 'L\'unità minima è 1 €');
            return;
        }

        state.baseUnit = next;
        el.baseUnit.value = String(next);
        persist();
        render();
    }

    function commitBaseUnit() {
        const parsed = Number.parseFloat(String(el.baseUnit.value).replace(',', '.'));

        if (!Number.isFinite(parsed) || parsed < 1) {
            el.baseUnit.value = String(state.baseUnit);
            toast('Inserisci un\'unità di almeno 1 €');
            return;
        }

        state.baseUnit = Math.min(1_000_000, round2(parsed));
        el.baseUnit.value = String(state.baseUnit);
        persist();
        render();
    }

    function toast(message) {
        if (!el.toast) return;

        el.toast.textContent = message;
        el.toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1800);
    }

    function bindEvents() {
        el.cardsGrid.addEventListener('click', (event) => {
            const button = event.target.closest('[data-rank]');
            if (!button || button.disabled) return;
            addCard(Number(button.dataset.rank));
        });

        el.undoBtn.addEventListener('click', undo);
        el.resetBtn.addEventListener('click', resetShoe);
        el.deckMinus.addEventListener('click', () => changeDecks(-1));
        el.deckPlus.addEventListener('click', () => changeDecks(1));

        el.baseUnit.addEventListener('input', () => {
            const parsed = Number.parseFloat(String(el.baseUnit.value).replace(',', '.'));
            if (Number.isFinite(parsed) && parsed >= 1) {
                state.baseUnit = Math.min(1_000_000, round2(parsed));
                persist();
                render();
            }
        });
        el.baseUnit.addEventListener('blur', commitBaseUnit);
        el.baseUnit.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                el.baseUnit.blur();
            }
        });

        el.unitMinus.addEventListener('click', () => stepBaseUnit(-1));
        el.unitPlus.addEventListener('click', () => stepBaseUnit(1));

        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            const target = event.target;
            const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable)) {
                return;
            }

            if (event.repeat) return;

            const key = event.key;

            if (key === 'ArrowUp') {
                event.preventDefault();
                changeDecks(1);
                return;
            }

            if (key === 'ArrowDown') {
                event.preventDefault();
                changeDecks(-1);
                return;
            }

            if (key === 'Backspace' || key === 'Delete') {
                event.preventDefault();
                undo();
                return;
            }

            const lower = key.toLowerCase();

            if (lower === 'r') {
                resetShoe();
                return;
            }

            if (key === '0') {
                addCard(10);
                return;
            }

            if (key >= '2' && key <= '9') {
                addCard(Number(key));
                return;
            }

            if (Object.prototype.hasOwnProperty.call(KEY_TO_VALUE, lower)) {
                addCard(KEY_TO_VALUE[lower]);
            }
        });
    }

    function init() {
        el.runningCount = document.getElementById('runningCount');
        el.trueCount = document.getElementById('trueCount');
        el.cardsOut = document.getElementById('cardsOut');
        el.deckCount = document.getElementById('deckCount');
        el.deckMinus = document.getElementById('deckMinus');
        el.deckPlus = document.getElementById('deckPlus');
        el.advice = document.getElementById('advice');
        el.suggestedBet = document.getElementById('suggestedBet');
        el.penetrationBar = document.getElementById('penetrationBar');
        el.penetrationFill = document.getElementById('penetrationFill');
        el.penetrationLabel = document.getElementById('penetrationLabel');
        el.probGrid = document.getElementById('probGrid');
        el.cardsGrid = document.getElementById('cardsGrid');
        el.undoBtn = document.getElementById('undoBtn');
        el.resetBtn = document.getElementById('resetBtn');
        el.baseUnit = document.getElementById('baseUnit');
        el.unitMinus = document.getElementById('unitMinus');
        el.unitPlus = document.getElementById('unitPlus');
        el.toast = document.getElementById('toast');

        state = loadState();
        el.baseUnit.value = String(state.baseUnit);

        buildCardsGrid();
        bindEvents();
        render();
    }

    init();
})();
