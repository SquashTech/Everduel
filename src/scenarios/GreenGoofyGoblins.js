/**
 * Green Scenario 2: Goofy Goblins
 * AI follows a scripted goblin-themed gameplay pattern with specific card plays
 * Features the Goblin Machine which requires goblins in each column to attack
 */
import BaseScenario from './BaseScenario.js';

export default class GreenGoofyGoblins extends BaseScenario {
    constructor() {
        super('hard-2', {
            name: 'Goofy Goblins',
            description: 'Don\'t mind the 25/25, if you keep their board clear it won\'t even attack you anyway!',
            difficulty: 4,
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
    }

    /**
     * Apply scenario-specific setup
     */
    async applyScenarioSetup() {
        // Apply base setup first
        await super.applyScenarioSetup();
        
        // No initial units - Goblin Machine will be played on turn 1
        
        // Override the AI doAITurn method to use our scripted behavior
        this.overrideAIBehavior();
        
        console.log('👺 Goofy Goblins: AI will follow scripted goblin card pattern');
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
        
        console.log('🎭 AI behavior overridden with Goofy Goblins pattern');
    }

    /**
     * Execute scripted AI turn based on turn number
     */
    async scriptedAITurn(originalDoAITurn) {
        const state = this.gameEngine.getState();
        const currentTurn = state.turn;
        
        console.log(`👺 Goofy Goblins AI - Turn ${currentTurn} scripted behavior`);
        
        // Emit turn started event for AI
        this.gameEngine.eventBus.emit('turn:started', { player: 'ai' });
        
        // Check if Goblin Machine is in front middle slot, if not, place it there
        // Skip this check on turn 1 since we're playing it normally that turn
        if (currentTurn > 1) {
            await this.ensureGoblinMachineInFrontMiddle(state);
        }
        
        // Execute scripted action based on turn number
        await this.executeScriptedAction(currentTurn, state);
        
        // AI still attacks with all units after scripted drafting
        const aiSystem = this.gameEngine.systems.get('ai');
        if (aiSystem) {
            // AI plays all cards from hand
            aiSystem.playCardsFromHand();
            
            // Wait a bit before attacking
            await this.gameEngine.delay(500);
            
            // AI attacks with all units using animation-based timing
            await aiSystem.attackWithAllUnits();
            
            console.log('👺 Goofy Goblins AI turn completed');
            
            // Emit turn ended event for AI's end-of-turn abilities
            this.gameEngine.eventBus.emit('turn:ended', { playerId: 'ai' });
        }
    }

    /**
     * Ensure Goblin Machine is in front middle slot
     */
    async ensureGoblinMachineInFrontMiddle(state) {
        const frontMiddleSlot = state.players.ai.battlefield[1]; // Slot 1 is front middle
        
        // Check if Goblin Machine is already there
        if (!frontMiddleSlot || frontMiddleSlot.name !== 'Goblin Machine') {
            console.log('👺 No Goblin Machine in front middle - placing one there');
            
            // Add Goblin Machine to hand and it will be played to front middle
            const goblinMachine = this.findCardByName('Goblin Machine');
            if (goblinMachine) {
                // Clear the front middle slot if occupied
                if (frontMiddleSlot) {
                    this.gameEngine.dispatch({
                        type: 'REMOVE_UNIT',
                        payload: {
                            playerId: 'ai',
                            slotIndex: 1
                        }
                    });
                }
                
                // Create unit and place directly in front middle
                const unit = {
                    ...goblinMachine,
                    unitId: Date.now(),
                    currentHealth: goblinMachine.health,
                    currentAttack: goblinMachine.attack,
                    canAttack: false,
                    buffs: []
                };
                
                this.gameEngine.dispatch({
                    type: 'PLACE_UNIT',
                    payload: {
                        playerId: 'ai',
                        unit: unit,
                        slotIndex: 1
                    }
                });
                
                console.log('👺 Placed Goblin Machine in front middle slot');
            }
        }
    }

    /**
     * Execute the specific scripted action for each turn
     */
    async executeScriptedAction(turn, state) {
        console.log(`👺 Executing Goofy Goblins scripted action for turn ${turn}`);
        
        let targetCards = [];
        let forceToSameColumn = false; // Flag for turns that need same-column placement
        
        // Determine what to play based on turn number
        switch(turn) {
            case 1:
                // Turn 1: Play Goblin Machine in front middle slot
                targetCards = ['Goblin Machine'];
                // Special handling for Goblin Machine to go to middle column
                break;
            case 2:
                // Turn 2: Play Muscle Goblin in left or right column
                targetCards = ['Muscle Goblin'];
                break;
            case 3:
                // Turn 3: Play Spear Goblin in left or right column
                targetCards = ['Spear Goblin'];
                break;
            case 4:
                // Turn 4: Play Knife Goblin and Spear Goblin, both in same column if possible
                targetCards = ['Knife Goblin', 'Spear Goblin'];
                forceToSameColumn = true;
                break;
            case 5:
                // Turn 5: Play Sword Goblin in left or right column
                targetCards = ['Sword Goblin'];
                break;
            case 6:
                // Turn 6: Play Axe Goblin, then Spear Goblin. Both in same column if possible
                targetCards = ['Axe Goblin', 'Spear Goblin'];
                forceToSameColumn = true;
                break;
            case 7:
                // Turn 7: Play Goblin Mage, then Muscle Goblin. Both in same column if possible
                targetCards = ['Goblin Mage', 'Muscle Goblin'];
                forceToSameColumn = true;
                break;
            case 8:
                // Turn 8: Play Goblin Chief in left or right column
                targetCards = ['Goblin Chief'];
                break;
            default: // Turn 9+
                // Randomly choose one of four options
                const lateGameOptions = [
                    ['Goblin Machine'],                                    // A: Play Goblin Machine
                    ['Goblin Chief', 'Sword Goblin'],                     // B: Play Goblin Chief, then Sword Goblin
                    ['Goblin Mage', 'Axe Goblin'],                        // C: Play Goblin Mage, then Axe Goblin
                    ['Knife Goblin', 'Spear Goblin', 'Muscle Goblin']     // D: Play all three tier 1 goblins
                ];
                targetCards = this.getRandomElement(lateGameOptions);
                break;
        }
        
        // For turns that need same-column placement or special placement, set preference tags
        let preferredColumn = null;
        
        // Special case for Goblin Machine on turn 1 - always goes to middle column
        if (turn === 1 && targetCards.includes('Goblin Machine')) {
            preferredColumn = 'middle';
            console.log(`👺 Turn 1: Placing Goblin Machine in middle column`);
        } else if (forceToSameColumn) {
            // Check which columns are less occupied (left = 0,3 or right = 2,5)
            const leftColumnEmpty = !state.players.ai.battlefield[0] || !state.players.ai.battlefield[3];
            const rightColumnEmpty = !state.players.ai.battlefield[2] || !state.players.ai.battlefield[5];
            
            if (leftColumnEmpty && rightColumnEmpty) {
                // Both columns have space, choose randomly
                preferredColumn = Math.random() < 0.5 ? 'left' : 'right';
            } else if (leftColumnEmpty) {
                preferredColumn = 'left';
            } else if (rightColumnEmpty) {
                preferredColumn = 'right';
            }
            // If neither column has space, cards will be played randomly
            
            console.log(`👺 Turn ${turn}: Attempting to place cards in ${preferredColumn || 'any available'} column`);
        }
        
        // Add cards directly to AI hand with column preference metadata
        for (let i = 0; i < targetCards.length; i++) {
            const cardName = targetCards[i];
            
            console.log(`👺 Scripted adding: ${cardName} (${i + 1}/${targetCards.length}) directly to AI hand`);
            
            // Find the card in the database
            const card = this.findCardByName(cardName);
            if (card) {
                // Add metadata for preferred column placement if needed
                const cardWithMeta = {
                    ...card,
                    handId: Date.now() + i,
                    preferredColumn: (forceToSameColumn || turn === 1) ? preferredColumn : null
                };
                
                // Add card directly to AI hand
                this.gameEngine.dispatch({
                    type: 'ADD_CARD_TO_HAND',
                    payload: {
                        playerId: 'ai',
                        card: cardWithMeta
                    }
                });
                
                console.log(`👺 Added ${card.name} (Tier ${card.tier}) to AI hand${preferredColumn ? ` with ${preferredColumn} column preference` : ''}`);
            } else {
                console.warn(`👺 Could not find card "${cardName}" in database`);
            }
            
            // Small delay between multiple cards
            if (i < targetCards.length - 1) {
                await this.gameEngine.delay(100);
            }
        }
        
        console.log(`👺 Turn ${turn}: Added ${targetCards.length} cards [${targetCards.join(', ')}] to AI hand`);
    }

    /**
     * Find a specific card by name in the database
     */
    findCardByName(cardName) {
        const cardDatabase = this.gameEngine.getCardDatabase();
        
        if (!cardDatabase) {
            console.warn(`👺 Card database not available`);
            return null;
        }
        
        // Handle special case for tier 4 Goblin Chief
        if (cardName === 'Goblin Chief') {
            // Look specifically for the tier 4 version
            if (cardDatabase[4]) {
                const found = cardDatabase[4].find(card => 
                    card.id === 'goblin_chief_t4' || card.name === 'Goblin Chief'
                );
                if (found) {
                    return {
                        ...found,
                        tier: 4
                    };
                }
            }
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
        
        console.warn(`👺 Card "${cardName}" not found in any tier`);
        return null;
    }

    /**
     * Get random element from array
     */
    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}