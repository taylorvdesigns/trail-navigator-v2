import { appState } from '../data/state.js';
import { poiManager } from '../data/poiManager.js';
import { CONFIG } from '../config.js';

const LOCOMOTION_SPEEDS = {
    WALKING: 3,
    RUNNING: 7,
    BIKING: 10
};

const CATEGORIES = [
    { slug: 'food',       iconClass: 'fas fa-utensils',       title: 'Food'      },
    { slug: 'drink',      iconClass: 'fas fa-beer-mug-empty', title: 'Drink'     },
    { slug: 'ice-cream',  iconClass: 'fas fa-ice-cream',      title: 'Ice Cream' },
    { slug: 'landmark',   iconClass: 'fas fa-map-pin',        title: 'Landmark'  },
    { slug: 'playground', iconClass: 'fas fa-child-reaching', title: 'Playground'}
];

export class NavView {
	constructor() {
	        this.container = null;
	        this.currentLocation = null;
	        this.currentDirection = 0;
	        this.selectedLocomotion = 'WALKING';
	        this.selectedCategories = new Set();
	        this.modal = null;
	        this.viewDistance = 2;
	        this.distanceIncrement = 2;
	        this.maxDistance = 15;
	        this.visiblePOIsAhead = new Set();
	        this.visiblePOIsBehind = new Set();
	        this.loadPreferences();
	        appState.subscribe(this.handleStateChange.bind(this));
			
	    }

		initialize() {
		        console.log('Initializing NavView');
		        this.container = document.getElementById('nav-view');
		        if (!this.container) {
		            console.error('Nav view container not found');
		            return;
		        }

		        // Get initial state
		        const state = appState.getState();
		        console.log('Initial state in NavView:', {
		            poisLoaded: state.poisLoaded,
		            hasPois: state.pois ? state.pois.length : 0,
		            hasLocation: !!state.userLocation
		        });

		        this.currentLocation = state.userLocation;
		        this.currentDirection = state.userDirection || 0;

		        // If POIs are already loaded, update immediately
		        if (state.poisLoaded && state.pois) {
		            console.log('POIs already loaded, updating lists');
		            this.updatePOILists();
		        }

		        this.render();
		    }

	// Update the updatePOILists method
	updatePOILists() {
	// Add this at the beginning of the method
	    const state = appState.getState();
	    if (state.pois && state.pois.length > 0) {
	        console.log("Sample POI structure:", state.pois[0]);
	    }

	    const allPOIs = state.pois || (poiManager.poiData || []);
	    const userLocation = this.currentLocation;
    
	    if (!allPOIs || allPOIs.length === 0) {
	        console.log('No POIs available');
	        return;
	    }

	    // Clear existing lists
	    this.visiblePOIsAhead.clear();
	    this.visiblePOIsBehind.clear();

	    // Log first POI structure
	    if (allPOIs.length > 0) {
	        console.log('Sample POI structure:', allPOIs[0]);
	    }

	    allPOIs.forEach(poi => {
	        // Skip if category is filtered out
	        if (this.selectedCategories.size > 0 && 
	            !poi.categories?.some(cat => this.selectedCategories.has(cat.slug))) {
	            return;
	        }

	        // Get coordinates from the coords array
	        const poiLocation = {
	            lat: poi.coords?.[0] || poi.latitude,
	            lng: poi.coords?.[1] || poi.longitude
	        };

	        if (!poiLocation.lat || !poiLocation.lng) {
	            console.warn('POI missing valid coordinates:', poi);
	            return;
	        }

	        let poiData = { ...poi };

	        // Only calculate distance-related data if we have user location
	        if (userLocation) {
	            const distance = this.calculateDistance(userLocation, poiLocation);
            
	            // Skip if beyond max view distance
	            if (distance > this.maxDistance) {
	                return;
	            }

	            const bearing = this.calculateBearing(userLocation, poiLocation);
	            const relativeAngle = (bearing - this.currentDirection + 360) % 360;

	            poiData = {
	                ...poiData,
	                distance,
	                timeMinutes: this.calculateTravelTime(distance),
	                bearing,
	                relativeAngle
	            };

	            // Classify as ahead (within 180° arc) or behind based on angle
	            if (relativeAngle <= 90 || relativeAngle >= 270) {
	                this.visiblePOIsAhead.add(poiData);
	            } else {
	                this.visiblePOIsBehind.add(poiData);
	            }
	        } else {
	            // Without location, just put all POIs in the "ahead" list
	            this.visiblePOIsAhead.add(poiData);
	        }
	    });

		console.log('POIs sorted into views:', {
		        ahead: this.visiblePOIsAhead.size,
		        behind: this.visiblePOIsBehind.size
		    });

		    if (this.currentLocation) {
		        // Sort POIs by distance
		        this.visiblePOIsAhead = new Set([...this.visiblePOIsAhead].sort((a, b) => {
		            // Sort in DESCENDING order (furthest first) for ahead list
		            return b.distance - a.distance;
		        }));
        
		        this.visiblePOIsBehind = new Set([...this.visiblePOIsBehind].sort((a, b) => {
		            // Sort in ASCENDING order (nearest first) for behind list
		            return a.distance - b.distance;
		        }));
		    } else {
		        // When no location is set, sort by name
		        this.visiblePOIsAhead = new Set([...this.visiblePOIsAhead].sort((a, b) => 
		            a.name.localeCompare(b.name)
		        ));
		        this.visiblePOIsBehind = new Set();
		    }
		}

