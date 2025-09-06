/**
 * Red Scenario 1: It Takes a Village
 * AI follows a scripted human-themed gameplay pattern with specific card plays
 */
import BaseScenario from './BaseScenario.js';

export default class RedItTakesAVillage extends BaseScenario {
    constructor() {
        super('easy-1', {
            name: 'It Takes a Village',
            description: 'Humans working together? That\'s how you know this is a fictional game.',
            difficulty: 3,
            aiDeckConfig: {
                health: 30,
                startingGold: 15, // AI starts with enough gold for scripted plays
                behavior: {
                    aggression: 1.0, // AI will attack with any unit that legally can
                    preferredTiers: [1, 2, 3, 4, 5],
                    randomPlacement: true,
                    scriptedAI: true // Custom flag for scripted behavior
                }
            },
            playerStartingDeck: {
                health: 30,
                startingGold: 2 // Player starts with normal 2 max gold
            }
        });
        
        // Store initial setup for the AI
        this.initialBackRowUnits = ['Worker', 'Worker', 'Worker'];
    }

    /**
     * Apply scenario-specific setup
     */
    async applyScenarioSetup() {
        // Apply base setup first
        await super.applyScenarioSetup();
        
        // Place three Workers in AI's back row initially
        await this.setupInitialAIUnits();
        
        // Override the AI doAITurn method to use our scripted behavior
        this.overrideAIBehavior();
        
        console.log('🏘️ It Takes a Village: AI will follow scripted human card pattern');
    }

    /**
     * Setup initial AI units (three Workers in back row)
     */
    async setupInitialAIUnits() {
        console.log('🏘️ Setting up initial AI units: 3 Workers in back row');
        
        for (let i = 0; i < this.initialBackRowUnits.length; i++) {
            const cardName = this.initialBackRowUnits[i];
            const card = this.findCardByName(cardName);
            
            if (card) {
                // Create a proper unit object from the card
                const unit = {
                    ...card,
                    unitId: Date.now() + i,
                    currentHealth: card.health,
                    currentAttack: card.attack,
                    canAttack: false, // Units can't attack on the turn they're placed
                    buffs: []
                };
                
                // Place worker directly on battlefield in back row (slots 3, 4, 5)
                const backRowSlot = i + 3; // Convert to back row slots (3, 4, 5)
                
                this.gameEngine.dispatch({
                    type: 'PLACE_UNIT',
                    payload: {
                        playerId: 'ai',
                        unit: unit,
                        slotIndex: backRowSlot
                    }
                });
                
                console.log(`🏘️ Placed ${card.name} in AI back row slot ${backRowSlot}`);
            }
        }
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
        
        console.log('🎭 AI behavior overridden with Village pattern');
    }

    /**
     * Execute scripted AI turn based on turn number
     */
    async scriptedAITurn(originalDoAITurn) {
        const state = this.gameEngine.getState();
        const currentTurn = state.turn;
        
        console.log(`🏘️ It Takes a Village AI - Turn ${currentTurn} scripted behavior`);
        
        // Emit turn started event for AI
        this.gameEngine.eventBus.emit('turn:started', { player: 'ai' });
        
        // Execute scripted action based on turn number
        await this.executeScriptedAction(currentTurn);
        
        // AI still attacks with all units after scripted drafting
        const aiSystem = this.gameEngine.systems.get('ai');
        if (aiSystem) {
            // AI plays all cards from hand
            aiSystem.playCardsFromHand();
            
            // Wait a bit before attacking
            await this.gameEngine.delay(500);
            
            // AI attacks with all units using animation-based timing
            await aiSystem.attackWithAllUnits();
            
            console.log('🏘️ Village AI turn completed');
            
            // Emit turn ended event for AI's end-of-turn abilities
            this.gameEngine.eventBus.emit('turn:ended', { playerId: 'ai' });
        }
    }

