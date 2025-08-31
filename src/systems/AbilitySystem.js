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
        console.log('⚡ AbilitySystem initialized');
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

        // Parse summon effects
        if (lowerText.includes('summon') || lowerText.includes('add')) {
            const summonEffect = this.parseSummonEffect(abilityText, context);
            if (summonEffect) {
                result.effects.push(summonEffect);
                this.executeSummonEffect(summonEffect, context);
                result.success = true;
            }
        }

        // Parse draw effects
        if (lowerText.includes('draw from your deck')) {
            const drawEffect = this.parseDrawEffect(abilityText, context);
            if (drawEffect) {
                result.effects.push(drawEffect);
                this.executeDrawEffect(drawEffect, context);
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

        // Parse Dragon Soul effects
        if (lowerText.includes('gain') && lowerText.includes('dragon soul')) {
            const dragonSoulEffect = this.parseDragonSoulEffect(abilityText, context);
            if (dragonSoulEffect) {
                result.effects.push(dragonSoulEffect);
                this.executeDragonSoulEffect(dragonSoulEffect, context);
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

        // Get potential targets based on target type
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
            console.log(`🎯 Targeting enemy back row: found ${backRowUnits.length} units`);
        } else if (effect.targetType === 'enemy_front_row') {
            const enemyBattlefield = state.players[enemyId].battlefield;
            // Front row slots are indices 0, 1, 2
            const frontRowUnits = [0, 1, 2]
                .map(slotIndex => enemyBattlefield[slotIndex])
                .filter(u => u !== null);
            
            targets = frontRowUnits;
            console.log(`🎯 Targeting enemy front row: found ${frontRowUnits.length} units`);
        } else if (effect.targetType === 'enemy_player') {
            targets = [{ type: 'player', playerId: enemyId }];
        } else if (effect.targetType === 'both_players') {
            targets = [
                { type: 'player', playerId: owner },
                { type: 'player', playerId: enemyId }
            ];
        } else if (effect.targetType === 'enemy_column') {
            // Deal damage in column with priority: Front Row -> Back Row -> Player
            const enemyBattlefield = state.players[enemyId].battlefield;
            const castingColumn = unit.slotIndex % 3; // 0, 1, or 2
            const frontSlot = castingColumn;      // 0, 1, or 2
            const backSlot = castingColumn + 3;   // 3, 4, or 5
            
            // Check for units in priority order
            const frontUnit = enemyBattlefield[frontSlot];
            const backUnit = enemyBattlefield[backSlot];
            
            if (frontUnit) {
                targets = [frontUnit];
                console.log(`🎯 Column damage targeting front row unit: ${frontUnit.name}`);
            } else if (backUnit) {
                targets = [backUnit];
                console.log(`🎯 Column damage targeting back row unit: ${backUnit.name}`);
            } else {
                // No units in column, hit player
                targets = [{ type: 'player', playerId: enemyId }];
                console.log(`🎯 Column damage targeting player (column ${castingColumn} empty)`);
            }
        }

        // Apply damage to each target
        targets.forEach((target, index) => {
            if (target.type === 'player') {
                // Damage player
                this.eventBus.emit('combat:damage', {
                    target: { type: 'player', playerId: target.playerId },
                    amount: effect.amount,
                    source: unit
                });
                
                // Enhanced logging for player damage
                const abilitySource = context.triggerUnit ? 'Manacharge' : 'Unleash';
            } else {
                // Damage unit
                const slotIndex = state.players[enemyId].battlefield.findIndex(u => u === target);
                this.eventBus.emit('combat:damage', {
                    target: { type: 'unit', unit: target, slotIndex, playerId: enemyId },
                    amount: effect.amount,
                    source: unit
                });

                // Enhanced logging for unit damage with targeting context
                const abilitySource = context.triggerUnit ? 'Manacharge' : 'Unleash';
                let targetingDescription = '';
                
                if (effect.targetSelection === 'random' && effect.targetType === 'enemy_unit') {
                    targetingDescription = ' (randomly targeted)';
                } else if (effect.targetType === 'enemy_back_row') {
                    targetingDescription = ' (back row)';
                } else if (effect.targetType === 'enemy_front_row') {
                    targetingDescription = ' (front row)';
                } else if (effect.targetType === 'enemy_column') {
                    targetingDescription = ` (column ${slotIndex % 3})`;
                }
                
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
        // Handle "another unit with ability" pattern like "Give another Flying unit +1/+1"
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
        
        // Handle health-only effects like "Give all of your units +2 Health"
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
        
        // Handle multiple tags with permanent attack like "Give Beasts and Elves +2 Attack"
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

        // Handle multiple tags with temporary attack like "Beasts and Elves have +3 Attack this turn"
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

        // Handle front row buff like "Your front slots gain +2/+2" (for Paladin)
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

        // Handle other slots in row buff like "Give the other slots in this row +1/+1"
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

        // Handle adjacent slots buff like "Give adjacent slots +1/+1" (keep for backward compatibility)
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

        // Handle slot with specific tag buff like "Give a slot with a Human or Dwarf +2/+2" or "Give a slot with another Human or Dwarf +2/+2"
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

        // Handle special tag-based effects like "Give your Beasts +0/+1" or "Give your other Humans +1/+2"
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

        // Handle other slot-targeting patterns that weren't caught by specific matchers above
        const slotBuffMatch = text.match(/give (?:the )?(.+?) \+(\d+)\/\+(\d+)/i);
        if (slotBuffMatch) {
            const targetDescription = slotBuffMatch[1].toLowerCase().trim();
            const attack = parseInt(slotBuffMatch[2]);
            const health = parseInt(slotBuffMatch[3]);
            
            // Debug logging for Villager
            if (text.includes('other slot in this column')) {
                console.log(`🏘️ [VILLAGER PARSE DEBUG] Text: "${text}"`);
                console.log(`🏘️ [VILLAGER PARSE DEBUG] Regex match:`, slotBuffMatch);
                console.log(`🏘️ [VILLAGER PARSE DEBUG] Target description: "${targetDescription}"`);
                console.log(`🏘️ [VILLAGER PARSE DEBUG] Attack: ${attack}, Health: ${health}`);
            }
            
            let target = 'self';
            let targetSlot = null;
            
            // Determine target type based on description
            if (targetDescription.includes('other slot in this column') || targetDescription.includes('other slot in column')) {
                target = 'other-slot-in-column';
                if (text.includes('other slot in this column')) {
                    console.log(`🏘️ [VILLAGER PARSE DEBUG] Target set to: ${target}`);
                }
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
            console.log(`🏘️ [VILLAGER BUFF DEBUG] Current slot: ${context.slotIndex}, Target slot: ${targetSlot}`);
            console.log(`🏘️ [VILLAGER BUFF DEBUG] Unit owner: ${context.unit.owner}, Effect: +${effect.attack}/+${effect.health}`);
            
            if (targetSlot !== null) {
                const buffData = {
                    slotIndex: targetSlot,
                    playerId: context.unit.owner,
                    buff: {
                        attack: effect.attack,
                        health: effect.health
                    }
                };
                
                console.log(`🏘️ [VILLAGER BUFF DEBUG] Emitting slot:buff event:`, buffData);
                this.eventBus.emit('slot:buff', buffData);
                
                console.log(`🏘️ Villager at slot ${context.slotIndex} buffed slot ${targetSlot} (+${effect.attack}/+${effect.health})`);
            } else {
                console.error(`🏘️ [VILLAGER BUFF DEBUG] Target slot is null! Cannot buff.`);
            }
        } else if (effect.target === 'random-back-row-slot') {
            // Buff a random back row slot (slots 3, 4, 5)
            const backRowSlots = [3, 4, 5];
            const targetSlot = backRowSlots[Math.floor(Math.random() * backRowSlots.length)];
            
            console.log(`🎯 SCOUT UNLEASH: ${context.unit.name} at slot ${context.slotIndex} is about to buff random back row slot ${targetSlot} with +${effect.attack}/+${effect.health}`);
            
            this.eventBus.emit('slot:buff', {
                slotIndex: targetSlot,
                playerId: context.unit.owner,
                buff: {
                    attack: effect.attack,
                    health: effect.health
                }
            });
            
            console.log(`✅ SCOUT UNLEASH: Emitted slot:buff event for slot ${targetSlot}`);
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
            
            console.log(`🎲 ${context.unit.name} at slot ${context.slotIndex} buffed random slot ${targetSlot} (+${effect.attack}/+${effect.health})`);
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
            
            console.log(`🌟 ${context.unit.name} buffed all ${unitsBuffed} friendly units (+${effect.attack}/+${effect.health})`);
        } else if (effect.target === 'multi-tag-based') {
            // Buff units with multiple specific tags (for Tracker ability)
            const state = this.gameState.getState();
            const targetTags = effect.tags.map(t => t.toLowerCase());
            
            // Buff all units with any of the specified tags on both battlefields
            Object.keys(state.players).forEach(playerId => {
                state.players[playerId].battlefield.forEach((unit, slotIndex) => {
                    if (unit && unit.tags && 
                        unit.tags.some(tag => targetTags.includes(tag.toLowerCase()))) {
                        
                        // Apply attack buff (temporary or permanent)
                        const updates = {};
                        
                        if (effect.temporary) {
                            // Temporary buff - only modify current stats
                            updates.currentAttack = (unit.currentAttack || unit.attack) + effect.attack;
                            console.log(`🏷️ ${unit.name} gained +${effect.attack} Attack this turn`);
                        } else {
                            // Permanent buff - modify base and current stats
                            updates.attack = unit.attack + effect.attack;
                            updates.currentAttack = (unit.currentAttack || unit.attack) + effect.attack;
                            if (effect.health > 0) {
                                updates.health = unit.health + effect.health;
                                updates.currentHealth = (unit.currentHealth || unit.health) + effect.health;
                                updates.maxHealth = (unit.maxHealth || unit.health) + effect.health;
                            }
                            console.log(`🏷️ ${unit.name} permanently gained +${effect.attack} Attack`);
                        }
                        
                        // Use centralized update method
                        const duration = effect.temporary ? ' this turn' : '';
                        const reason = `gained +${effect.attack} Attack${duration}`;
                        this.updateUnitStats(playerId, slotIndex, updates, reason);
                    }
                });
            });
            
            const duration = effect.temporary ? ' this turn' : '';
            console.log(`🌟 ${context.unit.name} gave ${effect.tags.join(' and ')}s +${effect.attack} Attack${duration}`);
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
                console.log(`🏷️ No slots with ${effect.tags.join(' or ')} found to buff (excluding own slot)`);
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
            
            console.log(`🔨 ${context.unit.name} buffed slot ${targetSlot.slotIndex} with ${targetSlot.unit.name} (+${effect.attack}/+${effect.health})`);            
        } else if (effect.target === 'front-slots') {
            // Buff all front row slots (for Paladin)
            const frontSlots = [0, 1, 2]; // Front row slots
            const state = this.gameState.getState();
            const battlefield = state.players[context.unit.owner].battlefield;
            let unitsBuffed = 0;
            
            frontSlots.forEach(slotIndex => {
                const unit = battlefield[slotIndex];
                if (unit) {
                    // Use centralized update method
                    const updates = {
                        attack: unit.attack + effect.attack,
                        health: unit.health + effect.health,
                        currentAttack: (unit.currentAttack || unit.attack) + effect.attack,
                        currentHealth: (unit.currentHealth || unit.health) + effect.health,
                        maxHealth: (unit.maxHealth || unit.health) + effect.health
                    };
                    const reason = `gained +${effect.attack}/+${effect.health} from ${context.unit.name}'s front row buff`;
                    this.updateUnitStats(context.unit.owner, slotIndex, updates, reason);
                    unitsBuffed++;
                }
            });
            
            console.log(`⚔️ ${context.unit.name} buffed ${unitsBuffed} front row units (+${effect.attack}/+${effect.health})`);
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
            
            console.log(`❄️ ${context.unit.name} buffed ${otherSlotsInRow.length} other slots in this row (+${effect.attack}/+${effect.health})`);
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
            
            console.log(`❄️ ${context.unit.name} buffed ${adjacentSlots.length} adjacent slots (+${effect.attack}/+${effect.health})`);
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
                console.log(`🦅 No other ${effect.ability} units found to buff`);
                return;
            }
            
            // Select a random unit with the ability
            const target = unitsWithAbility[Math.floor(Math.random() * unitsWithAbility.length)];
            
            // Apply buff to the unit
            this.applyBuffToUnit(context.unit.owner, target.slotIndex, effect.attack, effect.health);
            
            console.log(`🦅 ${context.unit.name} buffed ${target.unit.name} (+${effect.attack}/+${effect.health})`);
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
                console.log(`🏷️ No ${effect.tag} units found to buff`);
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
                console.log(`🎲 Randomly targeting ${effect.tag} unit at slot ${unitsToBuffer[0].slotIndex}`);
            }
            
            unitsToBuffer.forEach(({ unit, slotIndex }) => {
                this.applyBuffToUnit(context.unit.owner, slotIndex, effect.attack, effect.health);
            });
            
            const targetDesc = isRandomTarget ? `a random ${effect.tag}` : `all ${unitsToBuffer.length} ${effect.tag}`;
            console.log(`🏷️ ${context.unit.name} buffed ${targetDesc} unit(s) (+${effect.attack}/+${effect.health})`);
        } else {
            // Buff the unit itself
            const { unit } = context;
            const playerId = context.playerId || unit.owner;
            const slotIndex = context.slotIndex !== undefined ? context.slotIndex : unit.slotIndex;
            
            console.log(`🔧 Buffing ${unit.name} - Before: ${unit.attack}/${unit.health} (current: ${unit.currentAttack || unit.attack}/${unit.currentHealth || unit.health})`);
            
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
                
                console.log(`⏰ ${unit.name} gained temporary buff (+${effect.attack}/+${effect.health}) this turn`);
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
                
                console.log(`🔧 Buffing ${unit.name} - After: ${newAttack}/${newHealth} (current: ${newCurrentAttack}/${newCurrentHealth})`);
                
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
     * Centralized method for updating unit stats through Redux
     * 
     * This method consolidates all UPDATE_UNIT dispatch patterns to reduce code duplication
     * and ensure consistent stat updates across the entire ability system. All stat changes
     * should go through this method to maintain predictable state flow and proper UI updates.
     * 
     * Architecture Benefits:
     * - Single source of truth for stat updates
     * - Consistent event emission for UI responsiveness  
     * - Standardized logging and debugging
     * - Reduced code duplication (eliminated 8+ duplicate patterns)
     * 
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
            }
            
            // Immediately destroy the unit since it banishes itself
            setTimeout(() => {
                this.eventBus.emit('unit:dies', {
                    unit,
                    cause: 'banished',
                    playerId: unit.owner || context.playerId,
                    slotIndex: context.slotIndex
                });
            }, 500); // Small delay to ensure Unleash effect is processed
            
            return; // Don't process further effects
        }
        
        // Special debug logging for Villager
        if (unit.name === 'Villager') {
            console.log(`🏘️ [VILLAGER DEBUG] Original ability: "${abilityText}"`);
            console.log(`🏘️ [VILLAGER DEBUG] Effect text after prefix removal: "${effectText}"`);
            console.log(`🏘️ [VILLAGER DEBUG] Context:`, context);
            console.log(`🏘️ [VILLAGER DEBUG] Unit owner: ${unit.owner}, Context playerId: ${context.playerId}`);
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
        
        const result = this.parseAndExecuteAbility(effectText, { unit, ...context });
        
        // Special debug logging for Villager result
        if (unit.name === 'Villager') {
            console.log(`🏘️ [VILLAGER DEBUG] Parse result:`, result);
            
            // Manual fix for Villager if parsing failed
            if (!result.success || result.effects.length === 0) {
                console.log(`🏘️ [VILLAGER DEBUG] Parsing failed, applying manual fix`);
                const targetSlot = this.getOtherSlotInColumn(context.slotIndex);
                if (targetSlot !== null) {
                    const buffData = {
                        slotIndex: targetSlot,
                        playerId: unit.owner || context.playerId,
                        buff: { attack: 1, health: 1 }
                    };
                    console.log(`🏘️ [VILLAGER DEBUG] Manual buff application:`, buffData);
                    this.eventBus.emit('slot:buff', buffData);
                }
            }
        }
        
        // Log the specific Unleash effect
        if (result.success && result.effects.length > 0) {
            const effect = result.effects[0];
            let effectDescription = '';
            
            if (effect.type === 'buff') {
                if (effect.target === 'other-slot-in-column') {
                    effectDescription = `buffs the other slot in its column +${effect.attack}/+${effect.health}`;
                } else if (effect.target === 'random-back-row-slot') {
                    effectDescription = `buffs a random back row slot +${effect.attack}/+${effect.health}`;
                } else if (effect.target === 'random-slot') {
                    effectDescription = `buffs a random slot +${effect.attack}/+${effect.health}`;
                }
            } else if (effect.type === 'damage') {
                // Don't log generic damage description - specific targeting info is logged in executeDamageEffect
                effectDescription = '';
            }

            if (effectDescription) {
            }
        }
    }

    /**
     * Handle Last Gasp abilities (triggered when unit dies)
     * @param {Object} data - Last Gasp trigger data
     */
    handleLastGasp(data) {
        const { unit, context } = data;
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
        } else {
            // Single effect
            this.parseAndExecuteAbility(effectText, { unit, ...context });
        }
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
        const effectText = abilityText.replace(/^.*?manacharge:\s*/i, '');
        
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
     * Parse summon effects like "Add a Skeleton to your hand" or "Summon a Skeleton"
     * @param {string} text - Effect text
     * @param {Object} context - Context
     * @returns {Object} Summon effect object
     */
    parseSummonEffect(text, context) {
        const lowerText = text.toLowerCase();
        
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
            
            if (cardName) {
                return {
                    type: 'summon',
                    cardName,
                    amount,
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
        const { playerId } = context;
        const { type, cardName, amount } = effect;
        
        console.log(`🧙‍♂️ Executing summon effect: ${type} ${amount}x ${cardName} for ${playerId}`);
        
        // Get the appropriate card definition
        let cardDefinition;
        if (cardName === 'Skeleton') {
            cardDefinition = this.getSkeletonCard();
        } else if (cardName === 'Mana Surge') {
            cardDefinition = this.getManaSurgeCard();
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
                // Find empty slot to summon to
                const state = this.gameState.getState();
                const battlefield = state.players[playerId].battlefield;
                const emptySlot = battlefield.findIndex(slot => slot === null);
                
                if (emptySlot !== -1) {
                    // Create unit from card using shared factory
                    const unit = UnitFactory.createSummonedUnit(cardDefinition, playerId, emptySlot, {
                        canAttack: false,
                        summonedThisTurn: true
                    });
                    
                    // Validate the created unit
                    if (!UnitFactory.validateUnit(unit)) {
                        console.error('❌ Failed to create valid summoned unit:', skeletonCard);
                        continue;
                    }
                    
                    // Place on battlefield
                    this.gameEngine.dispatch({
                        type: 'PLACE_UNIT',
                        payload: { playerId, unit, slotIndex: emptySlot }
                    });
                    
                    console.log(`⚔️ Summoned ${cardName} to ${playerId}'s slot ${emptySlot}`);
                } else {
                    console.log(`❌ No empty slots to summon ${cardName} for ${playerId}`);
                }
            }
        }
        
        // Enhanced game log
        this.eventBus.emit('ability:activated', {
            ability: 'lastGasp',
            unit,
            player: playerId
        });
        const actionText = type === 'add-to-hand' ? 'adds to hand' : 'summons';
        const amountText = amount > 1 ? `${amount} ${cardName}s` : `a ${cardName}`;
    }

    /**
     * Parse Dragon Soul effect from ability text
     * @param {string} text - Ability text
     * @param {Object} context - Context
     * @returns {Object} Dragon Soul effect object
     */
    parseDragonSoulEffect(text, context) {
        // Pattern: "gain X dragon soul"
        const dragonSoulMatch = text.match(/gain (\d+) dragon souls?/i);
        if (!dragonSoulMatch) return null;

        const amount = parseInt(dragonSoulMatch[1]);
        
        return {
            type: 'dragon-soul',
            amount,
            target: 'self'
        };
    }

    /**
     * Execute a Dragon Soul effect
     * @param {Object} effect - Dragon Soul effect object
     * @param {Object} context - Context
     */
    executeDragonSoulEffect(effect, context) {
        const { unit } = context;
        const playerId = unit.owner;
        
        console.log(`🐉 ${unit.name} gains ${effect.amount} Dragon Soul(s)`);
        
        // Add Dragon Soul to player's resources
        this.gameEngine.dispatch({
            type: 'ADD_DRAGON_SOUL',
            payload: {
                playerId,
                amount: effect.amount
            }
        });
        
        this.eventBus.emit('ability:activated', {
            ability: 'dragonSoul',
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
     * Handle units that survived attacking (for Wolf ability)
     */
    handleSurvivedAttacking(data) {
        const { unit, owner, slotIndex } = data;
        
        // Check for Wolf's ability
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
                
                // Apply buff to the slot
                this.gameEngine.dispatch({
                    type: 'UPDATE_SLOT_BUFF',
                    payload: {
                        playerId,
                        slotIndex: attackerSlot,
                        buff: { attack: 1, health: 1 }
                    }
                });
                
                // If there's still a unit in the slot, apply the buff immediately
                const currentUnit = state.players[playerId].battlefield[attackerSlot];
                if (currentUnit) {
                    const updates = {
                        attack: currentUnit.attack + 1,
                        health: currentUnit.health + 1,
                        currentAttack: (currentUnit.currentAttack || currentUnit.attack) + 1,
                        currentHealth: (currentUnit.currentHealth || currentUnit.health) + 1,
                        maxHealth: (currentUnit.maxHealth || currentUnit.health) + 1
                    };
                    const reason = 'slot gained +1/+1 from Wolf ability';
                    this.updateUnitStats(playerId, attackerSlot, updates, reason);
                }
                
                console.log(`🎯 Slot ${attackerSlot} permanently buffed +1/+1`);
                
                this.eventBus.emit('slot:buff', {
                    playerId: attacker.owner,
                    slotIndex: attackerSlot,
                    buff: { attack: 1, health: 1 },
                    permanent: true
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