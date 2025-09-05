/**
 * Red Scenario 1: It Takes a Village
 * Easy difficulty scenario
 */
import BaseScenario from './BaseScenario.js';

export default class RedItTakesAVillage extends BaseScenario {
    constructor() {
        super('easy-1', {
            name: 'It Takes a Village',
            description: 'Face a community-focused opponent strategy',
            difficulty: 'easy',
            aiDeckConfig: {
                health: 20,
                startingGold: 2,
                behavior: {
                    aggression: 0.6,
                    preferredTiers: [1, 2, 3],
                    villageStrategy: true
                }
            }
        });
    }
}