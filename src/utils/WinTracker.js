/**
 * Win Tracker - Manages scenario completion tracking using localStorage
 */
export default class WinTracker {
    constructor() {
        this.storageKey = 'everduel_scenario_wins';
        this.wins = this.loadWins();
    }

    /**
     * Load wins from localStorage
     */
    loadWins() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Failed to load wins from localStorage:', error);
            return {};
        }
    }

    /**
     * Save wins to localStorage
     */
    saveWins() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.wins));
            console.log('✅ Wins saved to localStorage:', this.wins);
        } catch (error) {
            console.error('Failed to save wins to localStorage:', error);
        }
    }

    /**
     * Mark a scenario as completed
     * @param {string} scenarioId - The scenario ID
     */
    markScenarioWon(scenarioId) {
        if (!scenarioId) {
            console.warn('Cannot mark win: scenarioId is required');
            return;
        }

        const wasAlreadyWon = this.wins[scenarioId] === true;
        this.wins[scenarioId] = true;
        this.saveWins();

        if (!wasAlreadyWon) {
            console.log(`🌟 New scenario completed: ${scenarioId}`);
        } else {
            console.log(`🌟 Scenario re-completed: ${scenarioId}`);
        }
    }

    /**
     * Check if a scenario has been won
     * @param {string} scenarioId - The scenario ID
     * @returns {boolean} True if the scenario has been completed
     */
    hasWon(scenarioId) {
        return this.wins[scenarioId] === true;
    }

    /**
     * Get all completed scenario IDs
     * @returns {string[]} Array of completed scenario IDs
     */
    getCompletedScenarios() {
        return Object.keys(this.wins).filter(id => this.wins[id] === true);
    }

    /**
     * Get win statistics
     * @returns {Object} Statistics about completed scenarios
     */
    getStats() {
        const completed = this.getCompletedScenarios();
        return {
            totalCompleted: completed.length,
            completedScenarios: completed,
            allWins: { ...this.wins }
        };
    }

    /**
     * Clear all win data (for testing/debugging)
     */
    clearAllWins() {
        this.wins = {};
        this.saveWins();
        console.log('🗑️ All wins cleared');
    }

    /**
     * Export win data for backup
     * @returns {string} JSON string of all win data
     */
    exportWins() {
        return JSON.stringify(this.wins, null, 2);
    }

    /**
     * Import win data from backup
     * @param {string} jsonString - JSON string of win data
     */
    importWins(jsonString) {
        try {
            const importedWins = JSON.parse(jsonString);
            this.wins = { ...this.wins, ...importedWins };
            this.saveWins();
            console.log('📥 Wins imported successfully');
        } catch (error) {
            console.error('Failed to import wins:', error);
        }
    }
}