/**
 * Purple Scenario 1: The Goal is Souls
 * Expert difficulty with soul collection focus
 */
import BaseScenario from './BaseScenario.js';

export default class PurpleTheGoalIsSouls extends BaseScenario {
    constructor() {
        super('expert-1', {
            name: 'The Goal is Souls',
            description: 'Face an opponent obsessed with collecting souls',
            difficulty: 'expert',
            aiDeckConfig: {
                health: 35,
                startingGold: 5,
                behavior: {
                    aggression: 0.7,
                    preferredTiers: [3, 4, 5],
                    soulStrategy: true
                }
            }
        });
    }
}