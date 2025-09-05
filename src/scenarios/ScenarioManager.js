/**
 * Scenario Manager
 * Handles scenario loading, selection, and management
 */
import BaseScenario from './BaseScenario.js';

// Import individual scenario files
import GrayEasyMode from './GrayEasyMode.js';
import GrayBehindTheCurve from './GrayBehindTheCurve.js';
import RedItTakesAVillage from './RedItTakesAVillage.js';
import RedDraconicAwakening from './RedDraconicAwakening.js';
import YellowBeastsOfBurden from './YellowBeastsOfBurden.js';
import YellowTheSkyFalls from './YellowTheSkyFalls.js';
import GreenAnArrowToTheKnee from './GreenAnArrowToTheKnee.js';
import GreenGoofyGoblins from './GreenGoofyGoblins.js';
import BlueManaCheating from './BlueManaCheating.js';
import BlueBurnItAllDown from './BlueBurnItAllDown.js';
import PurpleTheGoalIsSouls from './PurpleTheGoalIsSouls.js';
import PurpleDeathIsOnlyTheBeginning from './PurpleDeathIsOnlyTheBeginning.js';

export default class ScenarioManager {
    constructor() {
        this.scenarios = new Map();
        this.currentScenario = null;
        this.gameEngine = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the scenario manager
     */
    async initialize(gameEngine) {
        this.gameEngine = gameEngine;
        
        // Register all available scenarios
        await this.registerDefaultScenarios();
        
        this.isInitialized = true;
        console.log(`📚 ScenarioManager initialized with ${this.scenarios.size} scenarios`);
    }

    /**
     * Register all default scenarios
     */
    async registerDefaultScenarios() {
        // Tutorial Scenarios (Gray)
        this.registerScenario('tutorial-1', new GrayEasyMode());
        this.registerScenario('tutorial-2', new GrayBehindTheCurve());

        // Easy Scenarios (Red)
        this.registerScenario('easy-1', new RedItTakesAVillage());
        this.registerScenario('easy-2', new RedDraconicAwakening());

        // Medium Scenarios (Yellow)
        this.registerScenario('medium-1', new YellowBeastsOfBurden());
        this.registerScenario('medium-2', new YellowTheSkyFalls());

        // Hard Scenarios (Green)
        this.registerScenario('hard-1', new GreenAnArrowToTheKnee());
        this.registerScenario('hard-2', new GreenGoofyGoblins());

        // Very Hard Scenarios (Blue)
        this.registerScenario('vhard-1', new BlueManaCheating());
        this.registerScenario('vhard-2', new BlueBurnItAllDown());

        // Expert Scenarios (Purple)
        this.registerScenario('expert-1', new PurpleTheGoalIsSouls());
        this.registerScenario('expert-2', new PurpleDeathIsOnlyTheBeginning());
    }

    /**
     * Register a scenario
     */
    registerScenario(scenarioId, scenario) {
        this.scenarios.set(scenarioId, scenario);
        console.log(`📖 Registered scenario: ${scenarioId}`);
    }

    /**
     * Get all available scenarios
     */
    getAllScenarios() {
        return Array.from(this.scenarios.entries()).map(([id, scenario]) => ({
            id,
            ...scenario.getScenarioInfo()
        }));
    }

    /**
     * Get a specific scenario
     */
    getScenario(scenarioId) {
        return this.scenarios.get(scenarioId);
    }

    /**
     * Select and load a scenario
     */
    async selectScenario(scenarioId) {
        const scenario = this.scenarios.get(scenarioId);
        if (!scenario) {
            throw new Error(`Scenario not found: ${scenarioId}`);
        }

        console.log(`🎬 Selecting scenario: ${scenarioId}`);
        
        // End current scenario if exists
        if (this.currentScenario) {
            await this.currentScenario.onScenarioEnd('replaced');
        }

        // Set new current scenario
        this.currentScenario = scenario;
        
        // Initialize the scenario
        await scenario.initialize(this.gameEngine);
        
        console.log(`✅ Scenario ${scenarioId} loaded successfully`);
        return scenario;
    }

    /**
     * Get current scenario
     */
    getCurrentScenario() {
        return this.currentScenario;
    }

    /**
     * Check if any win/lose conditions are met
     */
    checkScenarioConditions() {
        if (!this.currentScenario) return null;

        if (this.currentScenario.checkVictoryCondition()) {
            return 'victory';
        }
        
        if (this.currentScenario.checkDefeatCondition()) {
            return 'defeat';
        }

        return null;
    }

    /**
     * End current scenario
     */
    async endCurrentScenario(result) {
        if (this.currentScenario) {
            await this.currentScenario.onScenarioEnd(result);
            this.currentScenario = null;
        }
    }
}

/**
 * Placeholder Scenario for unimplemented scenarios
 */
class PlaceholderScenario extends BaseScenario {
    constructor(id, name, description, difficulty) {
        super(id, {
            name: name,
            description: description,
            difficulty: difficulty,
            aiDeckConfig: {
                health: 30,
                startingGold: 2,
                behavior: {
                    aggression: 0.5,
                    preferredTiers: [1, 2, 3]
                }
            }
        });
    }

    async applyScenarioSetup() {
        await super.applyScenarioSetup();
        console.log(`⚠️  ${this.name} is a placeholder scenario - using default settings`);
    }
}