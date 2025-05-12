import { CONFIG } from './config.js';
import { appState } from './data/state.js';

class MapManager {
    constructor() {
        this.map = null;
        this.userMarker = null;
        this.routeLine = null;
        this.markers = new Map();
    }

    _getInitialViewFromURL() {
        const params = new URLSearchParams(window.location.search);
        return {
            lat: parseFloat(params.get('lat')) || CONFIG.MAP.DEFAULT_COORDS[0],
            lng: parseFloat(params.get('lng')) || CONFIG.MAP.DEFAULT_COORDS[1],
            zoom: parseInt(params.get('z')) || CONFIG.MAP.DEFAULT_ZOOM
        };
    }

    async initialize() {
        try {
            if (this.map) {
                console.log('Map already initialized, skipping initialization');
                return this.map;
            }

            // Get initial view settings from URL
            const initialView = this._getInitialViewFromURL();
            console.log('Initial view settings:', initialView);

            // Clear any existing map instance
            const container = document.getElementById('map');
            if (container._leaflet_id) {
                container._leaflet_id = null;
            }

            // Wait for DOM to be fully ready
            await new Promise(resolve => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve);
                }
            });

            // Initialize map with the URL parameters
            this.map = L.map('map', {
                zoomControl: true,
                dragging: true,
                scrollWheelZoom: true,
                doubleClickZoom: true,
                touchZoom: true
            }).setView([initialView.lat, initialView.lng], initialView.zoom);
            
            // Add tile layer
            L.tileLayer(CONFIG.MAP.TILES, {
                attribution: CONFIG.MAP.ATTRIBUTION
            }).addTo(this.map);

            // Create user location marker
            this.userMarker = L.marker([initialView.lat, initialView.lng], {
                icon: L.divIcon({
                    className: 'user-marker',
                    html: '<i class="fas fa-circle"></i>',
                    iconSize: [12, 12]
                })
            });

            // Initialize empty route line
            this.routeLine = L.polyline([], {
                color: '#FF3B30',
                weight: 4
            }).addTo(this.map);

            // Set up map event listeners
            this._setupEventListeners();

            // Force immediate resize
            this.map.invalidateSize(true);

            // Add a delayed resize as backup
            setTimeout(() => {
                this.map.invalidateSize(true);
            }, 100);

            // Update state
            appState.update({
                map: this.map,
                userMarker: this.userMarker,
                routeLine: this.routeLine,
                loading: {
                    ...appState.loading,
                    map: false
                }
            });

            console.log('Map initialized successfully');
            return this.map;

        } catch (error) {
            console.error('Failed to initialize map:', error);
            throw error;
        }
    }

    _setupEventListeners() {
        // Map move/zoom events
        this.map.on('moveend', () => this._handleMapMove());
        this.map.on('zoomend', () => this._handleMapZoom());
        
        // Update markers when state changes
        appState.subscribe((state) => {
            if (state.lastPosition) {
                this.updateUserLocation(state.lastPosition);
            }
        });

        // Add a resize observer to handle container size changes
        const resizeObserver = new ResizeObserver(() => {
            this.map.invalidateSize();
        });
        resizeObserver.observe(document.getElementById('map'));
    }

    _handleMapMove() {
        // Store map center in URL
        const center = this.map.getCenter();
        const params = new URLSearchParams(window.location.search);
        params.set('lat', center.lat.toFixed(6));
        params.set('lng', center.lng.toFixed(6));
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    }

    _handleMapZoom() {
        // Store zoom level in URL
        const params = new URLSearchParams(window.location.search);
        params.set('z', this.map.getZoom());
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    }

    updateUserLocation(position) {
        const { latitude, longitude, accuracy } = position.coords;
        const latlng = [latitude, longitude];

        // Update user marker
        this.userMarker.setLatLng(latlng);
        
        // Add accuracy circle if it doesn't exist
        if (!this.accuracyCircle) {
            this.accuracyCircle = L.circle(latlng, {
                radius: accuracy,
                color: '#007AFF',
                fillColor: '#007AFF',
                fillOpacity: 0.1,
                weight: 1
            }).addTo(this.map);
        } else {
            this.accuracyCircle.setLatLng(latlng);
            this.accuracyCircle.setRadius(accuracy);
        }

        // Show user marker if hidden
        if (!this.map.hasLayer(this.userMarker)) {
            this.userMarker.addTo(this.map);
        }
    }

    setRouteData(routePoints) {
        // Update route line with new coordinates
        this.routeLine.setLatLngs(routePoints);
        
        // Store route data in state
        appState.update({
            routeLatLngs: routePoints
        });

        // Fit map to route bounds
        if (routePoints.length > 0) {
            this.map.fitBounds(this.routeLine.getBounds());
        }
    }

    addMarker(id, latlng, options = {}) {
        if (this.markers.has(id)) {
            this.markers.get(id).setLatLng(latlng);
            return;
        }

        const marker = L.marker(latlng, options).addTo(this.map);
        this.markers.set(id, marker);
        return marker;
    }

    removeMarker(id) {
        if (this.markers.has(id)) {
            const marker = this.markers.get(id);
            marker.remove();
            this.markers.delete(id);
        }
    }

    panTo(latlng, zoom = null) {
        if (zoom !== null) {
            this.map.setView(latlng, zoom);
        } else {
            this.map.panTo(latlng);
        }
    }
	
	fitToRoute(coordinates) {
	        if (!coordinates || coordinates.length === 0) {
	            console.warn('No coordinates provided to fit map view');
	            return;
	        }

	        try {
	            // Create a bounds object from the route coordinates
	            const bounds = L.latLngBounds(coordinates);
            
	            // Add a slight delay to ensure map is ready
	            setTimeout(() => {
	                // Fit the map to these bounds with some padding
	                this.map.fitBounds(bounds, {
	                    padding: [50, 50], // Add 50px padding around the route
	                    maxZoom: 16        // Prevent zooming in too far
	                });
	                console.log('Map view fitted to route bounds');
	            }, 250);
            
	        } catch (error) {
	            console.error('Error fitting map to route:', error);
	        }
	    }
}

// Create and export a single instance
export const mapManager = new MapManager();

// Export initialize function for cleaner imports
export const initializeMap = () => mapManager.initialize();