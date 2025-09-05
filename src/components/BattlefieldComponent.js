/**
 * Battlefield component for managing unit display and interactions
 * Handles the 3x2 grid battlefield visualization
 */
import StatCalculator from '../utils/StatCalculator.js';
import UnitFactory from '../utils/UnitFactory.js';

class BattlefieldComponent {
    constructor() {
        this.gameEngine = null;
        this.eventBus = null;
        this.gameState = null;
        this.uiManager = null;
        this.draggedCard = null;
        this.selectedAttacker = null;
        this.validTargets = [];
        this.lastClickTime = 0;
        this.lastClickSlot = null;
        this.clickDebounceMs = 250; // 250ms debounce to prevent double-clicks
        this.isProcessingPlacement = false; // Prevent attack processing during placement
        this.justDropped = false; // Prevent click events after drag/drop
        this.placingCardAt = null; // Track which slot is currently having a card placed
        this.globalClickBlocked = false; // Global click blocking during critical operations
        this.statCalculator = new StatCalculator();
    }

    /**
     * Initialize the battlefield component
     */
    initialize() {
        this.statCalculator.initialize(this.gameState);
        this.setupEventHandlers();
        this.setupDragAndDrop();
        this.setupClickHandlers();
        this.initializeSlotBuffs();
        console.log('⚔️ BattlefieldComponent initialized');
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.eventBus.on('unit:dies', (data) => this.handleUnitDeath(data));
        this.eventBus.on('combat:attack-completed', (data) => {
            this.updateAfterAttack(data);
            // Update attackable units after an attack (wait for battlefield update to complete)
            setTimeout(() => this.updateAttackableUnits(), 600);
        });
        this.eventBus.on('slot:buff-updated', (data) => this.updateSlotBuff(data));
        this.eventBus.on('unit:stats-updated', (data) => this.handleUnitStatsUpdate(data));
        this.eventBus.on('turn:started', (data) => {
            this.updateAttackableUnits(data);
            this.recalculateAllStats();
        });

        // Handle game reset - clear visual slot buffs when game starts
        this.eventBus.on('game:started', () => {
            this.initializeSlotBuffs();
        });

        // Handle returning to scenarios - clear visual slot buffs immediately
        this.eventBus.on('game:reset-to-scenarios', () => {
            this.initializeSlotBuffs();
        });
        this.eventBus.on('card:played', (data) => {
            // Only update attackable units when a card is actually played to the battlefield
            // Don't update during drafting or other non-battlefield card actions
            if (data.slotIndex !== undefined && data.playerId === 'player') {
                
                // Mark ALL newly placed units to prevent immediate attacks
                if (data.unit) {
                    data.unit.justPlaced = true;
                    console.log(`🛡️ Marked ${data.unit.name} as just placed - preventing immediate attacks`);
                    
                    // Clear the placement flag after extended delay
                    setTimeout(() => {
                        delete data.unit.justPlaced;
                        console.log(`✅ ${data.unit.name} can now attack if able`);
                        this.updateAttackableUnits();
                    }, 1000); // Extended to 1 second for ALL units
                }
                
                this.updateAttackableUnits(data);
                // Recalculate stats when units enter/leave battlefield (auras may change)
                this.recalculateAllStats();
            }
        });
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        // Clear any existing listeners first
        this.clearExistingListeners();
        
        // Setup drop zones for battlefield slots (using new selector format)
        const players = ['player', 'ai'];
        players.forEach(player => {
            for (let i = 0; i < 6; i++) {
                const slot = document.querySelector(`[data-player="${player}"][data-slot="${i}"]`);
                
                if (slot) {
                    // Store the click handler function to prevent duplicates
                    const clickHandler = (e) => {
                        console.log(`🖱️ Raw slot click on ${player} slot ${i}, target:`, e.target);
                        
                        // IMMEDIATE CHECK: Block all clicks during placement
                        const slotKey = `${player}-${i}`;
                        if (this.isProcessingPlacement || this.placingCardAt === slotKey || this.globalClickBlocked) {
                            console.log(`🚫 BLOCKED click during placement on ${slotKey} (global: ${this.globalClickBlocked}, processing: ${this.isProcessingPlacement})`);
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            return false;
                        }
                        
                        // Prevent event bubbling to avoid duplicate handling
                        e.stopPropagation();
                        this.handleSlotClick(i, player);
                    };
                    
                    // Store reference to handler for cleanup
                    slot._battlefieldClickHandler = clickHandler;
                    
                    slot.addEventListener('dragover', (e) => this.handleDragOver(e));
                    slot.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                    slot.addEventListener('drop', (e) => this.handleDrop(e, i, player));
                    slot.addEventListener('click', clickHandler, true); // Use capture phase
                }
            }
        });
        
        console.log('Drag and drop setup complete');
    }