    /**
     * Execute the specific scripted action for each turn
     */
    async executeScriptedAction(turn) {
        console.log(`🏘️ Executing Village scripted action for turn ${turn}`);
        
        let targetCards = [];
        let forceToFrontRow = false;
        
        // Determine what to play based on turn number
        switch(turn) {
            case 1:
                // Turn 1: Play Fighter in the front row
                targetCards = ['Fighter'];
                forceToFrontRow = true;
                break;
            case 2:
                // Turn 2: Play Soldier and Squire in random slots
                targetCards = ['Soldier', 'Squire'];
                break;
            case 3:
                // Turn 3: Randomly choose Knight, Berserker, or Blacksmith
                const turn3Options = ['Knight', 'Berserker', 'Blacksmith'];
                targetCards = [this.getRandomElement(turn3Options)];
                break;
            case 4:
                // Turn 4: Randomly choose Knight, Berserker, or Blacksmith
                const turn4Options = ['Knight', 'Berserker', 'Blacksmith'];
                targetCards = [this.getRandomElement(turn4Options)];
                break;
            case 5:
                // Turn 5: Play Paladin
                targetCards = ['Paladin'];
                break;
            case 6:
                // Turn 6: Randomly choose Warlord, Captain, or Dwarf Knight
                const turn6Options = ['Warlord', 'Captain', 'Dwarf Knight'];
                targetCards = [this.getRandomElement(turn6Options)];
                break;
            case 7:
                // Turn 7: Play two Knights
                targetCards = ['Knight', 'Knight'];
                break;
            case 8:
                // Turn 8: Fill the front row with Fighters, then play Tavernmaster
                // For simplicity, we'll add multiple Fighters and hope they go to front row
                targetCards = ['Fighter', 'Fighter', 'Fighter', 'Tavernmaster'];
                break;
            case 9:
                // Turn 9: Play Hero
                targetCards = ['Hero'];
                break;
            default: // Turn 10+
                // Randomly choose one of four options
                const lateGameOptions = [
                    ['Hero'],                    // A: Play Hero
                    ['Paladin', 'Knight'],       // B: Play Paladin, then Knight
                    ['Dwarf King'],              // C: Play Dwarf King
                    ['Warlord', 'Berserker']     // D: Play Warlord, then Berserker
                ];
                targetCards = this.getRandomElement(lateGameOptions);
                break;
        }
        
        // Add cards directly to AI hand
        for (let i = 0; i < targetCards.length; i++) {
            const cardName = targetCards[i];
            
            console.log(`🏘️ Scripted adding: ${cardName} (${i + 1}/${targetCards.length}) directly to AI hand`);
            
            // Find the card in the database
            const card = this.findCardByName(cardName);
            if (card) {
                // Add card directly to AI hand
                this.gameEngine.dispatch({
                    type: 'ADD_CARD_TO_HAND',
                    payload: {
                        playerId: 'ai',
                        card: { ...card, handId: Date.now() + i }
                    }
                });
                
                console.log(`🏘️ Added ${card.name} (Tier ${card.tier}) to AI hand`);
            } else {
                console.warn(`🏘️ Could not find card "${cardName}" in database`);
            }
            
            // Small delay between multiple cards
            if (i < targetCards.length - 1) {
                await this.gameEngine.delay(100);
            }
        }
        
        console.log(`🏘️ Turn ${turn}: Added ${targetCards.length} cards [${targetCards.join(', ')}] to AI hand`);
    }

    /**
     * Find a specific card by name in the database
     */
    findCardByName(cardName) {
        const cardDatabase = this.gameEngine.getCardDatabase();
        
        if (!cardDatabase) {
            console.warn(`🏘️ Card database not available`);
            return null;
        }
        
        // Search through all tiers
        for (let tier = 1; tier <= 5; tier++) {
            if (cardDatabase[tier]) {
                const found = cardDatabase[tier].find(card => 
                    card.name.toLowerCase() === cardName.toLowerCase()
                );
                if (found) {
                    // Ensure the card has the tier property
                    return {
                        ...found,
                        tier: tier
                    };
                }
            }
        }
        
        console.warn(`🏘️ Card "${cardName}" not found in any tier`);
        return null;
    }

    /**
     * Get random element from array
     */
    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}