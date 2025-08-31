/**
 * Handler for Unleash abilities
 * Triggered when a unit enters play
 */
import BaseAbilityHandler from './BaseAbilityHandler.js';
import AbilityParser from './AbilityParser.js';
import AbilityEffectExecutor from './AbilityEffectExecutor.js';

export default class UnleashAbilityHandler extends BaseAbilityHandler {
    setupEventHandlers() {
        this.eventBus.on('ability:unleash', (data) => this.handleUnleash(data));
    }

    /**
     * Handle Unleash ability activation
     */
    handleUnleash(data) {
        return this.safeExecute(() => {
            const { unit, context } = data;
            const abilityText = unit.ability;

            this.log(`Unleash triggered for ${unit.name}: ${abilityText}`);

            // Remove "Unleash:" prefix and parse the effect
            const effectText = abilityText.replace(/^.*?unleash:\s*/i, '');
            
            // Enhanced game log for Unleash activation
            this.emitEvent('ability:activated', {
                ability: 'unleash',
                unit,
                player: context.playerId || context.owner || 'player'
            });
            
            // Ensure unit.owner is set from context.playerId if not already set
            if (!unit.owner && context.playerId) {
                unit.owner = context.playerId;
            }
            
            const result = this.executeUnleashEffect(effectText, { unit, ...context });
            
            // Log the specific Unleash effect
            if (result.success && result.effects.length > 0) {
                this.logUnleashEffect(result.effects[0]);
            }

            return result;
        }, { ability: 'unleash', unit: data.unit });
    }

    /**
     * Execute the parsed unleash effect
     */
    executeUnleashEffect(effectText, context) {
        const effects = AbilityParser.parseAbilityText(effectText, context);
        const result = { success: false, effects: [] };

        if (!effects || effects.length === 0) {
            this.log(`Could not parse unleash effect: ${effectText}`);
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

    /**
     * Log unleash effect details
     */
    logUnleashEffect(effect) {
        let effectDescription = '';
        
        if (effect.type === 'buff') {
            if (effect.target === 'other-slot-in-column') {
                effectDescription = `buffs the other slot in its column +${effect.attack}/+${effect.health}`;
            } else if (effect.target === 'random-back-row-slot') {
                effectDescription = `buffs a random back row slot +${effect.attack}/+${effect.health}`;
            } else if (effect.target === 'random-slot') {
                effectDescription = `buffs a random slot +${effect.attack}/+${effect.health}`;
            }
        }

        if (effectDescription) {
            this.log(`Unleash effect: ${effectDescription}`);
        }
    }
}