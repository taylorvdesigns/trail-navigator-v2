import { appState } from './state.js';
import { mapManager } from '../map.js';
import { CONFIG } from '../config.js';

class POIManager {
    constructor() {
        this.poiData = [];
        this.markers = new Map();
    }

    async loadPOIs() {
        try {
            appState.update({
                loading: { ...appState.loading, pois: true }
            });

            const response = await fetch('https://srtmaps.elev8maps.com/wp-json/geodir/v2/places?per_page=100');
            
            if (!response.ok) {
                throw new Error(`GeoDir error ${response.status}`);
            }

            const places = await response.json();
            await this.processPoiData(places);

            appState.update({
                loading: { ...appState.loading, pois: false },
                poisLoaded: true
            });

            return this.poiData;

        } catch (error) {
            console.error('Failed to load POI data:', error);
            appState.update({
                loading: { ...appState.loading, pois: false },
                error: {
                    type: 'POI',
                    code: 'fetch-failed',
                    message: error.message
                }
            });
            throw error;
        }
    }

    async processPoiData(places) {
        try {
            // Map each WP place into our poiData
            this.poiData = places.map(p => ({
                id: p.id,
                name: p.title.rendered,
                coords: [+p.latitude, +p.longitude],
                description: p.content.raw,
                image: p.featured_image?.[0]?.source_url || '',
                tags: (p.post_tags || []).map(t => ({ 
                    slug: t.slug, 
                    name: t.name 
                })),
                categories: (p.post_category || [])
                    .map(c => ({
                        id: c.id,
                        name: c.name,
                        slug: c.slug.replace(/^\d+-/, '')
                    }))
                    .filter(cat => cat.slug !== 'business')
            }));

            // Add markers to map
            if (mapManager.map) {
                this.addMarkersToMap();
            }

            // Update state
            appState.update({
                pois: this.poiData
            });

        } catch (error) {
            console.error('Error processing POI data:', error);
            appState.update({
                error: {
                    type: 'POI',
                    code: 'processing-failed',
                    message: error.message
                }
            });
            throw error;
        }
    }

    addMarkersToMap() {
        // Clear existing markers
        this.clearMarkers();

        // Add new markers
        this.poiData.forEach(poi => {
            try {
                const [lat, lng] = poi.coords;
                
                if (isNaN(lat) || isNaN(lng)) {
                    console.warn(`Invalid coordinates for POI: ${poi.name}`);
                    return;
                }
                
                const marker = L.marker([lat, lng])
                    .addTo(mapManager.map)
                    .bindPopup(`<strong>${poi.name}</strong>`);

                // Store marker reference
                this.markers.set(poi.id, marker);

            } catch (error) {
                console.warn(`Failed to add marker for ${poi.name}:`, error);
            }
        });
    }

    clearMarkers() {
        this.markers.forEach(marker => {
            marker.remove();
        });
        this.markers.clear();
    }

    // Method to get POI by ID
    getPOIById(id) {
        return this.poiData.find(poi => poi.id === id);
    }

    // Method to filter POIs by category
    getPOIsByCategory(category) {
        return this.poiData.filter(poi => 
            poi.categories.some(cat => cat.slug === category)
        );
    }

    // Method to filter POIs by tag
    getPOIsByTag(tag) {
        return this.poiData.filter(poi => 
            poi.tags.some(t => t.slug === tag)
        );
    }
}

// Create and export a single instance
export const poiManager = new POIManager();

// Export initialize function for cleaner imports
export const initializePOIs = () => poiManager.loadPOIs();