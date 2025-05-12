// Central state management
class AppState {
    constructor() {
        this._state = {
            map: null,
            userMarker: null,
            routeLine: null,
            routeLatLngs: [],
            lastPosition: null,
            userBearing: null,
            poiData: [],
            currentMode: 'walk',
            activeTab: 'map',
            groupFilter: null,
            initialized: false,
            loading: {
                map: false,
                route: false,
                poi: false
            }
        };
        
        this._listeners = new Set();
    }
    
    // Subscribe to state changes
    subscribe(listener) {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }
    
    // Notify listeners of state changes
    _notify() {
        this._listeners.forEach(listener => listener(this._state));
    }
    
    // Update state
    update(changes) {
        const oldState = { ...this._state };
        this._state = {
            ...this._state,
            ...changes
        };
        
        // Log state changes in development
        console.log('State updated:', {
            changes,
            oldState: oldState,
            newState: this._state
        });
        
        this._notify();
    }
    
    // Getters
    get map() { return this._state.map; }
    get userMarker() { return this._state.userMarker; }
    get routeLine() { return this._state.routeLine; }
    get routeLatLngs() { return this._state.routeLatLngs; }
    get lastPosition() { return this._state.lastPosition; }
    get userBearing() { return this._state.userBearing; }
    get poiData() { return this._state.poiData; }
    get currentMode() { return this._state.currentMode; }
    get activeTab() { return this._state.activeTab; }
    get groupFilter() { return this._state.groupFilter; }
    get initialized() { return this._state.initialized; }
    get loading() { return this._state.loading; }
    
    // Check if critical data is loaded
    isReady() {
        return this.initialized &&
               this.map &&
               this.routeLine &&
               this.poiData.length > 0;
    }
}

// Create and export a single instance
export const appState = new AppState();