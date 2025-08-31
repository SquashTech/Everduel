/**
 * UI Manager for coordinating all UI components
 * Handles rendering, updates, and UI state management
 */
import BattlefieldComponent from './BattlefieldComponent.js';
import HandComponent from './HandComponent.js';
import ControlsComponent from './ControlsComponent.js';
import GameInfoComponent from './GameInfoComponent.js';
import DraftOverlayComponent from './DraftOverlayComponent.js';
import DragonSoulComponent from './DragonSoulComponent.js';
// import KeywordTooltipComponent from './KeywordTooltipComponent.js'; // DISABLED - was causing AI/logging issues

class UIManager {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.components = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize the UI manager
     */
    async initialize() {
        this.setupEventHandlers();
        this.initializeComponents();
        this.isInitialized = true;
        console.log('🎨 UIManager initialized');
    }

    /**
     * Setup event handlers for UI updates
     */
    setupEventHandlers() {
        this.eventBus.on('state:changed', () => this.updateAllComponents());
        this.eventBus.on('ui:refresh', () => this.updateAllComponents()); // Add ui:refresh listener
        this.eventBus.on('draft:options-ready', (data) => this.handleDraftOptionsReady(data));
        this.eventBus.on('draft:completed', () => this.handleDraftCompleted());
        this.eventBus.on('combat:attack-completed', (data) => this.handleAttackCompleted(data));
        this.eventBus.on('combat:attack-invalid', (data) => this.handleInvalidAttack(data));
        this.eventBus.on('card:played', (data) => this.handleCardPlayed(data));
        this.eventBus.on('turn:started', (data) => this.handleTurnStarted(data));
    }

    /**
     * Initialize all UI components
     */
    initializeComponents() {
        // Initialize battlefield components
        this.components.set('battlefield', new BattlefieldComponent());
        this.components.set('hand', new HandComponent());
        this.components.set('controls', new ControlsComponent());
        this.components.set('gameInfo', new GameInfoComponent());
        this.components.set('draftOverlay', new DraftOverlayComponent());
        this.components.set('dragonSoul', new DragonSoulComponent());
        // Temporarily disable tooltip to test for conflicts
        // this.components.set('keywordTooltip', new KeywordTooltipComponent(this.eventBus));
        
        // Inject dependencies into each component
        this.components.forEach((component, name) => {
            // Special handling for DragonSoulComponent which uses setDependencies
            if (name === 'dragonSoul') {
                component.setDependencies(this.gameState, this.eventBus);
            } else {
                component.gameEngine = this.gameEngine;
                component.eventBus = this.eventBus;
                component.gameState = this.gameState;
                component.uiManager = this;
            }
            
            if (component.initialize) {
                component.initialize();
            }
        });
    }

    /**
     * Update all components with current state
     */
    updateAllComponents() {
        if (!this.isInitialized) return;
        
        const state = this.gameState.getState();
        console.log(`🔄 UI updating - Current player: ${state.currentPlayer}, Turn: ${state.turn}`);
        
        this.components.forEach(component => {
            if (component.update) {
                component.update(state);
            }
        });
    }

    /**
     * Get a specific component
     * @param {string} name - Component name
     * @returns {Object|null} Component or null if not found
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }

    /**
     * Handle draft options becoming available
     * @param {Object} data - Draft options data
     */
    handleDraftOptionsReady(data) {
        // Only show draft modal for human player, not AI
        if (data.playerId !== 'player') {
            return;
        }
        
        const draftOverlay = this.getComponent('draftOverlay');
        if (draftOverlay) {
            draftOverlay.showDraftOptions(data.options, data.tier);
        }
    }

    /**
     * Handle draft completion
     */
    handleDraftCompleted() {
        const draftOverlay = this.getComponent('draftOverlay');
        if (draftOverlay) {
            draftOverlay.hideDraftOptions();
        }
    }

    /**
     * Handle attack completion with visual effects
     * @param {Object} data - Attack data
     */
    handleAttackCompleted(data) {
        const battlefield = this.getComponent('battlefield');
        if (battlefield) {
            battlefield.showAttackAnimation(data.attacker, data.target);
        }
    }

    /**
     * Handle invalid attack attempts
     * @param {Object} data - Invalid attack data
     */
    handleInvalidAttack(data) {
        console.log('🚫 Invalid attack:', data.reason, data.message);
        this.showNotification(data.message, 'warning');
    }

    /**
     * Handle card played with animations
     * @param {Object} data - Card play data
     */
    handleCardPlayed(data) {
        const hand = this.getComponent('hand');
        const battlefield = this.getComponent('battlefield');
        
        if (hand) {
            hand.removeCardFromHand(data.card);
        }
        
        if (battlefield) {
            battlefield.addUnitToBattlefield(data.unit, data.slotIndex);
        }
    }

