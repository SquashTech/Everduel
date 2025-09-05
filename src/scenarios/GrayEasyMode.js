/**
 * Gray Scenario 1: Easy Mode
 * Basic tutorial scenario where player goes first and AI plays simply
 */
import BaseScenario from './BaseScenario.js';

export default class GrayEasyMode extends BaseScenario {
    constructor() {
        super('tutorial-1', {
            name: 'Easy Mode',
            description: 'Practice Everduel! The opponent will simply buy one thing per turn and place it randomly. Great for learning the basics!',
            difficulty: 'tutorial',
            aiDeckConfig: {
                health: 30, // Updated health
                startingGold: 2, // Both start with 2 max gold
                behavior: {
                    aggression: 0.3,
                    preferredTiers: [1, 2],
                    randomPlacement: true, // AI places units randomly
                    simpleAI: true // Use SimpleAISystem behavior
                }
            },
            playerStartingDeck: {
                health: 30,
                startingGold: 2
            },
            specialRules: [
                {
                    name: 'Player goes first',
                    type: 'turnOrder',
                    playerFirst: true
                }
            ]
        });
    }

    /**
     * Apply scenario-specific setup
     */
    async applyScenarioSetup() {
        // Apply base setup first
        await super.applyScenarioSetup();
        
        // Add any Easy Mode specific logic here if needed
        console.log('🎓 Easy Mode: Player goes first, AI uses simple random placement');
    }
}