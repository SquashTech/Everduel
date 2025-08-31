/**
 * Type Validation Utilities
 * Provides runtime type checking and validation for critical game data
 * Addresses the lack of TypeScript by implementing defensive validation
 */
class TypeValidator {
    /**
     * Validate unit data structure
     */
    static validateUnit(unit, context = 'unknown') {
        const errors = [];
        
        if (!unit) {
            errors.push('Unit is null or undefined');
            return { valid: false, errors };
        }
        
        // Required properties
        if (typeof unit.name !== 'string' || !unit.name.trim()) {
            errors.push('Unit name must be a non-empty string');
        }
        
        if (!Number.isInteger(unit.attack) || unit.attack < 0) {
            errors.push('Unit attack must be a non-negative integer');
        }
        
        if (!Number.isInteger(unit.health) || unit.health < 0) {
            errors.push('Unit health must be a non-negative integer');
        }
        
        // Optional properties with type validation
        if (unit.ability && typeof unit.ability !== 'string') {
            errors.push('Unit ability must be a string');
        }
        
        if (unit.tags && !Array.isArray(unit.tags)) {
            errors.push('Unit tags must be an array');
        }
        
        if (unit.owner && typeof unit.owner !== 'string') {
            errors.push('Unit owner must be a string');
        }
        
        if (unit.slotIndex !== undefined && (!Number.isInteger(unit.slotIndex) || unit.slotIndex < 0 || unit.slotIndex > 5)) {
            errors.push('Unit slotIndex must be an integer between 0-5');
        }
        
        // Log validation issues
        if (errors.length > 0) {
            console.warn(`Unit validation failed in ${context}:`, {
                unit: { name: unit.name, id: unit.id },
                errors
            });
        }
        
        return { valid: errors.length === 0, errors };
    }
    
    /**
     * Validate card data structure
     */
    static validateCard(card, context = 'unknown') {
        const errors = [];
        
        if (!card) {
            errors.push('Card is null or undefined');
            return { valid: false, errors };
        }
        
        // Required properties
        if (typeof card.name !== 'string' || !card.name.trim()) {
            errors.push('Card name must be a non-empty string');
        }
        
        if (!Number.isInteger(card.attack) || card.attack < 0) {
            errors.push('Card attack must be a non-negative integer');
        }
        
        if (!Number.isInteger(card.health) || card.health <= 0) {
            errors.push('Card health must be a positive integer');
        }
        
        if (!card.color || !['red', 'blue', 'green'].includes(card.color)) {
            errors.push('Card color must be red, blue, or green');
        }
        
        // Optional properties
        if (card.ability && typeof card.ability !== 'string') {
            errors.push('Card ability must be a string');
        }
        
        if (card.tags && !Array.isArray(card.tags)) {
            errors.push('Card tags must be an array');
        }
        
        if (card.handId && typeof card.handId !== 'string') {
            errors.push('Card handId must be a string');
        }
        
        if (errors.length > 0) {
            console.warn(`Card validation failed in ${context}:`, {
                card: { name: card.name, id: card.id },
                errors
            });
        }
        
        return { valid: errors.length === 0, errors };
    }
    
    /**
     * Validate player data structure
     */
    static validatePlayer(player, playerId, context = 'unknown') {
        const errors = [];
        
        if (!player) {
            errors.push('Player is null or undefined');
            return { valid: false, errors };
        }
        
        // Required properties
        if (!Number.isInteger(player.health) || player.health < 0) {
            errors.push('Player health must be a non-negative integer');
        }
        
        if (!Array.isArray(player.battlefield)) {
            errors.push('Player battlefield must be an array');
        } else if (player.battlefield.length !== 6) {
            errors.push('Player battlefield must have exactly 6 slots');
        }
        
        if (!Array.isArray(player.hand)) {
            errors.push('Player hand must be an array');
        }
        
        if (!Array.isArray(player.deck)) {
            errors.push('Player deck must be an array');
        }
        
        // Validate battlefield units
        player.battlefield.forEach((unit, slotIndex) => {
            if (unit !== null) {
                const unitValidation = this.validateUnit(unit, `${context}.battlefield[${slotIndex}]`);
                if (!unitValidation.valid) {
                    errors.push(`Invalid unit at slot ${slotIndex}: ${unitValidation.errors.join(', ')}`);
                }
            }
        });
        
        // Validate hand cards
        player.hand.forEach((card, index) => {
            const cardValidation = this.validateCard(card, `${context}.hand[${index}]`);
            if (!cardValidation.valid) {
                errors.push(`Invalid card in hand at index ${index}: ${cardValidation.errors.join(', ')}`);
            }
        });
        
        if (errors.length > 0) {
            console.warn(`Player validation failed for ${playerId} in ${context}:`, errors);
        }
        
        return { valid: errors.length === 0, errors };
    }
    
