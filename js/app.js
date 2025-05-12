import { CONFIG } from './config.js';
import { appState } from './data/state.js';
import { mapManager, initializeMap } from './map.js';
import { initializePOIs } from './data/poiManager.js';
import { initializeRoute } from './data/routeData.js';
import { NavView } from './views/navView.js';

class TrailNavigator {
    constructor() {
        this.initialized = false;
        this.navView = null;
        this.currentView = 'map'; // Default view
        
        // Initialize tab switching
        this.initializeTabBar();
        
        appState.subscribe(this.handleStateChange.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    initializeTabBar() {
        const tabBar = document.getElementById('tab-bar');
        if (tabBar) {
            tabBar.addEventListener('click', (e) => {
                const button = e.target.closest('.tab-button');
                if (button) {
                    const view = button.dataset.view;
                    if (view) {
                        this.switchView(view);
                    }
                }
            });
        }
    }

    switchView(viewName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Hide all views
        document.getElementById('map').classList.toggle('hidden', viewName !== 'map');
        document.getElementById('nav-view').classList.toggle('hidden', viewName !== 'nav');
        // Add list view when implemented
        
        // Update current view
        this.currentView = viewName;
        
        // Update state
        appState.update({ currentView: viewName });
    }

    async initialize() {
        try {
            // Initialize map first
            await initializeMap();

            // Load POIs and route data in parallel
            await Promise.all([
                initializePOIs(),
                initializeRoute()
            ]);

            // Initialize views
            this.initializeViews();

            this.initialized = true;
            document.body.classList.add('app-ready');

        } catch (error) {
            console.error('Failed to initialize app:', error);
        }
    }

    initializeViews() {
        // Initialize NavView
        this.navView = new NavView();
        this.navView.initialize();
    }

    handleStateChange(state) {
        if (state.currentView && state.currentView !== this.currentView) {
            this.switchView(state.currentView);
        }
    }

    handleResize() {
        if (mapManager.map) {
            mapManager.map.invalidateSize();
        }
    }

    handleError(error) {
        console.error('App error:', error);
        // Implement error handling UI
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new TrailNavigator();
    app.initialize();
});