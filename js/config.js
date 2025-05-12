// Configuration constants
export const CONFIG = {
    MAP: {
        DEFAULT_COORDS: [34.963255, -82.453066], // Updated to Travelers Rest coordinates
        DEFAULT_ZOOM: 13,
        MAX_TRAIL_DISTANCE: 0.1, // miles, for detecting if user is on trail
        TILES: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '© OpenStreetMap contributors'
    },
    
    ROUTE: {
        ID: 50608713,
        API_KEY: '81c8a1eb',
        AUTH_TOKEN: '5cc5e4b222670322422e8a3fb7324379',
        get URL() {
            return `https://ridewithgps.com/api/v1/routes/${this.ID}.json?version=2`;
        }
    },
    
    POI: {
        API_URL: 'https://srtmaps.elev8maps.com/wp-json/geodir/v2/places',
        PER_PAGE: 100
    },
    
    TRAVEL_MODES: {
        walk: { speed: 3.1, icon: 'fa-solid fa-walking' },
        run: { speed: 5.0, icon: 'fa-solid fa-running' },
        bike: { speed: 12.0, icon: 'fa-solid fa-bicycle' }
    },
    
    TRAIL: {
        START: "Travelers Rest",
        END: "Conestee Park"
    }
};