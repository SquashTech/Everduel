/**
 * Shared utility for creating units from cards to reduce code duplication
 * Centralizes unit creation logic and ensures consistency across systems
 */
class UnitFactory {
    /**
     * Create a unit from a card with consistent properties
     * @param {Object} card - Card object
     * @param {string} playerId - Owner player ID
     * @param {number} slotIndex - Battlefield slot index
     * @param {Object} options - Additional options for unit creation
     * @returns {Object} Unit object
     */
    static createUnit(card, playerId, slotIndex, options = {}) {
        const {
            canAttack = null, // null = auto-determine based on Rush
            summonedThisTurn = true,
            customProperties = {}
        } = options;

        // Determine if unit can attack immediately
        const hasRush = card.ability && card.ability.toLowerCase().includes('rush');
        const shouldCanAttack = canAttack !== null ? canAttack : hasRush;

        // Base unit structure
        const unit = {
            // Card properties
            id: card.id,
            name: card.name,
            attack: card.attack,
            health: card.health,
            ability: card.ability || '',
            tags: Array.isArray(card.tags) ? [...card.tags] : [],
            color: card.color,
            
            // Current state properties
            currentAttack: card.attack,
            currentHealth: card.health,
            maxHealth: card.health, // For healing calculations
            
            // Ownership and position
            owner: playerId,
            slotIndex,
            
            // Combat state
            canAttack: shouldCanAttack,
            summonedThisTurn,
            hasAttackedPlayer: false,
            
            // Ability flags
            hasRush,
            
            // Apply any custom properties
            ...customProperties
        };

        return unit;
    }

    /**
     * Create a unit specifically for summoning effects (like skeletons)
     * @param {Object} cardTemplate - Basic card template
     * @param {string} playerId - Owner player ID  
     * @param {number} slotIndex - Battlefield slot index
     * @param {Object} options - Additional options
     * @returns {Object} Unit object
     */
    static createSummonedUnit(cardTemplate, playerId, slotIndex, options = {}) {
        const defaultOptions = {
            canAttack: false, // Summoned units typically can't attack immediately
            summonedThisTurn: true,
            ...options
        };

        return this.createUnit(cardTemplate, playerId, slotIndex, defaultOptions);
    }

    /**
     * Create a unit from a drafted card for placement on battlefield
     * @param {Object} card - Drafted card
     * @param {string} playerId - Owner player ID
     * @param {number} slotIndex - Battlefield slot index
     * @returns {Object} Unit object
     */
    static createPlayedUnit(card, playerId, slotIndex) {
        return this.createUnit(card, playerId, slotIndex, {
            canAttack: null, // Auto-determine based on Rush ability
            summonedThisTurn: true
        });
    }

    /**
     * Validate unit properties to ensure consistency
     * @param {Object} unit - Unit to validate
     * @returns {boolean} True if valid
     */
    static validateUnit(unit) {
        const requiredProperties = [
            'id', 'name', 'attack', 'health', 'currentAttack', 'currentHealth',
            'owner', 'slotIndex', 'canAttack', 'summonedThisTurn'
        ];

        const missingProperties = requiredProperties.filter(prop => 
            unit[prop] === undefined || unit[prop] === null
        );

        if (missingProperties.length > 0) {
            console.warn(`⚠️ Unit validation failed. Missing properties: ${missingProperties.join(', ')}`);
            return false;
        }

        // Validate data types
        if (typeof unit.attack !== 'number' || typeof unit.health !== 'number') {
            console.warn(`⚠️ Unit validation failed. Attack and health must be numbers`);
            return false;
        }

        if (typeof unit.slotIndex !== 'number' || unit.slotIndex < 0 || unit.slotIndex > 5) {
            console.warn(`⚠️ Unit validation failed. SlotIndex must be a number between 0-5`);
            return false;
        }

        return true;
    }

    /**
     * Clone a unit with modifications
     * @param {Object} unit - Unit to clone
     * @param {Object} modifications - Properties to modify
     * @returns {Object} Cloned and modified unit
     */
    static cloneUnit(unit, modifications = {}) {
        return {
            ...unit,
            tags: [...(unit.tags || [])], // Deep clone arrays
            ...modifications
        };
    }
}

export default UnitFactory;