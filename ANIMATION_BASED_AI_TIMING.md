# Animation-Based AI Timing System

## Current Problem
The AI system uses arbitrary `await this.delay(800)` calls between attacks, which:
- Can cause state synchronization issues
- Creates artificial timing that doesn't match visual feedback
- Makes the code fragile to timing-related bugs
- Doesn't scale well with different animation speeds

## Proposed Solution: Animation-Driven Timing

Replace arbitrary delays with animation-driven timing where the AI waits for attack animations to complete before proceeding.

## Current Codebase Architecture

### AI System Location
- **Main AI Logic**: `src/systems/SimpleAISystem.js`
- **Attack Method**: `attackWithAllUnits()` around line 119
- **Current Delay**: 800ms between each attack (line 190)

### Combat System
- **Location**: `src/systems/CombatSystem.js`
- **Attack Handler**: `handleAttack()` around line 107
- **Event**: Listens for `combat:attack` events

### Animation Infrastructure
- **Main Game Engine**: `src/core/SimpleGameEngine.js`
- **Event Bus**: Available for animation completion events
- **Battlefield Component**: `src/components/BattlefieldComponent.js` (handles UI updates)

### Current Attack Flow
1. AI collects eligible units
2. For each unit:
   - Gets fresh unit data from battlefield
   - Validates unit can still attack
   - Emits `combat:attack` event
   - **Waits 800ms** ⚠️ (PROBLEM)
   - Continues to next unit

## Implementation Plan

### 1. Create Attack Animation System

```javascript
// New file: src/animations/AttackAnimationManager.js
export default class AttackAnimationManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.activeAnimations = new Set();
    }
    
    startAttackAnimation(attackerId, duration = 1000) {
        const animationId = `attack-${attackerId}-${Date.now()}`;
        this.activeAnimations.add(animationId);
        
        // Emit animation start
        this.eventBus.emit('animation:attack:start', { 
            animationId, 
            attackerId,
            duration 
        });
        
        // Auto-complete after duration
        setTimeout(() => {
            this.completeAnimation(animationId);
        }, duration);
        
        return animationId;
    }
    
    completeAnimation(animationId) {
        if (this.activeAnimations.has(animationId)) {
            this.activeAnimations.delete(animationId);
            this.eventBus.emit('animation:attack:complete', { animationId });
        }
    }
    
    waitForAnimation(animationId) {
        return new Promise((resolve) => {
            if (!this.activeAnimations.has(animationId)) {
                resolve(); // Already complete
                return;
            }
            
            const handler = ({ animationId: completedId }) => {
                if (completedId === animationId) {
                    this.eventBus.off('animation:attack:complete', handler);
                    resolve();
                }
            };
            
            this.eventBus.on('animation:attack:complete', handler);
        });
    }
}
```

### 2. Update Combat System

```javascript
// In src/systems/CombatSystem.js, update handleAttack method
async handleAttack(data) {
    const { attacker, target, attackerSlot, targetSlot } = data;
    
    // Start attack animation
    const animationId = this.animationManager.startAttackAnimation(
        attacker.unitId || `${attacker.owner}-${attackerSlot}`,
        this.getAttackAnimationDuration(attacker)
    );
    
    // Rest of combat logic...
    
    // Combat system doesn't need to wait - animation runs independently
}

getAttackAnimationDuration(attacker) {
    // Base duration, could vary by unit type, abilities, etc.
    let duration = 800;
    
    if (this.hasAbility(attacker, 'Quick Strike')) duration *= 0.5;
    if (this.hasAbility(attacker, 'Slow')) duration *= 1.5;
    
    return duration;
}
```

### 3. Update AI System

```javascript
// In src/systems/SimpleAISystem.js, update attackWithAllUnits method
async attackWithAllUnits() {
    // ... existing unit collection logic ...
    
    // Attack with each unit sequentially with animation-based timing
    let attacksExecuted = 0;
    for (const { unit: originalUnit, slotIndex } of attackingUnits) {
        // ... existing validation logic ...
        
        const combatSystem = this.gameEngine.systems.get('CombatSystem');
        if (combatSystem) {
            const target = combatSystem.getDeterministicTarget(freshUnit);
            if (target) {
                // Emit attack event
                this.eventBus.emit('combat:attack', {
                    attacker: { ...freshUnit, owner: this.playerId },
                    target: target,
                    attackerSlot: slotIndex,
                    targetSlot: target.slotIndex
                });
                
                attacksExecuted++;
                
                // Wait for attack animation to complete instead of arbitrary delay
                const animationId = `attack-${freshUnit.unitId || `${this.playerId}-${slotIndex}`}-${Date.now()}`;
                await this.animationManager.waitForAnimation(animationId);
                
            } else {
                console.log(`🤖 No target found for ${freshUnit.name}, skipping attack`);
            }
        }
    }
    
    console.log(`🤖 Attack phase complete: ${attacksExecuted}/${attackingUnits.length} attacks executed`);
}
```

