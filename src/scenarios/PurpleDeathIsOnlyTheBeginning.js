/**
 * Purple Scenario 2: Death is Only the Beginning
 * Expert difficulty - ultimate challenge
 */
import BaseScenario from './BaseScenario.js';

export default class PurpleDeathIsOnlyTheBeginning extends BaseScenario {
    constructor() {
        super('expert-2', {
            name: 'Death is Only the Beginning',
            description: 'Face the ultimate nightmare challenge',
            difficulty: 'expert',
            aiDeckConfig: {
                health: 40,
                startingGold: 5,
                behavior: {
                    aggression: 0.8,
                    preferredTiers: [4, 5],
                    nightmareMode: true
                }
            },
            specialRules: [
                {
                    name: 'Death Aura',
                    type: 'continuous',
                    effect: 'All enemy units take 1 damage at start of turn'
                }
            ]
        });
    }
}