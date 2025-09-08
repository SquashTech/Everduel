import { CHAMPIONS } from '../data/EmbeddedGameData.js';

/**
 * Champion Selection Component
 * Displays a 5x2 grid organized by colors with Card Library format display
 */
export default class ChampionSelectionComponent {
    constructor() {
        this.selectedChampion = null;
        this.onChampionSelected = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the champion selection component
     */
    initialize(onChampionSelected) {
        this.onChampionSelected = onChampionSelected;
        this.isInitialized = true;
        console.log('⚔️ ChampionSelectionComponent initialized');
    }

    /**
     * Show the champion selection screen
     */
    show() {
        const modal = document.getElementById('championSelectionModal');
        if (!modal) {
            console.error('Champion selection modal not found');
            return;
        }

        // Populate champion grid
        this.populateChampionGrid();
        
        // Show initial placeholder message
        this.showPlaceholderMessage();

        // Show the modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // Hide scenario selection
        const scenarioSelection = document.getElementById('scenarioSelection');
        if (scenarioSelection) {
            scenarioSelection.classList.add('hidden');
        }

        console.log('👑 Champion selection shown');
    }

    /**
     * Show placeholder message when no champion is selected
     */
    showPlaceholderMessage() {
        const display = document.getElementById('championCardsDisplay');
        if (!display) return;

        display.innerHTML = `
            <div class="champion-cards-placeholder">
                Click a champion below to see their cards and spells
            </div>
        `;
    }

    /**
     * Hide the champion selection screen
     */
    hide() {
        const modal = document.getElementById('championSelectionModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }

    /**
     * Populate the 5x2 champion grid organized by colors
     */
    populateChampionGrid() {
        // Group champions by color and slot
        const championsByColor = {
            red: [],
            yellow: [],
            green: [],
            blue: [],
            purple: []
        };

        Object.values(CHAMPIONS).forEach(champion => {
            if (championsByColor[champion.color]) {
                championsByColor[champion.color].push(champion);
            }
        });

        // Populate each grid slot
        Object.keys(championsByColor).forEach(color => {
            const champions = championsByColor[color];
            
            // Place champions in slots (max 2 per color)
            for (let slot = 0; slot < 2; slot++) {
                const gridSlot = document.querySelector(`[data-color="${color}"][data-slot="${slot}"]`);
                if (!gridSlot) continue;

                gridSlot.innerHTML = '';

                if (champions[slot]) {
                    // Create champion button for existing champion
                    const button = this.createChampionButton(champions[slot]);
                    gridSlot.appendChild(button);
                } else {
                    // Create placeholder button
                    const placeholder = this.createPlaceholderButton(color);
                    gridSlot.appendChild(placeholder);
                }
            }
        });

        // Setup PLAY button
        this.setupPlayButton();
    }

    /**
     * Create a champion button
     */
    createChampionButton(champion) {
        const button = document.createElement('button');
        button.className = `champion-grid-btn champion-grid-btn-${champion.color}`;
        button.dataset.championId = champion.id;

        button.innerHTML = `
            <div class="champion-grid-name">${champion.name}</div>
        `;

        button.addEventListener('click', () => {
            this.selectChampion(champion);
        });

        return button;
    }

    /**
     * Create a placeholder button
     */
    createPlaceholderButton(color) {
        const button = document.createElement('div');
        button.className = `champion-grid-btn champion-grid-placeholder champion-grid-btn-${color}`;

        button.innerHTML = `
            <div class="champion-grid-name">Coming Soon</div>
        `;

        return button;
    }

    /**
     * Select a champion and display their cards
     */
    selectChampion(champion) {
        // Remove previous selections
        document.querySelectorAll('.champion-grid-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Highlight selected button
        const selectedBtn = document.querySelector(`[data-champion-id="${champion.id}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }

        this.selectedChampion = champion;
        this.displayChampionCards(champion);
        
        // Enable PLAY button
        const playBtn = document.getElementById('playWithChampionBtn');
        if (playBtn) {
            playBtn.disabled = false;
        }

        console.log(`👑 Champion selected: ${champion.name}`);
    }

    /**
     * Display champion cards with info directly below each card
     */
    displayChampionCards(champion) {
        const display = document.getElementById('championCardsDisplay');
        if (!display) return;

        // Create the grid container for card+info pairs
        const gridHTML = `
            <div class="champion-cards-with-info">
                <!-- Card+info pairs will be populated here -->
            </div>
        `;
        display.innerHTML = gridHTML;

        const container = display.querySelector('.champion-cards-with-info');
        if (!container) return;

        // Create champion card with info below
        const championWrapper = this.createCardWithInfo(champion, 'unit');
        container.appendChild(championWrapper);

        // Add Spellbook header
        const spellbookHeader = document.createElement('div');
        spellbookHeader.className = 'champion-spellbook-header';
        spellbookHeader.textContent = 'Spellbook:';
        container.appendChild(spellbookHeader);

        // Create spell cards with info below
        champion.spellbook.forEach(spell => {
            const spellWrapper = this.createCardWithInfo(spell, 'spell');
            container.appendChild(spellWrapper);
        });
    }

    /**
     * Create a card with its info positioned directly below
     */
    createCardWithInfo(cardData, type) {
        const wrapper = document.createElement('div');
        wrapper.className = 'card-with-info';

        // Create the game card
        const gameCard = this.createGameCard(cardData, type);
        wrapper.appendChild(gameCard);

        // Create info section below the card
        const infoDiv = document.createElement('div');
        infoDiv.className = 'card-info-below';

        if (type === 'unit') {
            // Champion info
            infoDiv.innerHTML = `
                <div class="card-cost">${cardData.cost} 💰</div>
            `;
        } else {
            // Spell info  
            infoDiv.innerHTML = `
                <div class="card-cost">${cardData.cost} 💰</div>
                <div class="card-copies">x${cardData.stock}</div>
            `;
        }

        wrapper.appendChild(infoDiv);
        return wrapper;
    }

    /**
     * Create a game card matching the exact in-game appearance
     */
    createGameCard(cardData, type) {
        const card = document.createElement('div');
        card.className = `game-card game-card--hand ${cardData.color}`;
        card.style.width = '165px'; // Match battlefield card width
        card.style.height = '140px'; // Match battlefield card height

        // Champions have crown indicator, spells have no tier indicator
        // Only regular units have tier indicators
        // Champions are detected by having a spellbook property
        const isChampion = type === 'unit' && cardData.spellbook && cardData.spellbook.length > 0;
        let tierIndicatorHTML = '';
        if (type === 'unit' && cardData.tier && !isChampion) {
            tierIndicatorHTML = `<div class="tier-indicator">${cardData.tier}</div>`;
        } else if (isChampion) {
            tierIndicatorHTML = `<div class="crown-indicator">👑</div>`;
        }

        // Card header - same format as in-game
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        const nameDiv = document.createElement('div');
        nameDiv.className = 'card-name';
        nameDiv.textContent = cardData.name;
        cardHeader.appendChild(nameDiv);
        
        // Add tier indicator if needed
        if (tierIndicatorHTML) {
            card.innerHTML = tierIndicatorHTML;
        }
        card.appendChild(cardHeader);

        // Card ability - same format as in-game
        const abilityDiv = document.createElement('div');
        abilityDiv.className = 'card-ability';
        const ability = type === 'spell' ? cardData.description : cardData.ability;
        abilityDiv.textContent = ability || '';
        card.appendChild(abilityDiv);

        // Card stats - same format as in-game
        const statsDiv = document.createElement('div');
        statsDiv.className = 'card-stats';
        
        if (type === 'unit') {
            // Champions and units show attack/health with same icons as in-game
            const attackDiv = document.createElement('div');
            attackDiv.className = 'stat-attack';
            const attackIcon = document.createElement('span');
            attackIcon.className = 'stat-icon';
            attackIcon.textContent = '⚔️';
            const attackValue = document.createElement('span');
            attackValue.className = 'stat-value';
            attackValue.textContent = cardData.attack.toString();
            attackDiv.appendChild(attackIcon);
            attackDiv.appendChild(attackValue);
            
            const healthDiv = document.createElement('div');
            healthDiv.className = 'stat-health';
            const healthIcon = document.createElement('span');
            healthIcon.className = 'stat-icon';
            healthIcon.textContent = '❤️';
            const healthValue = document.createElement('span');
            healthValue.className = 'stat-value';
            healthValue.textContent = cardData.health.toString();
            healthDiv.appendChild(healthIcon);
            healthDiv.appendChild(healthValue);
            
            statsDiv.appendChild(attackDiv);
            statsDiv.appendChild(healthDiv);
        }
        // Spells have empty stats div like in-game spell cards
        card.appendChild(statsDiv);

        // Card tags - same format as in-game
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'card-tags';
        if (cardData.tags && cardData.tags.length > 0) {
            // Show all tags
            cardData.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'tag';
                tagSpan.textContent = tag;
                tagsDiv.appendChild(tagSpan);
            });
        }
        card.appendChild(tagsDiv);

        return card;
    }

    /**
     * Setup PLAY button functionality
     */
    setupPlayButton() {
        const playBtn = document.getElementById('playWithChampionBtn');
        if (!playBtn) {
            console.error('PLAY button not found');
            return;
        }

        // Remove existing event listeners
        playBtn.replaceWith(playBtn.cloneNode(true));
        const newPlayBtn = document.getElementById('playWithChampionBtn');

        newPlayBtn.addEventListener('click', () => {
            this.startGameWithSelectedChampion();
        });
    }

    /**
     * Start the game with the selected champion
     */
    startGameWithSelectedChampion() {
        if (!this.selectedChampion) {
            console.error('No champion selected');
            return;
        }

        console.log(`👑 Starting game with champion: ${this.selectedChampion.name}`);

        // Hide champion selection
        this.hide();

        // Callback to proceed with the game
        if (this.onChampionSelected) {
            this.onChampionSelected(this.selectedChampion);
        }
    }

    /**
     * Get the currently selected champion
     */
    getSelectedChampion() {
        return this.selectedChampion;
    }
}