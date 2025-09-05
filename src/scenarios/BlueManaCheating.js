/**
 * Blue Scenario 1: Mana Cheating
 * Very hard difficulty with resource control
 */
import BaseScenario from './BaseScenario.js';

export default class BlueManaCheating extends BaseScenario {
    constructor() {
        super('vhard-1', {
            name: 'Mana Cheating',
            description: 'Face an opponent that bends the rules of resource management',
            difficulty: 'very_hard',
            aiDeckConfig: {
                health: 30,
                startingGold: 4,
                behavior: {
                    aggression: 0.4,
                    preferredTiers: [3, 4, 5],
                    controlStrategy: true,
                    resourceCheating: true
                }
            }
        });
    }
}