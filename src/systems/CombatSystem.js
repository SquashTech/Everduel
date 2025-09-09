/**
 * Combat system handling all battle mechanics
 * Manages unit attacks, abilities, and combat resolution
 */
import ErrorHandler from '../core/ErrorHandler.js';
import StatCalculator from '../utils/StatCalculator.js';

class CombatSystem {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.statCalculator = new StatCalculator();
        this.errorHandler = null;
    }

    /**
     * Initialize the combat system
     */
    async initialize() {
        this.errorHandler = new ErrorHandler(this.eventBus);
        this.statCalculator.initialize(this.gameState);
        this.setupEventHandlers();
        console.log('⚔️ CombatSystem initialized');
    }

    /**
     * Setup event handlers for combat-related events
     */
    setupEventHandlers() {
        this.eventBus.on('combat:attack', (data) => this.handleAttack(data));
        // REMOVED: combat:unit-clicked listener - BattlefieldComponent now directly emits combat:attack
        this.eventBus.on('turn:started', (data) => this.handleTurnStart(data));
    }

    /**
     * Handle unit click for deterministic attacking (called directly, not via event)
     * @param {Object} data - Unit click data
     */
    handleUnitClick(data) {
        console.log('⚔️ CombatSystem.handleUnitClick received:', data);
        
        const { unit, slotIndex, playerId } = data;
        const currentPlayer = this.stateSelectors.getCurrentPlayer();
        
        console.log('⚔️ Current player:', currentPlayer, 'Clicked by:', playerId);
        
        // Only process clicks during the player's turn
        if (currentPlayer !== playerId) {
            console.log('⚔️ Not your turn, cannot attack');
            return;
        }
        
        // Check if unit can attack
        if (!unit || this.stateSelectors.hasUnitAttacked(playerId, unit.id)) {
            console.log('⚔️ Unit cannot attack (already attacked or invalid unit)');
            return;
        }
        
        // Check if unit has summoning sickness or Rush
        if (!unit.canAttack && !this.hasAbility(unit, 'Rush')) {
            console.log('⚔️ Unit has summoning sickness');
            return;
        }
        
        // Validate and ensure unit properties are set
        if (!unit.currentHealth && !unit.health) {
            console.error('⚔️ Unit missing health properties:', unit);
            return;
        }
        
        // Ensure critical properties are set
        unit.slotIndex = slotIndex; // Ensure slot is set
        unit.owner = playerId; // Ensure owner is set
        unit.currentHealth = unit.currentHealth || unit.health; // Initialize current health if not set
        
        console.log('⚔️ Unit validated:', { 
            name: unit.name, 
            owner: unit.owner, 
            slotIndex: unit.slotIndex, 
            health: unit.currentHealth || unit.health,
            attack: unit.currentAttack || unit.attack
        });
        
        const target = this.getDeterministicTarget(unit);
        
        if (!target) {
            console.log('⚔️ No valid targets for attack');
            return;
        }
        
        console.log(`⚔️ ${unit.name} attacking ${target.type === 'player' ? 'player' : target.unit.name}`);
        
        // Execute the attack - preserve target structure for proper handling
        this.eventBus.emit('combat:attack', {
            attacker: unit,
            target: target, // Keep full target structure with type information
            attackerSlot: slotIndex,
            targetSlot: target.slotIndex
        });
    }

    /**
     * Handle an attack between units or unit to player
     * @param {Object} data - Attack data
     */
    handleAttack(data) {
        const { attacker, target, attackerSlot, targetSlot } = data;
        
        // Validate attack with specific feedback
        const validationResult = this.validateAttack(attacker, target);
        if (!validationResult.valid) {
            console.warn('Invalid attack attempted:', validationResult.reason);
            // Emit user feedback event
            this.eventBus.emit('combat:attack-invalid', {
                attacker,
                reason: validationResult.reason,
                message: validationResult.userMessage
            });
            return;
        }

        // Start attack animation
        const animationManager = this.gameEngine.systems.get('AnimationManager');
        if (animationManager) {
            const attackerId = attacker.unitId || `${attacker.owner}-${attackerSlot}`;
            const animationDuration = this.getAttackAnimationDuration(attacker);
            animationManager.startAttackAnimation(attackerId, animationDuration);
        }

        // Calculate damage
        const actualTarget = target.type === 'unit' ? target.unit : target;
        const damage = this.calculateDamage(attacker, actualTarget);
        
        // Check for first strike
        if (attacker.ability && attacker.ability.includes('First Strike')) {
            this.applyDamage(target, damage, attacker);
            
            // If target dies, attacker takes no return damage
            if (target.type === 'unit') {
                const state = this.gameState.getState();
                const updatedTarget = state.players[target.unit.owner].battlefield[targetSlot];
                if (updatedTarget && this.isUnitDead(updatedTarget)) {
                    this.eventBus.emit('unit:dies', {
                        unit: updatedTarget,
                        owner: target.unit.owner,
                        slotIndex: targetSlot
                    });
                    return;
                }
            }
        }

        // Apply mutual damage for unit vs unit combat
        if (target.type === 'unit') {
            const targetUnit = target.unit;
            const returnDamage = this.calculateDamage(targetUnit, attacker);
            
            // Create proper target structure for attacker damage
            const attackerTarget = { 
                type: 'unit', 
                unit: attacker, 
                owner: attacker.owner, 
                slotIndex: attackerSlot 
            };
            this.applyDamage(attackerTarget, returnDamage, targetUnit);
            
            if (!attacker.ability || !attacker.ability.includes('First Strike')) {
                this.applyDamage(target, damage, attacker);
            }

            // Handle Trample - excess damage goes to player
            if (this.hasAbility(attacker, 'Trample') && target.type === 'unit') {
                const targetCurrentHealth = target.unit.currentHealth || target.unit.health;
                if (damage > targetCurrentHealth) {
                    const excessDamage = damage - targetCurrentHealth;
                    console.log(`⚔️ Trample! ${excessDamage} excess damage to player`);
                    
                    this.eventBus.emit('combat:damage', {
                        target: { type: 'player', playerId: this.stateSelectors.getEnemyPlayer(attacker.owner) },
                        amount: excessDamage,
                        source: attacker,
                        type: 'trample'
                    });
                }
            }

            // Check for deaths using current health after damage events
            const state = this.gameState.getState();
            const updatedAttacker = state.players[attacker.owner].battlefield[attackerSlot];
            const updatedTarget = state.players[target.unit.owner].battlefield[targetSlot];
            
            if (updatedAttacker && this.isUnitDead(updatedAttacker)) {
                this.eventBus.emit('unit:dies', {
                    unit: updatedAttacker,
                    owner: attacker.owner,
                    slotIndex: attackerSlot
                });
            } else if (updatedAttacker) {
                // Attacker survived - emit survived-attacking event
                this.eventBus.emit('unit:survived-attacking', {
                    unit: updatedAttacker,
                    owner: attacker.owner,
                    slotIndex: attackerSlot
                });
            }
            
            if (updatedTarget && this.isUnitDead(updatedTarget)) {
                this.eventBus.emit('unit:dies', {
                    unit: updatedTarget,
                    owner: target.unit.owner,
                    slotIndex: targetSlot
                });
            }

        } else if (target.type === 'player') {
            // Direct player damage
            this.eventBus.emit('combat:damage', {
                target: { type: 'player', playerId: target.playerId },
                amount: damage,
                source: attacker,
                type: 'combat'
            });
            
            // Handle Lifesteal for direct player attacks
            if (attacker) {
                console.log(`🩸 Lifesteal check (direct player attack): ${attacker.name} ability: "${attacker.ability}"`);
                const hasLifesteal = this.hasAbility(attacker, 'Lifesteal');
                console.log(`🩸 hasAbility(${attacker.name}, 'Lifesteal'): ${hasLifesteal}`);
                if (hasLifesteal) {
                    this.handleLifesteal(attacker, damage);
                }
            } else {
                console.log('🩸 No attacker for Lifesteal check (direct player attack)');
            }
        }

        // Handle Sneaky first attack - mark as having targeted player
        if (this.hasAbility(attacker, 'Sneaky') && target.type === 'player') {
            attacker.hasAttackedPlayer = true;
        }

        // Mark attacker as having attacked
        this.markAsAttacked(attacker);
        
        // Emit attack completed event with full information
        this.eventBus.emit('combat:attack-completed', {
            attacker: {
                ...attacker,
                owner: attacker.owner  // Ensure owner is included
            },
            target,
            damage,
            attackerSlot,
            targetSlot
        });
    }

    /**
     * Check if a unit can attack
     * @param {Object} attacker - Attacking unit
     * @param {Object} target - Target unit or player
     * @returns {boolean} True if attack is valid
     */
    canAttack(attacker, target) {
        return this.validateAttack(attacker, target).valid;
    }

    /**
     * Validate an attack with detailed feedback
     * @param {Object} attacker - Attacking unit
     * @param {Object} target - Target unit or player
     * @returns {Object} Validation result with reason and user message
     */
    validateAttack(attacker, target) {
        // Check if unit has "Can't attack" ability
        if (attacker.ability && attacker.ability.toLowerCase().includes("can't attack")) {
            return {
                valid: false,
                reason: 'cannot_attack',
                userMessage: `${attacker.name} cannot attack`
            };
        }

        // Debug: Check attacker owner
        if (!attacker.owner) {
            console.error('⚔️ ERROR: Attacker missing owner property!', attacker);
            return {
                valid: false,
                reason: 'missing_owner',
                userMessage: 'Unit has no owner'
            };
        }

        // Check if it's the attacker's turn
        const currentPlayer = this.stateSelectors.getCurrentPlayer();
        if (attacker.owner !== currentPlayer) {
            console.log(`⚔️ Turn validation failed: attacker.owner=${attacker.owner}, currentPlayer=${currentPlayer}`);
            return {
                valid: false,
                reason: 'not_players_turn',
                userMessage: `It's not ${attacker.owner}'s turn`
            };
        }

        // Check if unit has already attacked this turn
        if (this.stateSelectors.hasUnitAttacked(attacker.owner, attacker.id)) {
            return {
                valid: false,
                reason: 'already_attacked',
                userMessage: `${attacker.name} has already attacked this turn`
            };
        }

        // Check summoning sickness - units can't attack on turn they're played unless they have Rush
        if (attacker.summonedThisTurn && !this.hasAbility(attacker, 'Rush')) {
            return {
                valid: false,
                reason: 'summoning_sickness',
                userMessage: `${attacker.name} cannot attack this turn (summoning sickness)`
            };
        }

        // Special check for Goblin Machine - needs a Goblin in each column
        if (attacker.name === 'Goblin Machine') {
            const battlefield = this.stateSelectors.getPlayerBattlefield(attacker.owner);
            const columns = [0, 1, 2]; // The three columns
            const missingColumns = [];
            
            for (const column of columns) {
                // Check both front (column) and back (column + 3) slots for Goblins
                const frontSlot = column;
                const backSlot = column + 3;
                const frontUnit = battlefield[frontSlot];
                const backUnit = battlefield[backSlot];
                
                const hasGoblinInColumn = 
                    (frontUnit && frontUnit.tags && frontUnit.tags.includes('Goblin')) ||
                    (backUnit && backUnit.tags && backUnit.tags.includes('Goblin'));
                
                if (!hasGoblinInColumn) {
                    missingColumns.push(column);
                }
            }
            
            if (missingColumns.length > 0) {
                const columnNames = missingColumns.map(col => 
                    col === 0 ? 'left' : col === 1 ? 'middle' : 'right'
                ).join(', ');
                
                return {
                    valid: false,
                    reason: 'goblin_machine_requirement',
                    userMessage: `Goblin Machine needs a Goblin in each column. Missing: ${columnNames}`
                };
            }
        }

        return { valid: true };
    }

    /**
     * Calculate damage for an attack
     * @param {Object} attacker - Attacking unit
     * @param {Object} target - Target unit or player
     * @returns {number} Damage amount
     */
    calculateDamage(attacker, target) {
        // Use stat calculator for dynamic attack calculation
        const damage = this.statCalculator.calculateEffectiveAttack(attacker);
        return Math.max(0, damage);
    }

    /**
     * Apply damage to a unit or player
     * @param {Object} target - Target to damage
     * @param {number} damage - Damage amount
     * @param {Object} source - Source of damage
     */
    applyDamage(target, damage, source) {
        console.log('⚔️ applyDamage called with target:', target, 'damage:', damage);
        
        if (target.type === 'unit') {
            // Extract the actual unit from target structure
            const unit = target.unit || target;
            const playerId = target.playerId || target.owner || unit.owner;
            const slotIndex = target.slotIndex !== undefined ? target.slotIndex : unit.slotIndex;
            
            if (!playerId || slotIndex === undefined) {
                console.error('⚔️ Missing required properties for unit damage:', { playerId, slotIndex, target, unit });
                return;
            }
            
            // Emit damage event for units to ensure proper state management
            this.eventBus.emit('combat:damage', {
                target: { 
                    type: 'unit', 
                    playerId: playerId,
                    slotIndex: slotIndex,
                    unit: unit
                },
                amount: damage,
                source,
                type: 'combat'
            });
            
            // Check for Lifesteal on the attacking unit
            if (source) {
                console.log(`🩸 Lifesteal check: ${source.name} ability: "${source.ability}"`);
                const hasLifesteal = this.hasAbility(source, 'Lifesteal');
                console.log(`🩸 hasAbility(${source.name}, 'Lifesteal'): ${hasLifesteal}`);
                if (hasLifesteal) {
                    this.handleLifesteal(source, damage);
                }
            } else {
                console.log('🩸 No source unit for Lifesteal check');
            }
        } else if (target.type === 'player') {
            this.eventBus.emit('combat:damage', {
                target: { type: 'player', playerId: target.playerId },
                amount: damage,
                source,
                type: 'combat'
            });
            
            // Check for Lifesteal on the attacking unit
            if (source) {
                console.log(`🩸 Lifesteal check: ${source.name} ability: "${source.ability}"`);
                const hasLifesteal = this.hasAbility(source, 'Lifesteal');
                console.log(`🩸 hasAbility(${source.name}, 'Lifesteal'): ${hasLifesteal}`);
                if (hasLifesteal) {
                    this.handleLifesteal(source, damage);
                }
            } else {
                console.log('🩸 No source unit for Lifesteal check');
            }
        }
    }

    /**
     * Handle Lifesteal healing for a unit that dealt damage
     * @param {Object} source - The unit with Lifesteal that dealt damage
     * @param {number} damage - Amount of damage dealt
     */
    handleLifesteal(source, damage) {
        if (!source || !source.owner) {
            console.warn('⚔️ Lifesteal: Invalid source unit');
            return;
        }

        const playerId = source.owner;
        const state = this.gameState.getState();
        const currentHealth = state.players[playerId].health;
        const maxHealth = 30; // Updated max health
        const healAmount = damage;
        const newHealth = Math.min(currentHealth + healAmount, maxHealth);

        console.log(`💚 Lifesteal: ${source.name} dealt ${damage} damage, healing ${playerId} for ${healAmount} (${currentHealth} -> ${newHealth})`);

        // Update player health
        this.gameEngine.dispatch({
            type: 'SET_PLAYER_HEALTH',
            payload: { 
                playerId, 
                health: newHealth 
            }
        });

        // Emit healing event for visual feedback
        this.eventBus.emit('player:healed', {
            playerId,
            amount: healAmount,
            source: source,
            type: 'lifesteal'
        });
    }

    /**
     * Check if a unit is dead
     * @param {Object} unit - Unit to check
     * @returns {boolean} True if unit is dead
     */
    isUnitDead(unit) {
        const currentHealth = unit.currentHealth || unit.health;
        return currentHealth <= 0;
    }

    /**
     * Mark a unit as having attacked this turn (using slot-based tracking)
     * @param {Object} unit - Unit that attacked
     */
    markAsAttacked(unit) {
        const currentlyAttacked = this.stateSelectors.getHasAttacked(unit.owner);
        const hasAttacked = [...currentlyAttacked, unit.slotIndex];
        
        console.log(`⚔️ Marking slot ${unit.slotIndex} (${unit.name}) as having attacked`);
        
        this.gameEngine.dispatch({
            type: 'SET_PLAYER_HAS_ATTACKED',
            payload: {
                playerId: unit.owner,
                hasAttacked
            }
        });
    }

    /**
     * Handle ability triggers during combat - Route to AbilitySystem
     * @param {Object} data - Ability trigger data
     */
    handleAbilityTrigger(data) {
        const { unit, ability, trigger, context } = data;
        
        // Route all abilities to AbilitySystem for centralized processing
        this.eventBus.emit(`ability:${ability.toLowerCase()}`, {
            unit,
            trigger,
            context
        });
    }






    /**
     * Handle start of turn effects
     * @param {Object} data - Turn start data
     */
    handleTurnStart(data) {
        const { player } = data;
        
        // Clear has attacked list for current player
        this.gameEngine.dispatch({
            type: 'SET_PLAYER_HAS_ATTACKED',
            payload: {
                playerId: player,
                hasAttacked: []
            }
        });

        // NOTE: Manacharge abilities should ONLY trigger when a Blue Unleash is played,
        // NOT at the start of turns. This was a bug that has been fixed.
    }

    /**
     * Check if a unit has a specific ability (either innate or granted by auras)
     * @param {Object} unit - Unit to check
     * @param {string} ability - Ability name to check for
     * @returns {boolean} True if unit has the ability
     */
    hasAbility(unit, ability) {
        // Debug logging for Lifesteal specifically
        if (ability.toLowerCase() === 'lifesteal') {
            console.log(`🔍 hasAbility debug: unit.ability = "${unit.ability}"`);
            console.log(`🔍 Looking for: "${ability}" (lowercase: "${ability.toLowerCase()}")`);
        }
        
        // First check innate ability
        if (unit.ability && unit.ability.toLowerCase().includes(ability.toLowerCase())) {
            if (ability.toLowerCase() === 'lifesteal') {
                console.log(`🔍 Found ${ability} in innate ability text!`);
            }
            return true;
        }
        
        // Then check if the ability is granted by an aura (like Lich)
        if (this.statCalculator) {
            const state = this.gameEngine.getState();
            const auraResult = this.statCalculator.hasAbility(unit, ability, state);
            if (ability.toLowerCase() === 'lifesteal' && auraResult) {
                console.log(`🔍 Found ${ability} in aura abilities!`);
            }
            return auraResult;
        }
        
        if (ability.toLowerCase() === 'lifesteal') {
            console.log(`🔍 ${ability} not found anywhere`);
        }
        return false;
    }

    /**
     * Get deterministic target for an attack using column-based combat
     * Units can only attack within their own column (left/middle/right)
     * @param {Object} attacker - Attacking unit
     * @returns {Object|null} Single target or null if no valid target
     */
    getDeterministicTarget(attacker) {
        const enemyPlayer = this.stateSelectors.getEnemyPlayer(attacker.owner);
        const enemyField = this.stateSelectors.getPlayerBattlefield(enemyPlayer);
        
        // Determine attacker's column (0=left, 1=middle, 2=right)
        const attackerColumn = attacker.slotIndex % 3;
        
        console.log(`⚔️ getDeterministicTarget: attacker=${attacker.name} in column ${attackerColumn}, enemyPlayer=${enemyPlayer}`);
        console.log(`⚔️ Enemy battlefield:`, enemyField.map((u, i) => `${i}: ${u?.name || 'empty'}`));
        
        // Column slots: front row (column) and back row (column + 3)
        const frontSlot = attackerColumn;        // 0, 1, or 2
        const backSlot = attackerColumn + 3;     // 3, 4, or 5
        
        console.log(`⚔️ Checking column ${attackerColumn}: front slot ${frontSlot}, back slot ${backSlot}`);
        
        // Use specialized targeting methods based on abilities
        if (this.hasAbility(attacker, 'Sneaky') && !attacker.hasAttackedPlayer) {
            return this.getSneakyTarget(attacker, enemyPlayer);
        }
        
        if (this.hasAbility(attacker, 'Flying')) {
            return this.getFlyingTarget(attacker, enemyField, frontSlot, backSlot, enemyPlayer);
        }
        
        if (this.hasAbility(attacker, 'Ranged')) {
            return this.getRangedTarget(attacker, enemyField, frontSlot, backSlot, enemyPlayer);
        }
        
        return this.getNormalTarget(attacker, enemyField, frontSlot, backSlot, attackerColumn, enemyPlayer);
    }

    /**
     * Handle targeting for Sneaky units (attacks player directly on first attack)
     */
    getSneakyTarget(attacker, enemyPlayer) {
        console.log(`⚔️ Sneaky unit ${attacker.name} attacks player directly on first attack`);
        return { type: 'player', playerId: enemyPlayer };
    }

    /**
     * Handle targeting for Flying units (attack player unless enemy Flying unit in column)
     */
    getFlyingTarget(attacker, enemyField, frontSlot, backSlot, enemyPlayer) {
        const frontUnit = enemyField[frontSlot];
        const backUnit = enemyField[backSlot];
        
        // Check for enemy Flying units in this column
        const enemyFlyingUnit = [frontUnit, backUnit].find(unit => 
            unit && this.hasAbility(unit, 'Flying')
        );
        
        if (enemyFlyingUnit) {
            const slotIndex = frontUnit === enemyFlyingUnit ? frontSlot : backSlot;
            console.log(`⚔️ Flying unit ${attacker.name} targets enemy Flying unit ${enemyFlyingUnit.name}`);
            return { type: 'unit', unit: enemyFlyingUnit, slotIndex };
        }
        
        // No Flying units in column - attack player directly
        console.log(`⚔️ Flying unit ${attacker.name} attacks player directly`);
        return { type: 'player', playerId: enemyPlayer };
    }

    /**
     * Handle targeting for Ranged units (back row first, then player, ignoring front row)
     */
    getRangedTarget(attacker, enemyField, frontSlot, backSlot, enemyPlayer) {
        const backUnit = enemyField[backSlot];
        if (backUnit && this.canAttack(attacker, backUnit)) {
            console.log(`⚔️ Ranged unit targeting back row: ${backUnit.name} at slot ${backSlot}`);
            
            
            return { type: 'unit', unit: backUnit, slotIndex: backSlot };
        }
        
        // No back row unit - can attack player directly (ignoring front row)
        console.log(`⚔️ Ranged unit targeting player directly: ${enemyPlayer}`);
        
        const frontUnit = enemyField[frontSlot];
        if (frontUnit) {
        } else {
        }
        
        return { type: 'player', playerId: enemyPlayer };
    }

    /**
     * Handle targeting for normal units (front row, then back row, then player)
     */
    getNormalTarget(attacker, enemyField, frontSlot, backSlot, attackerColumn, enemyPlayer) {
        const frontUnit = enemyField[frontSlot];
        if (frontUnit && this.canAttack(attacker, frontUnit)) {
            console.log(`⚔️ Targeting front row unit: ${frontUnit.name} at slot ${frontSlot}`);
            return { type: 'unit', unit: frontUnit, slotIndex: frontSlot };
        }
        
        const backUnit = enemyField[backSlot];
        if (backUnit && this.canAttack(attacker, backUnit)) {
            console.log(`⚔️ Targeting back row unit: ${backUnit.name} at slot ${backSlot}`);
            return { type: 'unit', unit: backUnit, slotIndex: backSlot };
        }
        
        // Column is empty - attack player directly
        console.log(`⚔️ Column ${attackerColumn} empty - normal unit attacking player`);
        return { type: 'player', playerId: enemyPlayer };
    }

    /**
     * Get valid targets for an attack (legacy method for AI)
     * @param {Object} attacker - Attacking unit
     * @returns {Array} Array of valid targets
     */
    getValidTargets(attacker) {
        const target = this.getDeterministicTarget(attacker);
        return target ? [target] : [];
    }

    /**
     * Get animation duration for an attack based on unit abilities
     * @param {Object} attacker - The attacking unit
     * @returns {number} Animation duration in milliseconds
     */
    getAttackAnimationDuration(attacker) {
        // Base duration
        let duration = 800;
        
        // Modify duration based on abilities
        if (this.hasAbility(attacker, 'Quick Strike')) {
            duration *= 0.5; // 400ms for quick attacks
        } else if (this.hasAbility(attacker, 'Slow')) {
            duration *= 1.5; // 1200ms for slow attacks
        }
        
        return duration;
    }
}

export default CombatSystem;