    /**
     * Clear existing event listeners to prevent duplicates
     */
    clearExistingListeners() {
        const players = ['player', 'ai'];
        players.forEach(player => {
            for (let i = 0; i < 6; i++) {
                const slot = document.querySelector(`[data-player="${player}"][data-slot="${i}"]`);
                if (slot && slot._battlefieldClickHandler) {
                    slot.removeEventListener('click', slot._battlefieldClickHandler, true);
                    slot._battlefieldClickHandler = null;
                }
            }
        });
    }

    /**
     * Setup click handlers for unit selection and attacks
     * Note: Individual slot handlers are already setup in setupDragDrop()
     * This method is kept for any additional global click handling if needed
     */
    setupClickHandlers() {
        console.log('✅ Click handlers setup - using slot-specific handlers to prevent duplicate events');
    }

    /**
     * Initialize all slot buff indicators (hidden by default)
     */
    initializeSlotBuffs() {
        const players = ['player', 'ai'];
        players.forEach(player => {
            for (let slot = 0; slot < 6; slot++) {
                const buffElement = document.getElementById(`${player}-slot-${slot}-buff`);
                if (buffElement) {
                    buffElement.classList.remove('active');
                    buffElement.textContent = '';
                    buffElement.setAttribute('data-buff', 'none');
                }
            }
        });
        console.log('Slot buff indicators initialized');
    }

    /**
     * Update a slot buff indicator
     * @param {Object} data - {player, slot, attack, health, type}
     */
    updateSlotBuff(data) {
        const { player, slot, attack, health, type } = data;
        const buffElement = document.getElementById(`${player}-slot-${slot}-buff`);
        
        if (!buffElement) {
            console.warn(`Slot buff element not found: ${player}-slot-${slot}-buff`);
            return;
        }

        // Clear existing classes
        buffElement.classList.remove('attack-buff', 'health-buff', 'mixed-buff');
        
        // Check if there are any buffs
        const hasAttackBuff = attack && attack !== 0;
        const hasHealthBuff = health && health !== 0;
        
        if (!hasAttackBuff && !hasHealthBuff) {
            // No buffs - hide the indicator
            buffElement.classList.remove('active');
            buffElement.textContent = '';
            buffElement.setAttribute('data-buff', 'none');
            return;
        }

        // Show and configure the buff indicator
        buffElement.classList.add('active');
        
        let buffText = '';
        let buffClass = '';
        
        if (hasAttackBuff && hasHealthBuff) {
            // Mixed buff
            buffText = `${attack > 0 ? '+' : ''}${attack}/${health > 0 ? '+' : ''}${health}`;
            buffClass = 'mixed-buff';
        } else if (hasAttackBuff) {
            // Attack only - show as +X/+0
            buffText = `${attack > 0 ? '+' : ''}${attack}/+0`;
            buffClass = 'attack-buff';
        } else if (hasHealthBuff) {
            // Health only - show as +0/+X
            buffText = `+0/${health > 0 ? '+' : ''}${health}`;
            buffClass = 'health-buff';
        }
        
        buffElement.classList.add(buffClass);
        buffElement.textContent = buffText;
        buffElement.setAttribute('data-buff', type || 'custom');
        
        console.log(`Updated slot buff: ${player} slot ${slot} -> ${buffText}`);
    }

    /**
     * Clear all slot buffs for a player
     * @param {string} player - 'player' or 'ai'
     */
    clearSlotBuffs(player) {
        for (let slot = 0; slot < 6; slot++) {
            this.updateSlotBuff({ player, slot, attack: 0, health: 0 });
        }
    }

    /**
     * Apply a slot buff (example function for testing)
     * @param {string} player - 'player' or 'ai'
     * @param {number} slot - slot number (0-5)
     * @param {number} attack - attack buff
     * @param {number} health - health buff
     * @param {string} type - buff type
     */
    applySlotBuff(player, slot, attack = 0, health = 0, type = 'custom') {
        this.updateSlotBuff({ player, slot, attack, health, type });
    }


