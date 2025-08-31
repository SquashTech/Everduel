/**
 * Handler for Last Gasp abilities
 * Triggered when a unit dies
 */
import BaseAbilityHandler from './BaseAbilityHandler.js';
import AbilityParser from './AbilityParser.js';
import AbilityEffectExecutor from './AbilityEffectExecutor.js';

export default class LastGaspAbilityHandler extends BaseAbilityHandler {
    setupEventHandlers() {
        this.eventBus.on('ability:last-gasp', (data) => this.handleLastGasp(data));
    }

    /**
     * Handle Last Gasp ability activation
     */
    handleLastGasp(data) {
        return this.safeExecute(() => {
            const { unit, context } = data;
            const abilityText = unit.ability;

            this.log(`Last Gasp triggered for ${unit.name}: ${abilityText}`);

            // Remove "Last Gasp:" prefix and parse the effect
            let effectText = abilityText.replace(/^.*last gasp:\s*/i, '');
            
            // Handle Banish effect specially
            if (this.handleBanishEffect(effectText, unit)) {
                return { success: true, banished: true };
            }
            
            // Handle compound effects (e.g., "Summon a Skeleton, then give your Undead and Dragons +2/+2")
            if (effectText.includes(', then ')) {
                return this.handleCompoundEffect(effectText, { unit, ...context });
            } else {
                // Single effect
                return this.executeLastGaspEffect(effectText, { unit, ...context });
            }
        }, { ability: 'last-gasp', unit: data.unit });
    }

    /**
     * Handle special banish effects
     */
    handleBanishEffect(effectText, unit) {
        if (effectText.toLowerCase().includes('banish this')) {
            this.log(`${unit.name} is banished - removed from game permanently`);
            
            // Mark unit as banished so it won't be added to deck
            if (unit) {
                unit.banished = true;
            }
            
            // The Banish effect means the unit is removed from the game entirely
            // It should not be added to the deck when destroyed
            return true;
        }
        return false;
    }

    /**
     * Handle compound effects that contain multiple parts
     */
    handleCompoundEffect(effectText, context) {
        const parts = effectText.split(', then ');
        this.log(`Compound Last Gasp effect with ${parts.length} parts`);
        
        const results = [];
        
        // Execute each part in sequence
        parts.forEach((part, index) => {
            this.log(`Executing Last Gasp part ${index + 1}: ${part.trim()}`);
            const result = this.executeLastGaspEffect(part.trim(), context);
            results.push(result);
        });

        return {
            success: results.some(r => r.success),
            effects: results.flatMap(r => r.effects || []),
            compound: true
        };
    }

    /**
     * Execute a single Last Gasp effect
     */
    executeLastGaspEffect(effectText, context) {
        const effects = AbilityParser.parseAbilityText(effectText, context);
        const result = { success: false, effects: [] };

        if (!effects || effects.length === 0) {
            this.log(`Could not parse Last Gasp effect: ${effectText}`);
            return result;
        }

        for (const effect of effects) {
            const executed = AbilityEffectExecutor.executeEffect(
                effect, 
                context, 
                this.gameState, 
                this.eventBus, 
                this.combatSystem
            );
            
            if (executed.success) {
                result.effects.push(effect);
                result.success = true;
            }
        }

        return result;
    }
}