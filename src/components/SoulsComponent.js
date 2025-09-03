/**
 * Souls Component for displaying and managing Soul resources
 */
class SoulsComponent {
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
        this.playerDisplay = document.getElementById('playerBattlefieldSouls');
        this.aiDisplay = document.getElementById('aiBattlefieldSouls');
        
        if (!this.playerDisplay || !this.aiDisplay) {
            console.error('Souls display elements not found');
            return;
        }
        
        this.setupEventListeners();
        this.updateDisplay();
        
        console.log('👻 SoulsComponent initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for Soul gains
        this.eventBus.on('souls:gained', (data) => {
            this.handleSoulGain(data);
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
     * Handle Soul gain event
     */
    handleSoulGain(data) {
        const { playerId, amount = 1 } = data;
        
        // Trigger gain animation
        this.animateGain(playerId, amount);
        
        // Update display after a brief delay for animation
        setTimeout(() => {
            this.updateDisplay();
        }, 100);
    }

    /**
     * Animate Soul gain
     */
    animateGain(playerId, amount = 1) {
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
        
        // Create floating +X indicator
        const indicator = amount === 1 ? '+1 👻' : `+${amount} 👻`;
        this.createFloatingIndicator(display, indicator);
    }

    /**
     * Create floating indicator for resource gain
     */
    createFloatingIndicator(parentElement, text) {
        const indicator = document.createElement('div');
        indicator.className = 'floating-indicator souls-indicator';
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
     * Update the display with current Soul counts
     */
    updateDisplay() {
        const state = this.gameState.getState();
        
        // Update player Soul count
        if (this.playerDisplay) {
            const playerCount = this.playerDisplay.querySelector('.souls-count');
            if (playerCount) {
                playerCount.textContent = state.souls.player.toString();
            }
        }
        
        // Update AI Soul count
        if (this.aiDisplay) {
            const aiCount = this.aiDisplay.querySelector('.souls-count');
            if (aiCount) {
                aiCount.textContent = state.souls.ai.toString();
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

export default SoulsComponent;