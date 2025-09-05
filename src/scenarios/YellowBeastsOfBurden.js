/**
 * Yellow Scenario 1: Beasts of Burden
 * Medium difficulty with animal strategy
 */
import BaseScenario from './BaseScenario.js';

export default class YellowBeastsOfBurden extends BaseScenario {
    constructor() {
        super('medium-1', {
            name: 'Beasts of Burden',
            description: 'Face a wild animal-focused strategy',
            difficulty: 'medium',
            aiDeckConfig: {
                health: 20,
                startingGold: 3,
                behavior: {
                    aggression: 0.8,
                    preferredTiers: [1, 2, 3],
                    animalStrategy: true
                }
            }
        });
    }
}