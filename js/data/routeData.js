import { CONFIG } from '../config.js';           // Go up one directory
import { appState } from './state.js';           // Same directory
import { mapManager } from '../map.js';          // Go up one directory

class RouteManager {
    constructor() {
        this.routeData = null;
    }

	async fetchRoute() {
	        try {
	            appState.update({
	                loading: { ...appState.loading, route: true }
	            });

	            const response = await fetch(CONFIG.ROUTE.URL);

	            if (!response.ok) {
	                throw new Error(`Failed to fetch route: ${response.status}`);
	            }

	            const data = await response.json();
	            this.routeData = data;
            
	            // Process route data
	            const routePoints = this._processRouteData(data);
            
	            // Update map with route
	            mapManager.setRouteData(routePoints);

	            // Ensure map is properly sized before fitting to route
	            mapManager.map.invalidateSize();
            
	            // Add a slight delay before fitting to route
	            setTimeout(() => {
	                mapManager.fitToRoute(routePoints);
	            }, 250);

	            appState.update({
	                loading: { ...appState.loading, route: false }
	            });

	            return routePoints;

        } catch (error) {
            console.error('Error fetching route:', error);
            appState.update({
                loading: { ...appState.loading, route: false }
            });
            throw error;
        }
    }

    _processRouteData(data) {
        if (!data || !data.route || !data.route.track_points) {
            throw new Error('Invalid route data format');
        }

        // Convert track points to [lat, lng] format
        return data.route.track_points.map(point => [
            point.y, // latitude
            point.x  // longitude
        ]);
    }

    fitMapToRoute(coordinates) {
        if (!coordinates || coordinates.length === 0) {
            console.warn('No coordinates provided to fit map view');
            return;
        }

        try {
            // Create a bounds object from the route coordinates
            const bounds = L.latLngBounds(coordinates);
            
            // Fit the map to these bounds with some padding
            mapManager.map.fitBounds(bounds, {
                padding: [50, 50], // Add 50px padding around the route
                maxZoom: 16        // Prevent zooming in too far
            });
            
            console.log('Map view fitted to route bounds');
        } catch (error) {
            console.error('Error fitting map to route:', error);
        }
    }

    // Get elevation for a specific point on the route
    getElevationAt(index) {
        if (!this.routeData?.route?.track_points?.[index]) {
            return null;
        }
        return this.routeData.route.track_points[index].e;
    }

    // Get the closest point on the route to given coordinates
    findClosestPoint(lat, lng) {
        if (!this.routeData?.route?.track_points) {
            return null;
        }

        let minDistance = Infinity;
        let closestIndex = 0;

        this.routeData.route.track_points.forEach((point, index) => {
            const distance = this._calculateDistance(
                lat, lng,
                point.y, point.x
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        return {
            index: closestIndex,
            point: this.routeData.route.track_points[closestIndex],
            distance: minDistance
        };
    }

    _calculateDistance(lat1, lon1, lat2, lon2) {
        // Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = this._toRad(lat2 - lat1);
        const dLon = this._toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    _toRad(degrees) {
        return degrees * (Math.PI/180);
    }
}

// Create and export a single instance
export const routeManager = new RouteManager();

// Export initialize function for cleaner imports
export const initializeRoute = () => routeManager.fetchRoute();