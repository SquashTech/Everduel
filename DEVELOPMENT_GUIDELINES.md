# Development Guidelines for Card Game Project

**Last Updated**: January 27, 2025  
**Version**: 2.0 - Post-Cleanup & Futureproofing  
**Purpose**: Comprehensive development standards for maintaining and expanding the card game architecture

---

## 🎯 Quick Start for New Developers

### **Architecture Overview**
This codebase uses a **modular, event-driven architecture** with:
- **Redux-style state management** (GameState.js)
- **Event-driven communication** (EventBus.js) 
- **Centralized error handling** (ErrorHandler.js + SafeExecutor.js)
- **System-based organization** (core/, systems/, components/, utils/)

### **Entry Points**
- **Main HTML**: `index-clean.html` (production entry point)
- **Main JS**: `src/SimpleMain.js` (application bootstrap)
- **Launch Script**: `launch-game.bat` (development server)

---

## 📋 Code Standards & Conventions

### **Naming Conventions** ✅ *[Verified Clean]*
- **Classes**: PascalCase (`AbilitySystem`, `GameState`)
- **Functions/Methods**: camelCase (`updateUnitStats`, `handleUnleash`)
- **Variables**: camelCase (`playerId`, `slotIndex`)
- **Constants**: UPPER_SNAKE_CASE (`CARD_DATABASE`, `GAME_CONFIG`)
- **Events**: namespace:action (`ability:unleash`, `card:drawn`)
- **Files**: PascalCase for classes, camelCase for utilities

### **Documentation Standards** ✅ *[Enhanced]*
- All public methods must have JSDoc comments
- Include `@param` and `@returns` for complex functions
- Document architectural decisions in method comments
- Use emoji prefixes in console.log for easy debugging:
  - `🎮` Game engine operations
  - `⚡` Ability system events  
  - `⚔️` Combat operations
  - `🃏` Card system actions
  - `❌` Error conditions
  - `⚠️` Warnings

### **File Organization** ✅ *[Optimized]*
```
src/
├── core/           # Core engine components (GameState, EventBus, etc.)
├── systems/        # Game logic systems (AbilitySystem, CombatSystem, etc.)
├── components/     # UI components and managers
├── utils/          # Utility functions and helpers
└── data/           # Game data and configuration
```

---

## 🔧 Development Patterns

### **State Updates** ⭐ *[Centralized Pattern]*
**ALWAYS use the centralized `updateUnitStats()` method for unit stat changes**

```javascript
// ✅ CORRECT - Use centralized method
const updates = { attack: newAttack, health: newHealth };
this.updateUnitStats(playerId, slotIndex, updates, "gained buff from ability");

// ❌ WRONG - Direct dispatch (creates inconsistency)
this.gameEngine.dispatch({ type: 'UPDATE_UNIT', payload: {...} });
```

### **Error Handling** ⭐ *[Enhanced System]*
Use the established error handling patterns:

```javascript
import { safeExecute, validators } from '../utils/SafeExecutor.js';

// For simple operations
const result = safeExecute(() => riskyOperation(), {
    context: 'parsing ability text',
    fallback: null
});

// For complex error handling
if (this.errorHandler) {
    const result = this.errorHandler.handleError(error, context, {
        operation: 'updateUnitStats',
        component: 'AbilitySystem', 
        severity: 'high'
    });
}
```

### **Event Communication** ✅ *[Consistent Pattern]*
```javascript
// Event naming: namespace:action
this.eventBus.emit('ability:unleash', { unit, abilityText });
this.eventBus.on('combat:attack', (data) => this.handleAttack(data));

// Always provide context in event data
this.eventBus.emit('unit:buffed', {
    unit: updatedUnit,
    effect: 'gained +2/+2',
    source: 'ability'
});
```

---

## ⚠️ Critical Anti-Patterns (DO NOT DO)

### **Case Sensitivity Errors** 🚨
```javascript
// ❌ NEVER pass lowercase text to case-sensitive parsers
const effect = this.parseBuffEffect(lowerText, context);

// ✅ ALWAYS pass original text
const effect = this.parseBuffEffect(abilityText, context);
```

### **Regex Without Case-Insensitive Flag** 🚨
```javascript
// ❌ WRONG - case sensitive
const match = text.match(/deal (\d+) damage/);

// ✅ CORRECT - always use /i flag
const match = text.match(/deal (\d+) damage/i);
```

### **Direct State Mutation** 🚨
```javascript
// ❌ NEVER mutate state directly
unit.attack += 5;

// ✅ ALWAYS use proper update methods
this.updateUnitStats(playerId, slotIndex, { attack: unit.attack + 5 });
```

### **Duplicate Dispatch Logic** 🚨
```javascript
// ❌ DON'T create duplicate UPDATE_UNIT patterns
this.gameEngine.dispatch({
    type: 'UPDATE_UNIT',
    payload: { playerId, slotIndex, updates }
});

// ✅ USE centralized helper
this.updateUnitStats(playerId, slotIndex, updates, reason);
```

---

## 🧪 Testing & Validation Guidelines

### **Before Adding New Abilities**
1. **Test with exact card database text** from `EmbeddedGameData.js`
2. **Test case variations**: "Deal" vs "deal", "Give" vs "give"
3. **Test edge cases**: no targets, multiple targets, self-exclusion
4. **Verify context passing**: unit owner, slotIndex, ability text

