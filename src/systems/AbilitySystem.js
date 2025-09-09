/**
 * Modular ability system for handling card keywords and effects
 * Provides a centralized, extensible system for all card abilities
 */
import ErrorHandler from '../core/ErrorHandler.js';
import UnitFactory from '../utils/UnitFactory.js';
import { SPELL_TOKENS, CHAMPIONS } from '../data/EmbeddedGameData.js';

class AbilitySystem {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.combatSystem = null;
        this.errorHandler = null;
    }

    /**
     * Initialize the ability system
     */
    initialize() {
        // Initialize error handler
        this.errorHandler = new ErrorHandler(this.eventBus);
        
        // Get reference to combat system if available
        if (this.gameEngine) {
            this.combatSystem = this.gameEngine.getSystem('CombatSystem');
        }
        
        this.setupEventHandlers();
    }

    /**
     * Setup event handlers for ability triggers
     */
    setupEventHandlers() {
        this.eventBus.on('ability:unleash', (data) => this.handleUnleash(data));
        this.eventBus.on('ability:last-gasp', (data) => this.handleLastGasp(data));
        this.eventBus.on('ability:manacharge', (data) => this.handleManacharge(data));
        this.eventBus.on('ability:manacharge-trigger', (data) => this.handleManachargeActivation(data));
        this.eventBus.on('ability:kindred', (data) => this.handleKindred(data));
        this.eventBus.on('ability:buff', (data) => this.handleBuff(data));
        this.eventBus.on('turn:ended', (data) => this.handleEndOfTurn(data));
        this.eventBus.on('turn:started', (data) => this.handleStartOfTurn(data));
        
        // Tier 2 ability events
        this.eventBus.on('unit:survived-damage', (data) => this.handleSurvivedDamage(data));
        this.eventBus.on('unit:survived-attacking', (data) => this.handleSurvivedAttacking(data));
        this.eventBus.on('combat:attack-completed', (data) => this.handleAfterAttack(data));
        this.eventBus.on('card:played', (data) => this.handleOpponentSummoned(data));
        this.eventBus.on('unit:dies', (data) => this.handleUnitDeath(data));
        this.eventBus.on('souls:gained', (data) => this.handleSoulsGained(data));
        this.eventBus.on('slot:buff', (data) => this.handleRoyalGuardSlotBuff(data));
    }

    /**
     * Parse ability text and execute the appropriate effect
     * @param {string} abilityText - The full ability text
     * @param {Object} context - Context including unit, owner, etc.
     * @returns {Object} Result of ability execution
     */
    parseAndExecuteAbility(abilityText, context) {
        const lowerText = abilityText.toLowerCase();
        const result = { success: false, effects: [] };

        // Parse damage effects
        if (lowerText.includes('deal') && lowerText.includes('damage')) {
            const damageEffect = this.parseDamageEffect(abilityText, context);
            if (damageEffect) {
                result.effects.push(damageEffect);
                this.executeDamageEffect(damageEffect, context);
                result.success = true;
            }
        }

        // Parse buff effects
        if (lowerText.includes('give') || lowerText.includes('gain')) {
            const buffEffect = this.parseBuffEffect(abilityText, { ...context, originalText: abilityText });
            if (buffEffect) {
                result.effects.push(buffEffect);
                this.executeBuffEffect(buffEffect, { ...context, originalText: abilityText });
                result.success = true;
            }
        }

        // Parse ability-granting effects
        if (lowerText.includes('gain rush') || lowerText.includes('gain flying') || lowerText.includes('gain ranged')) {
            const abilityEffect = this.parseAbilityGrantEffect(abilityText, context);
            if (abilityEffect) {
                result.effects.push(abilityEffect);
                this.executeAbilityGrantEffect(abilityEffect, context);
                result.success = true;
            }
        }

        // Parse summon effects (including Spider Queen's "Fill" ability)
        if (lowerText.includes('summon') || lowerText.includes('add') || lowerText.includes('fill')) {
            const summonEffect = this.parseSummonEffect(abilityText, context);
            if (summonEffect) {
                result.effects.push(summonEffect);
                this.executeSummonEffect(summonEffect, context);
                result.success = true;
            }
        }

        // Parse draw effects
        if (lowerText.includes('draw from your deck') || lowerText.includes('draw ')) {
            const drawEffect = this.parseDrawEffect(abilityText, context);
            if (drawEffect) {
                result.effects.push(drawEffect);
                this.executeDrawEffect(drawEffect, context);
                result.success = true;
            }
        }

        // Parse Soul consumption effects
        if (lowerText.includes('consume') && lowerText.includes('soul') || 
            lowerText.includes('for each of your souls')) {
            const soulEffect = this.parseSoulEffect(abilityText, context);
            if (soulEffect) {
                result.effects.push(soulEffect);
                this.executeSoulEffect(soulEffect, context);
                result.success = true;
            }
        }

        // Parse heal effects
        if (lowerText.includes('heal')) {
            const healEffect = this.parseHealEffect(abilityText, context);
            if (healEffect) {
                result.effects.push(healEffect);
                this.executeHealEffect(healEffect, context);
                result.success = true;
            }
        }

        // Parse Dragon Flame effects
        if (lowerText.includes('gain') && lowerText.includes('dragon flame')) {
            const dragonFlameEffect = this.parseDragonFlameEffect(abilityText, context);
            if (dragonFlameEffect) {
                result.effects.push(dragonFlameEffect);
                this.executeDragonFlameEffect(dragonFlameEffect, context);
                result.success = true;
            }
        }

        // Parse double buff effects (Dwarf King)
        if (lowerText.includes('double the buff')) {
            const doubleBuffEffect = this.parseDoubleBuffEffect(abilityText, context);
            if (doubleBuffEffect) {
                result.effects.push(doubleBuffEffect);
                this.executeDoubleBuffEffect(doubleBuffEffect, context);
                result.success = true;
            }
        }

        // Parse Dragon Flame damage effects (Skyterror)
        if (lowerText.includes('damage equal to your dragon flame') || 
            lowerText.includes('damage equal to your 🔥')) {
            const dragonFlameDamageEffect = this.parseDragonFlameDamageEffect(abilityText, context);
            if (dragonFlameDamageEffect) {
                result.effects.push(dragonFlameDamageEffect);
                this.executeDragonFlameDamageEffect(dragonFlameDamageEffect, context);
                result.success = true;
            }
        }

        // Parse Dragon Flame buff effects (Tier 4 Dragon)
        if (lowerText.includes('for each dragon flame')) {
            const dragonFlameBuffEffect = this.parseDragonFlameBuffEffect(abilityText, context);
            if (dragonFlameBuffEffect) {
                result.effects.push(dragonFlameBuffEffect);
                this.executeDragonFlameBuffEffect(dragonFlameBuffEffect, context);
                result.success = true;
            }
        }

        return result;
    }

    /**
     * Parse damage effect from ability text
     * @param {string} text - Ability text
     * @param {Object} context - Context
     * @returns {Object} Damage effect object
     */
    parseDamageEffect(text, context) {
        // Special pattern: "deal X damage to your player" (for Swamp Ooze Last Gasp)
        const selfDamageMatch = text.match(/deal (\d+) damage to your player/i);
        if (selfDamageMatch) {
            const damage = parseInt(selfDamageMatch[1]);
            return {
                type: 'damage',
                amount: damage,
                targetType: 'own_player',
                targetSelection: 'self'
            };
        }
        
        // Special pattern: "deal X damage to both players"
        const bothPlayersMatch = text.match(/deal (\d+) damage to both players/i);
        if (bothPlayersMatch) {
            const damage = parseInt(bothPlayersMatch[1]);
            return {
                type: 'damage',
                amount: damage,
                targetType: 'both_players',
                targetSelection: 'both'
            };
        }

        // Special pattern: "deal X damage in this column"
        const columnDamageMatch = text.match(/deal (\d+) damage in this column/i);
        if (columnDamageMatch) {
            const damage = parseInt(columnDamageMatch[1]);
            return {
                type: 'damage',
                amount: damage,
                targetType: 'enemy_column',
                targetSelection: 'column'
            };
        }

        // Special pattern: "deal X damage in a random column"
        const randomColumnDamageMatch = text.match(/deal (\d+) damage in a random column/i);
        if (randomColumnDamageMatch) {
            const damage = parseInt(randomColumnDamageMatch[1]);
            return {
                type: 'damage',
                amount: damage,
                targetType: 'enemy_random_column',
                targetSelection: 'random_column'
            };
        }
        
        // Special pattern: "deal X damage in each column" (for Grand Magus)
        const eachColumnDamageMatch = text.match(/deal (\d+) damage in each column/i);
        if (eachColumnDamageMatch) {
            const damage = parseInt(eachColumnDamageMatch[1]);
            return {
                type: 'damage',
                amount: damage,
                targetType: 'enemy_each_column',
                targetSelection: 'each_column'
            };
        }
        
        // Special pattern: "deal X damage to enemies in this column" (for Archmage)
        const enemiesInColumnMatch = text.match(/deal (\d+) damage to enemies in this column/i);
        if (enemiesInColumnMatch) {
            const damage = parseInt(enemiesInColumnMatch[1]);
            return {
                type: 'damage',
                amount: damage,
                targetType: 'enemy_units_column',
                targetSelection: 'column'
            };
        }

        // Special pattern: "deal X damage to the back row enemy here" (for Marksman)
        const backRowHereMatch = text.match(/deal (\d+) damage to the back row enemy here/i);
        if (backRowHereMatch) {
            const damage = parseInt(backRowHereMatch[1]);
            return {
                type: 'damage',
                amount: damage,
                targetType: 'back_row_enemy_here',
                targetSelection: 'column'
            };
        }

        // Pattern: "deal X damage to TARGET"
        const damageMatch = text.match(/deal (\d+) damage to (.+?)(?:\.|,|$)/i);
        if (!damageMatch) return null;

        const damage = parseInt(damageMatch[1]);
        const targetText = damageMatch[2].trim();

        let targetType = 'unit';
        let targetSelection = 'random';

        const lowerTargetText = targetText.toLowerCase();
        
        if (lowerTargetText.includes('all')) {
            targetSelection = 'all';
        } else if (lowerTargetText.includes('random')) {
            targetSelection = 'random';
        } else if (lowerTargetText.includes('target')) {
            targetSelection = 'targeted';
        }

        if (lowerTargetText.includes('enemy') || lowerTargetText.includes('enemies') || lowerTargetText.includes('opponent')) {
            if (lowerTargetText.includes('back row')) {
                targetType = 'enemy_back_row';
            } else if (lowerTargetText.includes('front row')) {
                targetType = 'enemy_front_row';  
            } else if (lowerTargetText.includes('unit')) {
                targetType = 'enemy_unit';
            } else if (lowerTargetText.includes('all enemies')) {
                targetType = 'all_enemies';
            } else {
                targetType = 'enemy_player';
            }
        } else if (lowerTargetText.includes('friendly') || lowerTargetText.includes('allied')) {
            targetType = 'friendly_unit';
        }

        const result = {
            type: 'damage',
            amount: damage,
            targetType,
            targetSelection
        };
        
        console.log(`🔍 Parsed damage effect: "${text}" -> type: ${targetType}, amount: ${damage}`);
        return result;
    }

    /**
     * Execute a damage effect
     * @param {Object} effect - Damage effect object
     * @param {Object} context - Context including unit owner
     */
    executeDamageEffect(effect, context) {
        const state = this.gameState.getState();
        const { unit } = context;
        const owner = unit.owner || context.playerId;
        const enemyId = owner === 'player' ? 'ai' : 'player';

        let targets = [];

        // Get targets
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
            // Back row slots are indices 3, 4, 5
            const backRowUnits = [3, 4, 5]
                .map(slotIndex => enemyBattlefield[slotIndex])
                .filter(u => u !== null);
            
            console.log(`🧙 Wizard targeting enemy back row: found ${backRowUnits.length} units`);
            targets = backRowUnits;
        } else if (effect.targetType === 'enemy_front_row') {
            const enemyBattlefield = state.players[enemyId].battlefield;
            // Front row slots are indices 0, 1, 2
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
        } else if (effect.targetType === 'enemy_units_column') {
            // Column damage to units only (for Archmage) - does NOT target player
            const enemyBattlefield = state.players[enemyId].battlefield;
            const castingColumn = unit.slotIndex % 3; // 0, 1, or 2
            const frontSlot = castingColumn;      // 0, 1, or 2
            const backSlot = castingColumn + 3;   // 3, 4, or 5
            
            // Collect all units in this column (both front and back row)
            targets = [];
            const frontUnit = enemyBattlefield[frontSlot];
            const backUnit = enemyBattlefield[backSlot];
            
            if (frontUnit) {
                targets.push(frontUnit);
            }
            if (backUnit) {
                targets.push(backUnit);
            }
            
            console.log(`🏛️ Archmage targeting ${targets.length} enemy units in column ${castingColumn}`);
        } else if (effect.targetType === 'enemy_column') {
            // Column damage priority: Front → Back → Player
            const enemyBattlefield = state.players[enemyId].battlefield;
            const castingColumn = unit.slotIndex % 3; // 0, 1, or 2
            const frontSlot = castingColumn;      // 0, 1, or 2
            const backSlot = castingColumn + 3;   // 3, 4, or 5
            
            // Check for units in priority order
            const frontUnit = enemyBattlefield[frontSlot];
            const backUnit = enemyBattlefield[backSlot];
            
            if (frontUnit) {
                targets = [frontUnit];
            } else if (backUnit) {
                targets = [backUnit];
            } else {
                // No units in column, hit player
                targets = [{ type: 'player', playerId: enemyId }];
            }
        } else if (effect.targetType === 'enemy_random_column') {
            // Random column damage priority: Front → Back → Player
            const enemyBattlefield = state.players[enemyId].battlefield;
            const randomColumn = Math.floor(Math.random() * 3); // 0, 1, or 2
            const frontSlot = randomColumn;      // 0, 1, or 2
            const backSlot = randomColumn + 3;   // 3, 4, or 5
            
            console.log(`🎯 Storm Falcon targeting random column ${randomColumn}`);
            
            // Check for units in priority order
            const frontUnit = enemyBattlefield[frontSlot];
            const backUnit = enemyBattlefield[backSlot];
            
            if (frontUnit) {
                targets = [frontUnit];
            } else if (backUnit) {
                targets = [backUnit];
            } else {
                // No units in column, hit player
                targets = [{ type: 'player', playerId: enemyId }];
            }
        } else if (effect.targetType === 'enemy_each_column') {
            // Deal damage in each of the 3 columns (for Grand Magus)
            const enemyBattlefield = state.players[enemyId].battlefield;
            targets = [];
            
            console.log(`🧙 Grand Magus targeting all 3 columns`);
            
            // Process each column (0, 1, 2)
            for (let column = 0; column < 3; column++) {
                const frontSlot = column;          // 0, 1, or 2
                const backSlot = column + 3;       // 3, 4, or 5
                
                // Check for units in priority order: Front → Back → Player
                const frontUnit = enemyBattlefield[frontSlot];
                const backUnit = enemyBattlefield[backSlot];
                
                if (frontUnit) {
                    targets.push(frontUnit);
                    console.log(`🧙 Column ${column}: targeting front unit ${frontUnit.name}`);
                } else if (backUnit) {
                    targets.push(backUnit);
                    console.log(`🧙 Column ${column}: targeting back unit ${backUnit.name}`);
                } else {
                    // No units in column, hit player
                    targets.push({ type: 'player', playerId: enemyId });
                    console.log(`🧙 Column ${column}: no units, targeting player`);
                }
            }
        } else if (effect.targetType === 'own_player') {
            // Self-damage (for Swamp Ooze Last Gasp)
            targets = [{ type: 'player', playerId: owner }];
        } else if (effect.targetType === 'back_row_enemy_here') {
            // Marksman: Deal damage to back row enemy in the same column
            const enemyBattlefield = state.players[enemyId].battlefield;
            const castingColumn = unit.slotIndex % 3; // 0, 1, or 2
            const backSlot = castingColumn + 3;   // 3, 4, or 5
            
            const backUnit = enemyBattlefield[backSlot];
            if (backUnit) {
                targets = [backUnit];
            } else {
                // No back row unit in this column, no damage
                console.log(`🎯 No back row enemy in column ${castingColumn} for Marksman`);
                targets = [];
            }
        } else if (effect.targetType === 'all_enemies') {
            // Deal damage to all enemy units AND the enemy player (like Mana Vortex)
            const enemyBattlefield = state.players[enemyId].battlefield;
            const validUnits = enemyBattlefield.filter(u => u !== null);
            
            // Add all enemy units to targets
            targets = [...validUnits];
            
            // Add enemy player to targets
            targets.push({ type: 'player', playerId: enemyId });
            
            console.log(`⚡ Targeting all enemies: ${validUnits.length} units + player ${enemyId}`);
        }

        // Apply damage
        targets.forEach((target, index) => {
            if (target.type === 'player') {
                // Damage player
                console.log(`💥 [DAMAGE DEBUG] Damaging player ${target.playerId} for ${effect.amount} from ${unit.name}`);
                this.eventBus.emit('combat:damage', {
                    target: { type: 'player', playerId: target.playerId },
                    amount: effect.amount,
                    source: unit
                });
                
            } else {
                // Damage unit
                const slotIndex = state.players[enemyId].battlefield.findIndex(u => u === target);
                console.log(`💥 [DAMAGE DEBUG] Damaging unit ${target.name} for ${effect.amount} from ${unit.name}`);
                this.eventBus.emit('combat:damage', {
                    target: { type: 'unit', unit: target, slotIndex, playerId: enemyId },
                    amount: effect.amount,
                    source: unit
                });

            }
        });
    }

    /**
     * Parse buff effect from ability text
     * @param {string} text - Ability text
     * @param {Object} context - Context
     * @returns {Object} Buff effect object
     */
    parseBuffEffect(text, context) {
        // Pattern: "Give another Flying unit +1/+1"
        const anotherAbilityMatch = text.match(/give another ([a-z]+) unit \+(\d+)\/\+(\d+)/i);
        if (anotherAbilityMatch) {
            return {
                type: 'buff',
                attack: parseInt(anotherAbilityMatch[2]),
                health: parseInt(anotherAbilityMatch[3]),
                target: 'another-with-ability',
                ability: anotherAbilityMatch[1].toLowerCase(),
                targetSlot: null,
                temporary: false
            };
        }
        
        // Health-only buffs
        const healthOnlyMatch = text.match(/give all (?:of )?your units \+(\d+) health/i);
        if (healthOnlyMatch) {
            return {
                type: 'buff',
                attack: 0,
                health: parseInt(healthOnlyMatch[1]),
                target: 'all-friendly-units',
                targetSlot: null,
                temporary: false
            };
        }
        
        // Multiple tags permanent with "your other"
        console.log(`🔍 [TRACKER DEBUG] Checking text for multi-tag pattern: "${text}"`);
        const multiTagOtherPermMatch = text.match(/give your other ([a-z]+)s? and ([a-z]+)s? \+(\d+) Attack/i);
        if (multiTagOtherPermMatch) {
            // Convert plural forms to singular for tag matching
            let tag1 = multiTagOtherPermMatch[1];
            let tag2 = multiTagOtherPermMatch[2];
            
            // Remove trailing 's' if present to get singular form
            if (tag1.toLowerCase() === 'elves') tag1 = 'Elf';
            else if (tag1.endsWith('s')) tag1 = tag1.slice(0, -1);
            
            if (tag2.toLowerCase() === 'beasts') tag2 = 'Beast';
            else if (tag2.endsWith('s')) tag2 = tag2.slice(0, -1);
            
            console.log(`✅ [TRACKER DEBUG] Matched! Original: ${multiTagOtherPermMatch[1]}, ${multiTagOtherPermMatch[2]} -> Tags: ${tag1}, ${tag2}, Attack: +${multiTagOtherPermMatch[3]}`);
            return {
                type: 'buff',
                attack: parseInt(multiTagOtherPermMatch[3]),
                health: 0,
                target: 'multi-tag-based',
                tags: [tag1, tag2],
                targetSlot: null,
                temporary: false,
                excludeSelf: true
            };
        } else {
            console.log(`❌ [TRACKER DEBUG] No match for multi-tag pattern`);
        }

        // Multiple tags permanent
        const multiTagPermMatch = text.match(/give ([a-z]+)s? and ([a-z]+)s? \+(\d+) attack/i);
        if (multiTagPermMatch) {
            return {
                type: 'buff',
                attack: parseInt(multiTagPermMatch[3]),
                health: 0,
                target: 'multi-tag-based',
                tags: [multiTagPermMatch[1], multiTagPermMatch[2]],
                targetSlot: null,
                temporary: false
            };
        }

        // Multiple tags temporary
        const multiTagTempMatch = text.match(/([a-z]+)s? and ([a-z]+)s? have \+(\d+) attack this turn/i);
        if (multiTagTempMatch) {
            return {
                type: 'buff',
                attack: parseInt(multiTagTempMatch[3]),
                health: 0,
                target: 'multi-tag-based',
                tags: [multiTagTempMatch[1], multiTagTempMatch[2]],
                targetSlot: null,
                temporary: true
            };
        }

        // Front row buff
        const frontSlotsMatch = text.match(/your front slots gain \+(\d+)\/\+(\d+)/i);
        if (frontSlotsMatch) {
            return {
                type: 'buff',
                attack: parseInt(frontSlotsMatch[1]),
                health: parseInt(frontSlotsMatch[2]),
                target: 'front-slots',
                targetSlot: null,
                temporary: false
            };
        }

        // Other slots in row
        const otherSlotsInRowMatch = text.match(/give the other slots in this row \+(\d+)\/\+(\d+)/i);
        if (otherSlotsInRowMatch) {
            return {
                type: 'buff',
                attack: parseInt(otherSlotsInRowMatch[1]),
                health: parseInt(otherSlotsInRowMatch[2]),
                target: 'other-slots-in-row',
                targetSlot: null,
                temporary: false
            };
        }

        // Adjacent slots
        const adjacentSlotsMatch = text.match(/give adjacent slots \+(\d+)\/\+(\d+)/i);
        if (adjacentSlotsMatch) {
            return {
                type: 'buff',
                attack: parseInt(adjacentSlotsMatch[1]),
                health: parseInt(adjacentSlotsMatch[2]),
                target: 'adjacent-slots',
                targetSlot: null,
                temporary: false
            };
        }

        // Slot with specific tags
        const slotWithTagMatch = text.match(/give a slot with (?:another |a )?(?:random )?([a-z]+) or ([a-z]+) \+(\d+)\/\+(\d+)/i);
        if (slotWithTagMatch) {
            return {
                type: 'buff',
                attack: parseInt(slotWithTagMatch[3]),
                health: parseInt(slotWithTagMatch[4]),
                target: 'slot-with-tag',
                tags: [slotWithTagMatch[1], slotWithTagMatch[2]],
                targetSlot: null,
                temporary: false
            };
        }

        // Tag-based effects
        const tagBuffMatch = text.match(/give (?:your |an? )(?:other )?([a-z]+?)s? \+(\d+)\/\+(\d+)/i);
        if (tagBuffMatch) {
            const excludeSelf = text.includes('other');
            // Remove trailing 's' from captured tag if present
            let tag = tagBuffMatch[1];
            if (tag.endsWith('s')) {
                tag = tag.slice(0, -1);
            }
            return {
                type: 'buff',
                attack: parseInt(tagBuffMatch[2]),
                health: parseInt(tagBuffMatch[3]),
                target: 'tag-based',
                tag: tag,
                excludeSelf: excludeSelf,
                targetSlot: null,
                temporary: false
            };
        }

        // Pattern: "gain X Attack this turn" (temporary attack-only)
        const tempAttackMatch = text.match(/gain \+?(\d+) attack this turn/i);
        if (tempAttackMatch) {
            return {
                type: 'buff',
                attack: parseInt(tempAttackMatch[1]),
                health: 0,
                target: 'self',
                targetSlot: null,
                temporary: true
            };
        }

        // Pattern: "gain X Attack" (permanent attack-only) - for Wild Boar, Alpha Wolf, etc.
        const permAttackMatch = text.match(/gain \+?(\d+) attack(?!\s+this turn)(?!\s+for\s+each)/i);
        if (permAttackMatch) {
            return {
                type: 'buff',
                attack: parseInt(permAttackMatch[1]),
                health: 0,
                target: 'self',
                targetSlot: null,
                temporary: false
            };
        }

        // Pattern: "gain +1/+1 for each other unit you have in play" (Captain ability)
        const perUnitBuffMatch = text.match(/gain \+(\d+)\/\+(\d+) for each other unit/i);
        if (perUnitBuffMatch) {
            // Count other units on the battlefield
            const battlefield = this.stateSelectors.getPlayerBattlefield(context.unit.owner);
            let otherUnitsCount = 0;
            
            battlefield.forEach((unit, slotIndex) => {
                if (unit && slotIndex !== context.slotIndex) {
                    otherUnitsCount++;
                }
            });
            
            const attackPerUnit = parseInt(perUnitBuffMatch[1]);
            const healthPerUnit = parseInt(perUnitBuffMatch[2]);
            
            console.log(`👨‍✈️ [CAPTAIN] Found ${otherUnitsCount} other units, gaining +${attackPerUnit * otherUnitsCount}/+${healthPerUnit * otherUnitsCount}`);
            
            return {
                type: 'buff',
                attack: attackPerUnit * otherUnitsCount,
                health: healthPerUnit * otherUnitsCount,
                target: 'self',
                targetSlot: null,
                temporary: false
            };
        }

        // Pattern: "gain X/Y" (permanent stat buff, for Manacharge abilities)
        // Exclude "for each" patterns which should be handled by specialized parsers
        const permBuffMatch = text.match(/gain \+?(\d+)\/\+?(\d+)(?!\s+this turn)(?!\s+for\s+each)/i);
        if (permBuffMatch) {
            return {
                type: 'buff',
                attack: parseInt(permBuffMatch[1]),
                health: parseInt(permBuffMatch[2]),
                target: 'self',
                targetSlot: null,
                temporary: false
            };
        }

        // Pattern: "gain X/Y this turn" (temporary stat buff)
        const tempBuffMatch = text.match(/gain \+?(\d+)\/\+?(\d+) this turn/i);
        if (tempBuffMatch) {
            return {
                type: 'buff',
                attack: parseInt(tempBuffMatch[1]),
                health: parseInt(tempBuffMatch[2]),
                target: 'self',
                targetSlot: null,
                temporary: true
            };
        }

        // Pattern: "Give all your slots with a [keyword] unit +X/+Y" (Forest Keeper) - MUST BE BEFORE GENERAL PATTERN
        const keywordSlotsMatch = text.match(/give all your slots with a ([a-z]+) unit \+(\d+)\/\+(\d+)/i);
        if (keywordSlotsMatch) {
            const keyword = keywordSlotsMatch[1].toLowerCase();
            const attack = parseInt(keywordSlotsMatch[2]);
            const health = parseInt(keywordSlotsMatch[3]);
            
            console.log(`🌲 [FOREST KEEPER] Matched pattern: keyword=${keyword}, buff=+${attack}/+${health}`);
            
            return {
                type: 'buff',
                attack: attack,
                health: health,
                target: 'slots-with-keyword',
                keyword: keyword,
                targetSlot: null,
                temporary: false,
                excludeSelf: false
            };
        }

        // General slot targeting
        const slotBuffMatch = text.match(/give (?:the )?(.+?) \+(\d+)\/\+(\d+)/i);
        if (slotBuffMatch) {
            const targetDescription = slotBuffMatch[1].toLowerCase().trim();
            const attack = parseInt(slotBuffMatch[2]);
            const health = parseInt(slotBuffMatch[3]);
            
            
            let target = 'self';
            let targetSlot = null;
            
            // Set target type
            if (targetDescription.includes('other slot in this column') || targetDescription.includes('other slot in column')) {
                target = 'other-slot-in-column';
            } else if (targetDescription.includes('random back row slot')) {
                target = 'random-back-row-slot';
            } else if (targetDescription.includes('random slot')) {
                target = 'random-slot';
            } else if (targetDescription.includes('this slot') || targetDescription === 'slot') {
                target = 'slot';
                targetSlot = context.slotIndex;
            } else if (targetDescription.includes('all of your units') || targetDescription.includes('all your units')) {
                target = 'all-friendly-units';
            } else if (targetDescription.includes('all of your slots') || targetDescription.includes('all your slots')) {
                target = 'all-slots';
            }

            return {
                type: 'buff',
                attack,
                health,
                target,
                targetSlot,
                temporary: text.includes('this turn')
            };
        }
        
        // If no patterns matched, return null
        return null;
    }

    /**
     * Execute a buff effect
     * @param {Object} effect - Buff effect object
     * @param {Object} context - Context
     */
    executeBuffEffect(effect, context) {
        if (effect.target === 'slot') {
            // Buff this slot
            this.eventBus.emit('slot:buff', {
                slotIndex: context.slotIndex,
                playerId: context.unit.owner,
                buff: {
                    attack: effect.attack,
                    health: effect.health
                }
            });
        } else if (effect.target === 'other-slot-in-column') {
            // Buff the other slot in the same column
            const targetSlot = this.getOtherSlotInColumn(context.slotIndex);
            
            if (targetSlot !== null) {
                const buffData = {
                    slotIndex: targetSlot,
                    playerId: context.unit.owner,
                    buff: {
                        attack: effect.attack,
                        health: effect.health
                    }
                };
                
                this.eventBus.emit('slot:buff', buffData);
            }
        } else if (effect.target === 'random-back-row-slot') {
            // Buff a random back row slot (slots 3, 4, 5)
            const backRowSlots = [3, 4, 5];
            const targetSlot = backRowSlots[Math.floor(Math.random() * backRowSlots.length)];
            
            this.eventBus.emit('slot:buff', {
                slotIndex: targetSlot,
                playerId: context.unit.owner,
                buff: {
                    attack: effect.attack,
                    health: effect.health
                }
            });
        } else if (effect.target === 'random-slot') {
            // Buff a random slot (any of the 6 slots)
            const allSlots = [0, 1, 2, 3, 4, 5];
            const targetSlot = allSlots[Math.floor(Math.random() * allSlots.length)];
            
            this.eventBus.emit('slot:buff', {
                slotIndex: targetSlot,
                playerId: context.unit.owner,
                buff: {
                    attack: effect.attack,
                    health: effect.health
                }
            });
        } else if (effect.target === 'all-friendly-units') {
            // Buff all friendly units on the battlefield
            const battlefield = this.stateSelectors.getPlayerBattlefield(context.unit.owner);
            let unitsBuffed = 0;
            
            battlefield.forEach((unit, slotIndex) => {
                if (unit) {
                    // Use proper state updates instead of direct mutations
                    const updates = {
                        currentAttack: (unit.currentAttack || unit.attack) + effect.attack,
                        currentHealth: (unit.currentHealth || unit.health) + effect.health,
                        maxHealth: (unit.maxHealth || unit.health) + effect.health
                    };
                    
                    // Use centralized update method
                    const reason = `gained +${effect.attack}/+${effect.health} (column buff)`;
                    this.updateUnitStats(context.unit.owner, slotIndex, updates, reason);
                    
                    unitsBuffed++;
                }
            });
            
        } else if (effect.target === 'multi-tag-based') {
            // Buff units with multiple specific tags (for Tracker ability)
            console.log(`🎯 [TRACKER EXECUTE] Executing multi-tag buff. Tags: ${effect.tags}, Owner: ${context.unit.owner}`);
            const battlefield = this.stateSelectors.getPlayerBattlefield(context.unit.owner);
            const targetTags = effect.tags.map(t => t.toLowerCase());
            console.log(`🎯 [TRACKER EXECUTE] Looking for units with tags: ${targetTags.join(' or ')}`);
            
            // Find all units with any of the specified tags on owner's battlefield
            battlefield.forEach((unit, slotIndex) => {
                if (unit && unit.tags && 
                    unit.tags.some(tag => targetTags.includes(tag.toLowerCase()))) {
                    
                    console.log(`✅ [TRACKER EXECUTE] Found eligible unit: ${unit.name} (${unit.tags.join(', ')}) at slot ${slotIndex}`);
                    // Exclude self if specified (for "your other" units)
                    if (effect.excludeSelf && slotIndex === context.slotIndex) {
                        console.log(`⏩ [TRACKER EXECUTE] Skipping self at slot ${slotIndex}`);
                        return;
                    }
                        
                        // Apply attack buff (temporary or permanent)
                        const updates = {};
                        
                        if (effect.temporary) {
                            // Temporary buff - only modify current stats
                            updates.currentAttack = (unit.currentAttack || unit.attack) + effect.attack;
                        } else {
                            // Permanent buff - only modify current stats, not base stats
                            updates.currentAttack = (unit.currentAttack || unit.attack) + effect.attack;
                            if (effect.health > 0) {
                                updates.currentHealth = (unit.currentHealth || unit.health) + effect.health;
                                updates.maxHealth = (unit.maxHealth || unit.health) + effect.health;
                            }
                        }
                        
                    // Use centralized update method
                    const duration = effect.temporary ? ' this turn' : '';
                    const reason = `gained +${effect.attack} Attack${duration}`;
                    this.updateUnitStats(context.unit.owner, slotIndex, updates, reason);
                }
            });
            
        } else if (effect.target === 'slot-with-tag') {
            // Buff slot that contains a unit with specified tags (for Blacksmith)
            const playerId = context.unit.owner || context.playerId;
            const battlefield = this.stateSelectors.getPlayerBattlefield(playerId);
            const targetTags = effect.tags.map(t => t.toLowerCase());
            
            const eligibleSlots = battlefield
                .map((unit, slotIndex) => ({ unit, slotIndex }))
                .filter(item => item.unit && item.unit.tags && 
                    item.unit.tags.some(tag => targetTags.includes(tag.toLowerCase())) &&
                    item.slotIndex !== context.slotIndex); // Exclude own slot
            
            if (eligibleSlots.length === 0) {
                return;
            }
            
            // Pick random eligible slot
            const randomIndex = Math.floor(Math.random() * eligibleSlots.length);
            const targetSlot = eligibleSlots[randomIndex];
            
            this.eventBus.emit('slot:buff', {
                slotIndex: targetSlot.slotIndex,
                playerId: playerId,
                buff: {
                    attack: effect.attack,
                    health: effect.health
                }
            });            
        } else if (effect.target === 'front-slots') {
            // Buff all front row slots (for Paladin)
            const frontSlots = [0, 1, 2]; // Front row slots
            
            frontSlots.forEach(slotIndex => {
                this.eventBus.emit('slot:buff', {
                    slotIndex: slotIndex,
                    playerId: context.unit.owner,
                    buff: {
                        attack: effect.attack,
                        health: effect.health
                    }
                });
            });
        } else if (effect.target === 'other-slots-in-row') {
            // Buff other slots in the same row (for Ice Mage)
            const currentSlot = context.slotIndex;
            const otherSlotsInRow = [];
            
            // Determine which row we're in (0-2 = back row, 3-5 = front row)
            const isBackRow = currentSlot < 3;
            const rowStart = isBackRow ? 0 : 3;
            const rowEnd = isBackRow ? 2 : 5;
            
            // Add all other slots in the same row
            for (let i = rowStart; i <= rowEnd; i++) {
                if (i !== currentSlot) {
                    otherSlotsInRow.push(i);
                }
            }
            
            otherSlotsInRow.forEach(slotIndex => {
                this.eventBus.emit('slot:buff', {
                    slotIndex: slotIndex,
                    playerId: context.unit.owner,
                    buff: {
                        attack: effect.attack,
                        health: effect.health
                    }
                });
            });
        } else if (effect.target === 'adjacent-slots') {
            // Buff adjacent slots (for backward compatibility)
            const currentSlot = context.slotIndex;
            const adjacentSlots = [];
            
            // Add left and right adjacent slots (0-5 battlefield layout)
            if (currentSlot > 0) adjacentSlots.push(currentSlot - 1);
            if (currentSlot < 5) adjacentSlots.push(currentSlot + 1);
            
            adjacentSlots.forEach(slotIndex => {
                this.eventBus.emit('slot:buff', {
                    slotIndex: slotIndex,
                    playerId: context.unit.owner,
                    buff: {
                        attack: effect.attack,
                        health: effect.health
                    }
                });
            });
            
        } else if (effect.target === 'all-slots') {
            // Buff all 6 slots on the battlefield (for Fairy Queen)
            const allSlots = [0, 1, 2, 3, 4, 5]; // All battlefield slots
            
            allSlots.forEach(slotIndex => {
                this.eventBus.emit('slot:buff', {
                    slotIndex: slotIndex,
                    playerId: context.unit.owner,
                    buff: {
                        attack: effect.attack,
                        health: effect.health
                    }
                });
            });
            
        } else if (effect.target === 'another-with-ability') {
            // Buff another unit with a specific ability (e.g., "another Flying unit")
            const battlefield = this.stateSelectors.getPlayerBattlefield(context.unit.owner);
            
            const unitsWithAbility = battlefield
                .map((unit, slotIndex) => ({ unit, slotIndex }))
                .filter(item => item.unit && 
                    item.slotIndex !== context.slotIndex && // Exclude self
                    item.unit.ability && 
                    item.unit.ability.toLowerCase().includes(effect.ability));
            
            
            if (unitsWithAbility.length === 0) {
                return;
            }
            
            // Select a random unit with the ability
            const target = unitsWithAbility[Math.floor(Math.random() * unitsWithAbility.length)];
            
            // Apply buff to the unit
            this.applyBuffToUnit(context.unit.owner, target.slotIndex, effect.attack, effect.health);
            
        } else if (effect.target === 'tag-based') {
            // Buff units with specific tag (random or all based on ability text)
            const battlefield = this.stateSelectors.getPlayerBattlefield(context.unit.owner);
            
            let taggedUnits = battlefield
                .map((unit, slotIndex) => ({ unit, slotIndex }))
                .filter(item => item.unit && item.unit.tags && 
                    item.unit.tags.some(tag => tag.toLowerCase() === effect.tag.toLowerCase()));
            
            
            // Exclude self if specified (for "other" units)
            if (effect.excludeSelf && context.slotIndex !== undefined) {
                taggedUnits = taggedUnits.filter(item => item.slotIndex !== context.slotIndex);
            }
            
            if (taggedUnits.length === 0) {
                return;
            }

            // Check if this is a "Give an X" (random target) vs "Give your Xs" (all targets)
            const originalText = context.originalText || '';
            const isRandomTarget = originalText.includes('give an ') || originalText.includes('give a ');
            
            let unitsToBuffer = taggedUnits;
            if (isRandomTarget && taggedUnits.length > 1) {
                // Random selection for "Give an Undead"
                const randomIndex = Math.floor(Math.random() * taggedUnits.length);
                unitsToBuffer = [taggedUnits[randomIndex]];
            }
            
            unitsToBuffer.forEach(({ unit, slotIndex }) => {
                this.applyBuffToUnit(context.unit.owner, slotIndex, effect.attack, effect.health);
            });
            
        } else if (effect.target === 'slots-with-keyword') {
            // Forest Keeper: Buff all slots that contain units with the specified keyword
            const battlefield = this.stateSelectors.getPlayerBattlefield(context.unit.owner);
            const keyword = effect.keyword.toLowerCase();
            
            console.log(`🌲 [FOREST KEEPER] Scanning battlefield for units with keyword: ${keyword}`);
            
            const unitsWithKeyword = battlefield
                .map((unit, slotIndex) => ({ unit, slotIndex }))
                .filter(item => item.unit && 
                    (!effect.excludeSelf || item.slotIndex !== context.slotIndex) && // Include/exclude self based on flag
                    item.unit.ability && 
                    item.unit.ability.toLowerCase().includes(keyword));
            
            console.log(`🌲 [FOREST KEEPER] Found ${unitsWithKeyword.length} units with keyword "${keyword}"`);
            
            if (unitsWithKeyword.length === 0) {
                console.log(`🌲 [FOREST KEEPER] No units found with keyword "${keyword}"`);
                return;
            }
            
            // Apply slot buffs to all slots with the keyword
            unitsWithKeyword.forEach(({ unit, slotIndex }) => {
                console.log(`🌲 [FOREST KEEPER] Applying slot buff to ${unit.name} at slot ${slotIndex} with +${effect.attack}/+${effect.health}`);
                this.eventBus.emit('slot:buff', {
                    playerId: context.unit.owner,
                    slotIndex: slotIndex,
                    buff: {
                        attack: effect.attack,
                        health: effect.health
                    }
                });
            });
            
        } else {
            // Buff the unit itself
            const { unit } = context;
            const playerId = context.playerId || unit.owner;
            const slotIndex = context.slotIndex !== undefined ? context.slotIndex : unit.slotIndex;
            
            
            if (effect.temporary) {
                // For temporary buffs, modify currentAttack directly (not permanent stats)
                const newCurrentAttack = (unit.currentAttack || unit.attack) + effect.attack;
                const newCurrentHealth = (unit.currentHealth || unit.health) + effect.health;
                
                // Use centralized update method for temporary buffs
                const updates = { 
                    currentAttack: newCurrentAttack,
                    currentHealth: newCurrentHealth
                };
                const reason = `gained temporary buff (+${effect.attack}/+${effect.health}) this turn`;
                this.updateUnitStats(playerId, slotIndex, updates, reason);
                
            } else {
                // Permanent buffs only modify current stats, not base stats
                const oldCurrentAttack = unit.currentAttack || unit.attack;
                const oldCurrentHealth = unit.currentHealth || unit.health;
                
                const newCurrentAttack = oldCurrentAttack + effect.attack;
                const newCurrentHealth = oldCurrentHealth + effect.health;
                const newMaxHealth = (unit.maxHealth || unit.health) + effect.health;
                
                // Use centralized update method for permanent buffs
                const updates = {
                    currentAttack: newCurrentAttack,
                    currentHealth: newCurrentHealth,
                    maxHealth: newMaxHealth
                };
                const reason = `gained permanent buff (+${effect.attack}/+${effect.health})`;
                this.updateUnitStats(playerId, slotIndex, updates, reason, false);
                
                
                // Force UI refresh with the updated stats (use calculated values instead of state lookup)
                setTimeout(() => {
                    this.eventBus.emit('unit:stats-updated', {
                        playerId,
                        slotIndex,
                        unit: this.gameState.getState().players[playerId].battlefield[slotIndex]
                    });
                }, 0);
            }

            this.eventBus.emit('unit:buffed', {
                unit,
                buff: effect
            });
        }
    }

    /**
     * Apply a buff to a unit (helper method)
     * @param {Object} unit - Unit to buff
     * @param {number} attackBuff - Attack buff amount
     * @param {number} healthBuff - Health buff amount
     * @param {string} playerId - Player ID
     * @param {number} slotIndex - Slot index
     */
    applyUnitBuff(unit, attackBuff, healthBuff, playerId, slotIndex) {
        const updates = {
            currentAttack: (unit.currentAttack || unit.attack) + attackBuff,
            currentHealth: (unit.currentHealth || unit.health) + healthBuff
        };
        const reason = `gained +${attackBuff}/+${healthBuff} buff`;
        this.updateUnitStats(playerId, slotIndex, updates, reason);
    }
    
    /**
     * Centralized method for updating unit stats through Redux
     * @param {string} playerId - Player ID ('player' or 'ai')
     * @param {number} slotIndex - Slot index of unit (0-5)
     * @param {Object} updates - Updates object with stat changes
     * @param {string} reason - Human-readable reason for update (for logging/debugging)
     * @param {boolean} emitEvent - Whether to emit buff event for UI updates (default: true)
     * @returns {boolean} Success status of the update operation
     */
    updateUnitStats(playerId, slotIndex, updates, reason = '', emitEvent = true) {
        try {
            const battlefield = this.stateSelectors.getPlayerBattlefield(playerId);
            const unit = battlefield[slotIndex];
            
            if (!unit) {
                console.log(`⚠️ No unit at slot ${slotIndex} to update`);
                return false;
            }

            // Validate updates object
            if (!updates || typeof updates !== 'object') {
                throw new Error('Invalid updates object provided to updateUnitStats');
            }

            // Dispatch the state update
            this.gameEngine.dispatch({
                type: 'UPDATE_UNIT',
                payload: { playerId, slotIndex, updates }
            });

            // Emit buff event for UI updates if requested
            if (emitEvent) {
                this.eventBus.emit('unit:buffed', {
                    unit: { ...unit, ...updates },
                    effect: reason
                });
            }

            if (reason) {
                console.log(`📊 ${unit.name} ${reason}`);
            }
            
            return true;
        } catch (error) {
            if (this.errorHandler) {
                const result = this.errorHandler.handleError(error, {
                    playerId,
                    slotIndex,
                    updates,
                    reason
                }, {
                    operation: 'updateUnitStats',
                    component: 'AbilitySystem',
                    severity: 'high',
                    fallback: false
                });
                
                return result.recoverable;
            } else {
                console.error('❌ Error in updateUnitStats:', error);
                return false;
            }
        }
    }

    /**
     * Helper method to apply buff to a specific unit
     * Uses centralized updateUnitStats method
     * @param {string} playerId - Player ID
     * @param {number} slotIndex - Slot index
     * @param {number} attackBuff - Attack buff amount
     * @param {number} healthBuff - Health buff amount
     */
    applyBuffToUnit(playerId, slotIndex, attackBuff, healthBuff) {
        const battlefield = this.stateSelectors.getPlayerBattlefield(playerId);
        const unit = battlefield[slotIndex];
        
        if (!unit) {
            console.log(`⚠️ No unit at slot ${slotIndex} to buff`);
            return;
        }

        // Calculate new stats using consistent pattern
        const updates = {
            currentAttack: (unit.currentAttack || unit.attack) + attackBuff,
            currentHealth: (unit.currentHealth || unit.health) + healthBuff,
            maxHealth: (unit.maxHealth || unit.health) + healthBuff
        };
        
        // Use centralized update method
        const reason = `gained +${attackBuff}/+${healthBuff}`;
        this.updateUnitStats(playerId, slotIndex, updates, reason);
    }

    /**
     * Parse ability-granting effects like "Gain Rush"
     * @param {string} text - Ability text
     * @param {Object} context - Context
     * @returns {Object} Ability grant effect object
     */
    parseAbilityGrantEffect(text, context) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('gain rush')) {
            return {
                type: 'grant-ability',
                ability: 'Rush',
                target: 'self'
            };
        } else if (lowerText.includes('gain flying')) {
            return {
                type: 'grant-ability',
                ability: 'Flying',
                target: 'self'
            };
        } else if (lowerText.includes('gain ranged')) {
            return {
                type: 'grant-ability',
                ability: 'Ranged',
                target: 'self'
            };
        }
        return null;
    }

    /**
     * Execute an ability-granting effect
     * @param {Object} effect - Ability grant effect object
     * @param {Object} context - Context
     */
    executeAbilityGrantEffect(effect, context) {
        const { unit } = context;
        
        // Determine the new ability string
        let newAbility;
        if (unit.ability && !unit.ability.includes(effect.ability)) {
            newAbility = unit.ability + `, ${effect.ability}`;
        } else if (!unit.ability) {
            newAbility = effect.ability;
        } else {
            // Already has this ability, no change needed
            return;
        }
        
        // Create updates object for state dispatch
        const updates = { ability: newAbility };
        
        // If granting Rush, enable immediate attack
        if (effect.ability === 'Rush' && unit.canAttack !== undefined) {
            updates.canAttack = true;
            console.log(`🏃 ${unit.name} can now attack immediately due to Rush!`);
        }
        
        // Use centralized update method
        const reason = `gained ${effect.ability}!`;
        this.updateUnitStats(context.unit.owner, context.slotIndex, updates, reason);
        
        console.log(`⚡ ${unit.name} gained ${effect.ability}!`);
        
        // Log the ability gain
    }

    /**
     * Get the other slot in the same column (for column-based abilities)
     * Column layout: [0, 1, 2]
     *                [3, 4, 5]
     * @param {number} slotIndex - Current slot (0-5)
     * @returns {number|null} Other slot in column, or null if none
     */
    getOtherSlotInColumn(slotIndex) {
        const columnMap = {
            0: 3, // Left column: 0 ↔ 3
            1: 4, // Middle column: 1 ↔ 4  
            2: 5, // Right column: 2 ↔ 5
            3: 0,
            4: 1,
            5: 2
        };
        
        return columnMap[slotIndex] ?? null;
    }

    /**
     * Handle Unleash abilities (triggered when unit is played)
     * @param {Object} data - Unleash trigger data
     */
    handleUnleash(data) {
        const { unit, context } = data;
        const abilityText = unit.ability;

        console.log(`⚡ Unleash triggered for ${unit.name}: ${abilityText}`);

        // Remove "Unleash:" prefix and parse the effect
        const effectText = abilityText.replace(/^.*?unleash:\s*/i, '');
        
        // Debug Mana Surge owner issue
        console.log(`🔧 [UNLEASH DEBUG] Unit: ${unit.name}, unit.owner: ${unit.owner}, context.playerId: ${context.playerId}`);
        
        // Handle Banish effect specially for Unleash (like Mana Surge)
        if (effectText.toLowerCase().includes('banish this')) {
            console.log(`⚰️ [BANISH] ${unit.name} banishes itself on Unleash - removed from game permanently`);
            
            // Special logging for Mana Surge
            if (unit.name === 'Mana Surge') {
                console.log(`🔵 [MANA SURGE] Mana Surge fulfilled its purpose - activated Manacharge and now banishes itself`);
            }
            
            // Mark unit as banished so it won't be added to deck when it dies
            if (unit) {
                unit.banished = true;
                // Ensure unit has owner set before banishing
                if (!unit.owner && context.playerId) {
                    unit.owner = context.playerId;
                    console.log(`🔧 Set owner to ${unit.owner} before banishing ${unit.name}`);
                }
            }
            
            // Immediately destroy the unit since it banishes itself
            setTimeout(() => {
                const owner = unit.owner || context.playerId;
                console.log(`💀 About to emit unit:dies for ${unit.name} with owner: ${owner}, slotIndex: ${context.slotIndex}`);
                this.eventBus.emit('unit:dies', {
                    unit,
                    cause: 'banished',
                    owner: owner,
                    slotIndex: context.slotIndex
                });
            }, 500); // Small delay to ensure Unleash effect is processed
            
            return; // Don't process further effects
        }
        
        
        // Enhanced game log for Unleash activation
        this.eventBus.emit('ability:activated', {
            ability: 'unleash',
            unit,
            player: context.playerId || context.owner || 'player'
        });
        
        // Ensure unit.owner is set from context.playerId if not already set
        if (!unit.owner && context.playerId) {
            unit.owner = context.playerId;
        }
        
        // Special handling for Skeleton King
        if (unit.name === 'Skeleton King') {
            const state = this.gameState.getState();
            const playerId = unit.owner || context.playerId || 'player';
            const battlefield = state.players[playerId].battlefield;
            const skeletonCard = this.getSkeletonCard();
            let skeletonsPlaced = 0;
            
            console.log(`💀👑 Skeleton King rises! Filling battlefield with Skeletons...`);
            
            // Fill all empty slots (0-5) with Skeletons
            for (let slot = 0; slot < 6; slot++) {
                if (!battlefield[slot]) {
                    const skeleton = UnitFactory.createSummonedUnit(skeletonCard, playerId, slot, {
                        canAttack: false,
                        summoner: unit.name
                    });
                    
                    // Place the skeleton
                    this.gameEngine.dispatch({
                        type: 'PLACE_UNIT',
                        payload: { 
                            playerId, 
                            slotIndex: slot, 
                            unit: skeleton 
                        }
                    });
                    
                    skeletonsPlaced++;
                    console.log(`💀 Skeleton summoned to slot ${slot}`);
                }
            }
            
            if (skeletonsPlaced > 0) {
                this.eventBus.emit('ability:activated', {
                    type: 'skeleton-king-unleash',
                    unit,
                    effect: `Summoned ${skeletonsPlaced} Skeleton${skeletonsPlaced > 1 ? 's' : ''}`
                });
            } else {
                console.log(`💀👑 Battlefield is already full, no Skeletons summoned`);
            }
            
            return;
        }

        // Special handling for Soul Eater
        if (unit.name === 'Soul Eater') {
            const state = this.gameState.getState();
            const playerId = unit.owner || context.playerId || 'player';
            const enemyId = playerId === 'player' ? 'ai' : 'player';
            
            // Validate state structure
            if (!state || !state.players || !state.players[enemyId] || !state.players[enemyId].battlefield) {
                console.error(`💀 Soul Eater: Invalid state structure for enemy ${enemyId}`);
                return;
            }
            
            // Find the frontmost enemy in the same column
            const column = context.slotIndex % 3; // 0, 1, or 2
            const frontSlot = column;      // 0, 1, or 2 (front row)
            const backSlot = column + 3;   // 3, 4, or 5 (back row)
            
            const enemyBattlefield = state.players[enemyId].battlefield;
            const frontUnit = enemyBattlefield[frontSlot];
            const backUnit = enemyBattlefield[backSlot];
            
            // Target the frontmost unit (prioritize front row)
            let targetUnit = null;
            let targetSlotIndex = null;
            
            if (frontUnit) {
                targetUnit = frontUnit;
                targetSlotIndex = frontSlot;
            } else if (backUnit) {
                targetUnit = backUnit;
                targetSlotIndex = backSlot;
            }
            
            if (targetUnit) {
                console.log(`💀 Soul Eater destroys ${targetUnit.name} in column ${column}`);
                
                // Emit unit death event
                this.eventBus.emit('unit:dies', {
                    unit: targetUnit,
                    cause: 'destroyed',
                    owner: enemyId,
                    slotIndex: targetSlotIndex
                });
                
                this.eventBus.emit('ability:activated', {
                    type: 'soul-eater-unleash',
                    unit,
                    effect: `Destroyed ${targetUnit.name}`
                });
            } else {
                console.log(`💀 Soul Eater found no enemies to destroy in column ${column}`);
            }
            return;
        }

        // Special handling for Bone Colossus
        if (unit.name === 'Bone Colossus') {
            const state = this.gameState.getState();
            const playerId = unit.owner || context.playerId;
            const souls = state.souls[playerId] || 0;
            
            console.log(`☠️ Bone Colossus Unleash: Gaining +${souls} Attack from ${souls} Souls`);
            
            if (souls > 0) {
                // Apply the attack buff
                this.applyBuffToUnit(playerId, context.slotIndex, souls, 0);
                
                this.eventBus.emit('ability:activated', {
                    type: 'bone-colossus-unleash',
                    unit,
                    effect: `Gained +${souls} Attack from Souls`
                });
            } else {
                console.log(`☠️ No Souls collected yet for ${playerId}, Bone Colossus gains no attack buff`);
            }
            return;
        }
        
        const result = this.parseAndExecuteAbility(effectText, { unit, ...context });
        
        // Manual fix for Villager if parsing failed
        if (unit.name === 'Villager') {
            if (!result.success || result.effects.length === 0) {
                const targetSlot = this.getOtherSlotInColumn(context.slotIndex);
                if (targetSlot !== null) {
                    const buffData = {
                        slotIndex: targetSlot,
                        playerId: unit.owner || context.playerId,
                        buff: { attack: 1, health: 1 }
                    };
                    this.eventBus.emit('slot:buff', buffData);
                }
            }
        }
        
    }

    /**
     * Handle Last Gasp abilities (triggered when unit dies)
     * @param {Object} data - Last Gasp trigger data
     */
    handleLastGasp(data) {
        const { unit } = data;
        // Handle both formats: with context object or with direct owner/slotIndex
        const context = data.context || { 
            playerId: data.owner || data.playerId, 
            slotIndex: data.slotIndex 
        };
        
        const abilityText = unit.ability;

        console.log(`💀 Last Gasp triggered for ${unit.name}: ${abilityText}`);

        // Remove "Last Gasp:" prefix and parse the effect
        let effectText = abilityText.replace(/^.*last gasp:\s*/i, '');
        
        // Special handling for Death
        if (unit.name === 'Death') {
            const state = this.gameState.getState();
            const playerId = context.playerId || unit.owner || 'player';
            const enemyId = playerId === 'player' ? 'ai' : 'player';
            const souls = state.souls[playerId] || 0;
            const damagePerSoul = 6;
            const totalDamage = souls * damagePerSoul;
            
            console.log(`💀⚡ Death's Last Gasp: Dealing ${totalDamage} damage (${souls} souls × ${damagePerSoul}) in column`);
            
            if (souls > 0) {
                // Get the column where Death died
                const column = context.slotIndex % 3; // 0, 1, or 2
                const frontSlot = column;      // 0, 1, or 2
                const backSlot = column + 3;   // 3, 4, or 5
                
                // Get fresh state to check current battlefield after combat resolution
                const freshState = this.gameState.getState();
                const enemyBattlefield = freshState.players[enemyId].battlefield;
                
                // Column damage priority: Front → Back → Player
                // Only target units that are still alive
                const frontUnit = enemyBattlefield[frontSlot];
                const backUnit = enemyBattlefield[backSlot];
                
                let target = null;
                let targetType = null;
                let targetSlotIndex = null;
                
                // Check if units are still alive (not null and have health > 0)
                if (frontUnit && frontUnit.currentHealth > 0) {
                    target = frontUnit;
                    targetType = 'unit';
                    targetSlotIndex = frontSlot;
                    console.log(`💀 Death targets front unit ${frontUnit.name} in column ${column}`);
                } else if (backUnit && backUnit.currentHealth > 0) {
                    target = backUnit;
                    targetType = 'unit';
                    targetSlotIndex = backSlot;
                    console.log(`💀 Death targets back unit ${backUnit.name} in column ${column}`);
                } else {
                    // No living units in column, hit player
                    target = { type: 'player', playerId: enemyId };
                    targetType = 'player';
                    console.log(`💀 Death targets ${enemyId} player (no living units in column ${column})`);
                }
                
                // Deal the damage
                if (targetType === 'player') {
                    this.eventBus.emit('combat:damage', {
                        target: { type: 'player', playerId: enemyId },
                        damage: totalDamage,
                        source: unit
                    });
                } else {
                    // Damage unit (only if we found a valid living target)
                    this.eventBus.emit('combat:damage', {
                        target: { type: 'unit', unit: target, slotIndex: targetSlotIndex, playerId: enemyId },
                        damage: totalDamage,
                        source: unit
                    });
                }
                
                this.eventBus.emit('ability:activated', {
                    type: 'death-last-gasp',
                    unit,
                    effect: `Dealt ${totalDamage} damage in column ${column}`
                });
            } else {
                console.log(`💀 Death has no souls, no damage dealt`);
            }
            
            // Still trigger Necromancer buff
            this.triggerNecromancerBuff(context.playerId);
            return;
        }
        
        // Handle Abomination: Return this to your hand
        if (unit.name === 'Abomination' && effectText.toLowerCase().includes('return this to your hand')) {
            const playerId = context.playerId || unit.owner || 'player';
            const state = this.gameState.getState();
            const playerHand = state.players[playerId].hand;
            
            // Check if hand is full (max 3 cards)
            if (playerHand.length >= 3) {
                console.log(`✋ ${unit.name} cannot return to hand - hand is full`);
            } else {
                // Create a fresh card version to add to hand
                const cardToReturn = {
                    id: unit.id,
                    name: unit.name,
                    attack: unit.originalAttack || unit.attack,
                    health: unit.originalHealth || unit.health,
                    ability: unit.ability,
                    tags: unit.tags,
                    color: unit.color,
                    handId: Date.now()
                };
                
                // Add to hand
                this.gameEngine.dispatch({
                    type: 'ADD_CARD_TO_HAND',
                    payload: {
                        playerId,
                        card: cardToReturn
                    }
                });
                
                console.log(`🔄 ${unit.name} returned to ${playerId}'s hand`);
                
                // Mark as banished so it won't also go to deck
                unit.banished = true;
            }
            
            // Still trigger Necromancer buff
            this.triggerNecromancerBuff(context.playerId);
            return;
        }
        
        // Handle Banish effect specially
        if (effectText.toLowerCase().includes('banish this')) {
            console.log(`⚰️ ${unit.name} is banished - removed from game permanently`);
            // Mark unit as banished so it won't be added to deck
            if (unit) {
                unit.banished = true;
            }
            // Still trigger Necromancer buff even for banish effects
            this.triggerNecromancerBuff(context.playerId);
            // The Banish effect means the unit is removed from the game entirely
            // It should not be added to the deck when destroyed
            return;
        }
        
        // Handle compound effects (e.g., "Summon a Skeleton, then give your Undead and Dragons +2/+2")
        if (effectText.includes(', then ')) {
            const parts = effectText.split(', then ');
            console.log(`🔗 Compound Last Gasp effect with ${parts.length} parts`);
            
            // Execute each part in sequence
            parts.forEach((part, index) => {
                console.log(`🔗 Executing Last Gasp part ${index + 1}: ${part.trim()}`);
                this.parseAndExecuteAbility(part.trim(), { unit, ...context });
            });
        } else if (effectText.includes(' and ')) {
            // Handle "and" compound effects (e.g., "Gain 1 Dragon Flame and summon a Skeleton here")
            const parts = effectText.split(' and ');
            console.log(`🔗 Compound Last Gasp effect (and) with ${parts.length} parts`);
            
            // Execute each part in sequence
            parts.forEach((part, index) => {
                console.log(`🔗 Executing Last Gasp part ${index + 1}: ${part.trim()}`);
                this.parseAndExecuteAbility(part.trim(), { unit, ...context });
            });
        } else {
            // Single effect
            this.parseAndExecuteAbility(effectText, { unit, ...context });
        }
        
        // Check for Necromancer on the battlefield and buff it
        this.triggerNecromancerBuff(context.playerId);
    }
    
    /**
     * Trigger Necromancer's ability when a friendly Last Gasp activates
     * @param {string} playerId - The player whose Last Gasp triggered
     */
    triggerNecromancerBuff(playerId) {
        const battlefield = this.stateSelectors.getPlayerBattlefield(playerId);
        
        battlefield.forEach((unit, slotIndex) => {
            if (unit && unit.name === 'Necromancer') {
                console.log(`💀 Necromancer detected! Buffing due to friendly Last Gasp`);
                
                // Apply +3/+3 buff to the Necromancer
                const updates = {
                    currentAttack: (unit.currentAttack || unit.attack) + 3,
                    currentHealth: (unit.currentHealth || unit.health) + 3,
                    maxHealth: (unit.maxHealth || unit.health) + 3
                };
                
                const reason = 'gained +3/+3 (friendly Last Gasp triggered)';
                this.updateUnitStats(playerId, slotIndex, updates, reason);
                
                // Visual feedback
                this.eventBus.emit('ability:activated', {
                    ability: 'necromancer-trigger',
                    unit,
                    player: playerId,
                    effect: 'Necromancer gains +3/+3 from friendly Last Gasp'
                });
            }
        });
    }

    /**
     * Handle Manacharge abilities (triggered when Blue Unleash ability is used)
     * @param {Object} data - Manacharge trigger data
     */
    handleManacharge(data) {
        const { unit, context } = data;
        const abilityText = unit.ability;

        console.log(`⚡ Manacharge triggered for ${unit.name}: ${abilityText}`);
        
        // Ensure unit.owner is set from context.playerId if not already set
        if (!unit.owner && context.playerId) {
            unit.owner = context.playerId;
        }

        // Remove "Manacharge:" prefix and parse the effect
        // Handle both "Manacharge:" and "Kindred and Manacharge:" formats
        const effectText = abilityText.replace(/^.*?(?:kindred\s+and\s+)?manacharge:\s*/i, '');
        
        // Handle special Manacharge effects
        if (effectText.toLowerCase() === 'double this unit\'s attack') {
            // Void Element special ability
            const currentAttack = unit.currentAttack || unit.attack;
            const newAttack = currentAttack * 2;
            
            const updates = {
                currentAttack: newAttack
            };
            const reason = 'doubled its attack from Manacharge';
            this.updateUnitStats(context.playerId, context.slotIndex, updates, reason);
            
            console.log(`⚡ ${unit.name} doubled its attack from ${currentAttack} to ${newAttack}!`);
            return;
        }
        
        // Kolus the Wise: Add a random spell to hand
        if (unit.name === 'Kolus the Wise' && effectText.toLowerCase().includes('add a flame pillar, frost wall, or thunderbolt to your hand')) {
            const spellOptions = ['flame_pillar', 'frost_wall', 'thunderbolt'];
            const randomSpellId = spellOptions[Math.floor(Math.random() * spellOptions.length)];
            
            const playerId = unit.owner || context.playerId || 'player';
            console.log(`⚡ ${unit.name} adds ${randomSpellId} to ${playerId}'s hand!`);
            
            // Find the spell in Kolus's spellbook
            const kolusData = CHAMPIONS.kolus;
            if (kolusData && kolusData.spellbook) {
                const spellToAdd = kolusData.spellbook.find(spell => spell.id === randomSpellId);
                if (spellToAdd) {
                    this.gameEngine.dispatch({
                        type: 'ADD_CARD_TO_HAND',
                        payload: {
                            playerId,
                            card: { ...spellToAdd }
                        }
                    });
                    console.log(`⚡ Successfully added ${spellToAdd.name} to ${playerId}'s hand from Manacharge!`);
                } else {
                    console.error(`❌ Could not find spell ${randomSpellId} in Kolus's spellbook`);
                }
            } else {
                console.error(`❌ Could not access Kolus's spellbook data`);
            }
            
            return;
        }
        
        // Fire Elemental: Summon a Fire Spirit in a random slot
        if (unit.name === 'Fire Elemental' && effectText.toLowerCase().includes('summon a fire spirit')) {
            const state = this.gameState.getState();
            const playerId = unit.owner || context.playerId || 'player';
            const battlefield = state.players[playerId].battlefield;
            
            // Find all empty slots
            const emptySlots = [];
            for (let i = 0; i < 6; i++) {
                if (!battlefield[i]) {
                    emptySlots.push(i);
                }
            }
            
            if (emptySlots.length > 0) {
                // Choose a random empty slot
                const randomIndex = Math.floor(Math.random() * emptySlots.length);
                const targetSlot = emptySlots[randomIndex];
                
                // Get Fire Spirit card definition
                const fireSpirit = this.getFireSpiritCard();
                
                // Create the summoned unit
                const summonedUnit = UnitFactory.createSummonedUnit(fireSpirit, playerId, targetSlot, {
                    canAttack: false,
                    summoner: unit.name
                });
                
                // Place the Fire Spirit
                this.gameEngine.dispatch({
                    type: 'PLACE_UNIT',
                    payload: { 
                        playerId, 
                        slotIndex: targetSlot, 
                        unit: summonedUnit 
                    }
                });
                
                console.log(`🔥 Fire Elemental summoned a Fire Spirit to slot ${targetSlot}`);
                
                this.eventBus.emit('ability:activated', {
                    type: 'fire-elemental-manacharge',
                    unit,
                    effect: `Summoned Fire Spirit to slot ${targetSlot}`
                });
            } else {
                console.log(`🔥 Fire Elemental's battlefield is full, cannot summon Fire Spirit`);
            }
            return;
        }
        
        // Use the general ability parsing system to handle all other Manacharge effects
        const result = this.parseAndExecuteAbility(effectText, { unit, ...context });
        
        // Enhanced logging with effect details
        if (result.success && result.effects.length > 0) {
            const effect = result.effects[0];
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
            } else if (effect.type === 'ability_grant') {
                effectDescription = `gains ${effect.ability}`;
            }

        }
    }

    /**
     * Handle Manacharge activation (triggered when Blue Unleash ability is used)
     * @param {Object} data - Manacharge activation data
     */
    handleManachargeActivation(data) {
        const { playerId, triggerUnit } = data;
        
        console.log(`🔵 Manacharge activation triggered by ${triggerUnit.name} for player ${playerId}`);
        
        // IMPORTANT: Only activate Manacharge for the same player who played the Blue Unleash
        // Get ONLY the triggering player's battlefield, not the opponent's
        const battlefield = this.stateSelectors.getPlayerBattlefield(playerId);
        
        // Count units with Manacharge abilities
        const manachargeUnits = battlefield.filter(unit => 
            unit && unit.ability && unit.ability.toLowerCase().includes('manacharge')
        );
        
        if (manachargeUnits.length > 0) {
            console.log(`Found ${manachargeUnits.length} Manacharge units for ${playerId}`);
            // Enhanced game log message
        }
        
        // Find all units with Manacharge abilities ON THE SAME PLAYER'S BATTLEFIELD
        battlefield.forEach((unit, slotIndex) => {
            if (unit && unit.ability && unit.ability.toLowerCase().includes('manacharge')) {
                // Double-check that this unit belongs to the correct player
                if (unit.owner && unit.owner !== playerId) {
                    console.warn(`⚠️ Skipping Manacharge for ${unit.name} - wrong owner (${unit.owner} vs ${playerId})`);
                    return;
                }
                
                console.log(`⚡ Activating Manacharge on ${unit.name} (owner: ${unit.owner || playerId}) at slot ${slotIndex}`);
                
                // Trigger the Manacharge ability
                this.eventBus.emit('ability:manacharge', {
                    unit,
                    context: { slotIndex, playerId, triggerUnit }
                });
            }
        });
    }

    /**
     * Handle Kindred abilities (triggered when similar tag is played)
     * @param {Object} data - Kindred trigger data
     */
    handleKindred(data) {
        const { unit, triggeringUnit, context } = data;
        const abilityText = unit.ability;

        console.log(`👥 Kindred triggered for ${unit.name}: ${abilityText}`);

        // Extract shared tags for logging
        const sharedTags = unit.tags.filter(tag => triggeringUnit.tags.includes(tag));
        const tagString = sharedTags.join(', ');

        // Enhanced game log message
        this.eventBus.emit('ability:activated', {
            ability: 'kindred',
            unit,
            player: context.owner || 'player'
        });

        // Lich: Deal 3 damage to a random enemy. Heal your player 3
        if (unit.name === 'Lich' && abilityText.toLowerCase().includes('deal 3 damage to a random enemy')) {
            const state = this.gameState.getState();
            const playerId = unit.owner || context.owner || 'player';
            const enemyId = playerId === 'player' ? 'ai' : 'player';
            const enemyBattlefield = state.players[enemyId].battlefield;
            
            // Find all enemy units (including the player as a potential target)
            const enemyTargets = [];
            
            // Add enemy units
            enemyBattlefield.forEach((enemyUnit, slotIndex) => {
                if (enemyUnit) {
                    enemyTargets.push({ 
                        type: 'unit', 
                        unit: enemyUnit, 
                        slotIndex, 
                        playerId: enemyId 
                    });
                }
            });
            
            // Add enemy player as a potential target
            enemyTargets.push({ 
                type: 'player', 
                playerId: enemyId 
            });
            
            // Choose a random enemy target
            if (enemyTargets.length > 0) {
                const randomTarget = enemyTargets[Math.floor(Math.random() * enemyTargets.length)];
                
                // Deal 3 damage to the random target
                if (randomTarget.type === 'player') {
                    this.eventBus.emit('combat:damage', {
                        target: { type: 'player', playerId: randomTarget.playerId },
                        amount: 3,
                        source: unit
                    });
                    console.log(`💀 Lich dealt 3 damage to ${randomTarget.playerId} player`);
                } else {
                    this.eventBus.emit('combat:damage', {
                        target: { 
                            type: 'unit', 
                            unit: randomTarget.unit, 
                            slotIndex: randomTarget.slotIndex, 
                            playerId: randomTarget.playerId 
                        },
                        amount: 3,
                        source: unit
                    });
                    console.log(`💀 Lich dealt 3 damage to ${randomTarget.unit.name}`);
                }
            }
            
            // Heal your player 3
            const currentHealth = state.players[playerId].health;
            const maxHealth = 30; // Updated max health
            const newHealth = Math.min(currentHealth + 3, maxHealth);
            
            this.gameEngine.dispatch({
                type: 'SET_PLAYER_HEALTH',
                payload: { 
                    playerId, 
                    health: newHealth 
                }
            });
            
            console.log(`💚 Lich healed ${playerId} for 3 (${currentHealth} -> ${newHealth})`);
            
            this.eventBus.emit('player:healed', {
                playerId,
                amount: 3,
                source: unit
            });
            
            this.eventBus.emit('ability:activated', {
                type: 'lich-kindred',
                unit,
                effect: `Dealt 3 damage and healed player for 3`
            });
            
            return;
        }
        
        // Goblin Chief: Summon a random Goblin (Knife, Spear, or Muscle) in a random slot
        if (unit.name === 'Goblin Chief' && abilityText.toLowerCase().includes('summon a knife, spear, or muscle goblin')) {
            const state = this.gameState.getState();
            const playerId = unit.owner || context.owner || 'player';
            const battlefield = state.players[playerId].battlefield;
            
            // Find all empty slots
            const emptySlots = [];
            for (let i = 0; i < 6; i++) {
                if (!battlefield[i]) {
                    emptySlots.push(i);
                }
            }
            
            if (emptySlots.length > 0) {
                // Choose a random empty slot
                const targetSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
                
                // Choose a random Goblin to summon
                const goblinOptions = ['knife_goblin', 'spear_goblin', 'muscle_goblin'];
                const selectedGoblin = goblinOptions[Math.floor(Math.random() * goblinOptions.length)];
                
                // Get the unit data using the specific method
                let unitData;
                if (selectedGoblin === 'knife_goblin') {
                    unitData = this.getKnifeGoblinCard();
                } else if (selectedGoblin === 'spear_goblin') {
                    unitData = this.getSpearGoblinCard();
                } else if (selectedGoblin === 'muscle_goblin') {
                    unitData = this.getMuscleGoblinCard();
                }
                
                if (unitData) {
                    // Create the summoned unit using UnitFactory
                    const summonedUnit = UnitFactory.createSummonedUnit(unitData, playerId, targetSlot, {
                        canAttack: false,
                        summoner: unit.name
                    });
                    
                    // Place the unit on the battlefield
                    this.gameEngine.dispatch({
                        type: 'PLACE_UNIT',
                        payload: { 
                            playerId, 
                            slotIndex: targetSlot, 
                            unit: summonedUnit 
                        }
                    });
                    
                    console.log(`👑 Goblin Chief summoned a ${summonedUnit.name} to slot ${targetSlot}`);
                    
                    this.eventBus.emit('ability:activated', {
                        type: 'goblin-chief-kindred',
                        unit,
                        effect: `Summoned ${summonedUnit.name} to slot ${targetSlot}`
                    });
                } else {
                    console.error(`Failed to find unit data for ${selectedGoblin}`);
                }
            } else {
                console.log(`👑 Goblin Chief's battlefield is full, cannot summon Goblin`);
            }
            return;
        }

        // Remove "Kindred:" prefix and parse the effect
        // Handle special case: "Kindred and Manacharge:"
        let effectText = abilityText.replace(/^.*?kindred(?:\s+and\s+manacharge)?:\s*/i, '');
        const result = this.parseAndExecuteAbility(effectText, { unit, triggeringUnit, ...context });

        // Log the specific effect that was triggered
        if (result.success && result.effects.length > 0) {
            const effect = result.effects[0];
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
            } else if (effect.type === 'ability_grant') {
                effectDescription = `gains ${effect.ability}`;
            }

            if (effectDescription) {
            }
        }
    }

    /**
     * Parse draw effect from ability text
     * @param {string} text - Ability text
     * @param {Object} context - Context
     * @returns {Object} Draw effect object
     */
    parseDrawEffect(text, context) {
        // Pattern: "Draw up to X [tag] units from your deck" (for Tempest Lord)
        const taggedDrawMatch = text.match(/draw up to (\d+) (\w+) units from your deck/i);
        if (taggedDrawMatch) {
            const amount = parseInt(taggedDrawMatch[1]);
            const tag = taggedDrawMatch[2];
            return {
                type: 'draw',
                amount: amount,
                target: 'self',
                filterTag: tag, // Filter by this tag
                upTo: true // Draw "up to" amount, not exactly amount
            };
        }
        
        // Pattern: "draw from your deck"
        const yourDeckMatch = text.match(/draw from your deck/i);
        if (yourDeckMatch) {
            return {
                type: 'draw',
                amount: 1, // Default to 1 card
                target: 'self'
            };
        }
        
        // Pattern: "draw from your opponent's deck" (for Phantom)
        const opponentDeckMatch = text.match(/draw from your opponent'?s? deck/i);
        if (opponentDeckMatch) {
            return {
                type: 'draw',
                amount: 1,
                target: 'opponent'
            };
        }
        
        // Pattern: "draw X" (simple draw like "Draw 1")
        const simpleDrawMatch = text.match(/draw (\d+)/i);
        if (simpleDrawMatch) {
            const amount = parseInt(simpleDrawMatch[1]);
            return {
                type: 'draw',
                amount: amount,
                target: 'self'
            };
        }
        
        return null;
    }

    /**
     * Execute a draw effect
     * @param {Object} effect - Draw effect object
     * @param {Object} context - Context
     */
    executeDrawEffect(effect, context) {
        const { unit } = context;
        const playerId = unit.owner;
        
        // Determine target player
        let targetPlayerId = playerId;
        if (effect.target === 'opponent') {
            const state = this.gameState.getState();
            targetPlayerId = Object.keys(state.players).find(id => id !== playerId);
            console.log(`📚 ${unit.name} draws ${effect.amount} card from opponent's deck`);
        }
        
        // Handle tag-based filtering (like Tempest Lord)
        if (effect.filterTag && effect.upTo) {
            this.executeTagFilteredDraw(effect, context, targetPlayerId);
            return;
        }
        
        // Standard draw behavior
        console.log(`📚 ${unit.name} draws ${effect.amount} card from deck`);
        
        // Emit card draw event - ability-triggered draws are FREE
        for (let i = 0; i < effect.amount; i++) {
            this.eventBus.emit('card:draw', {
                playerId: targetPlayerId,
                source: 'ability',
                free: true,  // Important: ability-triggered draws don't cost gold
                fromOpponent: effect.target === 'opponent'
            });
        }
    }

    /**
     * Execute tag-filtered draw effect (for abilities like Tempest Lord)
     * @param {Object} effect - Draw effect object
     * @param {Object} context - Context
     * @param {string} targetPlayerId - Target player ID
     */
    executeTagFilteredDraw(effect, context, targetPlayerId) {
        const { unit } = context;
        const state = this.gameState.getState();
        const player = state.players[targetPlayerId];
        
        if (!player || !player.deck || player.deck.length === 0) {
            console.log(`📚 ${unit.name} tried to draw ${effect.filterTag} units but deck is empty`);
            return;
        }
        
        console.log(`🔍 Searching deck for ${effect.filterTag} units. Deck has ${player.deck.length} cards:`);
        player.deck.forEach((card, i) => {
            console.log(`  [${i}] ${card.name} - Ability: "${card.ability || 'none'}" - Tags: ${card.tags ? card.tags.join(', ') : 'none'}`);
        });
        
        // Find cards with the specified ability keyword in the deck
        let cardsDrawn = 0;
        let cardsFound = [];
        
        for (let i = 0; i < player.deck.length && cardsDrawn < effect.amount; i++) {
            const card = player.deck[i];
            
            // Check if card has the required keyword in its ability text (case-insensitive)
            const hasKeyword = card.ability && card.ability.toLowerCase().includes(effect.filterTag.toLowerCase());
            
            if (hasKeyword) {
                // Check if player has hand space
                if (player.hand.length + cardsDrawn < 3) {
                    cardsFound.push({ card, index: i });
                    cardsDrawn++;
                    console.log(`📚 Found ${card.name} (has ${effect.filterTag}) at index ${i}`);
                } else {
                    console.log(`📚 Hand is full, cannot draw more cards`);
                    break;
                }
            }
        }
        
        // Actually move cards from deck to hand using game state actions
        for (let i = cardsFound.length - 1; i >= 0; i--) {
            const { card, index } = cardsFound[i];
            
            // Remove from deck
            this.gameEngine.dispatch({
                type: 'REMOVE_CARD_FROM_DECK',
                payload: { playerId: targetPlayerId, cardIndex: index }
            });
            
            // Add to hand
            this.gameEngine.dispatch({
                type: 'ADD_CARD_TO_HAND',
                payload: { playerId: targetPlayerId, card: card }
            });
            
            console.log(`✅ Moved ${card.name} from deck to hand`);
        }
        
        console.log(`🌪️ ${unit.name} drew ${cardsDrawn} ${effect.filterTag} units from deck (up to ${effect.amount})`);
        
        // Enhanced game log
        this.eventBus.emit('ability:activated', {
            ability: 'unleash',
            unit,
            player: targetPlayerId,
            effect: `Drew ${cardsDrawn} ${effect.filterTag} units from deck`
        });
    }

    /**
     * Parse heal effect from ability text
     * @param {string} text - Ability text
     * @param {Object} context - Context
     * @returns {Object} Heal effect object
     */
    parseHealEffect(text, context) {
        // Pattern: "heal your player X" or "heal yourself X"
        const healMatch = text.match(/heal (?:your player|yourself) (\d+)/i);
        if (healMatch) {
            const amount = parseInt(healMatch[1]);
            return {
                type: 'heal',
                amount: amount,
                target: 'self'
            };
        }
        
        return null;
    }

    /**
     * Execute heal effect
     * @param {Object} effect - Heal effect object
     * @param {Object} context - Context
     */
    executeHealEffect(effect, context) {
        const { unit } = context;
        const playerId = unit.owner || context.playerId;
        const state = this.gameState.getState();
        const currentHealth = state.players[playerId].health;
        const newHealth = Math.min(currentHealth + effect.amount, 30); // Max health is 30
        
        this.gameEngine.dispatch({
            type: 'SET_PLAYER_HEALTH',
            payload: {
                playerId,
                health: newHealth
            }
        });
        
        console.log(`💚 ${unit.name} healed ${playerId} for ${effect.amount} (${currentHealth} -> ${newHealth})`);
        
        this.eventBus.emit('player:healed', {
            playerId,
            amount: effect.amount,
            source: unit
        });
    }

    /**
     * Parse Soul consumption effects
     * @param {string} text - Ability text
     * @param {Object} context - Context
     * @returns {Object} Soul effect object
     */
    parseSoulEffect(text, context) {
        const lowerText = text.toLowerCase();
        
        // Pattern: "Consume up to 3 souls. Draw that many cards"
        if (lowerText.includes('consume up to') && lowerText.includes('souls')) {
            const consumeMatch = text.match(/consume up to (\d+) souls?\. draw that many/i);
            if (consumeMatch) {
                return {
                    type: 'soul-consume',
                    maxConsume: parseInt(consumeMatch[1]),
                    effect: 'draw-equal'
                };
            }
        }
        
        // Pattern: "Gain +2/+2 for each of your Souls"
        if (lowerText.includes('for each of your souls')) {
            const soulBuffMatch = text.match(/gain \+(\d+)\/\+(\d+) for each of your souls/i);
            if (soulBuffMatch) {
                return {
                    type: 'soul-buff',
                    attackPerSoul: parseInt(soulBuffMatch[1]),
                    healthPerSoul: parseInt(soulBuffMatch[2])
                };
            }
            
            // Pattern: "Gain +X Attack for each of your Souls" (attack only)
            const attackOnlyMatch = text.match(/gain \+(\d+) attack for each of your souls/i);
            if (attackOnlyMatch) {
                return {
                    type: 'soul-buff',
                    attackPerSoul: parseInt(attackOnlyMatch[1]),
                    healthPerSoul: 0
                };
            }
        }
        
        return null;
    }

    /**
     * Execute Soul consumption effects
     * @param {Object} effect - Soul effect object
     * @param {Object} context - Context
     */
    executeSoulEffect(effect, context) {
        const { unit } = context;
        const playerId = unit.owner || context.playerId;
        const state = this.gameState.getState();
        const currentSouls = state.souls[playerId] || 0;
        
        if (effect.type === 'soul-consume') {
            // Consume up to maxConsume souls, but only as many as we have
            const soulsToConsume = Math.min(currentSouls, effect.maxConsume);
            
            if (soulsToConsume > 0) {
                // Update souls count
                this.gameEngine.dispatch({
                    type: 'UPDATE_SOULS',
                    payload: { playerId, count: currentSouls - soulsToConsume }
                });
                
                console.log(`👻 ${unit.name} consumed ${soulsToConsume} souls`);
                
                // Execute the effect based on souls consumed
                if (effect.effect === 'draw-equal') {
                    const state = this.gameState.getState();
                    const currentHandSize = state.players[playerId].hand.length;
                    const maxDraws = Math.min(soulsToConsume, 3 - currentHandSize); // Don't exceed hand limit
                    
                    console.log(`👻 Attempting to draw ${soulsToConsume} cards, hand size: ${currentHandSize}, max possible: ${maxDraws}`);
                    
                    for (let i = 0; i < maxDraws; i++) {
                        this.eventBus.emit('card:draw', { 
                            playerId, 
                            source: 'ability', 
                            free: true 
                        });
                    }
                    
                    if (maxDraws < soulsToConsume) {
                        console.log(`⚠️ Could only draw ${maxDraws} cards instead of ${soulsToConsume} due to hand limit`);
                    }
                }
            }
            
        } else if (effect.type === 'soul-buff') {
            // Buff based on current soul count
            const attackBonus = currentSouls * effect.attackPerSoul;
            const healthBonus = currentSouls * effect.healthPerSoul;
            
            if (attackBonus > 0 || healthBonus > 0) {
                console.log(`👻 ${unit.name} gains +${attackBonus}/+${healthBonus} from ${currentSouls} souls`);
                
                this.applyBuffToUnit(playerId, context.slotIndex, attackBonus, healthBonus);
            }
        }
    }

    /**
     * Get the standard Skeleton card definition
     * All Skeletons should have "Last Gasp: Banish this" to prevent deck pollution
     * @returns {Object} Skeleton card definition
     */
    getSkeletonCard() {
        return {
            id: 'skeleton',
            name: 'Skeleton',
            attack: 1,
            health: 1,
            ability: 'Last Gasp: Banish this',
            tags: ['Undead'],
            color: 'purple'
        };
    }

    /**
     * Get the Mana Surge card definition
     * @returns {Object} Mana Surge card definition
     */
    getManaSurgeCard() {
        return {
            id: 'mana_surge',
            name: 'Mana Surge',
            attack: 1,
            health: 1,
            ability: 'Unleash: Banish this',
            tags: [],
            color: 'blue'
        };
    }
    
    /**
     * Get Spider token card definition
     * @returns {Object} Spider card
     */
    getSpiderCard() {
        return {
            id: 'spider',
            name: 'Spider',
            attack: 5,
            health: 1,
            ability: '',
            tags: ['Beast'],
            color: 'purple',
            isToken: true
        };
    }
    
    /**
     * Get Fire Spirit card definition (Tier 2 unit)
     * @returns {Object} Fire Spirit card
     */
    getFireSpiritCard() {
        return {
            id: 'fire_spirit',
            name: 'Fire Spirit',
            attack: 3,
            health: 3,
            ability: 'Manacharge: Gain +3/+2',
            tags: ['Mystic'],
            color: 'blue'
        };
    }
    
    /**
     * Get Knife Goblin card definition (Tier 1 unit)
     * @returns {Object} Knife Goblin card
     */
    getKnifeGoblinCard() {
        return {
            id: 'knife_goblin',
            name: 'Knife Goblin',
            attack: 1,
            health: 1,
            ability: 'Rush, Kindred: Gain +1/+1',
            tags: ['Goblin'],
            color: 'green'
        };
    }
    
    /**
     * Get Spear Goblin card definition (Tier 1 unit)
     * @returns {Object} Spear Goblin card
     */
    getSpearGoblinCard() {
        return {
            id: 'spear_goblin',
            name: 'Spear Goblin',
            attack: 1,
            health: 1,
            ability: 'Ranged, Kindred: Gain +1/+1',
            tags: ['Goblin'],
            color: 'green'
        };
    }
    
    /**
     * Get Muscle Goblin card definition (Tier 1 unit)
     * @returns {Object} Muscle Goblin card
     */
    getMuscleGoblinCard() {
        return {
            id: 'muscle_goblin',
            name: 'Muscle Goblin',
            attack: 1,
            health: 1,
            ability: 'Trample, Kindred: Gain +1/+1',
            tags: ['Goblin'],
            color: 'green'
        };
    }
    
    /**
     * Fill front row with 5/1 Spiders for Spider Queen
     * @param {string} playerId - Player ID
     * @param {Object} context - Context including the unit
     */
    fillFrontRowWithSpiders(playerId, context) {
        const state = this.gameState.getState();
        const battlefield = state.players[playerId].battlefield;
        const spiderCard = this.getSpiderCard();
        let spidersPlaced = 0;
        
        // Fill front row slots (0, 1, 2) with Spiders
        for (let slot = 0; slot <= 2; slot++) {
            if (!battlefield[slot]) {
                const spider = UnitFactory.createSummonedUnit(spiderCard, playerId, slot, {
                    canAttack: false,
                    summonedThisTurn: true
                });
                
                if (UnitFactory.validateUnit(spider)) {
                    this.gameEngine.dispatch({
                        type: 'PLACE_UNIT',
                        payload: { playerId, unit: spider, slotIndex: slot }
                    });
                    spidersPlaced++;
                }
            }
        }
        
        console.log(`🕷️ Filled ${spidersPlaced} front row slots with Spiders`);
        
        // Enhanced game log
        this.eventBus.emit('ability:activated', {
            ability: 'unleash',
            unit: context.unit || { name: 'Spider Queen' },
            player: playerId,
            effect: `Filled front row with ${spidersPlaced} Spiders`
        });
    }

    /**
     * Parse summon effects like "Add a Skeleton to your hand" or "Summon a Skeleton"
     * @param {string} text - Effect text
     * @param {Object} context - Context
     * @returns {Object} Summon effect object
     */
    parseSummonEffect(text, context) {
        const lowerText = text.toLowerCase();
        
        // Special case: "Fill your front row with 5/1 Spiders"
        if (lowerText.includes('fill your front row with') && lowerText.includes('spider')) {
            return {
                type: 'summon',
                cardName: 'Spider',
                amount: 3, // Front row has 3 slots
                fillFrontRow: true
            };
        }
        
        // Parse "Add X to your hand" effects
        if (lowerText.includes('add') && lowerText.includes('to your hand')) {
            let cardName = '';
            let amount = 1;
            
            // Extract card name and amount
            if (lowerText.includes('two skeletons')) {
                cardName = 'Skeleton';
                amount = 2;
            } else if (lowerText.includes('skeleton')) {
                cardName = 'Skeleton';
            } else if (lowerText.includes('mana surge')) {
                cardName = 'Mana Surge';
            } else if (lowerText.includes('mana spirit')) {
                cardName = 'Mana Surge'; // Map Mana Spirit to Mana Surge
            }
            
            // Legacy: Extract amount (e.g., "two skeletons")
            if (lowerText.includes('two') && !lowerText.includes('two skeletons')) {
                amount = 2;
            } else if (lowerText.includes('three')) {
                amount = 3;
            }
            
            if (cardName) {
                return {
                    type: 'add-to-hand',
                    cardName,
                    amount,
                    target: 'self'
                };
            }
        }
        
        // Parse "Summon X" effects
        if (lowerText.includes('summon')) {
            let cardName = '';
            let amount = 1;
            let location = 'any'; // Default to any empty slot
            
            // Extract card name
            if (lowerText.includes('skeleton')) {
                cardName = 'Skeleton';
            }
            
            // Extract amount
            if (lowerText.includes('two')) {
                amount = 2;
            } else if (lowerText.includes('three')) {
                amount = 3;
            }
            
            // Check for "here" specification (same slot)
            if (lowerText.includes('here')) {
                location = 'same-slot';
            }
            
            if (cardName) {
                return {
                    type: 'summon',
                    cardName,
                    amount,
                    location,
                    target: 'battlefield'
                };
            }
        }
        
        return null;
    }

    /**
     * Execute summon effects
     * @param {Object} effect - Summon effect object
     * @param {Object} context - Context
     */
    executeSummonEffect(effect, context) {
        const { playerId, slotIndex } = context;
        const { type, cardName, amount, location, fillFrontRow } = effect;
        
        console.log(`🧙‍♂️ Executing summon effect: ${type} ${amount}x ${cardName} for ${playerId}`);
        
        // Special handling for Spider Queen's "Fill front row" effect
        if (fillFrontRow && cardName === 'Spider') {
            return this.fillFrontRowWithSpiders(playerId, context);
        }
        
        // Get the appropriate card definition
        let cardDefinition;
        if (cardName === 'Skeleton') {
            cardDefinition = this.getSkeletonCard();
        } else if (cardName === 'Mana Surge') {
            cardDefinition = this.getManaSurgeCard();
        } else if (cardName === 'Spider') {
            cardDefinition = this.getSpiderCard();
        } else if (cardName === 'Fire Spirit') {
            cardDefinition = this.getFireSpiritCard();
        } else {
            console.error(`❌ Unknown card to summon: ${cardName}`);
            return;
        }
        
        if (type === 'add-to-hand') {
            // Create array of cards to add
            const cardsToAdd = [];
            for (let i = 0; i < amount; i++) {
                cardsToAdd.push({ ...cardDefinition });
            }
            
            // Add all cards in order with hand limit checking
            this.gameEngine.dispatch({
                type: 'ADD_CARDS_TO_HAND_IN_ORDER',
                payload: {
                    playerId,
                    cards: cardsToAdd
                }
            });
            
            console.log(`🃏 Added ${amount} ${cardName}(s) to ${playerId}'s hand`);
        } else {
            // Handle summon effects one by one
            for (let i = 0; i < amount; i++) {
                if (type === 'summon') {
                    // Determine which slot to summon to
                    const state = this.gameState.getState();
                    const battlefield = state.players[playerId].battlefield;
                    let targetSlot;
                    
                    if (location === 'same-slot' && slotIndex !== undefined) {
                        // Summon in the same slot as the dying unit (for "here" effects)
                        targetSlot = slotIndex;
                        console.log(`🎯 Summoning ${cardName} in same slot (${targetSlot}) as dying unit`);
                        console.log(`📍 Current slot ${targetSlot} contents:`, battlefield[targetSlot]);
                    } else {
                        // Find empty slot to summon to
                        targetSlot = battlefield.findIndex(slot => slot === null);
                        console.log(`🔍 Looking for empty slot, found: ${targetSlot}`);
                    }
                    
                    if (targetSlot !== -1 && targetSlot < battlefield.length) {
                        // Create unit from card using shared factory
                        const unit = UnitFactory.createSummonedUnit(cardDefinition, playerId, targetSlot, {
                            canAttack: false,
                            summonedThisTurn: true
                        });
                        
                        console.log(`🏗️ Created unit:`, unit);
                        
                        // Validate the created unit
                        if (!UnitFactory.validateUnit(unit)) {
                            console.error('❌ Failed to create valid summoned unit:', unit);
                            continue;
                        }
                        
                        // Place on battlefield
                        console.log(`📦 Dispatching PLACE_UNIT with:`, { playerId, unit, slotIndex: targetSlot });
                        this.gameEngine.dispatch({
                            type: 'PLACE_UNIT',
                            payload: { playerId, unit, slotIndex: targetSlot }
                        });
                        
                        // Check if unit was actually placed
                        const newState = this.gameState.getState();
                        const placedUnit = newState.players[playerId].battlefield[targetSlot];
                        console.log(`✅ After PLACE_UNIT, slot ${targetSlot} contains:`, placedUnit);
                        
                        console.log(`⚔️ Summoned ${cardName} to ${playerId}'s slot ${targetSlot}`);
                    } else {
                        console.log(`❌ No empty slots to summon ${cardName} for ${playerId}`);
                    }
                }
            }
        }
        
        this.eventBus.emit('ability:activated', {
            ability: 'lastGasp',
            unit: context.unit || { name: cardName },
            player: playerId
        });
    }

    /**
     * Parse Dragon Flame effect from ability text
     * @param {string} text - Ability text
     * @param {Object} context - Context
     * @returns {Object} Dragon Flame effect object
     */
    parseDragonFlameEffect(text, context) {
        // Pattern: "gain X dragon flame"
        const dragonFlameMatch = text.match(/gain (\d+) dragon flames?/i);
        if (!dragonFlameMatch) return null;

        const amount = parseInt(dragonFlameMatch[1]);
        
        return {
            type: 'dragon-flame',
            amount,
            target: 'self'
        };
    }

    /**
     * Execute a Dragon Flame effect
     * @param {Object} effect - Dragon Flame effect object
     * @param {Object} context - Context
     */
    executeDragonFlameEffect(effect, context) {
        const { unit } = context;
        const playerId = unit.owner;
        
        console.log(`🔥 ${unit.name} gains ${effect.amount} Dragon Flame(s)`);
        
        // Add Dragon Flame to player's resources
        this.gameEngine.dispatch({
            type: 'ADD_DRAGON_FLAME',
            payload: {
                playerId,
                amount: effect.amount
            }
        });
        
        this.eventBus.emit('ability:activated', {
            ability: 'dragonFlame',
            unit,
            player: playerId,
            amount: effect.amount
        });
    }

    /**
     * Handle end-of-turn abilities (triggered when a player's turn ends)
     * @param {Object} data - End of turn trigger data
     */
    handleEndOfTurn(data) {
        const { playerId } = data;
        
        console.log(`⏰ End of turn triggered for ${playerId}`);
        
        // Get all units on the current player's battlefield
        const state = this.gameState.getState();
        const battlefield = state.players[playerId].battlefield;
        
        battlefield.forEach((unit, slotIndex) => {
            if (unit && unit.ability) {
                // Check for end-of-turn abilities
                if (unit.ability.toLowerCase().includes('at the end of your turn') ||
                    unit.ability.toLowerCase().includes('end of turn')) {
                    
                    console.log(`⏰ Checking end-of-turn ability for ${unit.name}: ${unit.ability}`);
                    
                    // Handle Fighter's specific ability
                    if (unit.ability.toLowerCase().includes('if this is in the front row, gain +1/+1')) {
                        this.handleFighterEndOfTurn(unit, playerId, slotIndex);
                    }
                    
                    // Add more end-of-turn ability patterns here in the future
                }
            }
        });
    }

    /**
     * Handle start of turn abilities
     * @param {Object} data - Turn start data
     */
    handleStartOfTurn(data) {
        const { player } = data;
        
        console.log(`🌅 Start of turn triggered for ${player}`);
        
        // Get all units on the current player's battlefield
        const state = this.gameState.getState();
        const battlefield = state.players[player].battlefield;
        
        battlefield.forEach((unit, slotIndex) => {
            if (unit && unit.ability) {
                const lowerAbility = unit.ability.toLowerCase();
                
                // Check for start-of-turn abilities
                if (lowerAbility.includes('at the start of your turn')) {
                    console.log(`🌅 Triggering start-of-turn ability for ${unit.name}: ${unit.ability}`);
                    
                    // Worker: "At the start of your turn, give this slot +1/+0"
                    if (unit.name === 'Worker' || lowerAbility.includes('give this slot +1/+0')) {
                        console.log(`💪 [WORKER DEBUG] Triggering slot buff for ${unit.name} at slot ${slotIndex}`);
                        this.eventBus.emit('slot:buff', {
                            slotIndex: slotIndex,
                            playerId: player,
                            buff: {
                                attack: 1,
                                health: 0
                            }
                        });
                        console.log(`💪 ${unit.name} buffed its slot +1/+0`);
                    }
                    
                    // Forager: "At the start of your turn, draw 1"
                    if (unit.name === 'Forager' || lowerAbility.includes('draw 1')) {
                        this.eventBus.emit('card:draw', {
                            playerId: player,
                            source: 'ability',
                            free: true
                        });
                        console.log(`📚 ${unit.name} draws a card`);
                    }
                    
                    // Giant Toad: "At the start of your turn, give your other Beasts +2/+2"
                    if (lowerAbility.includes('give your other beasts +2/+2')) {
                        battlefield.forEach((targetUnit, targetSlot) => {
                            if (targetUnit && targetUnit.tags && targetUnit.tags.includes('Beast') && targetSlot !== slotIndex) {
                                this.applyUnitBuff(targetUnit, 2, 2, player, targetSlot);
                            }
                        });
                        console.log(`🐸 ${unit.name} buffed other Beasts +2/+2`);
                    }
                    
                    // Arrowmaster: "At the start of your turn, give all slots with an Elf +3/+0"
                    if (lowerAbility.includes('give all slots with an elf +3/+0')) {
                        battlefield.forEach((targetUnit, targetSlot) => {
                            if (targetUnit && targetUnit.tags && targetUnit.tags.includes('Elf')) {
                                // Buff the SLOT, not the unit
                                this.eventBus.emit('slot:buff', {
                                    slotIndex: targetSlot,
                                    playerId: player,
                                    buff: {
                                        attack: 3,
                                        health: 0
                                    }
                                });
                            }
                        });
                        console.log(`🏹 ${unit.name} buffed all slots with Elves +3/+0`);
                    }
                    
                    // Dwarf Knight (Tier 3): "At the start of your turn, give this slot +2/+2"
                    if (lowerAbility.includes('give this slot +2/+2')) {
                        this.eventBus.emit('slot:buff', {
                            slotIndex: slotIndex,
                            playerId: player,
                            buff: {
                                attack: 2,
                                health: 2
                            }
                        });
                        console.log(`⚔️ ${unit.name} buffed its slot +2/+2`);
                    }
                    
                    // Treant: "At the start of your turn, fully heal this"
                    if (unit.name === 'Treant' || lowerAbility.includes('fully heal this')) {
                        const maxHealth = unit.maxHealth || unit.health;
                        if (unit.currentHealth < maxHealth) {
                            console.log(`🌳 ${unit.name} healing from ${unit.currentHealth}/${maxHealth} to full health`);
                            
                            const updates = {
                                currentHealth: maxHealth
                            };
                            
                            this.updateUnitStats(player, slotIndex, updates, `fully healed to ${maxHealth}`);
                            console.log(`🌳 ${unit.name} is now fully healed: ${maxHealth}/${maxHealth}`);
                        } else {
                            console.log(`🌳 ${unit.name} is already at full health: ${unit.currentHealth}/${maxHealth}`);
                        }
                    }
                }
            }
        });
    }

    /**
     * Handle Fighter's end-of-turn ability
     * @param {Object} unit - Fighter unit
     * @param {string} playerId - Player ID
     * @param {number} slotIndex - Slot position
     */
    handleFighterEndOfTurn(unit, playerId, slotIndex) {
        // Check if Fighter is in front row (slots 0, 1, 2)
        const isFrontRow = slotIndex >= 0 && slotIndex <= 2;
        
        if (isFrontRow) {
            console.log(`💪 Fighter in front row (slot ${slotIndex}) gains +1/+1!`);
            
            // Enhanced game log for Fighter ability
            
            // Apply the +1/+1 buff
            this.eventBus.emit('ability:buff', {
                unit,
                effect: { attack: 1, health: 1, temporary: false },
                context: { 
                    playerId, 
                    slotIndex,
                    unit: unit  // Ensure unit is available in context
                }
            });
            
        } else {
            console.log(`😴 Fighter in back row (slot ${slotIndex}) - no buff this turn`);
            
            // Optional: Log why the ability didn't trigger
        }
    }

    /**
     * Handle buff events (direct buff application)
     * @param {Object} data - Buff event data
     */
    handleBuff(data) {
        const { unit, effect, context } = data;
        
        console.log(`💪 Applying buff to ${unit.name}: +${effect.attack}/+${effect.health}`);
        
        // Ensure the context has the unit property for executeBuffEffect
        const enhancedContext = {
            ...context,
            unit: unit
        };
        
        // Use the existing buff execution logic
        this.executeBuffEffect(effect, enhancedContext);
    }
    
    /**
     * Handle units that survived damage (for Berserker ability)
     */
    handleSurvivedDamage(data) {
        const { unit, owner, slotIndex } = data;
        
        // Check for Berserker's ability
        if (unit.ability && unit.ability.toLowerCase().includes('when this survives damage')) {
            console.log(`💪 ${unit.name} survived damage, triggering ability`);
            
            // Parse the effect from the ability text
            const abilityText = unit.ability.toLowerCase();
            if (abilityText.includes('gain +4 attack')) {
                this.eventBus.emit('ability:activated', {
                    type: 'survived-damage',
                    unit: unit,
                    effect: 'Gained +4 Attack from surviving damage'
                });
                
                // Use centralized update method
                const updates = {
                    currentAttack: (unit.currentAttack || unit.attack) + 4
                };
                const reason = 'gained +4 Attack from surviving damage';
                this.updateUnitStats(owner, slotIndex, updates, reason);
            } else if (abilityText.includes('gain +1/+1')) {
                // Legacy support for old +1/+1 version
                this.eventBus.emit('ability:activated', {
                    type: 'survived-damage',
                    unit: unit,
                    effect: 'Gained +1/+1 from surviving damage'
                });
                
                // Use centralized update method
                const updates = {
                    currentAttack: (unit.currentAttack || unit.attack) + 1,
                    currentHealth: (unit.currentHealth || unit.health) + 1,
                    maxHealth: (unit.maxHealth || unit.health) + 1
                };
                const reason = 'gained +1/+1 from surviving damage';
                this.updateUnitStats(owner, slotIndex, updates, reason);
            }
        }
    }
    
    /**
     * Handle units that survived attacking (for old Wolf ability - deprecated)
     * Note: Current Wolf uses "After this attacks" which is handled in handleAfterAttack
     */
    handleSurvivedAttacking(data) {
        const { unit, owner, slotIndex } = data;
        
        // Check for old Wolf ability text (deprecated - kept for backwards compatibility)
        if (unit.ability && unit.ability.toLowerCase().includes('when this survives attacking')) {
            console.log(`🐺 ${unit.name} survived attacking, triggering ability`);
            
            // Parse the effect from the ability text
            const abilityText = unit.ability.toLowerCase();
            if (abilityText.includes('give this slot +1/+1')) {
                this.eventBus.emit('ability:activated', {
                    type: 'survived-attacking',
                    unit: unit,
                    effect: 'Slot gained +1/+1 from Wolf surviving attack'
                });
                
                // Apply buff to the slot
                this.eventBus.emit('slot:buff', {
                    playerId: owner,
                    slotIndex: slotIndex,
                    buff: { attack: 1, health: 1 },
                    permanent: true
                });
            }
        }
    }
    
    /**
     * Handle abilities that trigger after a unit attacks (for Wolf and Dire Wolf abilities)
     */
    handleAfterAttack(data) {
        const { attacker, attackerSlot, target } = data;
        
        // Check for Wolf's new ability
        if (attacker && attacker.ability && attacker.ability.toLowerCase().includes('after this attacks')) {
            console.log(`🐺 ${attacker.name} attacked, checking for after-attack abilities`);
            
            // Parse the effect from the ability text
            const abilityText = attacker.ability.toLowerCase();
            
            // Check if the ability specifies attacking "the other player"
            if (abilityText.includes('after this attacks the other player')) {
                // Only trigger if target is a player (not another unit)
                const isPlayerTarget = target && (target.playerId === 'player' || target.playerId === 'ai') && !target.name;
                
                if (!isPlayerTarget) {
                    console.log(`🐺 ${attacker.name} attacked a unit, not triggering slot buff (only triggers on player attacks)`);
                    return;
                }
            }
            
            // Check for buffing Beasts after attacking (Stoneclaw Prince)
            if (abilityText.includes('give your beasts +5/+0')) {
                console.log(`🦁 ${attacker.name} triggered Beast buff after attacking`);
                
                this.eventBus.emit('ability:activated', {
                    type: 'after-attack',
                    unit: attacker,
                    effect: 'Gave all Beasts +5/+0 after attacking'
                });

                // Buff all Beast units
                const state = this.gameState.getState();
                const playerId = attacker.owner;
                const player = state.players[playerId];
                let buffedUnits = 0;

                player.battlefield.forEach((unit, index) => {
                    if (unit && unit.tags && unit.tags.includes('Beast')) {
                        const newAttack = unit.currentAttack + 5;
                        
                        this.gameEngine.dispatch({
                            type: 'UPDATE_UNIT',
                            payload: {
                                playerId,
                                slotIndex: index,
                                updates: {
                                    currentAttack: newAttack
                                }
                            }
                        });

                        buffedUnits++;
                        console.log(`  Buffed ${unit.name} to ${newAttack} attack`);
                    }
                });

                console.log(`🦁 Buffed ${buffedUnits} Beast units with +5/+0`);
            }
            
            if (abilityText.includes('give this slot +1/+1')) {
                console.log(`🐺 ${attacker.name} triggered slot buff after attacking`);
                
                this.eventBus.emit('ability:activated', {
                    type: 'after-attack',
                    unit: attacker,
                    effect: 'Slot gained +1/+1 from Wolf after attacking'
                });
                
                // Apply permanent slot buff
                const state = this.gameState.getState();
                const playerId = attacker.owner;
                
                // Initialize slot buffs if not exists
                if (!state.slotBuffs) {
                    this.gameEngine.dispatch({
                        type: 'INITIALIZE_SLOT_BUFFS'
                    });
                }
                
                // Apply buff to the slot (this will persist for future units)
                this.gameEngine.dispatch({
                    type: 'APPLY_SLOT_BUFF',
                    payload: {
                        playerId,
                        slotIndex: attackerSlot,
                        attackBuff: 1,
                        healthBuff: 1
                    }
                });
                
                // Wolf benefits from the slot buff immediately
                // Get the updated state after slot buff was applied
                const updatedState = this.gameState.getState();
                const currentUnit = updatedState.players[playerId].battlefield[attackerSlot];
                const slotBuff = updatedState.players[playerId].slotBuffs[attackerSlot];
                
                if (currentUnit && currentUnit.id === attacker.id) {
                    // Recalculate Wolf's stats: base stats + total slot buff
                    const baseAttack = currentUnit.attack;
                    const baseHealth = currentUnit.health;
                    
                    const updates = {
                        currentAttack: baseAttack + slotBuff.attack,
                        currentHealth: baseHealth + slotBuff.health,
                        maxHealth: baseHealth + slotBuff.health
                    };
                    const reason = `buffed to ${updates.currentAttack}/${updates.currentHealth} from slot buff`;
                    this.updateUnitStats(playerId, attackerSlot, updates, reason);
                }
                
                console.log(`🎯 Slot ${attackerSlot} permanently buffed +1/+1`);
                
                // Update the UI to show the slot buff (reuse updatedState from above)
                const currentSlotBuff = updatedState.players[playerId].slotBuffs[attackerSlot];
                this.eventBus.emit('slot:buff-updated', {
                    player: playerId,
                    slot: attackerSlot,
                    attack: currentSlotBuff.attack,
                    health: currentSlotBuff.health,
                    type: 'wolf'
                });
            }
        }
        
        // Check for Dire Wolf's ability: "When this attacks the opposing player, draw from your deck"
        if (attacker && attacker.ability && target && target.type === 'player') {
            const abilityText = attacker.ability.toLowerCase();
            if (abilityText.includes('when this attacks the opposing player') && abilityText.includes('draw from your deck')) {
                console.log(`🐺 ${attacker.name} attacked player, triggering card draw`);
                
                // Trigger free card draw
                this.eventBus.emit('card:draw', {
                    playerId: attacker.owner,
                    source: 'ability',
                    free: true
                });
                
                this.eventBus.emit('ability:activated', {
                    type: 'attack-player-draw',
                    unit: attacker,
                    effect: 'Drew a card from attacking player'
                });
            }
        }
        
        // Check for Gale Sharpswift's ability: "After this attacks, return it to your hand"
        if (attacker && attacker.ability && attacker.ability.toLowerCase().includes('after this attacks, return it to your hand')) {
            console.log(`🏹 ${attacker.name} attacked, attempting to return to hand`);
            
            const playerId = attacker.owner;
            const state = this.gameState.getState();
            const playerHand = state.players[playerId].hand;
            
            // Check if hand is full (max 3 cards)
            if (playerHand.length >= 3) {
                console.log(`✋ ${attacker.name} cannot return to hand - hand is full`);
            } else {
                // Create card for hand (convert unit back to card format using original stats)
                const cardForHand = {
                    id: attacker.id,
                    name: attacker.name,
                    attack: attacker.originalAttack || attacker.attack,
                    health: attacker.originalHealth || attacker.health,
                    ability: attacker.ability,
                    tags: attacker.tags,
                    color: attacker.color,
                    tier: attacker.tier,
                    cost: attacker.cost,
                    handId: Date.now()
                };
                
                // Remove unit from battlefield
                this.gameEngine.dispatch({
                    type: 'REMOVE_UNIT',
                    payload: { 
                        playerId, 
                        slotIndex: attackerSlot 
                    }
                });
                
                // Add unit to hand
                this.gameEngine.dispatch({
                    type: 'ADD_CARD_TO_HAND',
                    payload: {
                        playerId,
                        card: cardForHand
                    }
                });
                
                console.log(`✅ ${attacker.name} returned to hand with original stats ${cardForHand.attack}/${cardForHand.health}`);
                
                this.eventBus.emit('ability:activated', {
                    type: 'after-attack-return',
                    unit: attacker,
                    effect: 'Returned to hand after attacking'
                });
            }
        }
    }
    
    /**
     * Handle unit death triggers (for Wraith and Death Knight abilities)
     */
    handleUnitDeath(data) {
        // Safety check for data
        if (!data || !data.unit) {
            console.error('❌ handleUnitDeath called without unit data');
            return;
        }
        
        const { unit, owner, slotIndex } = data;
        const state = this.gameState.getState();
        
        console.log(`💀 Checking death triggers for ${unit.name} (${unit.tags?.join(', ')}) - color: ${unit.color}`);
        
        // Check all units on the battlefield for death-triggered abilities
        Object.keys(state.players).forEach(playerId => {
            state.players[playerId].battlefield.forEach((observingUnit, observingSlot) => {
                if (!observingUnit || !observingUnit.ability) return;
                
                const abilityLower = observingUnit.ability.toLowerCase();
                
                // Note: Wraith now uses "When you gain a Soul" - handled in handleSoulsGained
                
                // Note: Death Knight now uses Soul-based abilities - handled in Unleash parsing
            });
        });
    }

    /**
     * Handle "When you gain a Soul" triggers (for Wraith abilities)
     */
    handleSoulsGained(data) {
        const { playerId, amount, newTotal, source } = data;
        const state = this.gameState.getState();
        
        console.log(`👻 Player ${playerId} gained ${amount} souls (total: ${newTotal})`);
        
        // Check all units on the battlefield for soul-gain triggered abilities
        state.players[playerId].battlefield.forEach((observingUnit, observingSlot) => {
            if (!observingUnit || !observingUnit.ability) return;
            
            const abilityLower = observingUnit.ability.toLowerCase();
            
            // Wraith: "When you gain a Soul, gain +1/+1"
            if (abilityLower.includes('when you gain a soul')) {
                console.log(`👻 ${observingUnit.name} triggered by gaining a soul`);
                
                this.eventBus.emit('ability:activated', {
                    type: 'soul-gained',
                    unit: observingUnit,
                    effect: 'Gained +1/+1 from gaining a soul'
                });
                
                // Apply permanent buff to Wraith (for each soul gained)
                for (let i = 0; i < amount; i++) {
                    this.applyUnitBuff(observingUnit, 1, 1, playerId, observingSlot);
                }
            }
        });
    }
    
    /**
     * Handle opponent summon triggers (for Swamp Ooze)
     */
    handleOpponentSummoned(data) {
        const { card, owner } = data;
        const state = this.gameEngine.getState();
        
        // Check all units on the battlefield for Swamp Ooze ability
        Object.keys(state.players).forEach(playerId => {
            if (playerId !== owner) { // Only trigger for opponent's units
                state.players[playerId].battlefield.forEach((unit, slotIndex) => {
                    if (unit && unit.ability && 
                        unit.ability.toLowerCase().includes('when your opponent summons a unit')) {
                        console.log(`💧 ${unit.name} triggered by opponent summon`);
                        
                        const abilityText = unit.ability.toLowerCase();
                        if (abilityText.includes('this takes 1 damage')) {
                            // Deal 1 damage to Swamp Ooze
                            const newHealth = (unit.currentHealth || unit.health) - 1;
                            
                            if (newHealth <= 0) {
                                // Unit is destroyed
                                this.gameEngine.dispatch({
                                    type: 'REMOVE_UNIT',
                                    payload: { playerId, slotIndex }
                                });
                                
                                // Trigger last gasp if applicable
                                if (unit.ability && unit.ability.toLowerCase().includes('last gasp')) {
                                    this.eventBus.emit('ability:last-gasp', {
                                        unit,
                                        owner: playerId,
                                        slotIndex
                                    });
                                }
                                
                                console.log(`💀 ${unit.name} destroyed from self-damage`);
                            } else {
                                // Update unit health
                                const updates = {
                                    currentHealth: newHealth
                                };
                                const reason = 'took 1 damage from opponent summoning a unit';
                                this.updateUnitStats(playerId, slotIndex, updates, reason);
                            }
                            
                            this.eventBus.emit('ability:activated', {
                                type: 'opponent-summon-damage',
                                unit: unit,
                                effect: 'Took 1 damage from opponent summon'
                            });
                            
                            // Apply damage to Swamp Ooze
                            this.eventBus.emit('combat:damage', {
                                target: { 
                                    type: 'unit', 
                                    playerId: playerId,
                                    slotIndex: slotIndex,
                                    unit: unit
                                },
                                amount: 1,
                                source: { name: 'Ability Effect' },
                                type: 'ability'
                            });
                        }
                    }
                });
            }
        });
    }

    /**
     * Parse double buff effect (Dwarf King)
     * @param {string} text - Ability text
     * @param {Object} context - Context
     * @returns {Object} Double buff effect object
     */
    parseDoubleBuffEffect(text, context) {
        // Pattern: "double the buff on all your slots"
        if (text.toLowerCase().includes('double the buff on all your slots')) {
            return {
                type: 'double-buff',
                targetType: 'all_own_slots',
                target: 'all_own_slots'
            };
        }
        return null;
    }

    /**
     * Execute double buff effect (Dwarf King)
     * @param {Object} effect - Effect object
     * @param {Object} context - Context
     */
    executeDoubleBuffEffect(effect, context) {
        const { unit, owner, playerId: contextPlayerId } = context;
        const playerId = owner || unit.owner || contextPlayerId;
        
        console.log(`👑 ${unit.name} doubles all buff effects on your slots`);
        
        // Safety check for gameState and battlefield
        const state = this.gameState.getState();
        if (!state || !state.players || !state.players[playerId] || !state.players[playerId].battlefield) {
            console.error(`Cannot find battlefield for player ${playerId}`);
            return;
        }
        
        // Get all player slot buffs
        const slotBuffs = state.players[playerId].slotBuffs;
        
        // Double all existing slot buffs for all 6 slots
        for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
            const currentBuff = slotBuffs[slotIndex];
            if (currentBuff && (currentBuff.attack > 0 || currentBuff.health > 0)) {
                const originalAttack = currentBuff.attack;
                const originalHealth = currentBuff.health;
                
                console.log(`🔄 Slot ${slotIndex} buff doubled: +${originalAttack}/+${originalHealth} → +${originalAttack * 2}/+${originalHealth * 2}`);
                
                // Add the current buff amount to itself (doubling it)
                this.eventBus.emit('slot:buff', {
                    slotIndex,
                    playerId,
                    buff: {
                        attack: originalAttack,  // Add the original amount again
                        health: originalHealth   // Add the original amount again
                    }
                });
            }
        }
        
        this.eventBus.emit('ability:activated', {
            unit,
            abilityType: 'double-buff',
            description: `${unit.name} doubles all buff effects`
        });
    }

    /**
     * Parse Dragon Flame damage effect (Skyterror)
     * @param {string} text - Ability text
     * @param {Object} context - Context
     * @returns {Object} Dragon Flame damage effect object
     */
    parseDragonFlameDamageEffect(text, context) {
        // Pattern: "deal damage equal to your dragon flame to all enemies" or "deal damage equal to your 🔥 to all enemies"
        if (text.toLowerCase().includes('deal damage equal to your dragon flame to all enemies') ||
            text.includes('Deal damage equal to your 🔥 to all enemies')) {
            return {
                type: 'dragon-flame-damage',
                targetType: 'all_enemies',
                target: 'all_enemies'
            };
        }
        return null;
    }

    /**
     * Execute Dragon Flame damage effect (Skyterror)
     * @param {Object} effect - Effect object
     * @param {Object} context - Context
     */
    executeDragonFlameDamageEffect(effect, context) {
        const { unit, owner, playerId: contextPlayerId } = context;
        const playerId = owner || unit.owner || contextPlayerId;
        const opponentId = playerId === 'player' ? 'ai' : 'player';
        
        // Safety check for gameState and dragon flames
        const state = this.gameState.getState();
        if (!state || !state.dragonFlames) {
            console.error(`Cannot find dragon flames in game state`);
            return;
        }
        
        // Get player's Dragon Flame amount
        const dragonFlame = state.dragonFlames[playerId] || 0;
        
        console.log(`🔥⚔️ ${unit.name} deals ${dragonFlame} damage (equal to Dragon Flame) to all enemies`);
        
        if (dragonFlame === 0) {
            console.log(`No Dragon Flame available, no damage dealt`);
            return;
        }
        
        // Deal damage to all enemy units
        const enemyBattlefield = state.players[opponentId].battlefield;
        enemyBattlefield.forEach((slot, slotIndex) => {
            if (slot && this.combatSystem) {
                console.log(`🎯 Dealing ${dragonFlame} damage to ${slot.name} in slot ${slotIndex}`);
                
                this.combatSystem.applyDamage(
                    {
                        type: 'unit',
                        playerId: opponentId,
                        slotIndex: slotIndex,
                        unit: slot
                    },
                    dragonFlame,
                    { name: unit.name, type: 'ability' }
                );
            }
        });
        
        // Deal damage to enemy player
        if (this.combatSystem) {
            console.log(`🎯 Dealing ${dragonFlame} damage to enemy player`);
            this.combatSystem.applyDamage(
                {
                    type: 'player',
                    playerId: opponentId
                },
                dragonFlame,
                { name: unit.name, type: 'ability' }
            );
        }
        
        this.eventBus.emit('ability:activated', {
            unit,
            abilityType: 'dragon-flame-damage',
            description: `${unit.name} deals ${dragonFlame} damage to all enemies`
        });
    }

    /**
     * Parse Dragon Flame buff effect (Tier 4 Dragon)
     * @param {string} text - Ability text
     * @param {Object} context - Context
     * @returns {Object} Dragon Flame buff effect object
     */
    parseDragonFlameBuffEffect(text, context) {
        // Pattern: "gain +3/+3 for each dragon flame"
        const dragonFlameBuffMatch = text.match(/gain \+(\d+)\/\+(\d+) for each dragon flame/i);
        if (dragonFlameBuffMatch) {
            return {
                type: 'dragon-flame-buff',
                attackPerFlame: parseInt(dragonFlameBuffMatch[1]),
                healthPerFlame: parseInt(dragonFlameBuffMatch[2])
            };
        }
        return null;
    }

    /**
     * Execute Dragon Flame buff effect (Tier 4 Dragon)
     * @param {Object} effect - Effect object
     * @param {Object} context - Context
     */
    executeDragonFlameBuffEffect(effect, context) {
        const { unit, owner, playerId: contextPlayerId } = context;
        const playerId = owner || unit.owner || contextPlayerId;
        
        // Get player's Dragon Flame amount
        const state = this.gameState.getState();
        if (!state || !state.dragonFlames) {
            console.error(`Cannot find dragon flames in game state`);
            return;
        }
        
        const dragonFlame = state.dragonFlames[playerId] || 0;
        const attackBuff = dragonFlame * effect.attackPerFlame;
        const healthBuff = dragonFlame * effect.healthPerFlame;
        
        console.log(`🐉 ${unit.name} gains +${attackBuff}/+${healthBuff} (${effect.attackPerFlame}/${effect.healthPerFlame} per 🔥, you have ${dragonFlame} 🔥)`);
        
        if (attackBuff > 0 || healthBuff > 0) {
            // Apply the buff to the unit using the standard method
            this.applyBuffToUnit(playerId, context.slotIndex, attackBuff, healthBuff);
        }
        
        this.eventBus.emit('ability:activated', {
            unit,
            abilityType: 'dragon-flame-buff',
            description: `${unit.name} gains +${attackBuff}/+${healthBuff} from Dragon Flame`
        });
    }

    /**
     * Handle Royal Guard slot buff enhancement
     * When any slot gets buffed, Royal Guard adds an additional +2/+2 if present
     */
    handleRoyalGuardSlotBuff(data) {
        const { slotIndex, playerId, buff, source } = data;
        
        // Prevent infinite loop - don't trigger on Royal Guard's own enhancement
        if (source === 'royal_guard_enhancement') {
            return;
        }
        
        // Check if Royal Guard is in play for this player
        const state = this.gameState.getState();
        const playerBattlefield = state.players[playerId]?.battlefield || {};
        
        // Find Royal Guard on the battlefield
        const royalGuardSlots = [];
        for (let i = 0; i < 6; i++) {
            const unit = playerBattlefield[i];
            if (unit && (unit.name === 'Royal Guard' || unit.id === 'royal_guard')) {
                royalGuardSlots.push(i);
            }
        }
        
        // If Royal Guard is present, add additional +2/+2 buff
        if (royalGuardSlots.length > 0) {
            console.log(`👑 Royal Guard detected! Adding additional +2/+2 to slot ${slotIndex} buff (original: +${buff.attack}/+${buff.health})`);
            
            // Emit additional slot buff for each Royal Guard
            royalGuardSlots.forEach(() => {
                this.eventBus.emit('slot:buff', {
                    slotIndex: slotIndex,
                    playerId: playerId,
                    buff: {
                        attack: 2,
                        health: 2
                    },
                    source: 'royal_guard_enhancement'
                });
            });
        }
    }
}

// Export for ES6 modules
export default AbilitySystem;