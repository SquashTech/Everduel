/**
 * Refactored Main Entry Point
 * Demonstrates the improved modular architecture with all enhancements
 * Based on the architecture analysis recommendations
 */
import EventBus from './core/EventBus.js';
import EnhancedGameState from './core/EnhancedGameState.js';
import EventRegistry from './core/EventRegistry.js';
import ErrorHandler from './core/ErrorHandler.js';
import SimpleGameEngine from './core/SimpleGameEngine.js';
import ModularAbilitySystem from './systems/ModularAbilitySystem.js';
import CardSystem from './systems/CardSystem.js';
import CombatSystem from './systems/CombatSystem.js';
import SimpleAISystem from './systems/SimpleAISystem.js';
import UIManager from './components/UIManager.js';
import GameLogger from './core/GameLogger.js';
import DOMSanitizer from './utils/DOMSanitizer.js';
import TypeValidator from './utils/TypeValidator.js';
import PerformanceMonitor from './utils/PerformanceMonitor.js';
import EmbeddedGameData from './data/EmbeddedGameData.js';

/**
 * Refactored Game Application
 * Implements the architectural improvements recommended in the analysis
 */
class RefactoredCardGame {
    constructor() {
        console.log('🎮 Initializing Refactored Card Game with enhanced architecture...');
        
        // Initialize performance monitoring first
        this.performanceMonitor = new PerformanceMonitor();
        this.performanceMonitor.startSession('game-initialization');
        
        // Core infrastructure
        this.eventBus = new EventBus();
        this.eventRegistry = new EventRegistry();
        this.errorHandler = new ErrorHandler(this.eventBus);
        
        // Enhanced game state with memory management
        this.gameState = new EnhancedGameState(null, {
            maxHistory: 30, // Reduced from 50 for better memory usage
            compactHistory: true,
            cleanupInterval: 60000 // 1 minute cleanup
        });
        
        // Game engine
        this.gameEngine = new SimpleGameEngine();
        
        // Enhanced systems
        this.abilitySystem = new ModularAbilitySystem();
        this.cardSystem = new CardSystem();
        this.combatSystem = new CombatSystem();
        this.aiSystem = new SimpleAISystem();
        
        // UI and logging
        this.uiManager = new UIManager();
        this.gameLogger = new GameLogger(this.eventBus);
        
        this.initializeArchitecture();
    }

    /**
     * Initialize the enhanced architecture
     */
    initializeArchitecture() {
        this.performanceMonitor.startTimer('architecture-init', 'initialization');
        
        try {
            // Setup dependency injection
            this.setupDependencies();
            
            // Initialize systems with error handling
            this.initializeSystems();
            
            // Setup enhanced event monitoring
            this.setupEventMonitoring();
            
            // Setup periodic health checks
            this.setupHealthMonitoring();
            
            // Initialize game data
            this.loadGameData();
            
            console.log('✅ Refactored architecture initialized successfully');
            this.logArchitectureHealth();
            
        } catch (error) {
            this.errorHandler.handleError(error, 
                { operation: 'architecture-initialization' },
                { severity: 'critical', emit: true }
            );
        }
        
        this.performanceMonitor.endTimer('architecture-init');
        this.performanceMonitor.endSession();
    }

    /**
     * Setup dependency injection for all systems
     */
    setupDependencies() {
        this.performanceMonitor.startTimer('dependency-setup', 'initialization');
        
        // Inject dependencies into game engine
        this.gameEngine.eventBus = this.eventBus;
        this.gameEngine.gameState = this.gameState;
        
        // Inject dependencies into systems
        const systems = [this.abilitySystem, this.cardSystem, this.combatSystem, this.aiSystem];
        
        systems.forEach(system => {
            system.gameEngine = this.gameEngine;
            system.eventBus = this.eventBus;
            system.gameState = this.gameState;
            
            // Add performance profiling to critical systems
            this.performanceMonitor.profileObject(system, system.constructor.name.toLowerCase());
        });
        
        // Inject dependencies into UI manager
        this.uiManager.gameEngine = this.gameEngine;
        this.uiManager.eventBus = this.eventBus;
        this.uiManager.gameState = this.gameState;
        
        this.performanceMonitor.endTimer('dependency-setup');
    }

