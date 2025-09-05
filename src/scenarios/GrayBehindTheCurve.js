/**
 * Gray Scenario 2: Behind the Curve
 * AI gets a gold advantage and goes first, but still uses simple AI
 */
import BaseScenario from './BaseScenario.js';

export default class GrayBehindTheCurve extends BaseScenario {
    constructor() {
        super('tutorial-2', {
            name: 'Behind the Curve',
            description: "It's like the opponent played a ramp spell on turn 0 and they're going first. Still the same easy AI, but a bit more difficult than Easy Mode.",
            difficulty: 'tutorial',
            aiDeckConfig: {
                health: 20,
                startingGold: 3, // AI starts with 3 max gold (advantage)
                behavior: {
                    aggression: 0.4,
                    preferredTiers: [1, 2, 3],
                    randomPlacement: true,
                    simpleAI: true
                }
            },
            playerStartingDeck: {
                health: 20,
                startingGold: 2 // Player starts with normal 2 max gold
            },
            specialRules: [
                {
                    name: 'AI goes first',
                    type: 'turnOrder',
                    aiFirst: true
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
        
        // Add any Behind the Curve specific logic here if needed
        console.log('⏰ Behind the Curve: AI gets gold advantage and goes first');
    }
}