### **Testing Checklist for New Code**
- [ ] All abilities work with their exact database text
- [ ] Case-insensitive matching works correctly
- [ ] "Other" unit exclusion works (units don't target themselves)
- [ ] UI updates reflect stat changes immediately
- [ ] Error handling gracefully handles invalid inputs
- [ ] No console errors or warnings

---

## 🚀 Architecture Expansion Guide

### **Adding New Ability Types**
1. **Add pattern to `parseAndExecuteAbility()`**:
```javascript
if (lowerText.includes('new_keyword')) {
    const effect = this.parseNewEffect(abilityText, context);
    if (effect) {
        result.effects.push(effect);
        this.executeNewEffect(effect, context);
        result.success = true;
    }
}
```

2. **Create dedicated parser method**:
```javascript
parseNewEffect(text, context) {
    // Remember the /i flag!
    const match = text.match(/new pattern (\d+)/i);
    if (!match) return null;
    
    return {
        type: 'new_type',
        amount: parseInt(match[1])
    };
}
```

3. **Use centralized execution**:
```javascript
executeNewEffect(effect, context) {
    const updates = { /* calculate updates */ };
    this.updateUnitStats(context.unit.owner, context.slotIndex, updates, 
                        `gained ${effect.type} effect`);
}
```

### **Adding New Resource Types**
Follow the Dragon Soul model in `GameState.js`:
```javascript
// Add to initial state
newResource: { player: 0, ai: 0 }

// Add reducer case  
case 'ADD_NEW_RESOURCE':
    return {
        ...state,
        newResource: {
            ...state.newResource,
            [action.payload.playerId]: state.newResource[action.payload.playerId] + action.payload.amount
        }
    };
```

### **Adding New Systems**
1. **Follow established patterns**:
   - Extend from base system structure
   - Initialize ErrorHandler in constructor
   - Setup event handlers in `initialize()`
   - Use consistent logging patterns

2. **Register with game engine**:
```javascript
// In SimpleMain.js or wherever systems are initialized
const newSystem = new NewSystem();
gameEngine.registerSystem('NewSystem', newSystem);
```

---

## 🔍 Debugging & Troubleshooting

### **Common Issues & Solutions**

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Ability not parsing | Case sensitivity or missing `/i` flag | Check regex patterns, verify text casing |
| Ability not executing | Context not passed correctly | Verify `slotIndex`, `playerId` in context |
| Wrong targets selected | Filtering logic error | Check exclusion rules, tag matching |
| UI not updating | Missing event emission | Ensure `updateUnitStats()` called with `emitEvent: true` |
| Runtime crashes | Missing validation | Add null checks, use SafeExecutor utilities |

### **Debug Utilities Available**
- **ErrorHandler**: Comprehensive error tracking with retry logic
- **SafeExecutor**: Safe operation wrappers with fallback handling
- **Console Logging**: Standardized emoji-prefixed logging system
- **Event Debugging**: All events can be monitored via EventBus

---

## 📚 System Reference

### **Core Systems Overview**
- **GameState**: Immutable state management with Redux patterns
- **EventBus**: Decoupled event communication between systems  
- **AbilitySystem**: Centralized ability parsing and execution ⭐ *[Recently Enhanced]*
- **CombatSystem**: Battle mechanics and unit interactions
- **CardSystem**: Card drafting, deck management, hand operations
- **UIManager**: Centralized UI state management and updates

### **Key Helper Methods** ⭐ *[Newly Added]*
- **`updateUnitStats()`**: Centralized unit stat updates (replaces 8+ duplicate patterns)
- **`safeExecute()`**: Error-safe operation wrapper
- **`validateValue()`**: Input validation with common validators

---

## 🎯 Performance & Best Practices

### **Memory Management**
- GameState history limited to 50 states
- Event listeners properly cleaned up on component destruction
- Avoid creating unnecessary object references in tight loops

### **UI Responsiveness**
- All stat changes trigger UI updates via event system
- Async operations use proper Promise chains
- Loading states managed centrally

### **Code Quality**
- No TODO/FIXME comments in production code ✅ *[Verified Clean]*
- No commented-out code blocks ✅ *[Verified Clean]*
- All test/debug methods removed from production ✅ *[Cleaned]*

---

## 🔄 Version History

### **v2.0 - January 27, 2025** ⭐ *[Current]*
- **Consolidated duplicate code patterns** (8+ UPDATE_UNIT dispatches → 1 central method)
- **Enhanced error handling** (Added ErrorHandler to core systems + SafeExecutor utilities)
- **Removed debug/test methods** (testSlotBuffSystem, testPassiveEffects)
- **Standardized documentation** (Enhanced JSDoc comments with architectural notes)
- **Validated naming conventions** (Confirmed consistent patterns across codebase)

### **v1.0 - Pre-Cleanup**
- Original architecture with case sensitivity fixes
- Multiple duplicate code patterns  
- Basic error handling
- Debug methods in production code

---

## 📞 Development Support

### **Key Files to Reference**
- **Architecture Overview**: `COMPREHENSIVE_CODEBASE_ANALYSIS_AND_RECOMMENDATIONS.md`
- **Current Game Rules**: `Card Battle Basic Rules.txt`  
- **Game Architecture**: `CURRENT_GAME_ARCHITECTURE.md`

### **Getting Help**
- Check existing patterns in similar systems before implementing new features
- Use the centralized error handling for debugging complex issues
- Reference the comprehensive analysis for understanding ability parsing patterns
- Follow the established event communication patterns for system integration

---

**Remember**: This codebase is **production-ready** and **highly extensible**. Follow these patterns for consistent, maintainable code that builds upon the solid architectural foundation. 

🎮 **Happy Coding!**