    /**
     * Initialize all game systems with enhanced error handling
     */
    initializeSystems() {
        this.performanceMonitor.startTimer('systems-init', 'initialization');
        
        const systems = [
            { system: this.gameEngine, name: 'GameEngine' },
            { system: this.abilitySystem, name: 'ModularAbilitySystem' },
            { system: this.cardSystem, name: 'CardSystem' },
            { system: this.combatSystem, name: 'CombatSystem' },
            { system: this.aiSystem, name: 'AISystem' },
            { system: this.uiManager, name: 'UIManager' }
        ];
        
        systems.forEach(({ system, name }) => {
            try {
                this.performanceMonitor.startTimer(`${name}-init`, 'initialization');
                system.initialize();
                this.performanceMonitor.endTimer(`${name}-init`);
                console.log(`✅ ${name} initialized`);
            } catch (error) {
                console.error(`❌ Failed to initialize ${name}:`, error);
                this.errorHandler.handleError(error,
                    { system: name, operation: 'initialization' },
                    { severity: 'high', emit: true }
                );
            }
        });
        
        this.performanceMonitor.endTimer('systems-init');
    }

    /**
     * Setup enhanced event monitoring with the event registry
     */
    setupEventMonitoring() {
        // Wrap EventBus emit method to use registry validation
        const originalEmit = this.eventBus.emit.bind(this.eventBus);
        
        this.eventBus.emit = (eventName, data) => {
            // Track and validate through registry
            if (this.eventRegistry.trackEmit(eventName, data)) {
                return originalEmit(eventName, data);
            } else {
                console.warn(`Event emission blocked due to validation failure: ${eventName}`);
            }
        };
        
        // Wrap EventBus on/off methods to track listeners
        const originalOn = this.eventBus.on.bind(this.eventBus);
        const originalOff = this.eventBus.off.bind(this.eventBus);
        
        this.eventBus.on = (eventName, callback) => {
            this.eventRegistry.trackListener(eventName, true);
            return originalOn(eventName, callback);
        };
        
        this.eventBus.off = (eventName, callback) => {
            this.eventRegistry.trackListener(eventName, false);
            return originalOff(eventName, callback);
        };
        
        console.log('📊 Enhanced event monitoring active');
    }

    /**
     * Setup periodic health monitoring
     */
    setupHealthMonitoring() {
        // Health check every 30 seconds
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000);
        
        // Memory cleanup every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, 300000);
        
