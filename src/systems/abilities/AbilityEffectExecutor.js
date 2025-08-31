/**
 * Centralized effect execution
 * Handles the actual execution of parsed ability effects
 */
export default class AbilityEffectExecutor {
    /**
     * Execute a parsed ability effect
     */
    static executeEffect(effect, context, gameState, eventBus, combatSystem) {
        switch (effect.type) {
            case 'damage':
                return this.executeDamageEffect(effect, context, gameState, eventBus, combatSystem);
            case 'buff':
                return this.executeBuffEffect(effect, context, gameState, eventBus);
            case 'abilityGrant':
                return this.executeAbilityGrantEffect(effect, context, gameState, eventBus);
            case 'summon':
                return this.executeSummonEffect(effect, context, gameState, eventBus);
            case 'draw':
                return this.executeDrawEffect(effect, context, gameState, eventBus);
            case 'heal':
                return this.executeHealEffect(effect, context, gameState, eventBus, combatSystem);
            default:
                console.warn(`Unknown effect type: ${effect.type}`);
                return { success: false, error: 'Unknown effect type' };
        }
    }

    /**
     * Execute damage effects
     */
    static executeDamageEffect(effect, context, gameState, eventBus, combatSystem) {
        const state = gameState.getState();
        const { unit } = context;
        const owner = unit.owner || context.playerId;
        const enemyId = owner === 'player' ? 'ai' : 'player';

        let targets = this.getTargetsForDamageEffect(effect, state, unit, owner, enemyId);
        
        if (targets.length === 0) {
            console.log('🎯 No valid targets for damage effect');
            return { success: false, reason: 'no_targets' };
        }

        // Execute damage on each target
        for (const target of targets) {
            if (target.type === 'player') {
                this.damagePlayer(target.playerId, effect.amount, gameState, eventBus);
            } else {
                this.damageUnit(target, effect.amount, gameState, eventBus, combatSystem);
            }
        }

        return { success: true, targets: targets.length };
    }

    /**
     * Get targets for damage effects based on effect configuration
     */
    static getTargetsForDamageEffect(effect, state, unit, owner, enemyId) {
        let targets = [];

        if (effect.targetType === 'enemy_unit') {
            const enemyBattlefield = state.players[enemyId].battlefield;
            const validUnits = enemyBattlefield.filter(u => u !== null);
            
            if (effect.targetSelection === 'random' && validUnits.length > 0) {
                const randomIndex = Math.floor(Math.random() * validUnits.length);
                targets = [validUnits[randomIndex]];
            } else if (effect.targetSelection === 'all') {
                targets = validUnits;
            }
        } else if (effect.targetType === 'enemy_back_row') {
            const enemyBattlefield = state.players[enemyId].battlefield;
            const backRowUnits = [3, 4, 5]
                .map(slotIndex => enemyBattlefield[slotIndex])
                .filter(u => u !== null);
            targets = backRowUnits;
        } else if (effect.targetType === 'enemy_front_row') {
            const enemyBattlefield = state.players[enemyId].battlefield;
            const frontRowUnits = [0, 1, 2]
                .map(slotIndex => enemyBattlefield[slotIndex])
                .filter(u => u !== null);
            targets = frontRowUnits;
        } else if (effect.targetType === 'enemy_player') {
            targets = [{ type: 'player', playerId: enemyId }];
        } else if (effect.targetType === 'both_players') {
            targets = [
                { type: 'player', playerId: owner },
                { type: 'player', playerId: enemyId }
            ];
        }

        return targets;
    }

    /**
     * Damage a player directly
     */
    static damagePlayer(playerId, amount, gameState, eventBus) {
        console.log(`💥 Dealing ${amount} damage to ${playerId}`);
        gameState.addAction({
            type: 'PLAYER_DAMAGE',
            playerId,
            amount
        });
        
        eventBus.emit('player:damaged', { playerId, amount });
    }

    /**
     * Damage a unit
     */
    static damageUnit(unit, amount, gameState, eventBus, combatSystem) {
        if (combatSystem && combatSystem.dealDamageToUnit) {
            console.log(`💥 Dealing ${amount} damage to ${unit.name}`);
            combatSystem.dealDamageToUnit(unit, amount, null);
        } else {
            console.warn('CombatSystem not available for unit damage');
        }
    }

    /**
     * Execute buff effects
     */
    static executeBuffEffect(effect, context, gameState, eventBus) {
        // Implementation for buff effects
        console.log(`🔥 Executing buff effect: +${effect.attack}/+${effect.health}`);
        
        const targets = this.getTargetsForBuffEffect(effect, context, gameState);
        
        for (const target of targets) {
            gameState.addAction({
                type: 'BUFF_UNIT',
                unit: target,
                attack: effect.attack,
                health: effect.health,
                temporary: effect.temporary || false
            });
        }

        return { success: true, targets: targets.length };
    }

    /**
     * Get targets for buff effects
     */
    static getTargetsForBuffEffect(effect, context, gameState) {
        const state = gameState.getState();
        const { unit } = context;
        const owner = unit.owner || context.playerId;
        let targets = [];

        // Simple target resolution - can be expanded
        if (effect.target === 'self') {
            targets = [unit];
        } else if (effect.target === 'random-slot') {
            const battlefield = state.players[owner].battlefield;
            const validUnits = battlefield.filter(u => u !== null && u !== unit);
            if (validUnits.length > 0) {
                const randomIndex = Math.floor(Math.random() * validUnits.length);
                targets = [validUnits[randomIndex]];
            }
        }

        return targets;
    }

    /**
     * Execute ability grant effects
     */
    static executeAbilityGrantEffect(effect, context, gameState, eventBus) {
        console.log(`⚡ Granting ability: ${effect.ability}`);
        
        const targets = this.getTargetsForBuffEffect(effect, context, gameState);
        
        for (const target of targets) {
            gameState.addAction({
                type: 'GRANT_ABILITY',
                unit: target,
                ability: effect.ability
            });
        }

        return { success: true, targets: targets.length };
    }

    /**
     * Execute summon effects (placeholder)
     */
    static executeSummonEffect(effect, context, gameState, eventBus) {
        console.log(`🔮 Executing summon effect`);
        // Implementation would depend on summon system
        return { success: true };
    }

    /**
     * Execute draw effects (placeholder)
     */
    static executeDrawEffect(effect, context, gameState, eventBus) {
        console.log(`📚 Executing draw effect: ${effect.amount} cards`);
        // Implementation would depend on card system
        return { success: true };
    }

    /**
     * Execute heal effects (placeholder)
     */
    static executeHealEffect(effect, context, gameState, eventBus, combatSystem) {
        console.log(`💚 Executing heal effect: ${effect.amount} healing`);
        // Implementation would depend on healing system
        return { success: true };
    }
}