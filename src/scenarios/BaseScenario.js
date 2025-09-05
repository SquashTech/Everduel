/**
 * Base Scenario Class
 * Defines the interface and common functionality for all scenarios
 */
export default class BaseScenario {
    constructor(scenarioId, config = {}) {
        this.scenarioId = scenarioId;
        this.name = config.name || 'Unknown Scenario';
        this.description = config.description || '';
        this.difficulty = config.difficulty || 'medium';
        this.aiDeckConfig = config.aiDeckConfig || null;
        this.playerStartingDeck = config.playerStartingDeck || null;
        this.specialRules = config.specialRules || [];
        this.victory = config.victory || null;
        this.defeat = config.defeat || null;
        this.gameEngine = null;
    }

    /**
     * Initialize the scenario - called when scenario is selected
     * @param {SimpleGameEngine} gameEngine 
     */
    async initialize(gameEngine) {
        this.gameEngine = gameEngine;
        console.log(`🎬 Initializing scenario: ${this.name}`);
        
        // Apply any scenario-specific initialization
        await this.applyScenarioSetup();
    }

    /**
     * Apply scenario-specific setup - override in subclasses
     */
    async applyScenarioSetup() {
        // Configure AI settings if specified
        if (this.aiDeckConfig) {
            await this.configureAISettings();
        }

        // Configure player settings if specified  
        if (this.playerStartingDeck) {
            await this.configurePlayerSettings();
        }

        // Apply special rules
        await this.applySpecialRules();

        // Setup victory/defeat conditions
        this.setupWinConditions();
    }

    /**
     * Configure AI settings for this scenario
     */
    async configureAISettings() {
        if (!this.gameEngine || !this.aiDeckConfig) return;
        
        console.log(`🤖 Configuring AI settings for scenario: ${this.name}`);
        
        // Apply AI configuration
        const aiState = this.gameEngine.getState().players.ai;
        
        // Set AI health if specified
        if (this.aiDeckConfig.health !== undefined) {
            aiState.health = this.aiDeckConfig.health;
            aiState.maxHealth = this.aiDeckConfig.health;
        }

        // Set AI starting gold if specified (for drafting game)
        if (this.aiDeckConfig.startingGold !== undefined) {
            aiState.gold = this.aiDeckConfig.startingGold;
            aiState.maxGold = this.aiDeckConfig.startingGold;
            
            // Also dispatch through state management to ensure it sticks
            this.gameEngine.dispatch({ 
                type: 'SET_PLAYER_GOLD', 
                payload: { playerId: 'ai', gold: this.aiDeckConfig.startingGold, maxGold: this.aiDeckConfig.startingGold }
            });
        }

        // Set AI behavior modifiers if specified
        if (this.aiDeckConfig.behavior) {
            // Store AI behavior config for the AI system to use
            this.gameEngine.aiSettings = {
                ...this.gameEngine.aiSettings,
                ...this.aiDeckConfig.behavior
            };
        }
    }

    /**
     * Configure player settings for this scenario
     */
    async configurePlayerSettings() {
        if (!this.gameEngine || !this.playerStartingDeck) return;
        
        console.log(`👤 Configuring player settings for scenario: ${this.name}`);
        
        const playerState = this.gameEngine.getState().players.player;
        
        // Set player health if specified
        if (this.playerStartingDeck.health !== undefined) {
            playerState.health = this.playerStartingDeck.health;
            playerState.maxHealth = this.playerStartingDeck.health;
        }

        // Set player starting gold if specified (for drafting game)
        if (this.playerStartingDeck.startingGold !== undefined) {
            playerState.gold = this.playerStartingDeck.startingGold;
            playerState.maxGold = this.playerStartingDeck.startingGold;
            
            // Also dispatch through state management to ensure it sticks
            this.gameEngine.dispatch({ 
                type: 'SET_PLAYER_GOLD', 
                payload: { playerId: 'player', gold: this.playerStartingDeck.startingGold, maxGold: this.playerStartingDeck.startingGold }
            });
        }
    }

    /**
     * Apply special rules for this scenario - override in subclasses
     */
    async applySpecialRules() {
        for (const rule of this.specialRules) {
            console.log(`⚡ Applying special rule: ${rule.name}`);
            await this.applySpecialRule(rule);
        }
    }

    /**
     * Apply a single special rule
     */
    async applySpecialRule(rule) {
        // Base implementation - can be overridden
        if (rule.type === 'goldModifier') {
            this.gameEngine.goldModifier = rule.value;
        } else if (rule.type === 'healthModifier') {
            const state = this.gameEngine.getState();
            state.players.player.health += rule.playerValue || 0;
            state.players.ai.health += rule.aiValue || 0;
        } else if (rule.type === 'turnOrder') {
            // Handle turn order modifications
            const state = this.gameEngine.getState();
            if (rule.playerFirst) {
                state.currentPlayer = 'player';
                this.gameEngine.currentPlayer = 'player'; // Also update engine property
                console.log('🎮 Special rule: Player goes first');
            } else if (rule.aiFirst) {
                state.currentPlayer = 'ai';
                this.gameEngine.currentPlayer = 'ai'; // Also update engine property
                console.log('🤖 Special rule: AI goes first');
            }
        }
    }

    /**
     * Setup victory/defeat conditions
     */
    setupWinConditions() {
        if (this.victory) {
            console.log(`🏆 Victory condition: ${this.victory.description}`);
        }
        if (this.defeat) {
            console.log(`💀 Defeat condition: ${this.defeat.description}`);
        }
    }

    /**
     * Check if victory condition is met - override in subclasses
     */
    checkVictoryCondition() {
        if (!this.victory) {
            // Default: enemy health <= 0
            return this.gameEngine.getState().players.ai.health <= 0;
        }
        
        // Custom victory logic would go here
        return false;
    }

    /**
     * Check if defeat condition is met - override in subclasses
     */
    checkDefeatCondition() {
        if (!this.defeat) {
            // Default: player health <= 0
            return this.gameEngine.getState().players.player.health <= 0;
        }
        
        // Custom defeat logic would go here
        return false;
    }

    /**
     * Called when scenario ends
     */
    async onScenarioEnd(result) {
        console.log(`🎬 Scenario ${this.name} ended with result: ${result}`);
    }

    /**
     * Get scenario info for display
     */
    getScenarioInfo() {
        return {
            id: this.scenarioId,
            name: this.name,
            description: this.description,
            difficulty: this.difficulty
        };
    }
}