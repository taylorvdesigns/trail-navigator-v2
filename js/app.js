import { CONFIG } from './config.js';
import { appState } from './data/state.js';
import { mapManager, initializeMap } from './map.js';
import { initializePOIs } from './data/poiManager.js';
import { initializeRoute } from './data/routeData.js';

class TrailNavigator {
    constructor() {
        this.initialized = false;
        appState.subscribe(this.handleStateChange.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    async initialize() {    // <-- Here's the async initialize() function
        try {
            // Initialize map first
            await initializeMap();

            // Load POIs and route data in parallel
            await Promise.all([
                initializePOIs(),
                initializeRoute()
            ]);

            this.initialized = true;
            document.body.classList.add('app-ready');

        } catch (error) {
            console.error('Failed to initialize app:', error);
            // Handle initialization error
        }
    }

    handleStateChange(state) {
        // Handle state changes
        if (state.error) {
            this.handleError(state.error);
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