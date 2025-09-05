/**
 * Gray Scenario 2: Behind the Curve
 * AI follows a scripted gameplay pattern that gets progressively stronger each turn
 */
import BaseScenario from './BaseScenario.js';

export default class GrayBehindTheCurve extends BaseScenario {
    constructor() {
        super('tutorial-2', {
            name: 'Behind the Curve',
            description: "It's like the opponent played a ramp spell on turn 0, but the AI is still stupid.",
            difficulty: 'tutorial',
            aiDeckConfig: {
                health: 30,
                startingGold: 10, // AI starts with enough gold for scripted plays
                behavior: {
                    aggression: 0.4,
                    preferredTiers: [1, 2, 3, 4, 5],
                    randomPlacement: true,
                    scriptedAI: true // Custom flag for scripted behavior
                }
            },
            playerStartingDeck: {
                health: 30,
                startingGold: 2 // Player starts with normal 2 max gold
            },
            specialRules: [
                // Removed AI goes first for testing - just test scripted plays
            ]
        });
    }

    /**
     * Apply scenario-specific setup
     */
    async applyScenarioSetup() {
        // Apply base setup first
        await super.applyScenarioSetup();
        
        // Override the AI doAITurn method to use our scripted behavior
        this.overrideAIBehavior();
        
        console.log('⏰ Behind the Curve: AI will follow scripted card acquisition pattern (player goes first for testing)');
    }

    /**
     * Override AI behavior to follow scripted pattern
     */
    overrideAIBehavior() {
        if (!this.gameEngine) return;
        
        // Store original doAITurn method
        const originalDoAITurn = this.gameEngine.doAITurn.bind(this.gameEngine);
        
        // Replace with our scripted version
        this.gameEngine.doAITurn = async () => {
            await this.scriptedAITurn(originalDoAITurn);
        };
        
        console.log('🎭 AI behavior overridden with scripted pattern');
    }

    /**
     * Execute scripted AI turn based on turn number
     */
    async scriptedAITurn(originalDoAITurn) {
        const state = this.gameEngine.getState();
        const currentTurn = state.turn;
        
        console.log(`🎭 Behind the Curve AI - Turn ${currentTurn} scripted behavior`);
        
        // Emit turn started event for AI
        this.gameEngine.eventBus.emit('turn:started', { player: 'ai' });
        
        // Execute scripted action based on turn number
        await this.executeScriptedAction(currentTurn);
        
        // AI still attacks with all units after scripted drafting
        const aiSystem = this.gameEngine.systems.get('ai');
        if (aiSystem) {
            // AI plays all cards from hand
            await this.gameEngine.delay(600);
            aiSystem.playCardsFromHand();
            
            // AI attacks with all units
            await this.gameEngine.delay(800);
            aiSystem.attackWithAllUnits();
            
            console.log('🎭 Scripted AI turn completed');
            
            // Emit turn ended event for AI's end-of-turn abilities
            this.gameEngine.eventBus.emit('turn:ended', { playerId: 'ai' });
        }
    }

    /**
     * Execute the specific scripted action for each turn
     */
    async executeScriptedAction(turn) {
        console.log(`🎭 Executing scripted action for turn ${turn}`);
        
        let targetTiers = [];
        let cardCount = 1;
        
        // Determine what to draft based on turn number
        switch(turn) {
            case 1:
                targetTiers = [2]; // Random tier 2 unit
                break;
            case 2:
                targetTiers = [1]; // Two random tier 1 units
                cardCount = 2;
                break;
            case 3:
                targetTiers = [3]; // Random tier 3 unit
                break;
            case 4:
                targetTiers = [2]; // Two random tier 2 units
                cardCount = 2;
                break;
            case 5:
                targetTiers = [4]; // Random tier 4 unit
                break;
            case 6:
                targetTiers = [3, 1]; // Random tier 3 unit and random tier 1 unit
                cardCount = 2;
                break;
            case 7:
                targetTiers = [5]; // Random tier 5 unit
                break;
            case 8:
                targetTiers = [4]; // Two random tier 4 units
                cardCount = 2;
                break;
            case 9:
                targetTiers = [5]; // Random tier 5 unit
                break;
            default: // Turn 10 or later
                // Randomly choose one option
                const option = Math.floor(Math.random() * 3);
                if (option === 0) {
                    targetTiers = [5]; // Random tier 5 unit
                } else if (option === 1) {
                    targetTiers = [3]; // Three tier 3 units
                    cardCount = 3;
                } else {
                    targetTiers = [4, 2]; // Random tier 4 and tier 2
                    cardCount = 2;
                }
                break;
        }
        
        // Add cards directly to AI hand instead of using draft system
        for (let i = 0; i < cardCount; i++) {
            const tierIndex = i < targetTiers.length ? i : targetTiers.length - 1;
            const tier = targetTiers[tierIndex];
            
            console.log(`🎭 Scripted adding: tier ${tier} card ${i + 1}/${cardCount} directly to AI hand`);
            
            // Get random card from database for this tier
            const randomCard = this.getRandomCardFromTier(tier);
            if (randomCard) {
                // Add card directly to AI hand
                this.gameEngine.dispatch({
                    type: 'ADD_CARD_TO_HAND',
                    payload: {
                        playerId: 'ai',
                        card: { ...randomCard, handId: Date.now() + i }
                    }
                });
                
                console.log(`🎭 Added ${randomCard.name} (Tier ${tier}) to AI hand`);
            } else {
                console.warn(`🎭 Could not find tier ${tier} cards in database`);
            }
            
            // Small delay between multiple cards
            if (i < cardCount - 1) {
                await this.gameEngine.delay(100);
            }
        }
        
        console.log(`🎭 Turn ${turn}: Added ${cardCount} cards of tiers [${targetTiers.join(', ')}] directly to AI hand`);
    }

    /**
     * Get a random card from the specified tier
     */
    getRandomCardFromTier(tier) {
        const cardDatabase = this.gameEngine.getCardDatabase();
        
        if (!cardDatabase || !cardDatabase[tier] || cardDatabase[tier].length === 0) {
            console.warn(`🎭 No cards available for tier ${tier}`);
            return null;
        }
        
        const tierCards = cardDatabase[tier];
        const randomIndex = Math.floor(Math.random() * tierCards.length);
        const selectedCard = tierCards[randomIndex];
        
        // Ensure the card has the tier property for proper tier indicator display
        const cardWithTier = {
            ...selectedCard,
            tier: tier // Explicitly set tier property
        };
        
        console.log(`🎭 Selected ${cardWithTier.name} (tier ${tier}) from ${tierCards.length} tier ${tier} options`);
        return cardWithTier;
    }

    /**
     * Get random element from array
     */
    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}