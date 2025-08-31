/**
 * Dragon Soul Component for displaying and managing Dragon Soul resources
 */
class DragonSoulComponent {
    constructor() {
        this.gameState = null;
        this.eventBus = null;
        this.playerDisplay = null;
        this.aiDisplay = null;
        this.animationTimeouts = new Map();
    }

    /**
     * Initialize the component
     */
    initialize() {
        this.playerDisplay = document.getElementById('playerDragonSoul');
        this.aiDisplay = document.getElementById('aiDragonSoul');
        
        if (!this.playerDisplay || !this.aiDisplay) {
            console.error('Dragon Soul display elements not found');
            return;
        }
        
        this.setupEventListeners();
        this.updateDisplay();
        
        console.log('🐉 DragonSoulComponent initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for Dragon Soul gains
        this.eventBus.on('ability:activated', (data) => {
            if (data.ability === 'dragonSoul') {
                this.handleDragonSoulGain(data);
            }
        });
        
        // Listen for state changes
        this.eventBus.on('game:state-changed', () => {
            this.updateDisplay();
        });
        
        // Listen for game reset
        this.eventBus.on('game:reset', () => {
            this.reset();
        });
    }

    /**
     * Handle Dragon Soul gain event
     */
    handleDragonSoulGain(data) {
        const { player: playerId, amount = 1 } = data;
        
        // Trigger gain animation
        this.animateGain(playerId);
        
        // Update display after a brief delay for animation
        setTimeout(() => {
            this.updateDisplay();
        }, 100);
    }

    /**
     * Animate Dragon Soul gain
     */
    animateGain(playerId) {
        const display = playerId === 'player' ? this.playerDisplay : this.aiDisplay;
        
        if (!display) return;
        
        // Clear any existing animation timeout
        if (this.animationTimeouts.has(playerId)) {
            clearTimeout(this.animationTimeouts.get(playerId));
        }
        
        // Add animation class
        display.classList.add('gaining');
        
        // Remove animation class after animation completes
        const timeout = setTimeout(() => {
            display.classList.remove('gaining');
            this.animationTimeouts.delete(playerId);
        }, 600);
        
        this.animationTimeouts.set(playerId, timeout);
        
        // Create floating +1 indicator
        this.createFloatingIndicator(display, '+1 🐉');
    }

    /**
     * Create floating indicator for resource gain
     */
    createFloatingIndicator(parentElement, text) {
        const indicator = document.createElement('div');
        indicator.className = 'floating-indicator dragon-soul-indicator';
        indicator.textContent = text;
        
        // Position relative to parent
        const rect = parentElement.getBoundingClientRect();
        indicator.style.left = `${rect.left + rect.width / 2}px`;
        indicator.style.top = `${rect.top}px`;
        
        document.body.appendChild(indicator);
        
        // Remove after animation
        setTimeout(() => {
            indicator.remove();
        }, 1500);
    }

    /**
     * Update the display with current Dragon Soul counts
     */
    updateDisplay() {
        const state = this.gameState.getState();
        
        // Update player Dragon Soul count
        if (this.playerDisplay) {
            const playerCount = this.playerDisplay.querySelector('.dragon-soul-count');
            if (playerCount) {
                playerCount.textContent = state.dragonSouls.player.toString();
            }
        }
        
        // Update AI Dragon Soul count
        if (this.aiDisplay) {
            const aiCount = this.aiDisplay.querySelector('.dragon-soul-count');
            if (aiCount) {
                aiCount.textContent = state.dragonSouls.ai.toString();
            }
        }
    }

    /**
     * Reset the component
     */
    reset() {
        // Clear all animation timeouts
        this.animationTimeouts.forEach(timeout => clearTimeout(timeout));
        this.animationTimeouts.clear();
        
        // Reset displays
        this.updateDisplay();
    }

    /**
     * Set dependencies
     */
    setDependencies(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
    }
}

export default DragonSoulComponent;