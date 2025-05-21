import { CONFIG } from './config.js';
import { appState } from './data/state.js';
import { mapManager, initializeMap } from './map.js';
import { initializePOIs } from './data/poiManager.js';
import { initializeRoute } from './data/routeData.js';
import { NavView } from './views/navView.js';
import { initializeListView, listView } from './views/ListView.js';

class TrailNavigator {
    constructor() {
        this.initialized = false;
        this.navView = null;
        this.currentView = 'map';
		this.listView = listView;
        
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
	    console.log('Switching to view:', viewName); // Debug log

	    // Update tab buttons
	    document.querySelectorAll('.tab-button').forEach(btn => {
	        btn.classList.toggle('active', btn.dataset.view === viewName);
	    });

	    // Hide/show views
	    const mapView = document.getElementById('map');
	    const navView = document.getElementById('nav-view');
	    const listView = document.getElementById('list-view');

	    // Add hidden class to all views first
	    mapView.classList.add('hidden');
	    navView.classList.add('hidden');
	    listView.classList.add('hidden');

	    // Remove hidden class from the selected view
	    switch(viewName) {
	        case 'map':
	            mapView.classList.remove('hidden');
	            break;
	        case 'nav':
	            navView.classList.remove('hidden');
	            break;
	        case 'list':
	            listView.classList.remove('hidden');
	            // Force a re-render of the list view
	            if (this.listView) {
	                this.listView.render();
	            }
	            break;
	    }
    
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
	        await this.initializeViews(); // Add await here

	        this.initialized = true;
	        document.body.classList.add('app-ready');

	    } catch (error) {
	        console.error('Failed to initialize app:', error);
	    }
	}

	async initializeViews() {
	    // Initialize NavView
	    this.navView = new NavView();
	    this.navView.initialize();
	    await initializeListView();
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