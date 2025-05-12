import { CONFIG } from './config.js';
import { appState } from './data/state.js';

class TrailNavigator {
    constructor() {
        // Initialize state listeners
        appState.subscribe(this.handleStateChange.bind(this));
    }
    
    async initialize() {
        try {
            // Initialize loading state
            appState.update({
                loading: {
                    map: true,
                    route: true,
                    poi: true
                }
            });
            
            // Basic initialization for testing
            const map = L.map('map').setView(CONFIG.MAP.DEFAULT_COORDS, CONFIG.MAP.DEFAULT_ZOOM);
            
            L.tileLayer(CONFIG.MAP.TILES, {
                attribution: CONFIG.MAP.ATTRIBUTION
            }).addTo(map);
            
            appState.update({
                map,
                loading: {
                    map: false,
                    route: false,
                    poi: false
                },
                initialized: true
            });
            
            console.log('Trail Navigator initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Trail Navigator:', error);
            this.handleError(error);
        }
    }
    
    handleStateChange(state) {
        // Update loading indicator
        this.updateLoadingState(state.loading);
        
        // Update UI based on state changes
        if (state.initialized) {
            document.body.classList.add('app-ready');
        }
    }
    
    updateLoadingState(loading) {
        const isLoading = Object.values(loading).some(state => state);
        document.body.classList.toggle('loading', isLoading);
    }
    
    handleError(error) {
        console.error('Application error:', error);
        // TODO: Add user-friendly error handling
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new TrailNavigator();
    app.initialize();
});