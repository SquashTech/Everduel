/**
 * Centralized ability text parsing
 * Handles the complex regex-based parsing that was scattered throughout AbilitySystem
 */
export default class AbilityParser {
    /**
     * Parse damage effects from ability text
     */
    static parseDamageEffect(text, context) {
        const lowerText = text.toLowerCase();
        
        // Enhanced regex patterns for various damage effects
        const patterns = {
            directDamage: /deal (\d+) damage to (.+)/i,
            conditionalDamage: /deal (\d+) damage to (.+) if (.+)/i,
            randomDamage: /deal (\d+) damage to a random (.+)/i,
            splitDamage: /deal (\d+) damage split among (.+)/i,
            scaledDamage: /deal (\d+) \+ (.+) damage to (.+)/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) {
                return {
                    type: 'damage',
                    subtype: type,
                    amount: parseInt(match[1]),
                    target: match[2],
                    condition: match[3] || null,
                    originalText: text
                };
            }
        }

        return null;
    }

    /**
     * Parse buff effects from ability text
     */
    static parseBuffEffect(text, context) {
        const patterns = {
            simpleBuff: /give (.+) \+(\d+)\/\+(\d+)/i,
            conditionalBuff: /give (.+) \+(\d+)\/\+(\d+) if (.+)/i,
            temporaryBuff: /(.+) gains? \+(\d+)\/\+(\d+) this turn/i,
            negativeStatBuff: /give (.+) -(\d+)\/-(\d+)/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) {
                const isNegative = type === 'negativeStatBuff';
                return {
                    type: 'buff',
                    subtype: type,
                    target: match[1],
                    attack: isNegative ? -parseInt(match[2]) : parseInt(match[2]),
                    health: isNegative ? -parseInt(match[3]) : parseInt(match[3]),
                    condition: match[4] || null,
                    temporary: type === 'temporaryBuff',
                    originalText: text
                };
            }
        }

        return null;
    }

    /**
     * Parse ability granting effects
     */
    static parseAbilityGrantEffect(text, context) {
        const patterns = {
            giveAbility: /give (.+) (Rush|Flying|Ranged|Frenzy)/i,
            gainAbility: /(.+) gains? (Rush|Flying|Ranged|Frenzy)/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) {
                return {
                    type: 'abilityGrant',
                    subtype: type,
                    target: match[1],
                    ability: match[2].toLowerCase(),
                    originalText: text
                };
            }
        }

        return null;
    }

    /**
     * Parse summon effects
     */
    static parseSummonEffect(text, context) {
        const patterns = {
            summonUnit: /summon a (\d+)\/(\d+) (.+)/i,
            addToHand: /add (.+) to your hand/i,
            createCopy: /create a copy of (.+)/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) {
                if (type === 'summonUnit') {
                    return {
                        type: 'summon',
                        subtype: type,
                        attack: parseInt(match[1]),
                        health: parseInt(match[2]),
                        name: match[3],
                        originalText: text
                    };
                } else {
                    return {
                        type: 'summon',
                        subtype: type,
                        target: match[1],
                        originalText: text
                    };
                }
            }
        }

        return null;
    }

    /**
     * Parse draw effects
     */
    static parseDrawEffect(text, context) {
        const patterns = {
            simpleDraw: /draw (\d+) cards?/i,
            conditionalDraw: /draw (\d+) cards? if (.+)/i,
            drawUntil: /draw cards until you have (\d+)/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) {
                return {
                    type: 'draw',
                    subtype: type,
                    amount: parseInt(match[1]),
                    condition: match[2] || null,
                    originalText: text
                };
            }
        }

        return null;
    }

    /**
     * Parse healing effects
     */
    static parseHealEffect(text, context) {
        const patterns = {
            simpleHeal: /heal (\d+) damage/i,
            healTarget: /heal (.+) for (\d+)/i,
            restoreHealth: /restore (\d+) health to (.+)/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) {
                return {
                    type: 'heal',
                    subtype: type,
                    amount: parseInt(match[1]) || parseInt(match[2]),
                    target: match[2] || match[1],
                    originalText: text
                };
            }
        }

        return null;
    }

    /**
     * Main parser that tries all effect types
     */
    static parseAbilityText(abilityText, context = {}) {
        const effects = [];
        
        // Try each parser
        const parsers = [
            this.parseDamageEffect,
            this.parseBuffEffect,
            this.parseAbilityGrantEffect,
            this.parseSummonEffect,
            this.parseDrawEffect,
            this.parseHealEffect
        ];

        for (const parser of parsers) {
            const effect = parser(abilityText, context);
            if (effect) {
                effects.push(effect);
            }
        }

        return effects.length > 0 ? effects : null;
    }
}