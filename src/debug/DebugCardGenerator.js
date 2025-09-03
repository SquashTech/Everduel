/**
 * Debug Card Generator for Testing
 * Allows instant generation of any card without disrupting game flow
 */
import { CARD_DATABASE } from '../data/EmbeddedGameData.js';
import UnitFactory from '../utils/UnitFactory.js';

class DebugCardGenerator {
    constructor() {
        this.gameEngine = null;
        this.enabled = false;
        this.cardIndex = this.buildCardIndex();
    }

    initialize(gameEngine) {
        this.gameEngine = gameEngine;
        this.setupDebugCommands();
        console.log('🔧 Debug Card Generator initialized');
        console.log('Press ` (backtick) to open debug console');
    }

    buildCardIndex() {
        const index = new Map();
        
        Object.entries(CARD_DATABASE).forEach(([tier, cards]) => {
            cards.forEach(card => {
                index.set(card.id.toLowerCase(), { ...card, tier: parseInt(tier) });
                index.set(card.name.toLowerCase(), { ...card, tier: parseInt(tier) });
            });
        });
        
        return index;
    }

    setupDebugCommands() {
        let debugInput = '';
        let debugMode = false;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === '`') {
                e.preventDefault();
                debugMode = !debugMode;
                
                if (debugMode) {
                    this.showDebugOverlay();
                } else {
                    this.hideDebugOverlay();
                }
            }
            
