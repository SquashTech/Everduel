/**
 * Handler for Kindred abilities
 * Triggered when a unit with shared tags is played
 */
import BaseAbilityHandler from './BaseAbilityHandler.js';
import AbilityParser from './AbilityParser.js';
import AbilityEffectExecutor from './AbilityEffectExecutor.js';

export default class KindredAbilityHandler extends BaseAbilityHandler {
    setupEventHandlers() {
        this.eventBus.on('ability:kindred', (data) => this.handleKindred(data));
    }

    /**
     * Handle Kindred ability activation
     */
    handleKindred(data) {
        return this.safeExecute(() => {
            const { unit, triggeringUnit, context } = data;
            const abilityText = unit.ability;

            this.log(`Kindred triggered for ${unit.name}: ${abilityText}`);

            // Extract shared tags for logging
            const sharedTags = this.getSharedTags(unit, triggeringUnit);
            const tagString = sharedTags.join(', ');
            
            this.log(`Shared tags: ${tagString}`);

            // Enhanced game log message
            this.emitEvent('ability:activated', {
                ability: 'kindred',
                unit,
                player: context.owner || 'player',
                sharedTags
            });

            // Remove "Kindred:" prefix and parse the effect
            // Handle special case: "Kindred and Manacharge:"
            let effectText = abilityText.replace(/^.*?kindred(?:\s+and\s+manacharge)?:\s*/i, '');
            
            const result = this.executeKindredEffect(effectText, { 
                unit, 
                triggeringUnit, 
                sharedTags,
                ...context 
            });

            // Log the specific effect that was triggered
            if (result.success && result.effects.length > 0) {
                this.logKindredEffect(result.effects[0]);
            }

            return result;
        }, { ability: 'kindred', unit: data.unit, triggeringUnit: data.triggeringUnit });
    }

    /**
     * Get shared tags between two units
     */
    getSharedTags(unit1, unit2) {
        if (!unit1.tags || !unit2.tags) {
            return [];
        }
        return unit1.tags.filter(tag => unit2.tags.includes(tag));
    }

    /**
     * Execute parsed Kindred effect
     */
    executeKindredEffect(effectText, context) {
        const effects = AbilityParser.parseAbilityText(effectText, context);
        const result = { success: false, effects: [] };

        if (!effects || effects.length === 0) {
            this.log(`Could not parse Kindred effect: ${effectText}`);
            return result;
        }

        for (const effect of effects) {
            // Enhance effect with Kindred context
            effect.kindredContext = {
                sharedTags: context.sharedTags,
                triggeringUnit: context.triggeringUnit
            };
            
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
     * Log Kindred effect details
     */
    logKindredEffect(effect) {
        let effectDescription = '';
        
        if (effect.type === 'buff') {
            if (effect.temporary) {
                effectDescription = `gains +${effect.attack}/+${effect.health} this turn`;
            } else if (effect.target === 'tag-based') {
                effectDescription = `gives all ${effect.tag}s +${effect.attack}/+${effect.health}`;
            } else if (effect.target === 'slot') {
                effectDescription = `buffs its slot +${effect.attack}/+${effect.health}`;
            } else {
                effectDescription = `gains +${effect.attack}/+${effect.health}`;
            }
        } else if (effect.type === 'damage') {
            effectDescription = `deals ${effect.amount} damage to ${effect.targetType.replace('_', ' ')}`;
        } else if (effect.type === 'abilityGrant') {
            effectDescription = `gains ${effect.ability}`;
        }

        if (effectDescription) {
            this.log(`Kindred effect: ${effectDescription}`);
        }
    }

    /**
     * Check if two units share any tags (Kindred trigger condition)
     */
    static checkKindredTrigger(existingUnit, newUnit) {
        if (!existingUnit.tags || !newUnit.tags) {
            return false;
        }
        
        return existingUnit.tags.some(tag => newUnit.tags.includes(tag));
    }
}