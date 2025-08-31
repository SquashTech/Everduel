/**
 * Dynamic stat calculation utility for units with conditional abilities
 * Handles passive auras, conditional buffs, and temporary modifiers
 */

class StatCalculator {
    constructor() {
        this.gameState = null;
    }

    /**
     * Initialize with game state reference
     * @param {Object} gameState - Game state instance
     */
    initialize(gameState) {
        this.gameState = gameState;
    }

    /**
     * Calculate the current effective attack of a unit
     * @param {Object} unit - Unit to calculate attack for
     * @returns {number} Effective attack value
     */
    calculateEffectiveAttack(unit) {
        if (!unit || !this.gameState) return 0;

        let attack = unit.currentAttack || unit.attack;
        const state = this.gameState.getState();

        // Apply conditional bonuses
        attack += this.getConditionalAttackBonus(unit, state);
        
        // Apply passive aura bonuses
        attack += this.getPassiveAuraAttackBonus(unit, state);

        // Apply temporary modifiers
        if (unit.tempAttackBonus) {
            attack += unit.tempAttackBonus;
        }

        return Math.max(0, attack);
    }

    /**
     * Calculate the current effective health of a unit
     * @param {Object} unit - Unit to calculate health for
     * @returns {number} Effective health value
     */
    calculateEffectiveHealth(unit) {
        if (!unit || !this.gameState) return 0;

        let health = unit.currentHealth || unit.health;
        const state = this.gameState.getState();

        // Apply conditional bonuses
        health += this.getConditionalHealthBonus(unit, state);
        
        // Apply passive aura bonuses
        health += this.getPassiveAuraHealthBonus(unit, state);

        // Apply temporary modifiers
        if (unit.tempHealthBonus) {
            health += unit.tempHealthBonus;
        }

        return Math.max(1, health);
    }

    /**
     * Get conditional attack bonus based on unit's ability and game state
     * @param {Object} unit - Unit to check
     * @param {Object} state - Current game state
     * @returns {number} Attack bonus
     */
    getConditionalAttackBonus(unit, state) {
        if (!unit.ability) return 0;

        const ability = unit.ability.toLowerCase();
        let bonus = 0;

        // Rat: "+3/+0 while it's your turn"
        if (ability.includes('+3/+0 while it\'s your turn')) {
            if (unit.owner === state.currentPlayer) {
                bonus += 3;
            }
        }

        // Add more conditional effects here as needed
        // e.g., "+4/+0 while it's your turn" for Plague Rat
        if (ability.includes('+4/+0 while it\'s your turn')) {
            if (unit.owner === state.currentPlayer) {
                bonus += 4;
            }
        }

        return bonus;
    }

    /**
     * Get conditional health bonus based on unit's ability and game state
     * @param {Object} unit - Unit to check
     * @param {Object} state - Current game state
     * @returns {number} Health bonus
     */
    getConditionalHealthBonus(unit, state) {
        if (!unit.ability) return 0;

        // Currently no conditional health bonuses, but structure is ready
        return 0;
    }

    /**
     * Get passive aura attack bonus from other units on the battlefield
     * @param {Object} unit - Unit to check
     * @param {Object} state - Current game state
     * @returns {number} Attack bonus from auras
     */
    getPassiveAuraAttackBonus(unit, state) {
        let bonus = 0;
        const battlefield = state.players[unit.owner].battlefield;

        // Check each unit on the same battlefield for auras
        battlefield.forEach(allyUnit => {
            if (!allyUnit || allyUnit.id === unit.id) return;

            const ability = allyUnit.ability?.toLowerCase();
            if (!ability) return;

            // Piglet: "Your OTHER Beasts have +1 Attack"
            if (ability.includes('your other beasts have +1 attack')) {
                // Only buff other Beast units, not the Piglet itself
                if (unit.tags.includes('Beast') && unit.id !== allyUnit.id) {
                    bonus += 1;
                }
            }
            
            // Legacy support: "Your Beasts have +1 Attack" (for any old cards)
            if (ability.includes('your beasts have +1 attack') && !ability.includes('other')) {
                if (unit.tags.includes('Beast')) {
                    bonus += 1;
                }
            }

            // Pack Leader: "Your Beasts have +2 Attack" (Tier 2, but structure ready)
            if (ability.includes('your beasts have +2 attack')) {
                if (unit.tags.includes('Beast')) {
                    bonus += 2;
                }
            }
        });

        return bonus;
    }

