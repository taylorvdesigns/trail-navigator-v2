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