/**
 * Yellow Scenario 2: The Sky Falls
 * Medium difficulty with aerial assault focus
 */
import BaseScenario from './BaseScenario.js';

export default class YellowTheSkyFalls extends BaseScenario {
    constructor() {
        super('medium-2', {
            name: 'The Sky Falls',
            description: 'Face a devastating aerial assault strategy',
            difficulty: 5,
            aiDeckConfig: {
                health: 22,
                startingGold: 3,
                behavior: {
                    aggression: 0.7,
                    preferredTiers: [2, 3, 4],
                    aerialStrategy: true
                }
            }
        });
    }
}