    /**
     * Validate game state structure
     */
    static validateGameState(state, context = 'unknown') {
        const errors = [];
        
        if (!state) {
            errors.push('Game state is null or undefined');
            return { valid: false, errors };
        }
        
        // Required properties
        if (!state.players || typeof state.players !== 'object') {
            errors.push('Game state must have players object');
            return { valid: false, errors };
        }
        
        // Validate each player
        for (const [playerId, player] of Object.entries(state.players)) {
            const playerValidation = this.validatePlayer(player, playerId, `${context}.players.${playerId}`);
            if (!playerValidation.valid) {
                errors.push(`Invalid player ${playerId}: ${playerValidation.errors.join(', ')}`);
            }
        }
        
        // Validate current turn
        if (state.currentTurn && !['player', 'ai'].includes(state.currentTurn)) {
            errors.push('Current turn must be "player" or "ai"');
        }
        
        if (errors.length > 0) {
            console.warn(`Game state validation failed in ${context}:`, errors);
        }
        
        return { valid: errors.length === 0, errors };
    }
    
    /**
     * Validate ability context
     */
    static validateAbilityContext(context, requiredFields = []) {
        const errors = [];
        
        if (!context || typeof context !== 'object') {
            errors.push('Ability context must be an object');
            return { valid: false, errors };
        }
        
        // Check required fields
        requiredFields.forEach(field => {
            if (!(field in context)) {
                errors.push(`Missing required field: ${field}`);
            }
        });
        
        // Validate unit if present
        if (context.unit && !this.validateUnit(context.unit, 'ability-context').valid) {
            errors.push('Invalid unit in ability context');
        }
        
        // Validate playerId if present
        if (context.playerId && !['player', 'ai'].includes(context.playerId)) {
            errors.push('Invalid playerId in ability context');
        }
        
        // Validate slotIndex if present
        if (context.slotIndex !== undefined && (!Number.isInteger(context.slotIndex) || context.slotIndex < 0 || context.slotIndex > 5)) {
            errors.push('Invalid slotIndex in ability context');
        }
        
        return { valid: errors.length === 0, errors };
    }
    
    /**
     * Validate event data
     */
    static validateEventData(eventName, data) {
        const errors = [];
        
        if (!eventName || typeof eventName !== 'string') {
            errors.push('Event name must be a non-empty string');
        }
        
        // Specific validation based on event type
        switch (eventName) {
            case 'ability:unleash':
            case 'ability:last-gasp':
            case 'ability:manacharge':
                if (!data.unit) {
                    errors.push('Ability event must have unit data');
                }
                if (!data.context) {
                    errors.push('Ability event must have context data');
                }
                break;
                
            case 'combat:attack-completed':
                if (!data.attacker) {
                    errors.push('Combat event must have attacker data');
                }
                if (!data.target) {
                    errors.push('Combat event must have target data');
                }
                break;
                
            case 'turn:started':
            case 'turn:ended':
                if (!data.playerId || !['player', 'ai'].includes(data.playerId)) {
                    errors.push('Turn event must have valid playerId');
                }
                break;
        }
        
        if (errors.length > 0) {
            console.warn(`Event validation failed for ${eventName}:`, errors);
        }
        
        return { valid: errors.length === 0, errors };
    }
    
    /**
     * Create a safe validator wrapper
     */
    static createSafeValidator(validatorFn, defaultValue = null) {
        return function(...args) {
            try {
                return validatorFn.apply(this, args);
            } catch (error) {
                console.error('Validator error:', error);
                return { valid: false, errors: ['Validator threw exception: ' + error.message] };
            }
        };
    }
    
    /**
     * Validate with automatic error reporting
     */
    static validateWithReporting(validatorFn, data, context, throwOnError = false) {
        const result = validatorFn(data, context);
        
        if (!result.valid) {
            const errorMsg = `Validation failed in ${context}: ${result.errors.join(', ')}`;
            
            if (throwOnError) {
                throw new Error(errorMsg);
            } else {
                console.error(errorMsg, data);
            }
        }
        
        return result;
    }
}

export default TypeValidator;