    /**
     * Handle turn start
     * @param {Object} data - Turn data
     */
    handleTurnStarted(data) {
        const gameInfo = this.getComponent('gameInfo');
        if (gameInfo) {
            gameInfo.updateCurrentPlayer(data.player);
        }
        
        // Show turn indicator
        this.showTurnIndicator(data.player);
    }

    /**
     * Show turn indicator
     * @param {string} player - Current player
     */
    showTurnIndicator(player) {
        const indicator = document.getElementById('turnIndicator');
        if (indicator) {
            indicator.textContent = player === 'player' ? 'Your Turn' : 'AI Turn';
            indicator.className = `turn-indicator ${player}-turn`;
            
            // Fade out after 2 seconds
            setTimeout(() => {
                indicator.classList.add('fade-out');
            }, 2000);
        }
    }

    /**
     * Show damage number animation
     * @param {HTMLElement} element - Target element
     * @param {number} damage - Damage amount
     * @param {boolean} isHealing - Whether this is healing
     */
    showDamageNumber(element, damage, isHealing = false) {
        const damageElement = document.createElement('div');
        damageElement.className = `damage-number ${isHealing ? 'healing' : 'damage'}`;
        damageElement.textContent = isHealing ? `+${damage}` : `-${damage}`;
        
        // Position relative to target element
        const rect = element.getBoundingClientRect();
        damageElement.style.left = `${rect.left + rect.width / 2}px`;
        damageElement.style.top = `${rect.top}px`;
        damageElement.style.position = 'fixed';
        damageElement.style.zIndex = '1000';
        damageElement.style.pointerEvents = 'none';
        
        document.body.appendChild(damageElement);
        
        // Animate upward and fade out
        setTimeout(() => {
            damageElement.style.transform = 'translateY(-50px)';
            damageElement.style.opacity = '0';
        }, 100);
        
        // Remove after animation
        setTimeout(() => {
            if (damageElement.parentNode) {
                damageElement.parentNode.removeChild(damageElement);
            }
        }, 1000);
    }

    /**
     * Show attack arrow between elements
     * @param {HTMLElement} fromElement - Source element
     * @param {HTMLElement} toElement - Target element
     */
    showAttackArrow(fromElement, toElement) {
        const arrow = document.createElement('div');
        arrow.className = 'attack-arrow';
        
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        const fromX = fromRect.left + fromRect.width / 2;
        const fromY = fromRect.top + fromRect.height / 2;
        const toX = toRect.left + toRect.width / 2;
        const toY = toRect.top + toRect.height / 2;
        
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
        
        arrow.style.left = `${fromX}px`;
        arrow.style.top = `${fromY}px`;
        arrow.style.width = `${distance}px`;
        arrow.style.transform = `rotate(${angle}rad)`;
        arrow.style.position = 'fixed';
        arrow.style.zIndex = '999';
        arrow.style.pointerEvents = 'none';
        
        document.body.appendChild(arrow);
        
        // Remove after animation
        setTimeout(() => {
            if (arrow.parentNode) {
                arrow.parentNode.removeChild(arrow);
            }
        }, 800);
    }

    /**
     * Show notification message
     * @param {string} message - Message to show
     * @param {string} type - Type of notification (info, warning, error, success)
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Position at top center
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.zIndex = '1001';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.backgroundColor = this.getNotificationColor(type);
        notification.style.color = 'white';
        notification.style.fontWeight = 'bold';
        
        document.body.appendChild(notification);
        
        // Slide in
        setTimeout(() => {
            notification.style.transform = 'translateX(-50%) translateY(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Get notification color based on type
     * @param {string} type - Notification type
     * @returns {string} CSS color
     */
    getNotificationColor(type) {
        switch (type) {
            case 'error': return '#f44336';
            case 'warning': return '#ff9800';
            case 'success': return '#4caf50';
            case 'info':
            default: return '#2196f3';
        }
    }

    /**
     * Update element text content safely
     * @param {string} id - Element ID
     * @param {string} value - New value
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Add CSS class to element
     * @param {string} id - Element ID
     * @param {string} className - Class name to add
     */
    addClass(id, className) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add(className);
        }
    }

    /**
     * Remove CSS class from element
     * @param {string} id - Element ID
     * @param {string} className - Class name to remove
     */
    removeClass(id, className) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove(className);
        }
    }

    /**
     * Toggle visibility of element
     * @param {string} id - Element ID
     * @param {boolean} visible - Whether to show or hide
     */
    toggleVisibility(id, visible) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = visible ? '' : 'none';
        }
    }
}

export default UIManager;