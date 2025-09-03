/**
 * Modular ability system for handling card keywords and effects
 * Provides a centralized, extensible system for all card abilities
 */
import ErrorHandler from '../core/ErrorHandler.js';
import UnitFactory from '../utils/UnitFactory.js';

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

        if (targetText.includes('all')) {
            targetSelection = 'all';
        } else if (targetText.includes('random')) {
            targetSelection = 'random';
        } else if (targetText.includes('target')) {
            targetSelection = 'targeted';
        }

        if (targetText.includes('enemy')) {
            if (targetText.includes('back row')) {
                targetType = 'enemy_back_row';
            } else if (targetText.includes('front row')) {
                targetType = 'enemy_front_row';  
            } else if (targetText.includes('unit')) {
                targetType = 'enemy_unit';
            } else {
                targetType = 'enemy_player';
            }
        } else if (targetText.includes('friendly') || targetText.includes('allied')) {
            targetType = 'friendly_unit';
        }

        return {
            type: 'damage',
            amount: damage,
            targetType,
            targetSelection
        };
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
        const permBuffMatch = text.match(/gain \+?(\d+)\/\+?(\d+)(?!\s+this turn)/i);
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
                            // Permanent buff - modify base and current stats
                            updates.attack = unit.attack + effect.attack;
                            updates.currentAttack = (unit.currentAttack || unit.attack) + effect.attack;
                            if (effect.health > 0) {
                                updates.health = unit.health + effect.health;
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
                // Permanent buffs modify base stats
                const oldCurrentAttack = unit.currentAttack || unit.attack;
                const oldCurrentHealth = unit.currentHealth || unit.health;
                
                const newAttack = unit.attack + effect.attack;
                const newHealth = unit.health + effect.health;
                const newCurrentAttack = oldCurrentAttack + effect.attack;
                const newCurrentHealth = oldCurrentHealth + effect.health;
                const newMaxHealth = (unit.maxHealth || unit.health) + effect.health;
                
                // Use centralized update method for permanent buffs
                const updates = { 
                    attack: newAttack,
                    health: newHealth,
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
            attack: unit.attack + attackBuff,
            health: unit.health + healthBuff,
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
            attack: unit.attack + attackBuff,
            health: unit.health + healthBuff,
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
                    attack: unit.attack + 3,
                    currentAttack: (unit.currentAttack || unit.attack) + 3,
                    health: unit.health + 3,
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
        } else {
            console.log(`📚 ${unit.name} draws ${effect.amount} card from deck`);
        }
        
        // Emit card draw event - ability-triggered draws are FREE
        this.eventBus.emit('card:draw', {
            playerId: targetPlayerId,
            source: 'ability',
            free: true,  // Important: ability-triggered draws don't cost gold
            fromOpponent: effect.target === 'opponent'
        });

        // Enhanced game log
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
        const newHealth = Math.min(currentHealth + effect.amount, 20); // Max health is 20
        
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
        } else {
            console.error(`❌ Unknown card to summon: ${cardName}`);
            return;
        }
        
        for (let i = 0; i < amount; i++) {
            if (type === 'add-to-hand') {
                // Add to hand
                this.gameEngine.dispatch({
                    type: 'ADD_CARD_TO_HAND',
                    payload: {
                        playerId,
                        card: { ...cardDefinition, handId: Date.now() + i }
                    }
                });
                
                console.log(`🃏 Added ${cardName} to ${playerId}'s hand`);
            } else if (type === 'summon') {
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
                    
                    // Worker: "At the start of your turn, give this slot +1/+1"
                    if (unit.name === 'Worker' || lowerAbility.includes('give this slot +1/+1')) {
                        console.log(`💪 [WORKER DEBUG] Triggering slot buff for ${unit.name} at slot ${slotIndex}`);
                        this.eventBus.emit('slot:buff', {
                            slotIndex: slotIndex,
                            playerId: player,
                            buff: {
                                attack: 1,
                                health: 1
                            }
                        });
                        console.log(`💪 ${unit.name} buffed its slot +1/+1`);
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
                    
                    // Giant Toad: "At the start of your turn, give your Beasts +2/+2"
                    if (lowerAbility.includes('give your beasts +2/+2')) {
                        battlefield.forEach((targetUnit, targetSlot) => {
                            if (targetUnit && targetUnit.tags && targetUnit.tags.includes('Beast')) {
                                this.applyUnitBuff(targetUnit, 2, 2, player, targetSlot);
                            }
                        });
                        console.log(`🐸 ${unit.name} buffed all Beasts +2/+2`);
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
                    attack: unit.attack + 4,
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
                    attack: unit.attack + 1,
                    health: unit.health + 1,
                    currentHealth: (unit.currentHealth || unit.health) + 1
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
}

// Export for ES6 modules
export default AbilitySystem;