    /**
     * Handle unit stats update event
     * @param {Object} data - {playerId, slotIndex, unit}
     */
    handleUnitStatsUpdate(data) {
        const { playerId, slotIndex, unit } = data;
        console.log(`📊 Updating unit stats for ${unit.name} at slot ${slotIndex}`);
        
        // Get the current state to ensure we have the latest data
        const state = this.gameState.getState();
        const currentUnit = state.players[playerId].battlefield[slotIndex];
        
        if (currentUnit) {
            // Update the specific slot with the updated unit
            const slotElement = document.querySelector(`[data-player="${playerId}"][data-slot="${slotIndex}"]`);
            if (slotElement && slotElement.classList.contains('occupied')) {
                // Preserve cursor style before updating HTML
                const oldCursor = slotElement.style.cursor;
                
                // Update the unit display with the new stats
                slotElement.innerHTML = this.createUnitHTML(currentUnit, playerId);
                
                // Restore cursor style if it was set to pointer (indicates attackable)
                if (oldCursor === 'pointer') {
                    slotElement.style.cursor = 'pointer';
                }
                
                console.log(`✅ Updated ${unit.name} display: ${currentUnit.currentAttack || currentUnit.attack}/${currentUnit.currentHealth || currentUnit.health}`);
            }
        }
    }

    /**
     * Update the battlefield display
     * @param {Object} state - Current game state
     */
    update(state) {
        this.updatePlayerBattlefield('player', state);
        this.updatePlayerBattlefield('ai', state);
        this.updateDraftButtons(state);
    }

    /**
     * Update a specific player's battlefield
     * @param {string} playerId - Player ID
     * @param {Object} state - Game state
     */
    updatePlayerBattlefield(playerId, state) {
        const battlefield = state.players[playerId].battlefield;
        
        battlefield.forEach((unit, slotIndex) => {
            const slotElement = document.querySelector(`[data-player="${playerId}"][data-slot="${slotIndex}"]`);
            if (slotElement) {
                if (unit) {
                    // Preserve cursor style before updating HTML
                    const oldCursor = slotElement.style.cursor;
                    
                    slotElement.innerHTML = this.createUnitHTML(unit, playerId);
                    slotElement.classList.add('occupied');
                    slotElement.classList.remove('empty');
                    
                    // Restore cursor style if it was set to pointer (indicates attackable)
                    if (oldCursor === 'pointer') {
                        slotElement.style.cursor = 'pointer';
                    }
                } else {
                    slotElement.innerHTML = '';
                    slotElement.classList.add('empty');
                    slotElement.classList.remove('occupied');
                    slotElement.style.cursor = 'default';
                }
            }
        });
    }

    /**
     * Create HTML for a unit
     * @param {Object} unit - Unit data
     * @param {string} owner - Unit owner
     * @param {boolean} preserveAttackGlow - Whether to preserve existing attack glow state
     * @returns {string} HTML string
     */
    createUnitHTML(unit, owner, preserveAttackGlow = true) {
        // Use dynamic stat calculation
        const currentAttack = this.statCalculator.calculateEffectiveAttack(unit);
        const currentHealth = this.statCalculator.calculateEffectiveHealth(unit);
        const isDamaged = currentHealth < unit.health;
        
        // Check if unit currently has attack glow (to preserve it)
        let hasExistingGlow = false;
        if (preserveAttackGlow) {
            const existingCard = document.querySelector(`[data-unit-id="${unit.id}"] .game-card`);
            hasExistingGlow = existingCard && existingCard.classList.contains('can-attack');
        }
        
        // Determine if unit should have attack glow
        const shouldHaveGlow = hasExistingGlow || this.canUnitAttack(unit, owner);
        const canAttackClass = shouldHaveGlow ? ' can-attack' : '';
        
        const tierDisplay = UnitFactory.getCardTierDisplay(unit);
        const tierIndicatorHTML = tierDisplay ? `<div class="tier-indicator">${tierDisplay}</div>` : '';
        
        return `
            <div class="game-card game-card--battlefield unit ${unit.color}${canAttackClass}" data-unit-id="${unit.id}" data-slot="${unit.slotIndex}">
                ${tierIndicatorHTML}
                <div class="card-header">
                    <div class="card-name">${unit.name}</div>
                </div>
                <div class="card-ability">
                    ${unit.ability || ''}
                </div>
                <div class="card-stats">
                    <div class="stat-attack ${shouldHaveGlow ? 'can-attack' : ''}">
                        <span class="stat-icon">⚔️</span>
                        <span class="stat-value">${currentAttack}</span>
                    </div>
                    <div class="stat-health ${isDamaged ? 'damaged' : ''}">
                        <span class="stat-icon">❤️</span>
                        <span class="stat-value">${currentHealth}</span>
                    </div>
                </div>
                <div class="card-tags">
                    ${unit.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                ${shouldHaveGlow ? '<div class="attack-indicator">⚔️</div>' : ''}
            </div>
        `;
    }

