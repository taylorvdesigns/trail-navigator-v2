import { appState } from '../data/state.js';
import { poiManager } from '../data/poiManager.js';
import { CONFIG } from '../config.js';

const LOCOMOTION_SPEEDS = {
    WALKING: 3,
    RUNNING: 7,
    BIKING: 10
};

const CATEGORIES = [
    { slug: 'food',       iconClass: 'fas fa-utensils',       title: 'Food'      },
    { slug: 'drink',      iconClass: 'fas fa-beer-mug-empty', title: 'Drink'     },
    { slug: 'ice-cream',  iconClass: 'fas fa-ice-cream',      title: 'Ice Cream' },
    { slug: 'landmark',   iconClass: 'fas fa-map-pin',        title: 'Landmark'  },
    { slug: 'playground', iconClass: 'fas fa-child-reaching', title: 'Playground'}
];

export class NavView {
    constructor() {
        this.container = null;
        this.currentLocation = null;
        this.currentDirection = 0; // degrees, 0 = north
        this.selectedLocomotion = 'WALKING';
        this.selectedCategories = new Set();
        this.isTestMode = false;
        
        // For progressive disclosure
        this.viewDistance = 2; // Initial view distance in miles
        this.distanceIncrement = 2; // Miles to add when "Show More" is clicked
        this.maxDistance = 15; // Maximum distance to show POIs
        this.visiblePOIsAhead = new Set();
        this.visiblePOIsBehind = new Set();

        // Load saved preferences
        this.loadPreferences();
    }

    initialize() {
        console.log('Initializing NavView');
        this.container = document.getElementById('nav-view');
        if (!this.container) {
            console.error('Nav view container not found');
            return;
        }

        // Initial render
        this.render();
        
        // Attach event listeners
        this.attachEventListeners();
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="nav-view-content">
                <div class="locomotion-section">
                    <div class="locomotion-toggles">
                        <button class="${this.selectedLocomotion === 'WALKING' ? 'active' : ''}" data-mode="WALKING">
                            <i class="fas fa-person-walking"></i>
                            <span>Walking</span>
                        </button>
                        <button class="${this.selectedLocomotion === 'RUNNING' ? 'active' : ''}" data-mode="RUNNING">
                            <i class="fas fa-person-running"></i>
                            <span>Running</span>
                        </button>
                        <button class="${this.selectedLocomotion === 'BIKING' ? 'active' : ''}" data-mode="BIKING">
                            <i class="fas fa-bicycle"></i>
                            <span>Biking</span>
                        </button>
                    </div>
                </div>

                <div class="pois-ahead-section">
                    <h3>Ahead</h3>
                    <div class="poi-list">
                        <div class="poi-item">
                            <div class="poi-icons">
                                <i class="fas fa-utensils"></i>
                            </div>
                            <div class="poi-details">
                                <div class="poi-name">Test POI Ahead</div>
                                <div class="poi-meta">1.5 mi • 30 min</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="direction-filters-section">
                    <div class="direction-indicator">
                        <i class="fas fa-arrow-up"></i>
                    </div>
                    <div class="category-filters">
                        ${CATEGORIES.map(cat => `
                            <button class="${this.selectedCategories.has(cat.slug) ? 'active' : ''}" 
                                    data-category="${cat.slug}">
                                <i class="${cat.iconClass}"></i>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="pois-behind-section">
                    <h3>Behind</h3>
                    <div class="poi-list">
                        <div class="poi-item">
                            <div class="poi-icons">
                                <i class="fas fa-landmark"></i>
                            </div>
                            <div class="poi-details">
                                <div class="poi-name">Test POI Behind</div>
                                <div class="poi-meta">0.8 mi • 15 min</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Locomotion mode toggles
        const locomotionBtns = this.container.querySelectorAll('.locomotion-toggles button');
        locomotionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.handleLocomotionChange(mode);
            });
        });

        // Category filters
        const filterBtns = this.container.querySelectorAll('.category-filters button');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.handleCategoryToggle(category);
            });
        });
    }

    handleLocomotionChange(mode) {
        this.selectedLocomotion = mode;
        this.savePreferences();
        this.render();
    }

    handleCategoryToggle(category) {
        if (this.selectedCategories.has(category)) {
            this.selectedCategories.delete(category);
        } else {
            this.selectedCategories.add(category);
        }
        this.savePreferences();
        this.render();
    }

    handleLocationUpdate(location) {
        this.currentLocation = location;
        this.render();
    }

    handleDirectionChange(direction) {
        this.currentDirection = direction;
        this.render();
    }

    loadPreferences() {
        try {
            const saved = localStorage.getItem('navViewPreferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.selectedLocomotion = prefs.locomotion || 'WALKING';
                this.selectedCategories = new Set(prefs.categories || []);
            }
        } catch (error) {
            console.warn('Failed to load nav view preferences:', error);
        }
    }

    savePreferences() {
        try {
            localStorage.setItem('navViewPreferences', JSON.stringify({
                locomotion: this.selectedLocomotion,
                categories: Array.from(this.selectedCategories)
            }));
        } catch (error) {
            console.warn('Failed to save nav view preferences:', error);
        }
    }
}