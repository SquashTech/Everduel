/**
 * Event-driven architecture system for decoupled component communication
 * Allows systems to communicate without direct dependencies
 */
class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} callback - Function to call when event is emitted
     * @param {Object} options - Optional configuration
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback, options = {}) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0
        };

        const listeners = this.listeners.get(eventName);
        listeners.push(listener);
        
        // Sort by priority (higher priority first)
        listeners.sort((a, b) => b.priority - a.priority);

        // Return unsubscribe function
        return () => {
            const index = listeners.indexOf(listener);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        };
    }

    /**
     * Subscribe to an event that will only fire once
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    once(eventName, callback) {
        return this.on(eventName, callback, { once: true });
    }

    /**
     * Emit an event to all subscribers
     * @param {string} eventName - Name of the event to emit
     * @param {*} data - Data to pass to listeners
     * @returns {boolean} True if event had listeners, false otherwise
     */
    emit(eventName, data = null) {
        const listeners = this.listeners.get(eventName);
        if (!listeners || listeners.length === 0) {
            if (eventName === 'turn:end' || eventName === 'turn:started') {
                console.log(`⚠️ EventBus: No listeners for ${eventName}!`);
            }
            return false;
        }
        
        if (eventName === 'turn:end' || eventName === 'turn:started') {
            console.log(`📡 EventBus: Emitting ${eventName} to ${listeners.length} listeners`);
        }

        // Create a copy to handle modifications during emission
        const listenersToCall = [...listeners];

        listenersToCall.forEach(listener => {
            try {
                listener.callback(data);
                
                // Remove one-time listeners
                if (listener.once) {
                    const index = listeners.indexOf(listener);
                    if (index !== -1) {
                        listeners.splice(index, 1);
                    }
                }
            } catch (error) {
                console.error(`Error in event listener for '${eventName}':`, error);
                // Remove failed listeners to prevent repeated failures
                const index = listeners.indexOf(listener);
                if (index !== -1) {
                    console.warn(`Removing failed listener for '${eventName}' to prevent memory leaks`);
                    listeners.splice(index, 1);
                }
            }
        });

        return true;
    }

    /**
     * Remove all listeners for an event
     * @param {string} eventName - Name of the event
     */
    off(eventName) {
        this.listeners.delete(eventName);
    }

    /**
     * Remove a specific listener from an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Specific callback to remove
     */
    unsubscribe(eventName, callback) {
        const listeners = this.listeners.get(eventName);
        if (!listeners) return;

        const index = listeners.findIndex(listener => listener.callback === callback);
        if (index !== -1) {
            listeners.splice(index, 1);
            
            // Clean up empty event arrays
            if (listeners.length === 0) {
                this.listeners.delete(eventName);
            }
        }
    }

    /**
     * Remove all listeners for all events
     */
    clear() {
        this.listeners.clear();
    }

    /**
     * Destroy the EventBus and clean up all resources
     */
    destroy() {
        const totalListeners = Array.from(this.listeners.values())
            .reduce((sum, listeners) => sum + listeners.length, 0);
        
        if (totalListeners > 0) {
            console.warn(`🧹 EventBus.destroy(): Cleaning up ${totalListeners} listeners across ${this.listeners.size} events`);
        }
        
        this.listeners.clear();
        console.log('🧹 EventBus destroyed and cleaned up');
    }

    /**
     * Get diagnostic information about current listeners
     * @returns {Object} Diagnostic information
     */
    getDiagnostics() {
        const diagnostics = {
            totalEvents: this.listeners.size,
            totalListeners: 0,
            events: {}
        };

        for (const [eventName, listeners] of this.listeners.entries()) {
            diagnostics.totalListeners += listeners.length;
            diagnostics.events[eventName] = {
                count: listeners.length,
                hasOnceListeners: listeners.some(l => l.once)
            };
        }

        return diagnostics;
    }

    /**
     * Get count of listeners for an event
     * @param {string} eventName - Name of the event
     * @returns {number} Number of listeners
     */
    listenerCount(eventName) {
        const listeners = this.listeners.get(eventName);
        return listeners ? listeners.length : 0;
    }

    /**
     * Get all event names that have listeners
     * @returns {Array<string>} Array of event names
     */
    eventNames() {
        return Array.from(this.listeners.keys());
    }
}

export default EventBus;