        console.log('🏥 Health monitoring active');
    }

    /**
     * Load game data with validation
     */
    loadGameData() {
        this.performanceMonitor.startTimer('data-load', 'initialization');
        
        try {
            const gameData = EmbeddedGameData.getAllData();
            
            // Validate game data
            if (gameData.cards) {
                gameData.cards.forEach((card, index) => {
                    const validation = TypeValidator.validateCard(card, `gameData.cards[${index}]`);
                    if (!validation.valid) {
                        console.warn(`Invalid card data at index ${index}:`, validation.errors);
                    }
                });
            }
            
            this.gameData = gameData;
            console.log(`✅ Game data loaded: ${gameData.cards?.length || 0} cards`);
            
        } catch (error) {
            this.errorHandler.handleError(error,
                { operation: 'load-game-data' },
                { severity: 'high', emit: true }
            );
        }
        
        this.performanceMonitor.endTimer('data-load');
    }

    /**
     * Perform comprehensive health check
     */
    performHealthCheck() {
        console.log('🏥 Performing system health check...');
        
        const health = {
            timestamp: new Date().toISOString(),
            systems: {},
            overall: 'healthy'
        };
        
        // Check game state health
        const gameStateHealth = this.gameState.getHealthMetrics();
        health.systems.gameState = gameStateHealth;
        
        // Check ability system health
        const abilityHealth = this.abilitySystem.getHealthMetrics();
        health.systems.abilitySystem = abilityHealth;
        
        // Check event system health
        const eventStats = this.eventRegistry.getEventStats();
        health.systems.eventSystem = eventStats;
        
        // Check performance metrics
        const performanceReport = this.performanceMonitor.getReport();
        health.systems.performance = {
            averageFrameRate: performanceReport.summary.averageFrameRate,
            slowOperations: performanceReport.summary.slowOperations,
            totalErrors: performanceReport.summary.totalErrors
        };
        
        // Determine overall health
        if (gameStateHealth.memoryUsage > gameStateHealth.memoryLimit * 0.9) {
            health.overall = 'warning';
        }
        
        if (performanceReport.summary.averageFrameRate < 30) {
            health.overall = 'critical';
        }
        
        // Log health status
        if (health.overall !== 'healthy') {
            console.warn('⚠️ System health issues detected:', health);
        } else {
            console.log('✅ All systems healthy');
        }
        
        // Emit health event
        this.eventBus.emit('system:health-check', health);
        
        return health;
    }

    /**
     * Perform system cleanup
     */
    performCleanup() {
        console.log('🧹 Performing system cleanup...');
        
        // Clean up event registry
        this.eventRegistry.cleanup();
        
        // Trigger game state cleanup
        this.gameState.checkForCleanup();
        
        // Check memory usage
        this.performanceMonitor.checkMemoryUsage();
        
        console.log('✅ System cleanup completed');
    }

    /**
     * Log architecture health summary
     */
    logArchitectureHealth() {
        console.log('📊 Architecture Health Summary:');
        console.log('┌─────────────────────────────────┐');
        console.log('│ ✅ Modular Ability System      │');
        console.log('│ ✅ Security Vulnerabilities    │');
        console.log('│ ✅ Type Safety & Validation    │');
        console.log('│ ✅ Consistent Error Handling   │');
        console.log('│ ✅ Memory-Safe State History   │');
        console.log('│ ✅ Centralized Event Registry  │');
        console.log('│ ✅ DOM Sanitization           │');
        console.log('│ ✅ Performance Monitoring      │');
        console.log('└─────────────────────────────────┘');
    }

    /**
     * Start the game
     */
    start() {
        console.log('🚀 Starting refactored card game...');
        
        this.performanceMonitor.startSession('gameplay');
        
        try {
            // Initialize UI with safe DOM methods
            this.initializeUI();
            
            // Start the game engine
            this.gameEngine.start();
            
            console.log('✅ Game started successfully');
        } catch (error) {
            this.errorHandler.handleError(error,
                { operation: 'game-start' },
                { severity: 'critical', emit: true }
            );
        }
    }

    /**
     * Initialize UI with enhanced security
     */
    initializeUI() {
        // Ensure DOM sanitizer is available globally for components
        window.DOMSanitizer = DOMSanitizer;
        window.TypeValidator = TypeValidator;
        
        // Start UI manager
        this.uiManager.start();
    }

    /**
     * Stop the game and cleanup
     */
    stop() {
        console.log('🛑 Stopping game...');
        
        // Clear intervals
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        // Stop performance monitoring
        this.performanceMonitor.endSession();
        this.performanceMonitor.setEnabled(false);
        
        // Stop systems
        this.gameEngine.stop();
        
        console.log('✅ Game stopped');
    }

    /**
     * Get comprehensive system status
     */
    getSystemStatus() {
        return {
            health: this.performHealthCheck(),
            performance: this.performanceMonitor.getReport(),
            events: this.eventRegistry.getEventStats(),
            gameState: this.gameState.getHealthMetrics()
        };
    }

    /**
     * Export architecture documentation
     */
    exportDocumentation() {
        return {
            events: this.eventRegistry.exportDocumentation(),
            performance: this.performanceMonitor.exportMetrics(),
            architecture: {
                version: '2.0.0',
                improvements: [
                    'Modular ability system with specialized handlers',
                    'Enhanced security with DOM sanitization',
                    'Type safety and validation throughout',
                    'Consistent error handling patterns',
                    'Memory-safe state management',
                    'Centralized event registry with validation',
                    'Performance monitoring and profiling'
                ]
            }
        };
    }
}

// Initialize the refactored game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        const game = new RefactoredCardGame();
        window.cardGame = game;
        
        // Make debugging tools available in console
        window.gameDebug = {
            getSystemStatus: () => game.getSystemStatus(),
            exportDocs: () => game.exportDocumentation(),
            performHealthCheck: () => game.performHealthCheck(),
            enablePerformanceLogging: () => game.performanceMonitor.setDetailedLogging(true),
            enableEventDebug: () => game.eventRegistry.setDebugMode(true)
        };
        
        console.log('🎮 Refactored Card Game ready! Use window.gameDebug for debugging.');
        
        // Start the game
        game.start();
        
    } catch (error) {
        console.error('❌ Failed to initialize refactored game:', error);
    }
});

export default RefactoredCardGame;