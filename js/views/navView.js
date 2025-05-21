import { SPUR_COLORS, getSpurColor } from '../data/spurColors.js';
import { state } from '../data/state.js';
import { getPOIsAheadBehind, getSpurFromLocation } from '../data/routeData.js';
import { getFilteredPOIs } from '../data/poiManager.js';
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
	    console.log("1. NavView constructor - selectedCategories initialized:", this.selectedCategories);
    
	    this.modal = null;
	    this.viewDistance = 2;
	    this.distanceIncrement = 2;
	    this.maxDistance = 15;
	    this.visiblePOIsAhead = new Set();
	    this.visiblePOIsBehind = new Set();
    
	    console.log("2. Before loadPreferences - selectedCategories:", this.selectedCategories);
	    this.loadPreferences();
	    console.log("3. After loadPreferences - selectedCategories:", this.selectedCategories);
    
	    appState.subscribe(this.handleStateChange.bind(this));
	    console.log("4. After state subscription - selectedCategories:", this.selectedCategories);
    
	    this.visiblePOIsAhead = new Set();
	    this.visiblePOIsBehind = new Set();
	    this.poiGroups = {
	        ahead: new Map(),
	        behind: new Map()
	    };
	    this.ungroupedPOIs = {
	        ahead: new Set(),
	        behind: new Set()
	    };
	    console.log("5. End of constructor - selectedCategories:", this.selectedCategories);
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
			    console.log("updatePOILists called. Selected categories:", 
			        Array.from(this.selectedCategories),
			        "Size:", this.selectedCategories.size);
        
			    // Get the state first
			    const state = appState.getState();
			    const allPOIs = state.pois || [];
			    const userLocation = this.currentLocation;

			    // Clear existing lists
			    this.visiblePOIsAhead.clear();
			    this.visiblePOIsBehind.clear();
			    this.poiGroups.ahead.clear();
			    this.poiGroups.behind.clear();
			    this.ungroupedPOIs.ahead.clear();
			    this.ungroupedPOIs.behind.clear();

			    // Show a sample POI structure for debugging
			    if (allPOIs.length > 0) {
			        console.log("Sample POI structure:", allPOIs[0]);
			    }

			    // Debug log to see all POIs
			    console.log("Processing POIs count:", allPOIs.length);

			    allPOIs.forEach(poi => {
			        // Debug logs for each POI
			        console.log('Processing POI:', poi.name);
			        console.log('Tags structure:', poi.tags);
			        console.log('First tag:', poi.tags?.[0]);
			        console.log('Group tag value:', poi.tags?.[0]?.name);

			        // Get coordinates from the coords array
			        const poiLocation = {
			            lat: poi.coords?.[0] || poi.latitude,
			            lng: poi.coords?.[1] || poi.longitude
			        };

			        if (!poiLocation.lat || !poiLocation.lng) {
			            console.log('Skipping POI due to missing coordinates:', poi.name);
			            return;
			        }

			        let poiData = { ...poi };

			        // Only calculate distance-related data if we have user location
			        if (userLocation) {
			            const distance = this.calculateDistance(userLocation, poiLocation);
            
			            // Skip if beyond max view distance
			            if (distance > this.maxDistance) {
			                console.log('Skipping POI due to distance:', poi.name, distance);
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

			            // Determine if POI is ahead or behind
			            const direction = (relativeAngle <= 90 || relativeAngle >= 270) ? 'ahead' : 'behind';

			            // Check if POI matches current category filter
			            const matchesFilter = !this.selectedCategories.size || 
			                poi.categories?.some(cat => this.selectedCategories.has(cat.slug));

			            if (!matchesFilter) {
			                console.log('Skipping POI due to category filter:', poi.name);
			                return; // Skip POIs that don't match the filter
			            }

			            // Get the tag for grouping
			            const groupTag = poi.tags?.[0]?.name;
			            console.log('Group tag for POI:', poi.name, groupTag);

			            if (groupTag) {
			                // Add to appropriate group
			                if (!this.poiGroups[direction].has(groupTag)) {
			                    this.poiGroups[direction].set(groupTag, new Set());
			                }
			                this.poiGroups[direction].get(groupTag).add(poiData);
			                console.log(`Added ${poi.name} to ${direction} group: ${groupTag}`);
			            } else {
			                // Add to ungrouped POIs
			                this.ungroupedPOIs[direction].add(poiData);
			                console.log(`Added ${poi.name} to ${direction} ungrouped`);
			            }

			            // Also maintain the original sets
			            if (direction === 'ahead') {
			                this.visiblePOIsAhead.add(poiData);
			            } else {
			                this.visiblePOIsBehind.add(poiData);
			            }
			        } else {
			            // Without location, just put in ahead and ungrouped
			            this.ungroupedPOIs.ahead.add(poiData);
			            this.visiblePOIsAhead.add(poiData);
			            console.log(`Added ${poi.name} to ahead (no user location)`);
			        }
			    });

			    // Log the final state of groups and ungrouped
			    console.log('Final Groups:', {
			        ahead: Array.from(this.poiGroups.ahead.keys()),
			        behind: Array.from(this.poiGroups.behind.keys())
			    });
			    console.log('Final Ungrouped counts:', {
			        ahead: this.ungroupedPOIs.ahead.size,
			        behind: this.ungroupedPOIs.behind.size
			    });

			    // Sort POIs within each group and ungrouped sets
			    for (const direction of ['ahead', 'behind']) {
			        // Sort groups
			        for (const [tag, pois] of this.poiGroups[direction]) {
			            this.poiGroups[direction].set(tag, new Set([...pois].sort((a, b) => {
			                return a.distance - b.distance;
			            })));
			        }
        
			        // Sort ungrouped
			        this.ungroupedPOIs[direction] = new Set([...this.ungroupedPOIs[direction]].sort((a, b) => {
			            return a.distance - b.distance;
			        }));
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

	renderPOIList(direction, title) {
	    console.log(`Rendering POI list for ${direction}:`, typeof direction);
    
	    // Ensure direction is a string
	    if (!(direction === 'ahead' || direction === 'behind')) {
	        console.error('Invalid direction:', direction);
	        return '';
	    }

	    const groups = this.poiGroups[direction];
	    const ungrouped = this.ungroupedPOIs[direction];
    
	    console.log('Groups:', groups);
	    console.log('Ungrouped:', ungrouped);
	    console.log('Selected Categories:', this.selectedCategories);
    
	    if ((!groups || groups.size === 0) && (!ungrouped || ungrouped.size === 0)) {
	        console.log(`No POIs found for ${direction}`);
	        return `
	            <div class="pois-section">
	                <h3>${title}</h3>
	                <p class="no-pois">No points of interest found</p>
	            </div>
	        `;
	    }

	    // If filters are active, show all POIs without groups
	    if (this.selectedCategories.size > 0) {
	        console.log('Filters active, showing all POIs without groups');
	        const allPOIs = direction === 'ahead' ? 
	            this.visiblePOIsAhead : this.visiblePOIsBehind;
        
	        console.log('All POIs for direction:', allPOIs);    
	        return this.renderPOIItems(allPOIs, title);
	    }

	    // Render groups and ungrouped POIs
	    const groupsHtml = groups ? [...groups.entries()].map(([tag, pois]) => `
	        <div class="poi-group" data-group-tag="${tag}">
	            <div class="group-header">
	                <span class="group-name">${tag}</span>
	                <span class="poi-count">${pois.size}</span>
	                <i class="fas fa-chevron-right"></i>
	            </div>
	        </div>
	    `).join('') : '';

	    // Render ungrouped POIs
	    const ungroupedHtml = ungrouped && ungrouped.size > 0 ? 
	        [...ungrouped].map(poi => this.renderPOIItem(poi)).join('') : '';

	    return `
	        <div class="pois-section">
	            <h3>${title}</h3>
	            <div class="poi-list">
	                ${groupsHtml}
	                ${ungroupedHtml}
	            </div>
	        </div>
	    `;
	}

    getCategoryIcon(category) {
        const cat = CATEGORIES.find(c => c.slug === category);
        return cat ? cat.iconClass : 'fas fa-map-pin';
    }
	
	// Helper method to render individual POI items
	renderPOIItem(poi) {
	    console.log('Rendering individual POI:', poi);
	    return `
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
	    `;
	}
	
	// Helper: get visible spurs/groups from current user position
	function getCurrentSpur() {
	    // This function should return the current spur/trail based on user position
	    // For now, we assume state.currentSpur is updated elsewhere
	    return state.currentSpur || "main";
	}

	// Helper: handle dev-only heading override (visible if ?dev=1)
	function showDevOverride() {
	    return window.location.search.includes('dev=1');
	}
	
	export function renderNavView() {
	    const navViewRoot = document.getElementById('nav-view');
	    if (!navViewRoot) return;

	    // 1. Determine current spur/trail color
	    const currentSpur = getCurrentSpur();
	    const lineColor = getSpurColor(currentSpur);

	    // 2. Get filtered POIs and groups for ahead/behind lists
	    const { ahead, behind } = getPOIsAheadBehind(state.userLocation, state.userHeading, state.selectedRoute);

	    // Filter by selected categories (multi-select)
	    const filteredAhead = getFilteredPOIs(ahead, state.selectedCategories);
	    const filteredBehind = getFilteredPOIs(behind, state.selectedCategories);

	    // 3. Build the sticky center section (locomotion, filter, heading context)
	    let stickyCenter = `
	      <div class="nav-center-sticky">
	        <div class="nav-heading-context">
	          <div>HEADING TOWARD <b>${state.headingToward}</b></div>
	          <div>HEADING AWAY FROM <b>${state.headingAwayFrom}</b></div>
	        </div>
	        <div class="nav-mode-selector">
	          ${['walk', 'bike'].map(mode => `
	            <i class="fas fa-${mode === 'walk' ? 'person-walking' : 'bicycle'} ${state.locomotionMode === mode ? 'active' : ''}" 
	               onclick="window.setLocomotionMode && setLocomotionMode('${mode}')"></i>
	          `).join('')}
	        </div>
	        <div class="nav-category-filter">
	          ${state.categoryList.map(cat => `
	            <i class="${cat.iconClass} ${state.selectedCategories.includes(cat.slug) ? 'selected' : ''}"
	               title="${cat.title}" 
	               onclick="window.toggleCategory && toggleCategory('${cat.slug}')"></i>
	          `).join('')}
	        </div>
	        ${showDevOverride() ? `
	          <div class="nav-heading-override">
	            <label>DEV: Heading Override
	              <select onchange="window.setHeadingOverride && setHeadingOverride(this.value)">
	                <option value="">Auto</option>
	                <option value="forward">Forward</option>
	                <option value="backward">Backward</option>
	              </select>
	            </label>
	          </div>
	        ` : ''}
	      </div>
	    `;

	    // 4. Build POI/group rows (with group preview)
	    function buildPOIRows(poiList) {
	        return poiList.map(item => {
	            if (item.isGroup) {
	                // Show comma-separated preview of first 2 POIs in group
	                const preview = (item.pois.slice(0,2).map(p => p.title).join(', '));
	                return `
	                  <li class="nav-row nav-group-row" onclick="window.openGroupListView && openGroupListView('${item.groupId}')">
	                    <span class="nav-group-name">${item.groupName}</span>
	                    <span class="nav-group-preview">${preview}</span>
	                    <span class="nav-group-arrow">&#9662;</span>
	                  </li>
	                `;
	            } else {
	                // Individual POI
	                return `
	                  <li class="nav-row nav-poi-row">
	                    <span class="nav-poi-name">${item.title}</span>
	                    <span class="nav-poi-dist">${item.distDisplay}</span>
	                    <span class="nav-poi-time">${item.timeDisplay}</span>
	                  </li>
	                `;
	            }
	        }).join('');
	    }

	    // 5. Main render
	    navViewRoot.innerHTML = `
	      <div class="nav-vertical-line" style="background-color: ${lineColor};"></div>
	      <section class="nav-section nav-section-ahead">
	        <div class="nav-section-header">DESTINATIONS AHEAD</div>
	        <ul class="nav-list">${buildPOIRows(filteredAhead)}</ul>
	      </section>
	      ${stickyCenter}
	      <section class="nav-section nav-section-behind">
	        <div class="nav-section-header">DESTINATIONS BEHIND</div>
	        <ul class="nav-list">${buildPOIRows(filteredBehind)}</ul>
	      </section>
	    `;
	}

	// Attach to window for dev
	window.renderNavView = renderNavView;

	// Helper method to render a list of POIs
	renderPOIItems(pois, title) {
	    console.log('Rendering POI list:', { title, poisCount: pois.size });
	    return `
	        <div class="pois-section">
	            <h3>${title}</h3>
	            <div class="poi-list">
	                ${[...pois].map(poi => this.renderPOIItem(poi)).join('')}
	            </div>
	        </div>
	    `;
	}

	render() {
	    console.log('render called - current selectedCategories:', Array.from(this.selectedCategories));
	    if (!this.container) return;

	    this.container.innerHTML = `
	        <div class="nav-view-content">
	            <div class="location-panel">
	                <div class="location-panel-icon">
	                    <i class="fas fa-map-marker-alt"></i>
	                </div>
	                <div class="location-panel-content">
	                    <div class="location-panel-title">
	                        ${!this.currentLocation 
	                            ? 'Please select a trail entry point to begin navigation.'
	                            : `Currently at: ${this.getCurrentLocationName()}`
	                        }
	                    </div>
	                    <button class="location-panel-btn">
	                        <i class="fas fa-location-arrow"></i>
	                        ${!this.currentLocation ? 'Select Entry Point' : 'Change Location'}
	                    </button>
	                </div>
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

	            ${this.renderPOIList('ahead', 'Ahead')}

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

	            ${this.renderPOIList('behind', 'Behind')}

	            ${(this.visiblePOIsAhead.size + this.visiblePOIsBehind.size > 0) ? `
	                <div class="show-more-section">
	                    <button class="show-more-btn" ${this.viewDistance >= this.maxDistance ? 'disabled' : ''}>
	                        Show More
	                    </button>
	                </div>
	            ` : ''}
	        </div>
	    `;

	    // Re-attach event listeners after rendering
	    this.attachEventListeners(true);
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
	    console.log("A. Start of loadPreferences - selectedCategories:", this.selectedCategories);
	    try {
	        const saved = localStorage.getItem('navViewPreferences');
	        console.log("B. Found in localStorage:", saved);
	        if (saved) {
	            const prefs = JSON.parse(saved);
	            console.log("C. Parsed preferences:", prefs);
	            this.selectedLocomotion = prefs.locomotion || 'WALKING';
	            this.selectedCategories = new Set(prefs.categories || []);
	            console.log("D. After setting preferences - selectedCategories:", this.selectedCategories);
	        }
	    } catch (error) {
	        console.warn('Failed to load nav preferences:', error);
	    }
	    console.log("E. End of loadPreferences - selectedCategories:", this.selectedCategories);
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