            if (e.ctrlKey && e.shiftKey && e.key === 'G') {
                e.preventDefault();
                this.showQuickGenerate();
            }
        });
    }

    showDebugOverlay() {
        const existingOverlay = document.getElementById('debug-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'debug-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            padding: 15px;
            border: 2px solid #0f0;
            border-radius: 5px;
            font-family: monospace;
            z-index: 10000;
            min-width: 300px;
            max-height: 80vh;
            overflow-y: auto;
        `;

        overlay.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #0f0;">Debug Card Generator</h3>
            <input type="text" id="debug-card-search" placeholder="Enter card name or ID" style="
                width: 100%;
                padding: 5px;
                background: #000;
                color: #0f0;
                border: 1px solid #0f0;
                margin-bottom: 10px;
            ">
            <div id="debug-suggestions" style="max-height: 200px; overflow-y: auto; margin-bottom: 10px;"></div>
            <button id="debug-generate-btn" style="
                width: 100%;
                padding: 5px;
                background: #0f0;
                color: #000;
                border: none;
                cursor: pointer;
                font-weight: bold;
                margin-bottom: 5px;
            ">Generate Card</button>
            <button id="debug-fill-hand" style="
                width: 100%;
                padding: 5px;
                background: #ff0;
                color: #000;
                border: none;
                cursor: pointer;
                font-weight: bold;
                margin-bottom: 5px;
            ">Fill Hand (Random)</button>
            <button id="debug-clear-hand" style="
                width: 100%;
                padding: 5px;
                background: #f00;
                color: #fff;
                border: none;
                cursor: pointer;
                font-weight: bold;
                margin-bottom: 10px;
            ">Clear Hand</button>
            <div style="font-size: 12px; color: #888;">
                Shortcuts:<br>
                • Backtick - Toggle this overlay<br>
                • Ctrl+Shift+G - Quick generate<br>
                • Type to search cards
            </div>
        `;

        document.body.appendChild(overlay);

        const searchInput = document.getElementById('debug-card-search');
        const suggestionsDiv = document.getElementById('debug-suggestions');
        const generateBtn = document.getElementById('debug-generate-btn');
        const fillHandBtn = document.getElementById('debug-fill-hand');
        const clearHandBtn = document.getElementById('debug-clear-hand');

        searchInput.addEventListener('input', () => {
            this.updateSuggestions(searchInput.value, suggestionsDiv);
        });

        generateBtn.addEventListener('click', () => {
            const cardName = searchInput.value;
            if (cardName) {
                this.generateCard(cardName);
                searchInput.value = '';
                suggestionsDiv.innerHTML = '';
            }
        });

        fillHandBtn.addEventListener('click', () => {
            this.fillHandRandom();
        });

        clearHandBtn.addEventListener('click', () => {
            this.clearHand();
        });

        searchInput.focus();
    }

    hideDebugOverlay() {
        const overlay = document.getElementById('debug-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    updateSuggestions(searchTerm, suggestionsDiv) {
        if (!searchTerm) {
            suggestionsDiv.innerHTML = '';
            return;
        }

        const matches = [];
        const term = searchTerm.toLowerCase();

        this.cardIndex.forEach((card, key) => {
            if (key.includes(term) || card.name.toLowerCase().includes(term)) {
                if (!matches.find(m => m.id === card.id)) {
                    matches.push(card);
                }
            }
        });

        suggestionsDiv.innerHTML = matches.slice(0, 10).map(card => `
            <div class="debug-suggestion" style="
                padding: 5px;
                cursor: pointer;
                border-bottom: 1px solid #333;
                color: #0f0;
            " data-card-id="${card.id}">
                <strong>${card.name}</strong> (T${card.tier}) - ${card.attack}/${card.health}
                ${card.ability ? `<br><small style="color: #888;">${card.ability.substring(0, 50)}...</small>` : ''}
            </div>
        `).join('');

        suggestionsDiv.querySelectorAll('.debug-suggestion').forEach(div => {
            div.addEventListener('click', () => {
                const cardId = div.dataset.cardId;
                document.getElementById('debug-card-search').value = cardId;
                suggestionsDiv.innerHTML = '';
            });
            div.addEventListener('mouseenter', () => {
                div.style.background = '#111';
            });
            div.addEventListener('mouseleave', () => {
                div.style.background = 'transparent';
            });
        });
    }

    showQuickGenerate() {
        const cardName = prompt('Enter card name or ID to generate:');
        if (cardName) {
            this.generateCard(cardName);
        }
    }

    generateCard(cardNameOrId) {
        const searchTerm = cardNameOrId.toLowerCase();
        const cardData = this.cardIndex.get(searchTerm);
        
        if (!cardData) {
            console.error(`Card not found: ${cardNameOrId}`);
            this.showNotification(`Card not found: ${cardNameOrId}`, 'error');
            return;
        }

        const state = this.gameEngine.gameState.getState();
        const playerHand = state.players.player.hand;
        
        if (playerHand.length >= 3) {
            console.warn('Hand is full!');
            this.showNotification('Hand is full!', 'warning');
            return;
        }

        const newCard = UnitFactory.createUnit(cardData);
        
        this.gameEngine.gameState.dispatch({
            type: 'ADD_CARD_TO_HAND',
            payload: {
                player: 'player',
                card: newCard
            }
        });

        console.log(`Generated card: ${cardData.name}`);
        this.showNotification(`Generated: ${cardData.name}`, 'success');
        
        this.gameEngine.eventBus.emit('ui:update', {
            component: 'hand',
            player: 'player'
        });
    }

    fillHandRandom() {
        const state = this.gameEngine.gameState.getState();
        const playerHand = state.players.player.hand;
        const cardsToAdd = Math.min(3 - playerHand.length, 3);
        
        if (cardsToAdd <= 0) {
            this.showNotification('Hand is already full!', 'warning');
            return;
        }

        const allCards = Array.from(this.cardIndex.values());
        
        for (let i = 0; i < cardsToAdd; i++) {
            const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
            const newCard = UnitFactory.createUnit(randomCard);
            
            this.gameEngine.gameState.dispatch({
                type: 'ADD_CARD_TO_HAND',
                payload: {
                    player: 'player',
                    card: newCard
                }
            });
        }

        this.showNotification(`Added ${cardsToAdd} random cards`, 'success');
        
        this.gameEngine.eventBus.emit('ui:update', {
            component: 'hand',
            player: 'player'
        });
    }

    clearHand() {
        this.gameEngine.gameState.dispatch({
            type: 'CLEAR_HAND',
            payload: { player: 'player' }
        });

        this.showNotification('Hand cleared', 'info');
        
        this.gameEngine.eventBus.emit('ui:update', {
            component: 'hand',
            player: 'player'
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50px;
            right: 10px;
            padding: 10px 15px;
            background: ${type === 'error' ? '#f00' : type === 'warning' ? '#ff0' : type === 'success' ? '#0f0' : '#00f'};
            color: ${type === 'warning' ? '#000' : '#fff'};
            border-radius: 5px;
            font-family: monospace;
            font-weight: bold;
            z-index: 10001;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

export default DebugCardGenerator;