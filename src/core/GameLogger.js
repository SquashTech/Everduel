/**
 * Centralized Game Logging System
 * Prevents duplicate messages and provides a single source of truth for all game events
 */
import DOMSanitizer from '../utils/DOMSanitizer.js';

class GameLogger {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.messageHistory = new Set();
        this.lastMessageTime = 0;
        this.duplicateTimeout = 100; // ms to prevent rapid duplicates
        this.logContainer = null;
        this.maxEntries = 100;
        
        console.log('🎮 GameLogger initialized');
        this.setupEventListeners();
        this.initializeContainer();
    }
    
    /**
     * Initialize the log container reference
     */
    initializeContainer() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.logContainer = document.getElementById('gameLogDisplay');
            });
        } else {
            this.logContainer = document.getElementById('gameLogDisplay');
        }
    }
    
    /**
     * Set up centralized event listeners for all game events that should be logged
     */
    setupEventListeners() {
        // Combat events
        this.eventBus.on('combat:attack-completed', (data) => {
            this.logCombatAttack(data);
        });
        
        // Unit death events
        this.eventBus.on('unit:dies', (data) => {
            this.logUnitDeath(data);
        });
        
        // Damage to player events (only log non-combat damage to avoid redundancy)
        this.eventBus.on('combat:damage', (data) => {
            if (data.target?.type === 'player' && data.type !== 'combat') {
                this.logPlayerDamage(data);
            }
        });
        
        // Card play events
        this.eventBus.on('card:played', (data) => {
            this.logCardPlayed(data);
        });
        
        // Ability activation events
        this.eventBus.on('ability:activated', (data) => {
            this.logAbilityActivated(data);
        });
        
        // Manacharge trigger events
        this.eventBus.on('ability:manacharge-trigger', (data) => {
            this.logManachargeTriggered(data);
        });
        
        // Gold spending events
        this.eventBus.on('player:spend-gold', (data) => {
            this.logGoldSpent(data);
        });
        
        // Draft events
        this.eventBus.on('draft:completed', (data) => {
            this.logCardDrafted(data);
        });
        
        // Game end events
        this.eventBus.on('game:ended', (data) => {
            this.logGameEnd(data);
        });
    }
    
    /**
     * Core logging method with deduplication
     */
    logMessage(message, category = 'general') {
        const now = Date.now();
        const messageKey = `${message}_${category}`;
        
        // Prevent rapid duplicates
        if (this.messageHistory.has(messageKey) && 
            (now - this.lastMessageTime) < this.duplicateTimeout) {
            return;
        }
        
        // Clean up old message history (keep last 50 unique messages)
        if (this.messageHistory.size > 50) {
            const oldEntries = Array.from(this.messageHistory).slice(0, 25);
            oldEntries.forEach(entry => this.messageHistory.delete(entry));
        }
        
        this.messageHistory.add(messageKey);
        this.lastMessageTime = now;
        
        this.displayMessage(message, category);
    }
    
    /**
     * Display message in the UI
     */
    displayMessage(message, category) {
        if (!this.logContainer) {
            this.logContainer = document.getElementById('gameLogDisplay');
        }
        
        if (!this.logContainer) {
            console.warn('Game log container not found');
            return;
        }
        
        const entry = document.createElement('div');
        entry.className = `game-log-entry game-log-${category}`;
        entry.textContent = message;
        
        // Add timestamp
        const timestamp = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        entry.setAttribute('data-time', timestamp);
        entry.title = timestamp;
        
        this.logContainer.appendChild(entry);
        
        // Auto-scroll to bottom
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
        
        // Limit entries to prevent memory issues
        const entries = this.logContainer.querySelectorAll('.game-log-entry');
        if (entries.length > this.maxEntries) {
            entries[0].remove();
        }
    }
    
    /**
     * Combat attack logging
     */
    logCombatAttack(data) {
        const attacker = data.attacker?.name || 'Unit';
        const target = data.target?.type === 'player' ? 'player' : data.target?.name || 'unit';
        const damage = data.damage || 0;
        
        let emoji = '⚔️';
        if (data.attacker?.abilities?.includes('flying')) emoji = '🪶';
        else if (data.attacker?.abilities?.includes('sneaky')) emoji = '🥷';
        else if (data.attacker?.abilities?.includes('ranged')) emoji = '🏹';
        
        this.logMessage(`${emoji} ${attacker} attacks ${target} for ${damage} damage`, 'combat');
    }
    
    /**
     * Unit death logging
     */
    logUnitDeath(data) {
        const unitName = data.unit?.name || 'Unit';
        const owner = data.owner === 'player' ? 'Your' : 'Opponent';
        this.logMessage(`💀 ${owner} ${unitName} dies`, 'death');
    }
    
    /**
     * Player damage logging
     */
    logPlayerDamage(data) {
        const player = data.target.playerId === 'player' ? 'You' : 'Opponent';
        this.logMessage(`💔 ${player} take ${data.amount} damage`, 'damage');
    }
    
    /**
     * Card played logging
     */
    logCardPlayed(data) {
        const player = data.playerId === 'player' ? 'You' : 'Opponent';
        this.logMessage(`🃏 ${player} played ${data.card?.name || 'a card'} to slot ${data.slotIndex + 1}`, 'card');
    }
    
    /**
     * Ability activation logging
     */
    logAbilityActivated(data) {
        const { ability, unit, player } = data;
        const unitName = unit?.name || 'Unit';
        const playerName = player === 'player' ? 'Your' : 'Opponent';
        
        let emoji = '✨';
        if (ability === 'unleash') emoji = '🔥';
        else if (ability === 'lastGasp') emoji = '💨';
        else if (ability === 'manacharge') emoji = '⚡';
        else if (ability === 'kindred') emoji = '🤝';
        else if (ability === 'wisdom') emoji = '📚';
        
        // Capitalize the ability name for display
        const capitalizedAbility = ability.charAt(0).toUpperCase() + ability.slice(1);
        this.logMessage(`${emoji} ${playerName} ${unitName} uses ${capitalizedAbility}`, 'ability');
    }
    
    /**
     * Gold spending logging
     */
    logGoldSpent(data) {
        const player = data.playerId === 'player' ? 'You' : 'Opponent';
        this.logMessage(`💰 ${player} spent ${data.amount} gold`, 'gold');
    }
    
    /**
     * Manacharge trigger logging
     */
    logManachargeTriggered(data) {
        const player = data.playerId === 'player' ? 'Your' : 'Opponent';
        this.logMessage(`⚡ ${player} Blue Unleash triggered Manacharge abilities!`, 'ability');
    }
    
    /**
     * Card drafted logging
     */
    logCardDrafted(data) {
        const player = data.playerId === 'player' ? 'You' : 'Opponent';
        this.logMessage(`🎴 ${player} drafted ${data.selectedCard?.name || 'a card'}`, 'draft');
    }
    
    /**
     * Game end logging
     */
    logGameEnd(data) {
        const winner = data.winner === 'player' ? 'You' : data.winner === 'ai' ? 'Opponent' : 'No one';
        this.logMessage(`🏆 Game Over - ${winner} wins!`, 'game-end');
    }
    
    /**
     * Clear all log entries
     */
    clearLog() {
        if (this.logContainer) {
            DOMSanitizer.clearContent(this.logContainer);
        }
        this.messageHistory.clear();
    }
    
    /**
     * Manual log entry for special cases
     */
    log(message, category = 'general') {
        this.logMessage(message, category);
    }
}

export default GameLogger;