    /**
     * Check if a unit can attack
     * @param {Object} unit - Unit to check
     * @param {string} owner - Unit owner
     * @returns {boolean} True if unit can attack
     */
    canUnitAttack(unit, owner) {
        const state = this.gameState.getState();
        
        // Check if it's the unit's owner's turn
        if (state.currentPlayer !== owner) {
            return false;
        }
        
        // Check if unit has already attacked (slot-based tracking)
        if (state.players[owner].hasAttacked.includes(unit.slotIndex)) {
            return false;
        }
        
        // Prevent immediate attack for newly placed units (prevents placement + attack on same click)
        if (unit.justPlaced) {
            return false;
        }
        
        // Check if unit can attack (rush or has been on field)
        const basicCanAttack = unit.canAttack || this.hasAbility(unit, 'Rush');
        
        // Special check for Goblin Machine
        if (basicCanAttack && unit.name === 'Goblin Machine') {
            const combatSystem = this.gameEngine.getSystem('CombatSystem');
            if (combatSystem) {
                const validation = combatSystem.validateAttack(unit, null);
                return validation.valid;
            }
        }
        
        return basicCanAttack;
    }

    /**
     * Comprehensive validation for unit attacks with detailed logging
     * @param {Object} unit - Unit to check
     * @param {string} owner - Unit owner
     * @returns {boolean} True if unit can attack
     */
    canUnitAttackValidated(unit, owner) {
        const state = this.gameState.getState();
        
        // Check if it's the unit's owner's turn
        if (state.currentPlayer !== owner) {
            return false;
        }
        
        // Check if unit has already attacked (slot-based tracking)
        if (state.players[owner].hasAttacked.includes(unit.slotIndex)) {
            return false;
        }
        
        // Prevent immediate attack for newly placed units (prevents placement + attack on same click)
        if (unit.justPlaced) {
            return false;
        }
        
        // Check if unit has summoning sickness
        if (!unit.canAttack && !this.hasAbility(unit, 'Rush')) {
            return false;
        }
        
        // Special check for Goblin Machine
        if (unit.name === 'Goblin Machine') {
            const combatSystem = this.gameEngine.getSystem('CombatSystem');
            if (combatSystem) {
                const validation = combatSystem.validateAttack(unit, null);
                return validation.valid;
            }
        }
        
        return true;
    }

    /**
     * Handle unit click for attack selection
     * @param {number} slotIndex - Slot index
     * @param {string} playerId - Player ID
     */
    handleUnitClick(slotIndex, playerId) {
        console.log(`🖱️ Unit clicked: slot=${slotIndex}, player=${playerId}`);
        
        const state = this.gameState.getState();
        const unit = state.players[playerId].battlefield[slotIndex];
        
        if (!unit) {
            console.log('❌ No unit in clicked slot');
            return;
        }
        
        console.log(`🎯 ${unit.name} attempting attack...`);
        
        // Call CombatSystem's handleUnitClick method directly (not via event)
        const combatSystem = this.gameEngine.systems.get('CombatSystem');
        if (!combatSystem) {
            console.error('❌ Combat system not available');
            return;
        }
        
        // Let CombatSystem handle all the attack logic
        combatSystem.handleUnitClick({
            unit: unit,
            slotIndex: slotIndex,
            playerId: playerId
        });
    }

    /**
     * Update visual feedback for units that can attack
     * @param {Object} data - Event data (optional)
     */
    updateAttackableUnits(data) {
        const state = this.gameState.getState();
        const currentPlayer = state.currentPlayer;
        
        // Only show attackable feedback during player's turn
        if (currentPlayer !== 'player') {
            this.clearAttackableUnits();
            return;
        }
        
        const playerField = state.players.player.battlefield;
        const hasAttacked = state.players.player.hasAttacked;
        
        playerField.forEach((unit, slotIndex) => {
            const slot = document.querySelector(`[data-player="player"][data-slot="${slotIndex}"]`);
            const unitCard = slot?.querySelector('.game-card');
            
            if (unit && unitCard) {
                let canAttack = !hasAttacked.includes(slotIndex) && 
                                (unit.canAttack || this.hasAbility(unit, 'Rush'));
                
                // Additional check for Goblin Machine - use CombatSystem validation
                if (canAttack && unit.name === 'Goblin Machine') {
                    const combatSystem = this.gameEngine.getSystem('CombatSystem');
                    if (combatSystem) {
                        const validation = combatSystem.validateAttack(unit, null); // null target for basic check
                        canAttack = validation.valid;
                    }
                }
                
                if (canAttack) {
                    unitCard.classList.add('can-attack');
                    slot.style.cursor = 'pointer';
                } else {
                    unitCard.classList.remove('can-attack');
                    slot.style.cursor = 'default';
                }
            }
        });
    }

