/**
 * Yellow Scenario 1: Beasts of Burden
 * AI follows a scripted Beast-themed gameplay pattern with specific card plays
 */
import BaseScenario from './BaseScenario.js';

export default class YellowBeastsOfBurden extends BaseScenario {
    constructor() {
        super('medium-1', {
            name: 'Beasts of Burden',
            description: 'The wild calls! Look for high health units to withstand the onslaught of big trampling Beasts!',
            difficulty: 2,
            aiDeckConfig: {
                health: 30,
                startingGold: 15, // AI starts with enough gold for scripted plays
                behavior: {
                    aggression: 0.7,
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
        
        // Override the AI doAITurn method to use our scripted behavior
        this.overrideAIBehavior();
        
        console.log('🐻 Beasts of Burden: AI will follow scripted Beast card pattern');
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
        
        console.log('🎭 AI behavior overridden with Beast pattern');
    }

    /**
     * Execute scripted AI turn based on turn number
     */
    async scriptedAITurn(originalDoAITurn) {
        const state = this.gameEngine.getState();
        const currentTurn = state.turn;
        
        console.log(`🐻 Beasts of Burden AI - Turn ${currentTurn} scripted behavior`);
        
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
            
            // AI attacks with all units using animation-based timing
            await this.gameEngine.delay(500);
            await aiSystem.attackWithAllUnits();
            
            console.log('🐻 Beasts AI turn completed');
            
            // Emit turn ended event for AI's end-of-turn abilities
            this.gameEngine.eventBus.emit('turn:ended', { playerId: 'ai' });
        }
    }

    /**
     * Execute the specific scripted action for each turn
     */
    async executeScriptedAction(turn) {
        console.log(`🐻 Executing Beast scripted action for turn ${turn}`);
        
        let targetCards = [];
        
        // Determine what to play based on turn number
        switch(turn) {
            case 1:
                // Turn 1: Randomly choose Hawk, Wolf Pup, or Bear Cub
                const turn1Options = ['Hawk', 'Wolf Pup', 'Bear Cub'];
                targetCards = [this.getRandomElement(turn1Options)];
                break;
            case 2:
                // Turn 2: Play Piglet
                targetCards = ['Piglet'];
                break;
            case 3:
                // Turn 3: Randomly choose one of two options
                const turn3Options = [
                    ['Cow', 'Brown Bear'],   // A: Play Cow, then Brown Bear
                    ['Cow', 'Wolf']          // B: Play Cow, then Wolf
                ];
                targetCards = this.getRandomElement(turn3Options);
                break;
            case 4:
                // Turn 4: Play Pack Leader
                targetCards = ['Pack Leader'];
                break;
            case 5:
                // Turn 5: Randomly choose one of three options
                const turn5Options = [
                    ['Wolf', 'Wolf Pup'],           // A: Play Wolf, then Wolf Pup
                    ['Brown Bear', 'Bear Cub'],     // B: Play Brown Bear, then Bear Cub
                    ['Wild Boar', 'Bee Swarm']     // C: Play Wild Boar, then Bee Swarm
                ];
                targetCards = this.getRandomElement(turn5Options);
                break;
            case 6:
                // Turn 6: Play Giant Toad
                targetCards = ['Giant Toad'];
                break;
            case 7:
                // Turn 7: Play Grizzly Bear
                targetCards = ['Grizzly Bear'];
                break;
            case 8:
                // Turn 8: Randomly choose Mammoth or Ancient Tortoise
                const turn8Options = ['Mammoth', 'Ancient Tortoise'];
                targetCards = [this.getRandomElement(turn8Options)];
                break;
            case 9:
                // Turn 9: Play Lion King, then Wolf Pup, then Bear Cub
                targetCards = ['Lion King', 'Wolf Pup', 'Bear Cub'];
                break;
            default: // Turn 10+
                // Randomly choose one of five options
                const lateGameOptions = [
                    ['King Kong'],                        // A: Play King Kong
                    ['Primal Alpha'],                     // B: Play Primal Alpha
                    ['Wolf', 'Brown Bear', 'Pack Leader'], // C: Play Wolf, Brown Bear, and Pack Leader
                    ['Elder Stag', 'Giant Toad'],        // D: Play Elder Stag and Giant Toad
                    ['Lion King', 'Wolf Pup', 'Bear Cub'] // E: Play Lion King, then Wolf Pup, then Bear Cub
                ];
                targetCards = this.getRandomElement(lateGameOptions);
                break;
        }
        
        // Add cards directly to AI hand
        for (let i = 0; i < targetCards.length; i++) {
            const cardName = targetCards[i];
            
            console.log(`🐻 Scripted adding: ${cardName} (${i + 1}/${targetCards.length}) directly to AI hand`);
            
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
                
                console.log(`🐻 Added ${card.name} (Tier ${card.tier}) to AI hand`);
            } else {
                console.warn(`🐻 Could not find card "${cardName}" in database`);
            }
            
            // Small delay between multiple cards
            if (i < targetCards.length - 1) {
                await this.gameEngine.delay(100);
            }
        }
        
        console.log(`🐻 Turn ${turn}: Added ${targetCards.length} cards [${targetCards.join(', ')}] to AI hand`);
    }

    /**
     * Find a specific card by name in the database
     */
    findCardByName(cardName) {
        const cardDatabase = this.gameEngine.getCardDatabase();
        
        if (!cardDatabase) {
            console.warn(`🐻 Card database not available`);
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
        
        console.warn(`🐻 Card "${cardName}" not found in any tier`);
        return null;
    }

    /**
     * Get random element from array
     */
    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}