### 4. Add CSS Animations

```css
/* Add to css/game.css */

/* Attack animation for units */
.game-card.attacking {
    animation: attackPulse 0.8s ease-in-out;
    z-index: 1000;
}

@keyframes attackPulse {
    0% {
        transform: scale(1) translateX(0);
    }
    25% {
        transform: scale(1.05) translateX(10px);
        box-shadow: 0 0 20px rgba(255, 0, 0, 0.6);
    }
    50% {
        transform: scale(1.1) translateX(5px);
        box-shadow: 0 0 25px rgba(255, 0, 0, 0.8);
    }
    75% {
        transform: scale(1.05) translateX(-5px);
        box-shadow: 0 0 15px rgba(255, 0, 0, 0.4);
    }
    100% {
        transform: scale(1) translateX(0);
        box-shadow: none;
    }
}

/* Different animation speeds for different abilities */
.game-card.attacking.quick-strike {
    animation-duration: 0.4s;
}

.game-card.attacking.slow {
    animation-duration: 1.2s;
}
```

### 5. Update Battlefield Component

```javascript
// In src/components/BattlefieldComponent.js
// Listen for animation events and apply CSS classes

setupAnimationListeners() {
    this.eventBus.on('animation:attack:start', ({ attackerId, duration }) => {
        const unitElement = document.querySelector(`[data-unit-id="${attackerId}"]`);
        if (unitElement) {
            const card = unitElement.querySelector('.game-card');
            if (card) {
                card.classList.add('attacking');
                
                // Remove class after animation
                setTimeout(() => {
                    card.classList.remove('attacking');
                }, duration);
            }
        }
    });
}
```

## Benefits of This Approach

### 1. **Visual Consistency**
- AI timing matches what players see
- No disconnect between animation and game logic
- Smoother user experience

### 2. **Code Robustness**
- No arbitrary timing constants
- Animation system handles timing centrally
- Easy to adjust speeds globally

### 3. **Flexibility**
- Different units can have different animation speeds
- Abilities can modify animation duration
- Easy to add more complex animations

### 4. **Performance**
- Animations can run concurrently with game logic
- No blocking delays for UI updates
- Better separation of concerns

## Current System Integration Points

### Event Bus Usage
The game already uses an event bus pattern:
- `src/core/SimpleGameEngine.js` has `this.eventBus`
- Systems communicate via events like `combat:attack`
- Easy to add animation events to existing flow

### Existing Delay Pattern
Current locations using delays that could be replaced:
- `SimpleAISystem.js:53` - 500ms before attacking
- `SimpleAISystem.js:190` - 800ms between attacks
- `SimpleGameEngine.js:169` - 800ms before AI turn
- `SimpleGameEngine.js:215` - 800ms before AI attacks
- Scenarios: 600ms delays before card play, 800ms before attacks

### CSS Animation Infrastructure
- Game already has extensive CSS in `css/game.css`
- Cards have classes like `.game-card`, `.attacking` would fit naturally
- Existing animation patterns like health damage, card glow effects

## Migration Strategy

### Phase 1: Add Animation Manager
- Create `AttackAnimationManager` class
- Integrate with existing event bus
- Test with simple animations

### Phase 2: Update Combat System
- Add animation triggering to combat flow
- Maintain backwards compatibility
- Test combat still works properly

### Phase 3: Update AI System
- Replace delays with animation waits
- Keep existing validation logic
- Add comprehensive logging

### Phase 4: Add Visual Animations
- Implement CSS animations
- Connect to animation events
- Polish timing and effects

### Phase 5: Optimize & Extend
- Add ability-based timing variations
- Implement more complex animations
- Consider particle effects, sound timing

## Future Enhancements

### Dynamic Timing
- Faster animations for simple attacks
- Slower animations for powerful abilities
- Player preference settings for animation speed

### Advanced Animations
- Projectile animations for ranged attacks
- Screen shake for heavy hits
- Particle effects synchronized with timing

### Performance Optimizations
- Animation pooling for rapid attacks
- GPU acceleration for complex effects
- Reduced animations on slower devices

This approach would make the AI timing system much more robust, visually consistent, and maintainable while eliminating the current timing-related bugs.