    /**
     * Clear attackable unit visual feedback
     */
    clearAttackableUnits() {
        document.querySelectorAll('.game-card.can-attack').forEach(card => {
            card.classList.remove('can-attack');
        });
        document.querySelectorAll('[data-player="player"][data-slot]').forEach(slot => {
            slot.style.cursor = 'default';
        });
    }

    /**
     * Check if a unit has a specific ability
     * @param {Object} unit - Unit to check
     * @param {string} ability - Ability name
     * @returns {boolean} True if unit has ability
     */
    hasAbility(unit, ability) {
        return unit.ability && unit.ability.toLowerCase().includes(ability.toLowerCase());
    }

    /**
     * Select a unit for attacking
     * @param {Object} unit - Unit to select
     * @param {number} slotIndex - Slot index
     */
    selectUnitForAttack(unit, slotIndex) {
        // Clear previous selection
        this.clearAttackSelection();
        
        this.selectedAttacker = { unit, slotIndex };
        
        // Highlight selected unit
        const unitElement = document.querySelector(`[data-player="player"][data-slot="${slotIndex}"]`);
        if (unitElement) {
            unitElement.classList.add('selected-attacker');
        }
        
        // Get and highlight valid targets
        const combatSystem = this.gameEngine.getSystem('CombatSystem');
        if (combatSystem) {
            this.validTargets = combatSystem.getValidTargets(unit);
            this.highlightValidTargets();
        }
        
        this.uiManager.showNotification('Select a target to attack', 'info');
    }

    /**
     * Attack a target
     * @param {Object} target - Target unit or player
     * @param {number} targetSlot - Target slot index
     * @param {string} targetPlayer - Target player ID
     */
    attackTarget(target, targetSlot, targetPlayer) {
        if (!this.selectedAttacker) return;
        
        const attackData = {
            attacker: this.selectedAttacker.unit,
            target: target || { type: 'player', playerId: targetPlayer },
            attackerSlot: this.selectedAttacker.slotIndex,
            targetSlot: targetSlot
        };
        
        this.eventBus.emit('combat:attack', attackData);
        this.clearAttackSelection();
    }

    /**
     * Clear attack selection
     */
    clearAttackSelection() {
        // Remove selected-attacker class
        document.querySelectorAll('.selected-attacker').forEach(element => {
            element.classList.remove('selected-attacker');
        });
        
        // Remove target highlights
        document.querySelectorAll('.valid-target').forEach(element => {
            element.classList.remove('valid-target');
        });
        
        this.selectedAttacker = null;
        this.validTargets = [];
    }

    /**
     * Highlight valid attack targets
     */
    highlightValidTargets() {
        this.validTargets.forEach(target => {
            if (target.type === 'unit') {
                const targetElement = document.querySelector(`[data-player="ai"][data-slot="${target.slotIndex}"]`);
                if (targetElement) {
                    targetElement.classList.add('valid-target');
                }
            } else if (target.type === 'player') {
                const playerHealthElement = document.getElementById('aiHealth');
                if (playerHealthElement) {
                    playerHealthElement.classList.add('valid-target');
                }
            }
        });
    }

