import { CHAMPIONS, SPELL_TOKENS } from '../data/EmbeddedGameData.js';

/**
 * Spellbook Component
 * Manages the spellbook UI and spell purchasing during gameplay
 */
export default class SpellbookComponent {
    constructor() {
        this.champion = null;
        this.spellbook = [];
        this.isPortalOpen = false;
        this.gameEngine = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the spellbook component
     */
    initialize(gameEngine, champion) {
        this.gameEngine = gameEngine;
        this.champion = champion;
        
        // Deep copy the spellbook to track stocks independently
        if (champion && champion.spellbook) {
            this.spellbook = champion.spellbook.map(spell => ({
                ...spell,
                currentStock: spell.stock
            }));
        }
        
        this.setupEventListeners();
        this.updateSpellbookButton();
        
        this.isInitialized = true;
        console.log(`📖 SpellbookComponent initialized for ${champion?.name || 'no champion'}`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Spellbook button
        const spellbookBtn = document.getElementById('spellDraftBtn');
        if (spellbookBtn) {
            spellbookBtn.addEventListener('click', () => {
                this.showSpellbook();
            });
        }

        // Modal close buttons
        const spellbookCloseBtn = document.getElementById('spellbookCloseBtn');
        if (spellbookCloseBtn) {
            spellbookCloseBtn.addEventListener('click', () => {
                this.hideSpellbook();
            });
        }

        const portalCloseBtn = document.getElementById('portalCloseBtn');
        if (portalCloseBtn) {
            portalCloseBtn.addEventListener('click', () => {
                this.hidePortal();
            });
        }

        // Click outside modal to close
        const spellbookModal = document.getElementById('spellbookModal');
        if (spellbookModal) {
            spellbookModal.addEventListener('click', (e) => {
                if (e.target === spellbookModal) {
                    this.hideSpellbook();
                }
            });
        }

        const portalModal = document.getElementById('portalModal');
        if (portalModal) {
            portalModal.addEventListener('click', (e) => {
                if (e.target === portalModal) {
                    this.hidePortal();
                }
            });
        }
    }

    /**
     * Update the spellbook button text based on state
     */
    updateSpellbookButton() {
        const btn = document.getElementById('spellDraftBtn');
        if (!btn) return;

        if (!this.champion) {
            btn.style.display = 'none';
            return;
        }

        btn.style.display = 'block';
        
        if (this.isPortalOpen) {
            btn.innerHTML = '🌟 Portal Open 🌟';
            btn.classList.add('portal-open');
        } else if (this.isSpellbookEmpty()) {
            btn.innerHTML = '✨ Open Portal ✨';
            btn.classList.add('portal-ready');
        } else {
            btn.innerHTML = '📖 Spellbook 📖';
            btn.classList.remove('portal-open', 'portal-ready');
        }
    }

    /**
     * Check if spellbook is empty (all spells out of stock)
     */
    isSpellbookEmpty() {
        return this.spellbook.every(spell => spell.currentStock === 0);
    }

    /**
     * Show the spellbook modal
     */
    showSpellbook() {
        if (!this.champion) {
            console.error('No champion selected');
            return;
        }

        if (this.isPortalOpen) {
            this.showPortal();
            return;
        }

        if (this.isSpellbookEmpty()) {
            // Transform to portal
            this.openPortal();
            return;
        }

        const modal = document.getElementById('spellbookModal');
        if (!modal) return;

        this.populateSpellbook();
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        console.log('📖 Spellbook opened');
    }

    /**
     * Hide the spellbook modal
     */
    hideSpellbook() {
        const modal = document.getElementById('spellbookModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }

    /**
     * Populate spellbook with available spells
     */
    populateSpellbook() {
        const container = document.getElementById('spellbookSpells');
        if (!container) return;

        container.innerHTML = '';

        this.spellbook.forEach(spell => {
            const spellCard = this.createSpellCard(spell);
            container.appendChild(spellCard);
        });

        this.updateSpellbookStatus();
        this.updateSpellbookGoldDisplay();
    }

    /**
     * Create a spell card element (matching Champion Select format)
     */
    createSpellCard(spell) {
        const wrapper = document.createElement('div');
        wrapper.className = 'spell-card-with-button';

        // Create the game card using the same method as Champion Select
        const gameCard = this.createGameCard(spell, 'spell');
        wrapper.appendChild(gameCard);

        // Create buy button below the card
        const buyButton = document.createElement('button');
        const availability = this.checkSpellAvailability(spell);
        
        buyButton.className = `spell-buy-button ${availability.available ? '' : 'disabled'}`;
        buyButton.innerHTML = availability.available 
            ? `${spell.cost} 💰 Buy Spell` 
            : availability.reason;
        buyButton.disabled = !availability.available;

        if (availability.available) {
            buyButton.addEventListener('click', () => {
                this.buySpell(spell);
            });
        }

        wrapper.appendChild(buyButton);
        
        // Add stock indicator below the buy button
        const stockIndicator = document.createElement('div');
        stockIndicator.className = 'spell-stock-indicator';
        stockIndicator.textContent = `Remaining: ${spell.currentStock}/${spell.stock || spell.maxStock || spell.currentStock}`;
        
        // Style the stock indicator
        stockIndicator.style.fontSize = '12px';
        stockIndicator.style.color = spell.currentStock > 0 ? '#4CAF50' : '#f44336';
        stockIndicator.style.fontWeight = 'bold';
        stockIndicator.style.textAlign = 'center';
        stockIndicator.style.marginTop = '4px';
        
        wrapper.appendChild(stockIndicator);
        
        return wrapper;
    }

    /**
     * Check if a spell can be purchased by the player
     */
    checkSpellAvailability(spell) {
        if (!this.gameEngine) {
            return { available: false, reason: 'Game not ready' };
        }

        const state = this.gameEngine.gameState.getState();
        const player = state.players.player;

        // Check stock first
        if (spell.currentStock <= 0) {
            return { available: false, reason: 'Out of Stock' };
        }

        // Check if hand is full
        if (player.hand.length >= 3) {
            return { available: false, reason: 'Hand Full (3/3)' };
        }

        // Check if player has enough gold
        if (player.gold < spell.cost) {
            return { available: false, reason: `Need ${spell.cost} 💰` };
        }

        return { available: true, reason: null };
    }

    /**
     * Create a game card matching the exact Champion Select appearance
     */
    createGameCard(cardData, type) {
        const card = document.createElement('div');
        card.className = `game-card game-card--hand ${cardData.color}`;
        card.style.width = '165px'; // Match battlefield card width
        card.style.height = '140px'; // Match battlefield card height

        // Champions have crown indicator, spells have no tier indicator
        // Only regular units have tier indicators
        // Champions are detected by having a spellbook property
        const isChampion = type === 'unit' && cardData.spellbook && cardData.spellbook.length > 0;
        let tierIndicatorHTML = '';
        if (type === 'unit' && cardData.tier && !isChampion) {
            tierIndicatorHTML = `<div class="tier-indicator">${cardData.tier}</div>`;
        } else if (isChampion) {
            tierIndicatorHTML = `<div class="crown-indicator">👑</div>`;
        }

        // Card header - same format as in-game
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        const nameDiv = document.createElement('div');
        nameDiv.className = 'card-name';
        nameDiv.textContent = cardData.name;
        cardHeader.appendChild(nameDiv);
        
        // Add tier indicator if needed
        if (tierIndicatorHTML) {
            card.innerHTML = tierIndicatorHTML;
        }
        card.appendChild(cardHeader);

        // Card ability - same format as in-game
        const abilityDiv = document.createElement('div');
        abilityDiv.className = 'card-ability';
        const ability = type === 'spell' ? cardData.description : cardData.ability;
        abilityDiv.textContent = ability || '';
        card.appendChild(abilityDiv);

        // Card stats - same format as in-game
        const statsDiv = document.createElement('div');
        statsDiv.className = 'card-stats';
        
        if (type === 'unit') {
            // Champions and units show attack/health with same icons as in-game
            const attackDiv = document.createElement('div');
            attackDiv.className = 'stat-attack';
            const attackIcon = document.createElement('span');
            attackIcon.className = 'stat-icon';
            attackIcon.textContent = '⚔️';
            const attackValue = document.createElement('span');
            attackValue.className = 'stat-value';
            attackValue.textContent = cardData.attack.toString();
            attackDiv.appendChild(attackIcon);
            attackDiv.appendChild(attackValue);
            
            const healthDiv = document.createElement('div');
            healthDiv.className = 'stat-health';
            const healthIcon = document.createElement('span');
            healthIcon.className = 'stat-icon';
            healthIcon.textContent = '❤️';
            const healthValue = document.createElement('span');
            healthValue.className = 'stat-value';
            healthValue.textContent = cardData.health.toString();
            healthDiv.appendChild(healthIcon);
            healthDiv.appendChild(healthValue);
            
            statsDiv.appendChild(attackDiv);
            statsDiv.appendChild(healthDiv);
        }
        // Spells have empty stats div like in-game spell cards
        card.appendChild(statsDiv);

        // Card tags - same format as in-game
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'card-tags';
        if (cardData.tags && cardData.tags.length > 0) {
            // Show all tags
            cardData.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'tag';
                tagSpan.textContent = tag;
                tagsDiv.appendChild(tagSpan);
            });
        }
        card.appendChild(tagsDiv);

        return card;
    }

    /**
     * Buy a spell
     */
    buySpell(spell) {
        if (!this.gameEngine) {
            console.error('Game engine not initialized');
            return;
        }

        const state = this.gameEngine.gameState.getState();
        const player = state.players.player;

        // Check if player has enough gold
        if (player.gold < spell.cost) {
            this.showNotification('Not enough gold!', 'error');
            return;
        }

        // Check if hand is full
        if (player.hand.length >= 3) {
            this.showNotification('Hand is full!', 'error');
            return;
        }

        // Check stock
        if (spell.currentStock <= 0) {
            this.showNotification('Out of stock!', 'error');
            return;
        }

        // Process the purchase - this will update the GameState
        const newState = this.gameEngine.gameState.dispatch({
            type: 'BUY_SPELL',
            payload: {
                spell: spell,
                playerId: 'player'
            }
        });

        // Check if the purchase was successful (state changed)
        if (newState !== state) {
            console.log(`✅ Spell purchase successful: ${spell.name}`);
            
            // Reduce local stock
            spell.currentStock--;

            // Update UI
            this.populateSpellbook();
            this.updateSpellbookStatus();
            
            // Check if spellbook is now empty
            if (this.isSpellbookEmpty()) {
                this.hideSpellbook();
                this.updateSpellbookButton();
            }

            // Verify the spell was added to hand
            const updatedPlayer = newState.players.player;
            console.log(`Player hand after purchase:`, updatedPlayer.hand);
            console.log(`Player gold after purchase: ${updatedPlayer.gold}`);

            // CRITICAL FIX: Trigger UI refresh to update main game UI (hand, gold display, etc.)
            this.gameEngine.eventBus.emit('ui:refresh');

            this.showNotification(`Bought ${spell.name}!`, 'success');
            console.log(`✨ Spell purchased: ${spell.name}`);
        } else {
            console.error('❌ Failed to purchase spell - state not updated');
            console.log('Current player state:', state.players.player);
            console.log('Spell details:', spell);
        }
    }

    /**
     * Update spellbook status text
     */
    updateSpellbookStatus() {
        const status = document.getElementById('spellbookStatus');
        if (!status) return;

        const totalSpells = this.spellbook.reduce((sum, spell) => sum + spell.currentStock, 0);
        
        if (totalSpells === 0) {
            status.innerHTML = 'All spells sold out! Portal ready to open!';
            status.classList.add('portal-ready');
        } else {
            status.innerHTML = `${totalSpells} spell${totalSpells !== 1 ? 's' : ''} remaining`;
            status.classList.remove('portal-ready');
        }
    }

    /**
     * Update the gold display in the spellbook header
     */
    updateSpellbookGoldDisplay() {
        // Find or create gold display element
        let goldDisplay = document.getElementById('spellbookGoldDisplay');
        if (!goldDisplay) {
            // Create and add gold display to header
            const header = document.querySelector('.spellbook-header');
            if (header) {
                goldDisplay = document.createElement('div');
                goldDisplay.id = 'spellbookGoldDisplay';
                goldDisplay.className = 'spellbook-gold-display';
                header.appendChild(goldDisplay);
            }
        }
        
        if (!goldDisplay || !this.gameEngine) return;

        const state = this.gameEngine.gameState.getState();
        const playerGold = state.players.player.gold;
        goldDisplay.innerHTML = `💰 <span>${playerGold}</span>`;
    }

    /**
     * Open the portal (when spellbook is empty)
     */
    openPortal() {
        this.isPortalOpen = true;
        this.updateSpellbookButton();
        this.showPortal();
        console.log('🌟 Portal opened!');
    }

    /**
     * Show the portal modal
     */
    showPortal() {
        const modal = document.getElementById('portalModal');
        if (!modal) return;

        this.populatePortal();
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    /**
     * Hide the portal modal
     */
    hidePortal() {
        const modal = document.getElementById('portalModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }

    /**
     * Populate portal with champion card
     */
    populatePortal() {
        const container = document.getElementById('championPortalCard');
        const summonBtn = document.getElementById('summonChampionBtn');
        
        if (!container || !summonBtn) return;

        // Clear container
        container.innerHTML = '';

        // Create the champion card using the same format as in Champion Selection
        const gameCard = this.createGameCard(this.champion, 'unit');
        
        // Create wrapper with cost info below like in Champion Selection
        const wrapper = document.createElement('div');
        wrapper.className = 'card-with-info';
        wrapper.appendChild(gameCard);
        
        // Add cost info below the card
        const infoDiv = document.createElement('div');
        infoDiv.className = 'card-info-below';
        infoDiv.innerHTML = `<div class="card-cost">${this.champion.cost} 💰</div>`;
        wrapper.appendChild(infoDiv);
        
        container.appendChild(wrapper);

        // Setup buy button (changed from "summon")
        const state = this.gameEngine.gameState.getState();
        const playerGold = state.players.player.gold;
        const canAfford = playerGold >= this.champion.cost;
        
        if (canAfford) {
            summonBtn.innerHTML = `Buy for ${this.champion.cost}g`;
            summonBtn.disabled = false;
            summonBtn.classList.remove('disabled');
            summonBtn.onclick = () => this.summonChampion();
        } else {
            summonBtn.innerHTML = `Buy for ${this.champion.cost}g (Need ${this.champion.cost - playerGold}g more)`;
            summonBtn.disabled = true;
            summonBtn.classList.add('disabled');
            summonBtn.onclick = null; // Remove click handler
        }
    }

    /**
     * Summon the champion
     */
    summonChampion() {
        if (!this.gameEngine) {
            console.error('Game engine not initialized');
            return;
        }

        const state = this.gameEngine.gameState.getState();
        const player = state.players.player;

        // Check if player has enough gold
        if (player.gold < this.champion.cost) {
            this.showNotification('Not enough gold!', 'error');
            return;
        }

        // Check if hand is full
        if (player.hand.length >= 3) {
            this.showNotification('Hand is full!', 'error');
            return;
        }

        // Add champion to hand
        this.gameEngine.gameState.dispatch({
            type: 'SUMMON_CHAMPION',
            payload: {
                champion: this.champion,
                playerId: 'player'
            }
        });

        // Portal is now closed
        this.isPortalOpen = false;
        const btn = document.getElementById('spellDraftBtn');
        if (btn) {
            btn.innerHTML = '🚫 Portal Closed 🚫';
            btn.classList.add('portal-closed');
            btn.disabled = true;
        }

        // CRITICAL FIX: Trigger UI refresh to update main game UI (hand, gold display, etc.)
        this.gameEngine.eventBus.emit('ui:refresh');

        this.hidePortal();
        this.showNotification(`${this.champion.name} summoned!`, 'success');
        console.log(`👑 Champion summoned: ${this.champion.name}`);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;

        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    /**
     * Handle spell card being played
     */
    handleSpellPlayed(spell, target) {
        // This will be called by the game engine when a spell is played
        // The SpellSystem will handle the actual effects
        console.log(`🎯 Spell played: ${spell.name} on target:`, target);
    }
}