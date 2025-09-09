import { SPELL_TOKENS, CARD_DATABASE } from '../data/EmbeddedGameData.js';

/**
 * Spell System
 * Handles spell card mechanics, targeting, and effects
 */
export default class SpellSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.targetingMode = false;
        this.currentSpell = null;
        this.validTargets = [];
        this.cancelListener = null;
    }

    /**
     * Check if a card is a spell
     */
    isSpell(card) {
        return card && card.type === 'spell';
    }

    /**
     * Play a spell card
     */
    playSpell(spell, playerId = 'player') {
        if (!this.isSpell(spell)) {
            console.error('Not a spell card:', spell);
            return false;
        }

        console.log(`🎯 Playing spell: ${spell.name}`);

        // Check if spell needs targeting
        if (this.needsTargeting(spell)) {
            this.startTargeting(spell, playerId);
            return true; // Spell will be played after target selection
        }

        // Execute spell immediately if no targeting needed
        this.executeSpell(spell, null, playerId);
        return true;
    }

    /**
     * Check if spell needs targeting
     */
    needsTargeting(spell) {
        // Special case: global/self spells that require battlefield targeting
        if (spell.requiresBattlefieldTargeting) {
            return true;
        }
        
        return spell.targetType !== 'self' && 
               spell.targetType !== 'global' && 
               spell.targetType !== 'random';
    }

    /**
     * Start targeting mode for a spell
     */
    startTargeting(spell, playerId) {
        this.targetingMode = true;
        this.currentSpell = spell;
        this.validTargets = this.getValidTargets(spell, playerId);

        console.log(`🎯 Starting targeting for ${spell.name} (${spell.targetType}/${spell.targetScope})`, this.validTargets);
        
        if (this.validTargets.length === 0) {
            console.warn(`⚠️ No valid targets found for ${spell.name}`);
            this.showNotification(`No valid targets for ${spell.name}`, 'error');
            this.clearTargeting();
            return;
        }

        // Highlight valid targets
        this.highlightTargets();

        // Add document-level click listener for cancellation
        this.setupCancellationListener();

        // Show targeting instructions
        if (spell.requiresBattlefieldTargeting) {
            this.showNotification(`Click your battlefield to cast ${spell.name} (click elsewhere to cancel)`, 'info');
        } else {
            this.showNotification(`Select target for ${spell.name} (click elsewhere to cancel)`, 'info');
        }
    }

    /**
     * Get valid targets for a spell
     */
    getValidTargets(spell, playerId) {
        const state = this.gameEngine.gameState.getState();
        const targets = [];

        // Special case: spells that require battlefield targeting
        if (spell.requiresBattlefieldTargeting) {
            // Add entire player battlefield as a single target
            targets.push({ type: 'battlefield', playerId });
            return targets;
        }

        switch (spell.targetType) {
            case 'slot':
                if (spell.targetScope === 'friendly') {
                    // Friendly slots
                    state.players[playerId].battlefield.forEach((unit, index) => {
                        targets.push({ type: 'slot', playerId, slotIndex: index });
                    });
                } else if (spell.targetScope === 'enemy') {
                    // Enemy slots
                    const enemyId = playerId === 'player' ? 'ai' : 'player';
                    state.players[enemyId].battlefield.forEach((unit, index) => {
                        if (unit) { // Only occupied slots
                            targets.push({ type: 'slot', playerId: enemyId, slotIndex: index });
                        }
                    });
                }
                break;

            case 'unit':
                if (spell.targetScope === 'friendly') {
                    state.players[playerId].battlefield.forEach((unit, index) => {
                        if (unit) {
                            targets.push({ type: 'unit', playerId, slotIndex: index, unit });
                        }
                    });
                } else if (spell.targetScope === 'enemy') {
                    const enemyId = playerId === 'player' ? 'ai' : 'player';
                    state.players[enemyId].battlefield.forEach((unit, index) => {
                        if (unit) {
                            targets.push({ type: 'unit', playerId: enemyId, slotIndex: index, unit });
                        }
                    });
                } else if (spell.targetScope === 'enemyFront') {
                    // Only enemy front row units (slots 0, 1, 2)
                    const enemyId = playerId === 'player' ? 'ai' : 'player';
                    for (let index = 0; index < 3; index++) {
                        const unit = state.players[enemyId].battlefield[index];
                        if (unit) {
                            targets.push({ type: 'unit', playerId: enemyId, slotIndex: index, unit });
                        }
                    }
                }
                break;

            case 'column':
                // Three columns (0, 1, 2)
                for (let col = 0; col < 3; col++) {
                    targets.push({ type: 'column', column: col, scope: spell.targetScope });
                }
                break;

            case 'row':
                // Two rows (front and back)
                if (spell.targetScope === 'friendlyFront') {
                    targets.push({ type: 'row', row: 'front', playerId });
                } else if (spell.targetScope === 'friendlyBack') {
                    targets.push({ type: 'row', row: 'back', playerId });
                } else if (spell.targetScope === 'enemy') {
                    // Enemy rows - add both front and back for player to choose
                    const enemyId = playerId === 'player' ? 'ai' : 'player';
                    targets.push({ type: 'row', row: 'front', playerId: enemyId });
                    targets.push({ type: 'row', row: 'back', playerId: enemyId });
                }
                break;
        }

        return targets;
    }

    /**
     * Highlight valid targets
     */
    highlightTargets() {
        // Clear previous highlights
        document.querySelectorAll('.spell-target-valid').forEach(el => {
            el.classList.remove('spell-target-valid');
        });

        console.log(`🎨 Highlighting ${this.validTargets.length} targets for ${this.currentSpell.name}`);

        // Add highlights
        this.validTargets.forEach(target => {
            const element = this.getTargetElement(target);
            if (element) {
                console.log(`  ✓ Highlighting target at slot ${target.slotIndex}:`, target.unit ? target.unit.name : 'empty');
                element.classList.add('spell-target-valid');
                element.addEventListener('click', () => this.selectTarget(target), { once: true });
            } else {
                console.warn(`  ✗ Could not find element for target slot ${target.slotIndex}`);
            }
        });
    }

    /**
     * Get DOM element for a target
     */
    getTargetElement(target) {
        if (target.type === 'slot' || target.type === 'unit') {
            return document.querySelector(`.slot[data-player="${target.playerId}"][data-slot="${target.slotIndex}"]`);
        } else if (target.type === 'battlefield') {
            // Return the entire battlefield container for the player
            const battlefieldId = target.playerId === 'player' ? 'playerBattlefield' : 'aiBattlefield';
            return document.getElementById(battlefieldId);
        } else if (target.type === 'column') {
            // For column targeting, we need to create a visual column overlay
            return this.getOrCreateColumnElement(target);
        } else if (target.type === 'row') {
            // For row targeting, we need to create a visual row overlay
            return this.getOrCreateRowElement(target);
        }
        // Add more target types as needed
        return null;
    }

    /**
     * Get or create column overlay element for targeting
     */
    getOrCreateColumnElement(target) {
        const columnId = `column-overlay-${target.scope}-${target.column}`;
        let columnElement = document.getElementById(columnId);
        
        if (!columnElement) {
            // Create column overlay
            columnElement = document.createElement('div');
            columnElement.id = columnId;
            columnElement.className = 'column-overlay';
            columnElement.setAttribute('data-column', target.column);
            columnElement.setAttribute('data-scope', target.scope);
            
            // Set initial positioning to prevent CSS transition from causing visual shifts
            columnElement.style.position = 'absolute';
            columnElement.style.left = '0px';
            columnElement.style.top = '0px';
            columnElement.style.width = '0px';
            columnElement.style.height = '0px';
            columnElement.style.opacity = '0';
            
            // Determine which battlefield to attach to
            const battlefieldId = target.scope === 'enemy' ? 'aiBattlefield' : 'playerBattlefield';
            const battlefield = document.getElementById(battlefieldId);
            
            if (battlefield) {
                battlefield.appendChild(columnElement);
                // Position the overlay immediately after adding to DOM (no setTimeout delay)
                this.positionColumnOverlay(columnElement, target.column, battlefield);
            }
        }
        
        return columnElement;
    }

    /**
     * Position column overlay to cover both front and back row slots in a column
     */
    positionColumnOverlay(overlay, column, battlefield) {
        // Get the front and back row slots for this column
        const frontSlot = battlefield.querySelector(`.slot[data-slot="${column}"]`);
        const backSlot = battlefield.querySelector(`.slot[data-slot="${column + 3}"]`);
        
        if (frontSlot && backSlot) {
            // Get the slot container elements (which include the slot and buff indicator)
            const frontContainer = frontSlot.parentElement;
            const backContainer = backSlot.parentElement;
            
            if (frontContainer && backContainer) {
                // Use offsetTop/offsetLeft for positioning relative to the battlefield
                const frontTop = frontContainer.offsetTop;
                const frontLeft = frontContainer.offsetLeft;
                const backTop = backContainer.offsetTop;
                const backLeft = backContainer.offsetLeft;
                
                // Calculate dimensions to cover both slot containers
                const left = Math.min(frontLeft, backLeft);
                const top = Math.min(frontTop, backTop);
                const right = Math.max(frontLeft + frontContainer.offsetWidth, backLeft + backContainer.offsetWidth);
                const bottom = Math.max(frontTop + frontContainer.offsetHeight, backTop + backContainer.offsetHeight);
                
                const width = right - left;
                const height = bottom - top;
                
                // Add some padding to make the overlay more visible
                const padding = 4;
                
                overlay.style.position = 'absolute';
                overlay.style.left = `${left - padding}px`;
                overlay.style.top = `${top - padding}px`;
                overlay.style.width = `${width + (padding * 2)}px`;
                overlay.style.height = `${height + (padding * 2)}px`;
                overlay.style.pointerEvents = 'all';
                overlay.style.zIndex = '1000';
                overlay.style.borderRadius = '8px';
                overlay.style.opacity = '1'; // Make visible after positioning
                
                console.log(`📍 Positioned column ${column} overlay:`, {
                    left: left - padding,
                    top: top - padding,
                    width: width + (padding * 2),
                    height: height + (padding * 2)
                });
            }
        }
    }

    /**
     * Get or create row overlay element for targeting
     */
    getOrCreateRowElement(target) {
        const rowId = `row-overlay-${target.playerId}-${target.row}`;
        let rowElement = document.getElementById(rowId);
        
        if (!rowElement) {
            // Create row overlay
            rowElement = document.createElement('div');
            rowElement.id = rowId;
            rowElement.className = 'row-overlay';
            rowElement.setAttribute('data-row', target.row);
            rowElement.setAttribute('data-player', target.playerId);
            
            // Set initial positioning to prevent CSS transition from causing visual shifts
            rowElement.style.position = 'absolute';
            rowElement.style.left = '0px';
            rowElement.style.top = '0px';
            rowElement.style.width = '0px';
            rowElement.style.height = '0px';
            rowElement.style.opacity = '0';
            
            // Determine which battlefield to attach to
            const battlefieldId = target.playerId === 'player' ? 'playerBattlefield' : 'aiBattlefield';
            const battlefield = document.getElementById(battlefieldId);
            
            if (battlefield) {
                battlefield.appendChild(rowElement);
                // Position the overlay immediately after adding to DOM (no setTimeout delay)
                this.positionRowOverlay(rowElement, target.row, target.playerId, battlefield);
            }
        }
        
        return rowElement;
    }

    /**
     * Position row overlay to cover all slots in a row
     */
    positionRowOverlay(overlay, row, playerId, battlefield) {
        // Get all slots in the specified row
        let slotIndexes;
        if (row === 'front') {
            slotIndexes = [0, 1, 2]; // Front row slots
        } else if (row === 'back') {
            slotIndexes = [3, 4, 5]; // Back row slots
        } else {
            return;
        }
        
        // Find all slot containers for this row
        const slotContainers = slotIndexes.map(index => {
            const slot = battlefield.querySelector(`.slot[data-player="${playerId}"][data-slot="${index}"]`);
            return slot ? slot.parentElement : null;
        }).filter(container => container !== null);
        
        if (slotContainers.length > 0) {
            // Calculate bounding box for all slot containers in the row
            const positions = slotContainers.map(container => ({
                top: container.offsetTop,
                left: container.offsetLeft,
                right: container.offsetLeft + container.offsetWidth,
                bottom: container.offsetTop + container.offsetHeight
            }));
            
            const left = Math.min(...positions.map(p => p.left));
            const top = Math.min(...positions.map(p => p.top));
            const right = Math.max(...positions.map(p => p.right));
            const bottom = Math.max(...positions.map(p => p.bottom));
            
            const width = right - left;
            const height = bottom - top;
            
            // Add padding for better visibility
            const padding = 4;
            
            overlay.style.position = 'absolute';
            overlay.style.left = `${left - padding}px`;
            overlay.style.top = `${top - padding}px`;
            overlay.style.width = `${width + (padding * 2)}px`;
            overlay.style.height = `${height + (padding * 2)}px`;
            overlay.style.pointerEvents = 'all';
            overlay.style.zIndex = '1000';
            overlay.style.borderRadius = '8px';
            overlay.style.opacity = '1'; // Make visible after positioning
            
            console.log(`📍 Positioned ${row} row overlay for ${playerId}:`, {
                left: left - padding,
                top: top - padding,
                width: width + (padding * 2),
                height: height + (padding * 2)
            });
        }
    }

    /**
     * Select a target and execute spell
     */
    selectTarget(target) {
        if (!this.currentSpell || !this.targetingMode) return;

        // Store spell reference before clearing
        const spell = this.currentSpell;
        
        // Clear targeting mode
        this.clearTargeting();

        // Execute spell with selected target
        this.executeSpell(spell, target, 'player');
    }

    /**
     * Clear targeting mode
     */
    clearTargeting() {
        this.targetingMode = false;
        this.currentSpell = null;
        this.validTargets = [];

        // Remove highlights
        document.querySelectorAll('.spell-target-valid').forEach(el => {
            el.classList.remove('spell-target-valid');
        });

        // Remove column overlays
        document.querySelectorAll('.column-overlay').forEach(overlay => {
            overlay.remove();
        });

        // Remove row overlays
        document.querySelectorAll('.row-overlay').forEach(overlay => {
            overlay.remove();
        });

        // Remove cancellation listener
        if (this.cancelListener) {
            document.removeEventListener('click', this.cancelListener);
            this.cancelListener = null;
        }
    }

    /**
     * Setup document-level click listener for spell cancellation
     */
    setupCancellationListener() {
        // Remove any existing listener first
        if (this.cancelListener) {
            document.removeEventListener('click', this.cancelListener);
        }

        // Create new listener
        this.cancelListener = (e) => {
            // Don't cancel if we're not in targeting mode
            if (!this.targetingMode) return;

            // Check if click was on a valid target (let them proceed normally)
            if (e.target.classList.contains('spell-target-valid')) return;

            // Check if click was on a spell card in hand (don't cancel, let it change spells)
            if (e.target.closest('.hand-card.spell-card')) return;

            // Check if click was inside the battlefield for battlefield-targeting spells
            const playerBattlefield = document.getElementById('playerBattlefield');
            if (this.currentSpell?.requiresBattlefieldTargeting && playerBattlefield) {
                if (playerBattlefield.contains(e.target)) {
                    // This is a valid battlefield click, don't cancel
                    return;
                }
            }

            // Cancel targeting if clicked outside
            this.cancelTargeting();
        };

        // Add the listener with a small delay to avoid immediate cancellation
        setTimeout(() => {
            if (this.targetingMode) { // Only add if still in targeting mode
                document.addEventListener('click', this.cancelListener);
            }
        }, 100);
    }

    /**
     * Cancel spell targeting (called when clicking outside valid targets)
     */
    cancelTargeting() {
        this.showNotification('Spell targeting cancelled', 'info');
        this.clearTargeting();
    }

    /**
     * Execute spell effect
     */
    executeSpell(spell, target, playerId) {
        if (!spell) {
            console.error('❌ SpellSystem: No spell provided to executeSpell');
            return;
        }
        
        const state = this.gameEngine.gameState.getState();
        
        console.log(`✨ Executing ${spell.name} for ${playerId}`, target);

        // For battlefield targeting spells, ignore the target parameter and treat as global/self
        let effectiveTarget = target;
        if (spell.requiresBattlefieldTargeting) {
            effectiveTarget = null; // Treat as global/self-targeting spell
        }

        // Emit spell cast event for logging
        this.gameEngine.eventBus.emit('spell:cast', {
            spell: spell,
            target: effectiveTarget,
            playerId: playerId
        });

        // Remove spell from hand BEFORE executing for spells that add cards to hand
        // This ensures proper hand size calculation
        const addCardSpells = ['garrison', 'flicker', 'call_of_the_wild', 'quick_escape', 'harvest', 'blood_summon'];
        if (addCardSpells.includes(spell.id)) {
            this.removeSpellFromHand(spell, playerId);
        }

        switch (spell.id) {
            // Godric's spells
            case 'reinforce':
                this.applySlotBuff(target, 2, 2);
                break;

            case 'inspire':
                this.buffUnitsByTag('Human', 1, 1, playerId);
                break;

            case 'garrison':
                this.addCardsToHand(['squire', 'soldier', 'fighter'], playerId);
                break;

            case 'light_of_justice':
                this.applySlotBuff(target, 5, 10);
                break;

            // Kolus's spells
            case 'flicker':
                this.addManaSurgeUnitToHand(playerId);
                break;

            case 'flame_pillar':
                this.damageColumn(target, 4, playerId);
                break;

            case 'frost_wall':
                this.buffFrontRow(target, 0, 4, playerId);
                break;

            case 'thunderbolt':
                this.damageRandomEnemy(12, playerId);
                break;

            // Stoneclaw Prince's spells
            case 'claw_swipe':
                this.damageUnit(target, 2);
                break;

            case 'on_the_prowl':
                this.summonRandomTier1Beast(playerId);
                break;

            case 'mighty_pounce':
                this.buffBeastUnits(3, 0, playerId);
                break;

            case 'call_of_the_wild':
                this.addRandomBeasts(playerId);
                break;

            // Gale Sharpswift's spells
            case 'line_of_sight':
                this.applySlotBuff(target, 2, 0);
                break;

            case 'quick_escape':
                this.returnUnitToHand(target, playerId);
                break;

            case 'archery_tower':
                this.buffBackRow(target, 3, 0, playerId);
                break;

            case 'rain_of_arrows':
                this.damageAllEnemyColumns(5, playerId);
                break;

            // Lord Vladimus's spells
            case 'drain':
                this.drainUnit(target, playerId);
                break;

            case 'harvest':
                this.harvestSouls(target, playerId);
                break;

            case 'blood_summon':
                this.summonVampireBats(playerId);
                break;

            case 'plague':
                this.plagueRow(target, playerId);
                break;

            // Special spells
            case 'mana_surge':
                this.giveGold(2, playerId);
                break;

            default:
                console.warn(`Unknown spell effect: ${spell.id}`);
        }

        // Remove spell from hand (if not already removed)
        if (!addCardSpells.includes(spell.id)) {
            this.removeSpellFromHand(spell, playerId);
        }

        // UI will update automatically from state changes
        this.showNotification(`${spell.name} cast!`, 'success');
    }

    /**
     * Apply buff to a slot
     */
    applySlotBuff(target, attackBuff, healthBuff) {
        if (!target) {
            console.error('❌ SpellSystem: No target provided to applySlotBuff');
            return;
        }

        console.log(`🎯 Applying slot buff +${attackBuff}/+${healthBuff} to slot ${target.slotIndex} for ${target.playerId}`, target);

        this.gameEngine.dispatch({
            type: 'BUFF_SLOT',
            payload: {
                playerId: target.playerId,
                slotIndex: target.slotIndex,
                attackBuff,
                healthBuff
            }
        });

        console.log('✅ BUFF_SLOT action dispatched');
        
        // Get updated state and emit UI event
        const state = this.gameEngine.gameState.getState();
        const updatedSlotBuff = state.players[target.playerId].slotBuffs[target.slotIndex];
        
        this.gameEngine.eventBus.emit('slot:buff-updated', {
            player: target.playerId,
            slot: target.slotIndex,
            attack: updatedSlotBuff.attack,
            health: updatedSlotBuff.health,
            type: 'slot-buff'
        });
        
        console.log('🎯 slot:buff-updated event emitted', updatedSlotBuff);
        
        // Apply buffs to current unit in slot if any
        const currentUnit = state.players[target.playerId].battlefield[target.slotIndex];
        
        if (currentUnit && (updatedSlotBuff.attack > 0 || updatedSlotBuff.health > 0)) {
            console.log(`📊 Updating unit stats for ${currentUnit.name} in buffed slot`);
            
            // Calculate stats from base stats + total slot buff, but preserve existing unit buffs
            const baseAttack = currentUnit.attack;  // Original card attack
            const baseHealth = currentUnit.health;  // Original card health
            const currentAttackBeforeSlot = currentUnit.currentAttack || baseAttack;
            const currentMaxHealthBeforeSlot = currentUnit.maxHealth || baseHealth;
            
            // Calculate the damage the unit has taken (if any)
            const currentDamage = currentUnit.maxHealth ? 
                (currentUnit.maxHealth - currentUnit.currentHealth) : 0;
            
            // Apply the TOTAL slot buff to the ALREADY BUFFED current stats
            // This preserves any unit buffs (like Inspire) that were applied earlier
            
            // For attack: keep any existing unit buffs and add slot buff
            const unitAttackBuff = currentAttackBeforeSlot - baseAttack; // How much the unit was already buffed
            const newCurrentAttack = baseAttack + unitAttackBuff + updatedSlotBuff.attack;
            
            // For health: keep any existing unit buffs and add slot buff
            const unitHealthBuff = currentMaxHealthBeforeSlot - baseHealth; // How much the unit's health was already buffed
            const newMaxHealth = baseHealth + unitHealthBuff + updatedSlotBuff.health;
            const finalCurrentHealth = newMaxHealth - currentDamage; // Preserve damage
            
            const buffedUnit = {
                ...currentUnit,
                currentAttack: newCurrentAttack,
                currentHealth: finalCurrentHealth,
                maxHealth: newMaxHealth
            };
            
            console.log(`  Base(${baseAttack}/${baseHealth}) + UnitBuffs(${unitAttackBuff}/${unitHealthBuff}) + Slot(${updatedSlotBuff.attack}/${updatedSlotBuff.health}) = ${buffedUnit.currentAttack}/${buffedUnit.currentHealth}/${buffedUnit.maxHealth}${currentDamage > 0 ? ` (preserved ${currentDamage} damage)` : ''}`);
            
            this.gameEngine.dispatch({
                type: 'UPDATE_UNIT',
                payload: {
                    playerId: target.playerId,
                    slotIndex: target.slotIndex,
                    updates: {
                        currentAttack: buffedUnit.currentAttack,
                        currentHealth: buffedUnit.currentHealth,
                        maxHealth: buffedUnit.maxHealth
                    }
                }
            });
            
            console.log('✅ Unit stats updated');
        }
    }

    /**
     * Buff all units with a specific tag
     */
    buffUnitsByTag(tag, attackBuff, healthBuff, playerId) {
        const state = this.gameEngine.gameState.getState();
        const player = state.players[playerId];
        let buffedUnits = 0;

        console.log(`🔍 Buffing units with tag "${tag}" - Attack: +${attackBuff}, Health: +${healthBuff}`);
        
        player.battlefield.forEach((unit, index) => {
            if (unit) {
                console.log(`Unit at slot ${index}:`, unit.name, 'Tags:', unit.tags);
                if (unit.tags && unit.tags.includes(tag)) {
                    console.log(`✅ Buffing ${unit.name} at slot ${index} with +${attackBuff}/+${healthBuff}`);
                    this.gameEngine.dispatch({
                        type: 'BUFF_UNIT',
                        payload: {
                            playerId,
                            slotIndex: index,
                            attackBuff,
                            healthBuff
                        }
                    });
                    buffedUnits++;
                }
            }
        });
        
        console.log(`📊 Total units buffed: ${buffedUnits}`);
        // UI will update automatically from BUFF_UNIT dispatches
    }

    /**
     * Add cards to hand
     */
    addCardsToHand(cardIds, playerId) {
        // Find all cards in the database first
        const cards = [];
        cardIds.forEach(cardId => {
            let card = null;
            for (const tier of Object.values(CARD_DATABASE)) {
                const found = tier.find(c => c.id === cardId);
                if (found) {
                    card = { ...found };
                    break;
                }
            }
            if (card) {
                cards.push(card);
            }
        });

        // Add all cards in order with hand limit checking
        if (cards.length > 0) {
            this.gameEngine.dispatch({
                type: 'ADD_CARDS_TO_HAND_IN_ORDER',
                payload: {
                    playerId,
                    cards
                }
            });
        }
    }

    /**
     * Add spell to hand
     */
    addSpellToHand(spellId, playerId) {
        const spell = SPELL_TOKENS[spellId];
        if (spell) {
            this.gameEngine.dispatch({
                type: 'ADD_CARD_TO_HAND',
                payload: {
                    playerId,
                    card: { ...spell }
                }
            });
        }
    }

    /**
     * Add Mana Surge unit token to hand
     */
    addManaSurgeUnitToHand(playerId) {
        const manaSurgeCard = {
            id: 'mana_surge',
            name: 'Mana Surge',
            attack: 1,
            health: 1,
            ability: 'Unleash: Banish this',
            tags: [],
            color: 'blue',
            isToken: true
            // handId will be added automatically by GameState reducer
        };

        this.gameEngine.dispatch({
            type: 'ADD_CARD_TO_HAND',
            payload: {
                playerId,
                card: manaSurgeCard
            }
        });
    }

    /**
     * Damage all units in a column
     */
    damageColumn(target, damage, casterId) {
        if (!target) return;

        const state = this.gameEngine.gameState.getState();
        const column = target.column;

        // Determine which players to affect based on scope and caster
        ['ai', 'player'].forEach(playerId => {
            if (target.scope === 'enemy' && playerId === casterId) return; // Skip caster for enemy targeting
            if (target.scope === 'friendly' && playerId !== casterId) return; // Skip non-caster for friendly targeting

            // Front row slot in column
            const frontSlot = column;
            // Back row slot in column
            const backSlot = column + 3;

            [frontSlot, backSlot].forEach(slotIndex => {
                const unit = state.players[playerId].battlefield[slotIndex];
                if (unit) {
                    this.gameEngine.dispatch({
                        type: 'DAMAGE_UNIT',
                        payload: {
                            playerId,
                            slotIndex,
                            damage
                        }
                    });
                }
            });
        });
    }

    /**
     * Buff all units in front row
     */
    buffFrontRow(target, attackBuff, healthBuff, playerId) {
        console.log(`🧊 Frost Wall buffing front row slots for ${playerId}: +${attackBuff}/+${healthBuff}`);
        
        for (let i = 0; i < 3; i++) {
            // Dispatch the slot buff
            this.gameEngine.dispatch({
                type: 'BUFF_SLOT',
                payload: {
                    playerId,
                    slotIndex: i,
                    attackBuff,
                    healthBuff
                }
            });
            
            // Get updated state and emit UI event for each slot
            const state = this.gameEngine.gameState.getState();
            const updatedSlotBuff = state.players[playerId].slotBuffs[i];
            
            this.gameEngine.eventBus.emit('slot:buff-updated', {
                player: playerId,
                slot: i,
                attack: updatedSlotBuff.attack,
                health: updatedSlotBuff.health,
                type: 'slot-buff'
            });
            
            console.log(`🎯 Updated slot ${i} buff UI: +${updatedSlotBuff.attack}/+${updatedSlotBuff.health}`);
            
            // Apply buffs to current unit in slot if any
            const currentUnit = state.players[playerId].battlefield[i];
            
            if (currentUnit && (updatedSlotBuff.attack > 0 || updatedSlotBuff.health > 0)) {
                console.log(`📊 Updating unit stats for ${currentUnit.name} in buffed slot ${i}`);
                
                // Calculate stats from base stats + total slot buff, but preserve existing unit buffs
                const baseAttack = currentUnit.attack;  // Original card attack
                const baseHealth = currentUnit.health;  // Original card health
                const currentAttackBeforeSlot = currentUnit.currentAttack || baseAttack;
                const currentMaxHealthBeforeSlot = currentUnit.maxHealth || baseHealth;
                
                // Calculate the damage the unit has taken (if any)
                const currentDamage = currentUnit.maxHealth ? 
                    (currentUnit.maxHealth - currentUnit.currentHealth) : 0;
                
                // Apply the TOTAL slot buff to the ALREADY BUFFED current stats
                // This preserves any unit buffs (like Inspire) that were applied earlier
                
                // For attack: keep any existing unit buffs and add slot buff
                const unitAttackBuff = currentAttackBeforeSlot - baseAttack; // How much the unit was already buffed
                const newCurrentAttack = baseAttack + unitAttackBuff + updatedSlotBuff.attack;
                
                // For health: keep any existing unit buffs and add slot buff
                const unitHealthBuff = currentMaxHealthBeforeSlot - baseHealth; // How much the unit's health was already buffed
                const newMaxHealth = baseHealth + unitHealthBuff + updatedSlotBuff.health;
                const finalCurrentHealth = newMaxHealth - currentDamage; // Preserve damage
                
                const buffedUnit = {
                    ...currentUnit,
                    currentAttack: newCurrentAttack,
                    currentHealth: finalCurrentHealth,
                    maxHealth: newMaxHealth
                };
                
                console.log(`  Base(${baseAttack}/${baseHealth}) + UnitBuffs(${unitAttackBuff}/${unitHealthBuff}) + Slot(${updatedSlotBuff.attack}/${updatedSlotBuff.health}) = ${buffedUnit.currentAttack}/${buffedUnit.currentHealth}/${buffedUnit.maxHealth}${currentDamage > 0 ? ` (preserved ${currentDamage} damage)` : ''}`);
                
                this.gameEngine.dispatch({
                    type: 'UPDATE_UNIT',
                    payload: {
                        playerId,
                        slotIndex: i,
                        updates: {
                            currentAttack: buffedUnit.currentAttack,
                            currentHealth: buffedUnit.currentHealth,
                            maxHealth: buffedUnit.maxHealth
                        }
                    }
                });
                
                console.log('✅ Unit stats updated');
            }
        }
    }

    /**
     * Damage a random enemy
     */
    damageRandomEnemy(damage, playerId) {
        const state = this.gameEngine.gameState.getState();
        const enemyId = playerId === 'player' ? 'ai' : 'player';
        const enemyUnits = [];

        state.players[enemyId].battlefield.forEach((unit, index) => {
            if (unit) {
                enemyUnits.push({ unit, index });
            }
        });

        if (enemyUnits.length > 0) {
            const random = enemyUnits[Math.floor(Math.random() * enemyUnits.length)];
            this.gameEngine.dispatch({
                type: 'DAMAGE_UNIT',
                payload: {
                    playerId: enemyId,
                    slotIndex: random.index,
                    damage
                }
            });
        }
    }

    /**
     * Give gold to player
     */
    giveGold(amount, playerId) {
        const state = this.gameEngine.gameState.getState();
        const player = state.players[playerId];
        
        this.gameEngine.dispatch({
            type: 'SET_PLAYER_GOLD',
            payload: {
                playerId,
                gold: player.gold + amount,
                maxGold: player.maxGold
            }
        });
    }

    /**
     * Remove spell from hand after casting
     */
    removeSpellFromHand(spell, playerId) {
        const state = this.gameEngine.gameState.getState();
        const hand = state.players[playerId].hand;
        // Use handId for unique identification of the specific spell card instance
        const index = hand.findIndex(card => card.handId === spell.handId);
        
        if (index !== -1) {
            this.gameEngine.dispatch({
                type: 'REMOVE_CARD_FROM_HAND',
                payload: {
                    playerId,
                    cardIndex: index
                }
            });
        }
    }

    /**
     * Damage a specific unit (for Claw Swipe)
     */
    damageUnit(target, damage) {
        if (!target) {
            console.warn('No target provided for Claw Swipe');
            return;
        }

        // Get the unit from the battlefield if not provided
        const state = this.gameEngine.gameState.getState();
        const unit = target.unit || state.players[target.playerId].battlefield[target.slotIndex];
        
        if (!unit) {
            console.warn('No valid unit at target location for Claw Swipe');
            return;
        }

        const { playerId, slotIndex } = target;
        const newHealth = Math.max(0, unit.currentHealth - damage);

        console.log(`🦁 Claw Swipe dealing ${damage} damage to ${unit.name}`);

        if (newHealth <= 0) {
            // Unit dies
            this.gameEngine.dispatch({
                type: 'REMOVE_UNIT',
                payload: { playerId, slotIndex }
            });
            console.log(`💀 ${unit.name} destroyed by Claw Swipe`);
        } else {
            // Update unit health
            this.gameEngine.dispatch({
                type: 'UPDATE_UNIT',
                payload: {
                    playerId,
                    slotIndex,
                    updates: { currentHealth: newHealth }
                }
            });
        }
    }

    /**
     * Summon a random tier 1 Beast to a random slot (for On the Prowl)
     */
    summonRandomTier1Beast(playerId) {
        const cardDatabase = this.gameEngine.getCardDatabase();
        const tier1Beasts = [];

        // Find all Tier 1 Beast units
        if (cardDatabase[1]) {
            cardDatabase[1].forEach(card => {
                if (card.tags && card.tags.includes('Beast')) {
                    tier1Beasts.push({ ...card, tier: 1 });
                }
            });
        }

        if (tier1Beasts.length === 0) {
            console.log('🦁 No Tier 1 Beasts available to summon');
            return;
        }

        // Pick a random Tier 1 Beast
        const randomBeast = tier1Beasts[Math.floor(Math.random() * tier1Beasts.length)];
        
        // Find empty slots
        const state = this.gameEngine.gameState.getState();
        const battlefield = state.players[playerId].battlefield;
        const emptySlots = [];
        for (let i = 0; i < 6; i++) {
            if (!battlefield[i]) {
                emptySlots.push(i);
            }
        }

        if (emptySlots.length === 0) {
            console.log('🦁 No empty slots available for summoning');
            this.showNotification('No empty slots for On the Prowl', 'warning');
            return;
        }

        // Pick a random empty slot
        const randomSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
        
        console.log(`🦁 On the Prowl: Summoning ${randomBeast.name} to slot ${randomSlot}`);

        // Create unit and place on battlefield
        const unit = {
            ...randomBeast,
            unitId: Date.now(),
            currentHealth: randomBeast.health,
            currentAttack: randomBeast.attack,
            canAttack: false,
            buffs: [],
            owner: playerId
        };

        this.gameEngine.dispatch({
            type: 'PLACE_UNIT',
            payload: {
                playerId,
                unit: unit,
                slotIndex: randomSlot
            }
        });

        // Trigger summon abilities
        this.gameEngine.eventBus.emit('unit:summoned', {
            unit: unit,
            owner: playerId,
            slotIndex: randomSlot
        });
    }

    /**
     * Buff all Beast units (for Mighty Pounce)
     */
    buffBeastUnits(attackBuff, healthBuff, playerId) {
        const state = this.gameEngine.gameState.getState();
        const player = state.players[playerId];
        let buffedUnits = 0;

        console.log(`🦁 Mighty Pounce: Buffing Beast units +${attackBuff}/+${healthBuff}`);

        player.battlefield.forEach((unit, index) => {
            if (unit && unit.tags && unit.tags.includes('Beast')) {
                const newAttack = unit.currentAttack + attackBuff;
                const newHealth = unit.currentHealth + healthBuff;
                const newMaxHealth = (unit.maxHealth || unit.health) + healthBuff;

                this.gameEngine.dispatch({
                    type: 'UPDATE_UNIT',
                    payload: {
                        playerId,
                        slotIndex: index,
                        updates: {
                            currentAttack: newAttack,
                            currentHealth: newHealth,
                            maxHealth: newMaxHealth
                        }
                    }
                });

                buffedUnits++;
                console.log(`  Buffed ${unit.name} to ${newAttack}/${newHealth}`);
            }
        });

        console.log(`🦁 Buffed ${buffedUnits} Beast units`);
    }

    /**
     * Add random Tier 3 Beasts to hand (for Call of the Wild)
     */
    addRandomBeasts(playerId) {
        const cardDatabase = this.gameEngine.getCardDatabase();
        const tier3Beasts = [];

        // Find all Tier 3 Beast units
        if (cardDatabase[3]) {
            cardDatabase[3].forEach(card => {
                if (card.tags && card.tags.includes('Beast')) {
                    tier3Beasts.push({ ...card, tier: 3 });
                }
            });
        }

        if (tier3Beasts.length === 0) {
            console.log('🦁 No Tier 3 Beasts available');
            return;
        }

        console.log('🦁 Call of the Wild: Adding 2 random Tier 3 Beasts');

        // Add 2 random beasts (can be duplicates)
        for (let i = 0; i < 2; i++) {
            const randomBeast = tier3Beasts[Math.floor(Math.random() * tier3Beasts.length)];
            
            this.gameEngine.dispatch({
                type: 'ADD_CARD_TO_HAND',
                payload: {
                    playerId,
                    card: { ...randomBeast }
                }
            });

            console.log(`  Added ${randomBeast.name} to hand`);
        }
    }

    /**
     * Return a unit to hand (for Quick Escape)
     */
    returnUnitToHand(target, playerId) {
        if (!target || !target.unit) {
            console.warn('No valid unit to return to hand');
            return;
        }

        const state = this.gameEngine.gameState.getState();
        const unit = target.unit;
        const { slotIndex } = target;
        const playerHand = state.players[playerId].hand;

        console.log(`🏹 Quick Escape: Attempting to return ${unit.name} to hand`);

        // Check if hand is full (max 3 cards)
        if (playerHand.length >= 3) {
            console.log(`✋ ${unit.name} cannot return to hand - hand is full`);
            this.showNotification(`Hand is full! Cannot return ${unit.name}`, 'warning');
            return;
        }

        // Create card for hand (convert unit back to card format using original stats)
        const cardForHand = {
            id: unit.id,
            name: unit.name,
            attack: unit.originalAttack || unit.attack, // Use original card stats
            health: unit.originalHealth || unit.health, // Use original card stats
            ability: unit.ability,
            tags: unit.tags,
            color: unit.color,
            tier: unit.tier,
            handId: Date.now() // Unique identifier for this card instance
        };

        // Remove unit from battlefield
        this.gameEngine.dispatch({
            type: 'REMOVE_UNIT',
            payload: { 
                playerId, 
                slotIndex 
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

        console.log(`✅ ${unit.name} returned to hand with original stats ${cardForHand.attack}/${cardForHand.health}`);
    }

    /**
     * Buff all units in back row (for Archery Tower)
     */
    buffBackRow(target, attackBuff, healthBuff, playerId) {
        console.log(`🏹 Archery Tower buffing back row slots for ${playerId}: +${attackBuff}/+${healthBuff}`);
        
        for (let i = 3; i < 6; i++) { // Back row slots are 3, 4, 5
            // Dispatch the slot buff
            this.gameEngine.dispatch({
                type: 'BUFF_SLOT',
                payload: {
                    playerId,
                    slotIndex: i,
                    attackBuff,
                    healthBuff
                }
            });
            
            // Get updated state and emit UI event for each slot
            const state = this.gameEngine.gameState.getState();
            const updatedSlotBuff = state.players[playerId].slotBuffs[i];
            
            this.gameEngine.eventBus.emit('slot:buff-updated', {
                player: playerId,
                slot: i,
                attack: updatedSlotBuff.attack,
                health: updatedSlotBuff.health,
                type: 'slot-buff'
            });
            
            console.log(`🎯 Updated slot ${i} buff UI: +${updatedSlotBuff.attack}/+${updatedSlotBuff.health}`);
            
            // Apply buffs to current unit in slot if any
            const currentUnit = state.players[playerId].battlefield[i];
            
            if (currentUnit && (updatedSlotBuff.attack > 0 || updatedSlotBuff.health > 0)) {
                console.log(`📊 Updating unit stats for ${currentUnit.name} in buffed slot ${i}`);
                
                // Calculate stats from base stats + total slot buff, but preserve existing unit buffs
                const baseAttack = currentUnit.attack;  // Original card attack
                const baseHealth = currentUnit.health;  // Original card health
                const currentAttackBeforeSlot = currentUnit.currentAttack || baseAttack;
                const currentMaxHealthBeforeSlot = currentUnit.maxHealth || baseHealth;
                
                // Calculate the damage the unit has taken (if any)
                const currentDamage = currentUnit.maxHealth ? 
                    (currentUnit.maxHealth - currentUnit.currentHealth) : 0;
                
                // Apply the TOTAL slot buff to the ALREADY BUFFED current stats
                // This preserves any unit buffs (like Inspire) that were applied earlier
                
                // For attack: keep any existing unit buffs and add slot buff
                const unitAttackBuff = currentAttackBeforeSlot - baseAttack; // How much the unit was already buffed
                const newCurrentAttack = baseAttack + unitAttackBuff + updatedSlotBuff.attack;
                
                // For health: keep any existing unit buffs and add slot buff
                const unitHealthBuff = currentMaxHealthBeforeSlot - baseHealth; // How much the unit's health was already buffed
                const newMaxHealth = baseHealth + unitHealthBuff + updatedSlotBuff.health;
                const finalCurrentHealth = newMaxHealth - currentDamage; // Preserve damage
                
                const buffedUnit = {
                    ...currentUnit,
                    currentAttack: newCurrentAttack,
                    currentHealth: finalCurrentHealth,
                    maxHealth: newMaxHealth
                };
                
                console.log(`  Base(${baseAttack}/${baseHealth}) + UnitBuffs(${unitAttackBuff}/${unitHealthBuff}) + Slot(${updatedSlotBuff.attack}/${updatedSlotBuff.health}) = ${buffedUnit.currentAttack}/${buffedUnit.currentHealth}/${buffedUnit.maxHealth}${currentDamage > 0 ? ` (preserved ${currentDamage} damage)` : ''}`);
                
                this.gameEngine.dispatch({
                    type: 'UPDATE_UNIT',
                    payload: {
                        playerId,
                        slotIndex: i,
                        updates: {
                            currentAttack: buffedUnit.currentAttack,
                            currentHealth: buffedUnit.currentHealth,
                            maxHealth: buffedUnit.maxHealth
                        }
                    }
                });
                
                console.log('✅ Unit stats updated');
            }
        }
    }

    /**
     * Rain of Arrows: Deal damage in each enemy column with unit-attack priority (Front → Back → Player)
     */
    damageAllEnemyColumns(damage, playerId) {
        console.log(`🏹 Rain of Arrows: Dealing ${damage} damage in each enemy column (Front → Back → Player priority)`);
        
        const state = this.gameEngine.gameState.getState();
        const enemyId = playerId === 'player' ? 'ai' : 'player';
        const enemyBattlefield = state.players[enemyId].battlefield;
        
        // Process each of the 3 columns
        for (let column = 0; column < 3; column++) {
            const frontSlot = column;        // 0, 1, 2
            const backSlot = column + 3;     // 3, 4, 5
            
            console.log(`🏹 Column ${column}: Checking front slot ${frontSlot}, back slot ${backSlot}`);
            
            // Check for units in priority order: Front → Back → Player
            const frontUnit = enemyBattlefield[frontSlot];
            const backUnit = enemyBattlefield[backSlot];
            
            if (frontUnit) {
                console.log(`🏹 Column ${column}: Targeting front unit ${frontUnit.name} at slot ${frontSlot}`);
                this.gameEngine.eventBus.emit('combat:damage', {
                    target: { 
                        type: 'unit', 
                        unit: frontUnit, 
                        slotIndex: frontSlot, 
                        playerId: enemyId 
                    },
                    amount: damage,
                    source: { name: 'Rain of Arrows' },
                    type: 'ability'
                });
            } else if (backUnit) {
                console.log(`🏹 Column ${column}: Targeting back unit ${backUnit.name} at slot ${backSlot}`);
                this.gameEngine.eventBus.emit('combat:damage', {
                    target: { 
                        type: 'unit', 
                        unit: backUnit, 
                        slotIndex: backSlot, 
                        playerId: enemyId 
                    },
                    amount: damage,
                    source: { name: 'Rain of Arrows' },
                    type: 'ability'
                });
            } else {
                console.log(`🏹 Column ${column}: No units, targeting player ${enemyId}`);
                this.gameEngine.eventBus.emit('combat:damage', {
                    target: { type: 'player', playerId: enemyId },
                    amount: damage,
                    source: { name: 'Rain of Arrows' },
                    type: 'ability'
                });
            }
        }
        
        console.log('🏹 Rain of Arrows completed');
    }

    /**
     * Drain: Deal damage to unit and heal player (for Lord Vladimus)
     */
    drainUnit(target, playerId) {
        if (!target || !target.unit) {
            console.warn('No valid unit target for Drain');
            return;
        }

        console.log(`🩸 Drain: Dealing 3 damage to ${target.unit.name} and healing player`);

        // Deal 3 damage to target unit
        this.damageUnit(target, 3);

        // Heal player for 3
        const state = this.gameEngine.gameState.getState();
        const currentHealth = state.players[playerId].health;
        const maxHealth = 30;
        const newHealth = Math.min(currentHealth + 3, maxHealth);

        this.gameEngine.dispatch({
            type: 'SET_PLAYER_HEALTH',
            payload: { 
                playerId, 
                health: newHealth 
            }
        });

        console.log(`💚 Drain healed ${playerId} for 3 (${currentHealth} -> ${newHealth})`);

        this.gameEngine.eventBus.emit('player:healed', {
            playerId,
            amount: 3,
            source: { name: 'Drain' },
            type: 'drain'
        });
    }

    /**
     * Harvest: Consume souls and draw cards (like Phantom ability)
     */
    harvestSouls(target, playerId) {
        const state = this.gameEngine.gameState.getState();
        const currentSouls = state.souls[playerId] || 0;
        const soulsToConsume = Math.min(3, currentSouls);

        console.log(`👻 Harvest: Player has ${currentSouls} souls, consuming ${soulsToConsume} souls to draw ${soulsToConsume} cards`);

        if (soulsToConsume === 0) {
            console.log('No souls to consume');
            this.showNotification('No souls to consume!', 'warning');
            return;
        }

        // Consume souls
        this.gameEngine.dispatch({
            type: 'SET_PLAYER_SOULS',
            payload: { 
                playerId, 
                souls: currentSouls - soulsToConsume
            }
        });

        // Draw cards equal to souls consumed
        for (let i = 0; i < soulsToConsume; i++) {
            this.gameEngine.eventBus.emit('card:draw', {
                playerId,
                source: 'harvest',
                free: true
            });
        }

        console.log(`✅ Harvest consumed ${soulsToConsume} souls and drew ${soulsToConsume} cards`);
    }

    /**
     * Blood Summon: Add 2 Vampire Bats to hand
     */
    summonVampireBats(playerId) {
        console.log(`🦇 Blood Summon: Adding 2 Vampire Bats to hand`);

        // Create 2 Vampire Bat cards
        for (let i = 0; i < 2; i++) {
            const vampireBat = {
                id: 'vampire_bat',
                name: 'Vampire Bat',
                attack: 6,
                health: 1,
                ability: 'Flying. Lifesteal',
                tags: ['Undead'],
                color: 'purple',
                tier: 2,
                handId: Date.now() + i // Unique ID for each instance
            };

            this.gameEngine.dispatch({
                type: 'ADD_CARD_TO_HAND',
                payload: {
                    playerId,
                    card: vampireBat
                }
            });

            console.log(`  Added Vampire Bat ${i + 1} to hand`);
        }

        console.log('✅ Blood Summon completed - 2 Vampire Bats added');
    }

    /**
     * Plague: Destroy all units in chosen enemy row
     */
    plagueRow(target, playerId) {
        if (!target || !target.row) {
            console.warn('No valid row target for Plague');
            return;
        }

        const enemyId = playerId === 'player' ? 'ai' : 'player';
        const isBackRow = target.row === 'back';
        
        console.log(`☠️ Plague: Destroying all units in enemy ${target.row} row`);

        // Determine which slots to target (front row: 0,1,2 | back row: 3,4,5)
        const slotsToDestroy = isBackRow ? [3, 4, 5] : [0, 1, 2];
        let unitsDestroyed = 0;

        const state = this.gameEngine.gameState.getState();
        const enemyBattlefield = state.players[enemyId].battlefield;

        // Destroy all units in the target row
        for (const slotIndex of slotsToDestroy) {
            const unit = enemyBattlefield[slotIndex];
            if (unit) {
                console.log(`  Destroying ${unit.name} at slot ${slotIndex}`);
                
                // Remove unit from battlefield
                this.gameEngine.dispatch({
                    type: 'REMOVE_UNIT',
                    payload: { 
                        playerId: enemyId, 
                        slotIndex 
                    }
                });

                // Trigger death events
                this.gameEngine.eventBus.emit('unit:dies', {
                    unit: unit,
                    owner: enemyId,
                    slotIndex: slotIndex
                });

                unitsDestroyed++;
            }
        }

        console.log(`☠️ Plague destroyed ${unitsDestroyed} units from ${target.row} row`);
        
        if (unitsDestroyed === 0) {
            this.showNotification(`No units in ${target.row} row to destroy`, 'warning');
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;

        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}