    /**
     * Handle drag over event
     * @param {Event} e - Drag event
     */
    handleDragOver(e) {
        e.preventDefault();
        
        const slot = e.currentTarget;
        const playerId = slot.getAttribute('data-player');
        const slotIndex = parseInt(slot.getAttribute('data-slot'));
        const state = this.gameState.getState();
        
        // Only allow drops on empty player slots during player's turn
        const isPlayerSlot = playerId === 'player';
        const isEmptySlot = !slot.classList.contains('occupied');
        const isPlayerTurn = state.currentPlayer === 'player';
        
        if (isPlayerSlot && isEmptySlot && isPlayerTurn) {
            e.dataTransfer.dropEffect = 'move';
            slot.classList.add('drag-over');
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }

    /**
     * Handle drag leave event
     * @param {Event} e - Drag event
     */
    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    /**
     * Handle drop event
     * @param {Event} e - Drop event
     * @param {number} slotIndex - Target slot index
     * @param {string} playerId - Player ID
     */
    handleDrop(e, slotIndex, playerId) {
        e.preventDefault();
        e.stopPropagation(); // Prevent any bubbling
        e.currentTarget.classList.remove('drag-over');
        
        // Set flag to prevent subsequent click events
        this.justDropped = true;
        this.isProcessingPlacement = true;
        
        const cardData = e.dataTransfer.getData('text/plain');
        if (!cardData) {
            console.warn('No card data found in drop event');
            this.justDropped = false;
            this.isProcessingPlacement = false;
            return;
        }
        
        try {
            const card = JSON.parse(cardData);
            console.log(`Attempting to drop card ${card.name} in slot ${slotIndex} for ${playerId}`);
            
            // Validate placement before emitting event
            if (!this.validateCardPlacement(card, slotIndex, playerId)) {
                this.justDropped = false;
                this.isProcessingPlacement = false;
                return;
            }
            
            // Clear any drop zone highlights
            this.clearDropZoneHighlights();
            
            // Emit the card play event
            this.eventBus.emit('card:play', {
                card,
                slotIndex,
                playerId
            });
            
            console.log(`Card play event emitted for ${card.name}`);
            
            // Clear flags after processing
            setTimeout(() => {
                this.justDropped = false;
                this.isProcessingPlacement = false;
            }, 300);
            
        } catch (error) {
            console.error('Error parsing dropped card data:', error);
            this.uiManager.showNotification('Error playing card', 'error');
            this.justDropped = false;
            this.isProcessingPlacement = false;
        }
    }

    /**
     * Handle slot click for card placement
     * @param {number} slotIndex - Slot index
     * @param {string} playerId - Player ID
     */
    handleSlotClick(slotIndex, playerId) {
        console.log(`🖱️ SLOT CLICK DEBUG:`, {
            slot: slotIndex,
            player: playerId,
            hasSelectedCard: !!this.uiManager.getComponent('hand')?.getSelectedCard(),
            isProcessingPlacement: this.isProcessingPlacement,
            placingCardAt: this.placingCardAt,
            justDropped: this.justDropped,
            timestamp: Date.now()
        });
        
        // Prevent attack processing during placement
        if (this.isProcessingPlacement) {
            console.log('🚫 Ignoring click during placement');
            return;
        }
        
        // Prevent click events immediately after drop events
        if (this.justDropped) {
            console.log('🚫 Ignoring click immediately after drop');
            return;
        }
        
        // Debounce rapid clicks on the same slot
        const now = Date.now();
        const slotKey = `${playerId}-${slotIndex}`;
        
        if (this.lastClickSlot === slotKey && (now - this.lastClickTime) < this.clickDebounceMs) {
            console.log(`🚫 Ignoring rapid click on ${slotKey} (debounced)`);
            return;
        }
        
        this.lastClickTime = now;
        this.lastClickSlot = slotKey;
        
        const state = this.gameState.getState();
        const unit = state.players[playerId].battlefield[slotIndex];
        
        console.log(`🖱️ Unit found:`, unit ? unit.name : 'none');
        
        // PRIORITY 1: If there's a selected card from hand, always handle card placement first
        const handComponent = this.uiManager.getComponent('hand');
        if (handComponent && handComponent.getSelectedCard()) {
            this.isProcessingPlacement = true;
            
            const selectedCard = handComponent.getSelectedCard();
            
            console.log(`🎴 Playing selected card ${selectedCard.name} to slot ${slotIndex}`);
            
            // Set multiple protection flags to prevent any attacks
            const slotKey = `${playerId}-${slotIndex}`;
            this.placingCardAt = slotKey;
            this.globalClickBlocked = true;
            
            console.log(`🔒 All clicks blocked during placement of ${selectedCard.name}`);
            
            this.eventBus.emit('card:play', {
                card: selectedCard,
                slotIndex,
                playerId
            });
            
            handComponent.clearSelection();
            
            // Reset flags after extended delay to prevent immediate attack
            // Must be long enough to prevent any queued/delayed click events
            setTimeout(() => {
                console.log(`🔓 Clearing all placement protection for slot ${slotIndex}`);
                this.isProcessingPlacement = false;
                this.placingCardAt = null;
                this.globalClickBlocked = false;
            }, 1200); // Extended to 1.2 seconds
            
            return; // Exit early to prevent attack handling
        }
        
        // PRIORITY 2: Only handle unit attacks if no card is selected and it's player's turn
        if (unit && state.currentPlayer === 'player' && playerId === 'player') {
            // Check if we're currently placing a card at this slot
            const slotKey = `${playerId}-${slotIndex}`;
            if (this.placingCardAt === slotKey) {
                console.log(`🚫 Ignoring attack - currently placing card at ${slotKey}`);
                return;
            }
            
            // Validate if unit can actually attack BEFORE logging
            if (!this.canUnitAttackValidated(unit, playerId)) {
                console.log(`🚫 Unit ${unit.name} cannot attack (summoning sickness, already attacked, or just placed)`);
                return;
            }
            
            console.log(`🖱️ Attempting attack with ${unit.name}`);
            this.handleUnitClick(slotIndex, playerId);
            return;
        }
        
        console.log(`🖱️ No valid action for slot click - no card selected and no valid unit attack`);
    }

    /**
     * Add unit to battlefield with animation
     * @param {Object} unit - Unit to add
     * @param {number} slotIndex - Target slot
     */
    addUnitToBattlefield(unit, slotIndex) {
        const slotElement = document.querySelector(`[data-player="${unit.owner}"][data-slot="${slotIndex}"]`);
        if (slotElement) {
            slotElement.innerHTML = this.createUnitHTML(unit, unit.owner);
            slotElement.classList.add('occupied', 'unit-spawned');
            slotElement.classList.remove('empty');
            
            // Remove spawn animation class after animation completes
            setTimeout(() => {
                slotElement.classList.remove('unit-spawned');
            }, 500);
        }
    }

    /**
     * Show attack animation
     * @param {Object} attacker - Attacking unit
     * @param {Object} target - Target unit or player
     */
    showAttackAnimation(attacker, target) {
        const attackerElement = document.querySelector(`[data-player="${attacker.owner}"][data-slot="${attacker.slotIndex}"]`);
        let targetElement;
        
        if (target.type === 'unit') {
            targetElement = document.querySelector(`[data-player="${target.owner}"][data-slot="${target.slotIndex}"]`);
        } else {
            targetElement = document.getElementById(`${target.playerId}Health`);
        }
        
        if (attackerElement && targetElement) {
            // Add attack animation class
            attackerElement.classList.add('attacking');
            
            // Show attack arrow
            this.uiManager.showAttackArrow(attackerElement, targetElement);
            
            // Remove animation class after animation
            setTimeout(() => {
                attackerElement.classList.remove('attacking');
            }, 800);
        }
    }

    /**
     * Handle unit death
     * @param {Object} data - Death data
     */
    handleUnitDeath(data) {
        const { slotIndex, owner } = data;
        const slotElement = document.querySelector(`[data-player="${owner}"][data-slot="${slotIndex}"]`);
        
        if (slotElement) {
            slotElement.classList.add('unit-dying');
            
            setTimeout(() => {
                slotElement.innerHTML = '';
                slotElement.classList.remove('occupied', 'unit-dying');
                slotElement.classList.add('empty');
                
                // Recalculate stats when units die (auras may change)
                this.recalculateAllStats();
            }, 300);
        }
    }

    /**
     * Update after attack completion
     * @param {Object} data - Attack data
     */
    updateAfterAttack(data) {
        // Update unit displays to reflect damage
        setTimeout(() => {
            this.update(this.gameState.getState());
        }, 500);
    }

    /**
     * Update draft buttons based on available cards and gold
     * @param {Object} state - Game state
     */
    updateDraftButtons(state) {
        if (state.currentPlayer !== 'player') return;
        
        const playerGold = state.players.player.gold;
        const cardSystem = this.gameEngine.getSystem('CardSystem');
        
        for (let tier = 1; tier <= 5; tier++) {
            const button = document.getElementById(`draftTier${tier}Btn`);
            if (button) {
                const cost = tier * 2;
                const canAfford = playerGold >= cost;
                const cardsAvailable = cardSystem ? cardSystem.getDraftPoolCount(tier) > 0 : false;
                
                button.disabled = !canAfford || !cardsAvailable;
                
                const remainingCount = cardSystem ? cardSystem.getDraftPoolCount(tier) : 25;
                
                button.innerHTML = `
                    <div class="tier-info">
                        <span class="tier-name">Tier ${tier} -</span>
                        <span class="tier-cost gold-cost">${cost} 💰</span>
                    </div>
                    <span class="remaining-count" id="tier${tier}Count">${remainingCount}</span>
                `;
                
                // Set tooltip with status information
                let tooltip = `Tier ${tier} costs ${cost} gold`;
                if (!canAfford) tooltip += ' - Need more gold';
                if (!cardsAvailable) tooltip += ' - No cards available';
                button.title = tooltip;
            }
        }
    }

    /**
     * Validate card placement
     * @param {Object} card - Card to place
     * @param {number} slotIndex - Target slot index
     * @param {string} playerId - Player ID
     * @returns {boolean} True if placement is valid
     */
    validateCardPlacement(card, slotIndex, playerId) {
        const state = this.gameState.getState();
        
        // Check if it's the player's turn
        if (state.currentPlayer !== playerId) {
            this.uiManager.showNotification("It's not your turn!", 'warning');
            return false;
        }
        
        // Check if slot index is valid
        if (slotIndex < 0 || slotIndex >= 6) {
            this.uiManager.showNotification('Invalid slot position', 'error');
            return false;
        }
        
        // Check if slot is empty
        if (state.players[playerId].battlefield[slotIndex] !== null) {
            this.uiManager.showNotification('Slot is already occupied', 'warning');
            return false;
        }
        
        // Check if player owns the card (it should be in their hand)
        const playerHand = state.players[playerId].hand;
        const cardInHand = playerHand.find(handCard => handCard.handId === card.handId);
        
        if (!cardInHand) {
            this.uiManager.showNotification('Card not found in hand', 'error');
            return false;
        }
        
        console.log(`✅ Card placement validated: ${card.name} -> slot ${slotIndex}`);
        return true;
    }
    
    /**
     * Clear drop zone highlights
     */
    clearDropZoneHighlights() {
        document.querySelectorAll('.valid-drop, .drag-over').forEach(element => {
            element.classList.remove('valid-drop', 'drag-over');
        });
    }

    /**
     * Recalculate and update display for all units with dynamic stats
     * Called when turn changes or battlefield composition changes
     */
    recalculateAllStats() {
        const state = this.gameState.getState();
        
        // Update both players' battlefields
        ['player', 'ai'].forEach(playerId => {
            const battlefield = state.players[playerId].battlefield;
            battlefield.forEach((unit, slotIndex) => {
                if (unit) {
                    // Get the slot element
                    const slotElement = document.querySelector(`[data-player="${playerId}"][data-slot="${slotIndex}"]`);
                    if (slotElement && slotElement.classList.contains('occupied')) {
                        // Preserve cursor style before updating HTML
                        const oldCursor = slotElement.style.cursor;
                        
                        // Update the unit display with recalculated stats
                        slotElement.innerHTML = this.createUnitHTML(unit, playerId);
                        
                        // Restore cursor style if it was set to pointer (indicates attackable)
                        if (oldCursor === 'pointer') {
                            slotElement.style.cursor = 'pointer';
                        }
                    }
                }
            });
        });
        
        console.log('📊 All unit stats recalculated for dynamic display');
    }



    /**
     * Get deterministic target based on combat rules
     * @param {Object} unit - Attacking unit
     * @param {number} slotIndex - Attacker's slot index
     * @returns {Object} Target object
     */
    getDeterministicTarget(unit, slotIndex) {
        const state = this.gameState.getState();
        const enemyBattlefield = state.players.ai.battlefield;
        
        // Determine column (0-2 for slots 0-2, 3-5)
        const column = slotIndex % 3;
        
        // Get front and back row slots for this column
        const frontSlot = column; // slots 0, 1, 2
        const backSlot = column + 3; // slots 3, 4, 5
        
        const frontUnit = enemyBattlefield[frontSlot];
        const backUnit = enemyBattlefield[backSlot];
        
        // Flying units always attack player UNLESS there's an enemy Flying unit in column
        if (this.hasAbility(unit, 'Flying')) {
            // Check for enemy Flying units in the same column
            const enemyFlyingInColumn = 
                (frontUnit && this.hasAbility(frontUnit, 'Flying')) ||
                (backUnit && this.hasAbility(backUnit, 'Flying'));
                
            if (enemyFlyingInColumn) {
                // Attack the Flying unit (prefer front row)
                if (frontUnit && this.hasAbility(frontUnit, 'Flying')) {
                    return { type: 'unit', unit: frontUnit, slotIndex: frontSlot, playerId: 'ai', name: frontUnit.name };
                } else if (backUnit && this.hasAbility(backUnit, 'Flying')) {
                    return { type: 'unit', unit: backUnit, slotIndex: backSlot, playerId: 'ai', name: backUnit.name };
                }
            } else {
                // No enemy Flying units, attack player directly
                return { type: 'player', playerId: 'ai', name: 'ai player' };
            }
        }
        
        // Ranged units ignore front row, attack back row first
        if (this.hasAbility(unit, 'Ranged')) {
            if (backUnit) {
                return { type: 'unit', unit: backUnit, slotIndex: backSlot, playerId: 'ai', name: backUnit.name };
            }
            // No back row unit, attack player
            return { type: 'player', playerId: 'ai', name: 'ai player' };
        }
        
        // Normal targeting: Front → Back → Player
        if (frontUnit) {
            return { type: 'unit', unit: frontUnit, slotIndex: frontSlot, playerId: 'ai', name: frontUnit.name };
        } else if (backUnit) {
            return { type: 'unit', unit: backUnit, slotIndex: backSlot, playerId: 'ai', name: backUnit.name };
        } else {
            // No units in column, attack player
            return { type: 'player', playerId: 'ai', name: 'ai player' };
        }
    }

    /**
     * Check if unit has ability
     * @param {Object} unit - Unit to check
     * @param {string} ability - Ability name
     * @returns {boolean} True if has ability
     */
    hasAbility(unit, ability) {
        return unit.ability && unit.ability.toLowerCase().includes(ability.toLowerCase());
    }
}

export default BattlefieldComponent;