    calculateDistance(point1, point2) {
        // Haversine formula for distance calculation
        const R = 3959; // Earth's radius in miles
        const lat1 = point1.lat * Math.PI / 180;
        const lat2 = point2.lat * Math.PI / 180;
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLon = (point2.lng - point1.lng) * Math.PI / 180;

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateBearing(point1, point2) {
        const lat1 = point1.lat * Math.PI / 180;
        const lat2 = point2.lat * Math.PI / 180;
        const dLon = (point2.lng - point1.lng) * Math.PI / 180;

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

        let bearing = Math.atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360;
    }

    calculateTravelTime(distance) {
        const speed = LOCOMOTION_SPEEDS[this.selectedLocomotion];
        return Math.round((distance / speed) * 60); // Convert to minutes
    }

	renderPOIList(pois, title) {
	    if (!pois || pois.size === 0) {
	        return `
	            <div class="pois-section">
	                <h3>${title}</h3>
	                <p class="no-pois">No points of interest found</p>
	            </div>
	        `;
	    }

	    const poiItems = [...pois].map(poi => `
	        <div class="poi-item" data-poi-id="${poi.id}">
	            <div class="poi-icons">
	                ${poi.categories.map(cat => 
	                    `<i class="${this.getCategoryIcon(cat.slug)}" title="${cat.name}"></i>`
	                ).join('')}
	            </div>
	            <div class="poi-details">
	                <div class="poi-name">${poi.name}</div>
	                ${poi.distance !== undefined ? `
	                    <div class="poi-meta">
	                        ${poi.distance.toFixed(1)} mi • ${poi.timeMinutes} min
	                    </div>
	                ` : ''}
	            </div>
	        </div>
	    `).join('');

	    return `
	        <div class="pois-section">
	            <h3>${title}</h3>
	            <div class="poi-list">
	                ${poiItems}
	            </div>
	        </div>
	    `;
	}

    getCategoryIcon(category) {
        const cat = CATEGORIES.find(c => c.slug === category);
        return cat ? cat.iconClass : 'fas fa-map-pin';
    }

	render() {
	    if (!this.container) return;

	    this.container.innerHTML = `
	        <div class="nav-view-content">
	            <div class="location-picker-section">
	                <div class="location-notice">
	                    <i class="fas fa-map-marker-alt"></i>
	                    ${!this.currentLocation ? `
	                        <p>Please select a trail entry point to begin navigation.</p>
	                    ` : `
	                        <p>Currently at: ${this.getCurrentLocationName()}</p>
	                    `}
	                </div>
	                <button class="pick-location-btn">
	                    <i class="fas fa-map-pin"></i>
	                    ${!this.currentLocation ? 'Select Entry Point' : 'Change Location'}
	                </button>
	            </div>
	           

	            <div class="locomotion-section">
                    <div class="locomotion-toggles">
                        ${Object.keys(LOCOMOTION_SPEEDS).map(mode => `
                            <button class="${this.selectedLocomotion === mode ? 'active' : ''}" 
                                    data-mode="${mode}">
                                <i class="fas fa-person-${mode.toLowerCase()}"></i>
                                <span>${mode.charAt(0) + mode.slice(1).toLowerCase()}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                ${this.renderPOIList(this.visiblePOIsAhead, 'Ahead')}

                <div class="direction-filters-section">
                    <div class="direction-indicator">
                        <i class="fas fa-arrow-up" style="transform: rotate(${this.currentDirection}deg)"></i>
                    </div>
                    <div class="category-filters">
                        ${CATEGORIES.map(cat => `
                            <button class="${this.selectedCategories.has(cat.slug) ? 'active' : ''}" 
                                    data-category="${cat.slug}" 
                                    title="${cat.title}">
                                <i class="${cat.iconClass}"></i>
                            </button>
                        `).join('')}
                    </div>
                </div>

                ${this.renderPOIList(this.visiblePOIsBehind, 'Behind')}

                ${this.visiblePOIsAhead.size + this.visiblePOIsBehind.size > 0 ? `
                    <div class="show-more-section">
                        <button class="show-more-btn" ${this.viewDistance >= this.maxDistance ? 'disabled' : ''}>
                            Show More
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        // Re-attach event listeners after rendering
		this.attachEventListeners(true); // Always attach location picker listener now
		}

		attachEventListeners(needsLocationPicker) {
		    if (!this.container) return;

		    // Location picker button
		    if (needsLocationPicker) {
		        const pickButton = this.container.querySelector('.pick-location-btn');
		        if (pickButton) {
		            pickButton.addEventListener('click', () => this.showLocationPickerModal());
		        }
		    }

        // Locomotion mode toggles
        this.container.querySelectorAll('.locomotion-toggles button').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode && LOCOMOTION_SPEEDS[mode]) {
                    this.selectedLocomotion = mode;
                    this.updatePOILists(appState.getState().pois);
                    this.render();
                    this.savePreferences();
                }
            });
        });
		
		if (needsLocationPicker) {
		        const pickButton = this.container.querySelector('.pick-location-btn');
		        if (pickButton) {
		            pickButton.addEventListener('click', () => this.showLocationPickerModal());
		        }
		    }

        // Category filter toggles
        this.container.querySelectorAll('.category-filters button').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                if (category) {
                    if (this.selectedCategories.has(category)) {
                        this.selectedCategories.delete(category);
                    } else {
                        this.selectedCategories.add(category);
                    }
                    this.updatePOILists(appState.getState().pois);
                    this.render();
                    this.savePreferences();
                }
            });
        });

        // POI item clicks
        this.container.querySelectorAll('.poi-item').forEach(item => {
            item.addEventListener('click', () => {
                const poiId = parseInt(item.dataset.poiId);
                if (poiId) {
                    const poi = poiManager.getPOIById(poiId);
                    if (poi) {
                        // Handle POI selection
                        appState.update({ selectedPOI: poi });
                    }
                }
            });
        });
    }
	
	// Add these modal-related methods
	showLocationPickerModal() {
	        if (!this.modal) {
	            this.modal = document.createElement('div');
	            this.modal.className = 'location-picker-modal';
	            document.body.appendChild(this.modal);
	        }

	        this.modal.innerHTML = `
	            <div class="modal-content">
	                <div class="modal-header">
	                    <h3>Choose a Trail Entry Point</h3>
	                    <button class="close-modal" aria-label="Close">&times;</button>
	                </div>
	                <div class="modal-body">
	                    <p>Select your starting point on the Swamp Rabbit Trail:</p>
	                    <div class="location-list">
	                        ${CONFIG.TEST_LOCATIONS.map(loc => `
	                            <button class="location-option" 
	                                    data-lat="${loc.coords[0]}" 
	                                    data-lng="${loc.coords[1]}">
	                                <div class="location-name">${loc.name}</div>
	                                <div class="location-description">${loc.description}</div>
	                            </button>
	                        `).join('')}
	                    </div>
	                </div>
	            </div>
	        `;

	        const closeBtn = this.modal.querySelector('.close-modal');
	        if (closeBtn) {
	            closeBtn.addEventListener('click', () => this.hideLocationPickerModal());
	        }

	        const locationButtons = this.modal.querySelectorAll('.location-option');
	        locationButtons.forEach(button => {
	            button.addEventListener('click', () => {
	                const location = {
	                    lat: parseFloat(button.dataset.lat),
	                    lng: parseFloat(button.dataset.lng)
	                };
	                this.setTestLocation(location);
	                this.hideLocationPickerModal();
	            });
	        });

	        this.modal.style.display = 'flex';
        
	        this.modal.addEventListener('click', (e) => {
	            if (e.target === this.modal) {
	                this.hideLocationPickerModal();
	            }
	        });
	    }
	
	enableLocationPicking() {
	    // Notify map to enter location picking mode
	    appState.update({
	        mapMode: 'picking-location',
	        message: 'Click anywhere on the trail to set your test location'
	    });

	    // Add a one-time event listener for the picked location
	    const handleLocationPicked = (event) => {
	        if (event.detail && event.detail.location) {
	            this.currentLocation = event.detail.location;
	            appState.update({
	                userLocation: event.detail.location,
	                mapMode: 'normal',
	                message: null
	            });
	            this.updatePOILists();
	            this.render();
	        }
	    };

	    document.addEventListener('location-picked', handleLocationPicked, { once: true });
	}
	
	getCurrentLocationName() {
	    if (!this.currentLocation) return '';
    
	    const currentLoc = CONFIG.TEST_LOCATIONS.find(loc => 
	        loc.coords[0] === this.currentLocation.lat && 
	        loc.coords[1] === this.currentLocation.lng
	    );
    
	    return currentLoc ? currentLoc.name : 'Custom Location';
	}

	handleStateChange(state) {
	    console.log('NavView state update:', {
	        poisLoaded: state.poisLoaded,
	        hasPois: state.pois ? state.pois.length : 0,
	        userLocation: state.userLocation,
	        userDirection: state.userDirection
	    });

	    let shouldUpdate = false;

	    if (state.userLocation && 
	        (!this.currentLocation || 
	         this.currentLocation.lat !== state.userLocation.lat || 
	         this.currentLocation.lng !== state.userLocation.lng)) {
	        this.currentLocation = state.userLocation;
	        shouldUpdate = true;
	    }

	    if (state.userDirection !== undefined && this.currentDirection !== state.userDirection) {
	        this.currentDirection = state.userDirection;
	        shouldUpdate = true;
	    }

	    // Check if POIs were loaded or updated
	    if (state.poisLoaded && state.pois) {
	        console.log('POIs loaded into NavView, count:', state.pois.length);
	        shouldUpdate = true;
	    }

	    if (shouldUpdate) {
	        this.updatePOILists();
	        this.render();
	    }
	}
	
	hideLocationPickerModal() {
	        if (this.modal) {
	            this.modal.style.display = 'none';
	        }
	    }

		setTestLocation(location) {
		        this.currentLocation = location;
		        appState.update({
		            userLocation: location
		        });
		        this.updatePOILists();
		        this.render();
		    }
		

    handleLocomotionChange(mode) {
        this.selectedLocomotion = mode;
        this.savePreferences();
        this.render();
    }

    handleCategoryToggle(category) {
        if (this.selectedCategories.has(category)) {
            this.selectedCategories.delete(category);
        } else {
            this.selectedCategories.add(category);
        }
        this.savePreferences();
        this.render();
    }

    handleLocationUpdate(location) {
        this.currentLocation = location;
        this.render();
    }

    handleDirectionChange(direction) {
        this.currentDirection = direction;
        this.render();
    }

    loadPreferences() {
        try {
            const saved = localStorage.getItem('navViewPreferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.selectedLocomotion = prefs.locomotion || 'WALKING';
                this.selectedCategories = new Set(prefs.categories || []);
            }
        } catch (error) {
            console.warn('Failed to load nav preferences:', error);
        }
    }

    savePreferences() {
        try {
            const prefs = {
                locomotion: this.selectedLocomotion,
                categories: Array.from(this.selectedCategories)
            };
            localStorage.setItem('navViewPreferences', JSON.stringify(prefs));
        } catch (error) {
            console.warn('Failed to save nav preferences:', error);
        }
    }
}