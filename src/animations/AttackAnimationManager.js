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
    
    // Helper method to wait for any animation by attacker ID (for AI system)
    waitForAttackerAnimation(attackerId) {
        return new Promise((resolve) => {
            // Find any active animation for this attacker
            const activeAnimation = Array.from(this.activeAnimations).find(id => 
                id.includes(`attack-${attackerId}-`)
            );
            
            if (!activeAnimation) {
                resolve(); // No animation running
                return;
            }
            
            const handler = ({ animationId }) => {
                if (animationId.includes(`attack-${attackerId}-`)) {
                    this.eventBus.off('animation:attack:complete', handler);
                    resolve();
                }
            };
            
            this.eventBus.on('animation:attack:complete', handler);
        });
    }
    
    // Check if any animations are currently running
    hasActiveAnimations() {
        return this.activeAnimations.size > 0;
    }
    
    // Get count of active animations (for debugging)
    getActiveAnimationCount() {
        return this.activeAnimations.size;
    }
}