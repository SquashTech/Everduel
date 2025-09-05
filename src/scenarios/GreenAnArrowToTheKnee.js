/**
 * Green Scenario 1: An Arrow to the Knee
 * Hard difficulty with ranged focus
 */
import BaseScenario from './BaseScenario.js';

export default class GreenAnArrowToTheKnee extends BaseScenario {
    constructor() {
        super('hard-1', {
            name: 'An Arrow to the Knee',
            description: 'Face an opponent that specializes in ranged attacks',
            difficulty: 'hard',
            aiDeckConfig: {
                health: 25,
                startingGold: 3,
                behavior: {
                    aggression: 0.7,
                    preferredTiers: [2, 3, 4],
                    rangedFocus: true
                }
            }
        });
    }
}