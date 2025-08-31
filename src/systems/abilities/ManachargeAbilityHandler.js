/**
 * Handler for Manacharge abilities
 * Triggered when Blue Unleash ability is used
 */
import BaseAbilityHandler from './BaseAbilityHandler.js';
import AbilityParser from './AbilityParser.js';
import AbilityEffectExecutor from './AbilityEffectExecutor.js';

export default class ManachargeAbilityHandler extends BaseAbilityHandler {
    setupEventHandlers() {
        this.eventBus.on('ability:manacharge', (data) => this.handleManacharge(data));
        this.eventBus.on('ability:manacharge-trigger', (data) => this.handleManachargeActivation(data));
    }

    /**
     * Handle Manacharge ability activation
     */
    handleManacharge(data) {
        return this.safeExecute(() => {
            const { unit, context } = data;
            const abilityText = unit.ability;

            this.log(`Manacharge triggered for ${unit.name}: ${abilityText}`);
            
            // Ensure unit.owner is set from context.playerId if not already set
            if (!unit.owner && context.playerId) {
                unit.owner = context.playerId;
            }

            // Remove "Manacharge:" prefix and parse the effect
            const effectText = abilityText.replace(/^.*?manacharge:\s*/i, '');
            
            // Handle special Manacharge effects
            if (this.handleSpecialManachargeEffects(effectText, unit, context)) {
                return { success: true, special: true };
            }
            
            // Use the general ability parsing system for other effects
            const result = this.executeManachargeEffect(effectText, { unit, ...context });
            
            // Enhanced logging with effect details
            if (result.success && result.effects.length > 0) {
                this.logManachargeEffect(result.effects[0]);
            }

            return result;
        }, { ability: 'manacharge', unit: data.unit });
    }

    /**
     * Handle special Manacharge effects that need custom logic
     */
    handleSpecialManachargeEffects(effectText, unit, context) {
        const lowerText = effectText.toLowerCase();
        
        // Void Element special ability
        if (lowerText === 'double this unit\'s attack') {
            const currentAttack = unit.currentAttack || unit.attack;
            const newAttack = currentAttack * 2;
            
            const updates = {
                currentAttack: newAttack
            };
            const reason = 'doubled its attack from Manacharge';
            
            this.updateUnitStats(context.playerId, context.slotIndex, updates, reason);
            this.log(`${unit.name} doubled its attack from ${currentAttack} to ${newAttack}!`);
            
            return true;
        }
        
        return false;
    }

    /**
     * Execute parsed Manacharge effect
     */
    executeManachargeEffect(effectText, context) {
        const effects = AbilityParser.parseAbilityText(effectText, context);
        const result = { success: false, effects: [] };

        if (!effects || effects.length === 0) {
            this.log(`Could not parse Manacharge effect: ${effectText}`);
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
     * Handle Manacharge activation trigger
     */
    handleManachargeActivation(data) {
        return this.safeExecute(() => {
            this.log('Manacharge activation triggered', data);
            
            // Trigger all Manacharge abilities on the battlefield
            const state = this.getCurrentState();
            const playerId = data.playerId;
            
            if (!state.players || !state.players[playerId]) {
                return { success: false, error: 'Invalid player' };
            }
            
            const battlefield = state.players[playerId].battlefield;
            let activatedCount = 0;
            
            battlefield.forEach((unit, slotIndex) => {
                if (unit && unit.ability && unit.ability.toLowerCase().includes('manacharge:')) {
                    this.emitEvent('ability:manacharge', {
                        unit,
                        context: { playerId, slotIndex }
                    });
                    activatedCount++;
                }
            });
            
            this.log(`Activated ${activatedCount} Manacharge abilities`);
            return { success: true, activated: activatedCount };
        }, { ability: 'manacharge-trigger' });
    }

    /**
     * Log Manacharge effect details
     */
    logManachargeEffect(effect) {
        let effectDescription = '';
        
        if (effect.type === 'buff') {
            if (effect.target === 'all-friendly-units') {
                effectDescription = `gives all units +${effect.attack}/+${effect.health}`;
            } else if (effect.target === 'self') {
                effectDescription = `gains +${effect.attack}/+${effect.health}`;
            } else if (effect.target === 'slot') {
                effectDescription = `buffs its slot +${effect.attack}/+${effect.health}`;
            }
        } else if (effect.type === 'damage') {
            effectDescription = `deals ${effect.amount} damage to ${effect.targetType.replace('_', ' ')}`;
        } else if (effect.type === 'abilityGrant') {
            effectDescription = `gains ${effect.ability}`;
        }

        if (effectDescription) {
            this.log(`Manacharge effect: ${effectDescription}`);
        }
    }

    /**
     * Update unit stats (helper method)
     */
    updateUnitStats(playerId, slotIndex, updates, reason) {
        if (this.gameState) {
            this.gameState.addAction({
                type: 'UPDATE_UNIT',
                playerId,
                slotIndex,
                updates,
                reason
            });
        }
    }
}