    /**
     * Get passive aura health bonus from other units on the battlefield
     * @param {Object} unit - Unit to check
     * @param {Object} state - Current game state
     * @returns {number} Health bonus from auras
     */
    getPassiveAuraHealthBonus(unit, state) {
        let bonus = 0;
        const battlefield = state.players[unit.owner].battlefield;

        // Check each unit on the same battlefield for auras
        battlefield.forEach(allyUnit => {
            if (!allyUnit || allyUnit.id === unit.id) return;

            const ability = allyUnit.ability?.toLowerCase();
            if (!ability) return;

            // Currently no health auras in Tier 1, but structure is ready
            // Example: "Your Beasts have +0/+1"
        });

        return bonus;
    }

    /**
     * Update a unit's current stats based on dynamic calculations
     * This should be called when game state changes
     * @param {Object} unit - Unit to update
     * @returns {Object} Updated unit with recalculated stats
     */
    updateUnitStats(unit) {
        if (!unit) return unit;

        const effectiveAttack = this.calculateEffectiveAttack(unit);
        const effectiveHealth = this.calculateEffectiveHealth(unit);

        // Update the unit's current stats for display
        return {
            ...unit,
            effectiveAttack,
            effectiveHealth
        };
    }

    /**
     * Get additional abilities granted by auras (like Lich granting Rush and Trample)
     * @param {Object} unit - Unit to check
     * @param {Object} state - Current game state
     * @returns {Array} Array of ability names granted
     */
    getGrantedAbilities(unit, state) {
        const grantedAbilities = [];
        const battlefield = state.players[unit.owner].battlefield;

        // Check each unit on the same battlefield for ability-granting auras
        battlefield.forEach(allyUnit => {
            if (!allyUnit || allyUnit.id === unit.id) return;

            const ability = allyUnit.ability?.toLowerCase();
            if (!ability) return;

            // Lich: "Your other Undead have Trample and Rush"
            if (ability.includes('your other undead have trample and rush')) {
                if (unit.tags && unit.tags.includes('Undead') && unit.id !== allyUnit.id) {
                    if (!grantedAbilities.includes('Trample')) {
                        grantedAbilities.push('Trample');
                    }
                    if (!grantedAbilities.includes('Rush')) {
                        grantedAbilities.push('Rush');
                    }
                }
            }
        });

        return grantedAbilities;
    }

    /**
     * Check if a unit has a specific ability (either innate or granted)
     * @param {Object} unit - Unit to check
     * @param {string} abilityName - Name of ability to check for
     * @param {Object} state - Current game state
     * @returns {boolean} Whether unit has the ability
     */
    hasAbility(unit, abilityName, state) {
        if (!unit) return false;

        // Check innate abilities
        const innateAbility = unit.ability?.toLowerCase() || '';
        if (innateAbility.includes(abilityName.toLowerCase())) {
            return true;
        }

        // Check granted abilities
        const grantedAbilities = this.getGrantedAbilities(unit, state);
        return grantedAbilities.includes(abilityName);
    }

    /**
     * Recalculate stats for all units on a player's battlefield
     * @param {string} playerId - Player ID
     */
    recalculatePlayerBattlefield(playerId) {
        if (!this.gameState) return;

        const state = this.gameState.getState();
        const battlefield = state.players[playerId].battlefield;

        battlefield.forEach((unit, slotIndex) => {
            if (unit) {
                const updatedUnit = this.updateUnitStats(unit);
                
                // Emit event to update UI if stats changed
                if (updatedUnit.effectiveAttack !== (unit.effectiveAttack || unit.currentAttack || unit.attack) ||
                    updatedUnit.effectiveHealth !== (unit.effectiveHealth || unit.currentHealth || unit.health)) {
                    
                    // Update the unit in game state would need to be done by the caller
                    // We just calculate here
                }
            }
        });
    }
}

export default StatCalculator;