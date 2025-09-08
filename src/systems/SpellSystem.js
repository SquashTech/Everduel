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
                            targets.push({ type: 'unit', playerId, slotIndex: index });
                        }
                    });
                } else if (spell.targetScope === 'enemy') {
                    const enemyId = playerId === 'player' ? 'ai' : 'player';
                    state.players[enemyId].battlefield.forEach((unit, index) => {
                        if (unit) {
                            targets.push({ type: 'unit', playerId: enemyId, slotIndex: index });
                        }
                    });
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

        // Add highlights
        this.validTargets.forEach(target => {
            const element = this.getTargetElement(target);
            if (element) {
                element.classList.add('spell-target-valid');
                element.addEventListener('click', () => this.selectTarget(target), { once: true });
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
        const addCardSpells = ['garrison', 'flicker'];
        if (addCardSpells.includes(spell.id)) {
            this.removeSpellFromHand(spell, playerId);
        }

        switch (spell.id) {
            // Godric's spells
            case 'reinforce':
                this.applySlotBuff(target, 2, 2);
                break;

            case 'inspire':
                this.buffUnitsByTag('Human', 3, 3, playerId);
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
                this.buffFrontRow(target, 0, 3, playerId);
                break;

            case 'thunderbolt':
                this.damageRandomEnemy(12, playerId);
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