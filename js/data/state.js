let state = {};

// Nav View enhancements:
state.selectedCategories = [];
state.locomotionMode = 'walk';
state.headingOverride = null;
state.categoryList = [
    { slug: 'food', iconClass: 'fas fa-utensils', title: 'Food' },
    { slug: 'drink', iconClass: 'fas fa-beer-mug-empty', title: 'Drink' },
    { slug: 'ice-cream', iconClass: 'fas fa-ice-cream', title: 'Ice Cream' },
    { slug: 'landmark', iconClass: 'fas fa-map-pin', title: 'Landmark' },
    { slug: 'playground', iconClass: 'fas fa-child-reaching', title: 'Playground' }
];
state.headingToward = '';
state.headingAwayFrom = '';
state.currentSpur = 'main';
state.activeView = 'nav';
state.activeGroupId = null;

export { state };

class AppState {
    constructor() {
        this.subscribers = [];  // Initialize subscribers array first
        this.state = {
            map: null,
            userMarker: null,
            routeLine: null,
            pois: [],
            poisLoaded: false,
            loading: {
                map: true,
                route: false,
                pois: false
            },
            error: null
        };
    }

    subscribe(callback) {
        if (typeof callback === 'function') {
            this.subscribers.push(callback);
        } else {
            console.warn('Invalid subscriber callback provided:', callback);
        }
    }

    update(newState) {
        this.state = {
            ...this.state,
            ...newState
        };
        this.notify();
    }

    notify() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.state);
            } catch (error) {
                console.error('Error in state subscriber callback:', error);
            }
        });
    }

    getState() {
        return this.state;
    }
}

export const appState = new AppState();