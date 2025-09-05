/**
 * Blue Scenario 2: Burn It All Down
 * Very hard difficulty with destruction focus
 */
import BaseScenario from './BaseScenario.js';

export default class BlueBurnItAllDown extends BaseScenario {
    constructor() {
        super('vhard-2', {
            name: 'Burn It All Down',
            description: 'Face an opponent obsessed with destruction and chaos',
            difficulty: 'very_hard',
            aiDeckConfig: {
                health: 28,
                startingGold: 4,
                behavior: {
                    aggression: 0.9,
                    preferredTiers: [3, 4, 5],
                    destructionStrategy: true
                }
            }
        });
    }
}