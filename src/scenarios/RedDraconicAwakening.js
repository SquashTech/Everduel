/**
 * Red Scenario 2: Draconic Awakening
 * Dragon-themed easy scenario
 */
import BaseScenario from './BaseScenario.js';

export default class RedDraconicAwakening extends BaseScenario {
    constructor() {
        super('easy-2', {
            name: 'Draconic Awakening',
            description: 'Face the power of awakened dragons',
            difficulty: 4,
            aiDeckConfig: {
                health: 25,
                startingGold: 2,
                behavior: {
                    aggression: 0.7,
                    preferredTiers: [2, 3],
                    dragonStrategy: true
                }
            }
        });
    }
}