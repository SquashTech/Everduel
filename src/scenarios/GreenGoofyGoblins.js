/**
 * Green Scenario 2: Goofy Goblins
 * Hard difficulty with goblin swarm tactics
 */
import BaseScenario from './BaseScenario.js';

export default class GreenGoofyGoblins extends BaseScenario {
    constructor() {
        super('hard-2', {
            name: 'Goofy Goblins',
            description: 'Face a chaotic goblin swarm strategy',
            difficulty: 4,
            aiDeckConfig: {
                health: 23,
                startingGold: 3,
                behavior: {
                    aggression: 0.8,
                    preferredTiers: [1, 2, 3],
                    swarmStrategy: true
                }
            }
        });
    }
}