import { appState } from '../data/state.js';
import { poiManager } from '../data/poiManager.js';

const CATEGORIES = [
    { slug: 'food',       iconClass: 'fas fa-utensils',       title: 'Food'      },
    { slug: 'drink',      iconClass: 'fas fa-beer-mug-empty', title: 'Drink'     },
    { slug: 'ice-cream',  iconClass: 'fas fa-ice-cream',      title: 'Ice Cream' },
    { slug: 'landmark',   iconClass: 'fas fa-map-pin',        title: 'Landmark'  },
    { slug: 'playground', iconClass: 'fas fa-child-reaching', title: 'Playground'}
];

export class ListView {
    constructor() {
        this.container = null;
        this.selectedSort = 'name';
        this.selectedCategories = new Set();
        this.openGroups = {}; // Keep track of expanded groups
        
        if (appState) {
            appState.subscribe(this.handleStateChange.bind(this));
        }
    }

    initialize() {
        this.container = document.getElementById('list-view');
        if (!this.container) return;

        const state = appState.getState();
        if (state.poisLoaded && state.pois) this.render();
    }

    handleStateChange(state) {
        if (state.poisLoaded && state.pois) this.render();
    }

    groupPOIsByTag(pois) {
        const groups = new Map();
        const ungrouped = [];
        pois.forEach(poi => {
            const tag = poi.tags?.[0]?.name;
            if (tag) {
                if (!groups.has(tag)) groups.set(tag, []);
                groups.get(tag).push(poi);
            } else {
                ungrouped.push(poi);
            }
        });
        for (const [tag, tagPois] of groups) {
            groups.set(tag, this.sortPOIs(tagPois));
        }
        return { groups, ungrouped: this.sortPOIs(ungrouped) };
    }

    sortPOIs(pois) {
        return [...pois].sort((a, b) => {
            switch (this.selectedSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'distance':
                    return (a.distance || Infinity) - (b.distance || Infinity);
                default:
                    return 0;
            }
        });
    }

    getCategoryIcon(category) {
        const cat = CATEGORIES.find(c => c.slug === category);
        return cat ? cat.iconClass : 'fas fa-map-pin';
    }

    renderPOIItem(poi) {
        return `
            <div class="poi-item" data-poi-id="${poi.id}" tabindex="0">
                <div class="poi-icons">
                    ${poi.categories.map(cat => 
                        `<i class="${this.getCategoryIcon(cat.slug)}" title="${cat.name}"></i>`
                    ).join('')}
                </div>
                <div class="poi-details">
                    <div class="poi-name">${poi.name}</div>
                    ${poi.distance !== undefined ? `
                        <div class="poi-meta">
                            ${poi.distance.toFixed(1)} mi
                        </div>
                    ` : ''}
                    <div class="poi-description">${poi.description || ''}</div>
                </div>
            </div>
        `;
    }

    renderCategoryFilters() {
        return `
            <div class="category-filters-bar">
                <span class="category-label">${this.selectedCategories.size === 0 ? "All Categories" : "Filtered:"}</span>
                <div class="category-filters">
                    ${CATEGORIES.map(cat => `
                        <button class="category-filter ${this.selectedCategories.has(cat.slug) ? 'active' : ''}"
                                data-category="${cat.slug}"
                                aria-pressed="${this.selectedCategories.has(cat.slug)}"
                                title="${cat.title}">
                            <i class="${cat.iconClass}"></i>
                        </button>
                    `).join('')}
                    <button class="category-filter clear" ${this.selectedCategories.size === 0 ? 'disabled' : ''}
                        title="Clear Filters" aria-label="Clear Filters">&times;</button>
                </div>
            </div>
        `;
    }

    render() {
        if (!this.container) return;
        const state = appState.getState();
        const pois = state.pois || [];

        const filteredPOIs = this.selectedCategories.size > 0 
            ? pois.filter(poi => poi.categories.some(cat => this.selectedCategories.has(cat.slug)))
            : pois;

        const { groups, ungrouped } = this.groupPOIsByTag(filteredPOIs);

        this.container.innerHTML = `
            <div class="list-view-content">
                <div class="list-controls">
                    ${this.renderCategoryFilters()}
                    <div class="sort-controls">
                        <select class="sort-select" aria-label="Sort POIs">
                            <option value="name" ${this.selectedSort === 'name' ? 'selected' : ''}>Name</option>
                            <option value="distance" ${this.selectedSort === 'distance' ? 'selected' : ''}>Distance</option>
                        </select>
                    </div>
                </div>
                <div class="poi-groups">
                    ${
                        [...groups.entries()].map(([tag, tagPois]) => `
                            <div class="poi-group" data-group="${tag}">
                                <button class="group-header ${this.openGroups[tag] ? 'open' : ''}" aria-expanded="${!!this.openGroups[tag]}">
                                    <span class="group-name">${tag}</span>
                                    <span class="poi-count">${tagPois.length}</span>
                                    <span class="group-chevron">
                                        <i class="fas fa-chevron-${this.openGroups[tag] ? 'down' : 'right'}"></i>
                                    </span>
                                </button>
                                <div class="group-items" style="display:${this.openGroups[tag] ? 'block' : 'none'};">
                                    ${tagPois.map(poi => this.renderPOIItem(poi)).join('')}
                                </div>
                            </div>
                        `).join('')
                    }
                    ${
                        ungrouped.length > 0 ? `
                            <div class="poi-group" data-group="Other">
                                <button class="group-header ${this.openGroups.Other ? 'open' : ''}" aria-expanded="${!!this.openGroups.Other}">
                                    <span class="group-name">Other</span>
                                    <span class="poi-count">${ungrouped.length}</span>
                                    <span class="group-chevron">
                                        <i class="fas fa-chevron-${this.openGroups.Other ? 'down' : 'right'}"></i>
                                    </span>
                                </button>
                                <div class="group-items" style="display:${this.openGroups.Other ? 'block' : 'none'};">
                                    ${ungrouped.map(poi => this.renderPOIItem(poi)).join('')}
                                </div>
                            </div>
                        ` : ''
                    }
                    ${groups.size === 0 && ungrouped.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-search"></i><br>
                            No places found.<br>
                            Try adjusting your filters.
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        this.attachEventListeners();
    }

    attachEventListeners() {
        if (!this.container) return;

        // Category filter handlers
        this.container.querySelectorAll('.category-filter').forEach(btn => {
            btn.addEventListener('click', e => {
                const category = btn.dataset.category;
                if (category) {
                    if (this.selectedCategories.has(category)) {
                        this.selectedCategories.delete(category);
                    } else {
                        this.selectedCategories.add(category);
                    }
                    this.render();
                } else if (btn.classList.contains('clear')) {
                    this.selectedCategories.clear();
                    this.render();
                }
            });
        });

        // Sort select handler
        const sortSelect = this.container.querySelector('.sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.selectedSort = e.target.value;
                this.render();
            });
        }

        // POI item click handler
        this.container.querySelectorAll('.poi-item').forEach(item => {
            item.addEventListener('click', () => {
                const poiId = parseInt(item.dataset.poiId);
                if (poiId) {
                    const poi = poiManager.getPOIById(poiId);
                    if (poi) {
                        appState.update({ selectedPOI: poi });
                    }
                }
            });
        });

        // Collapsible group handler
        this.container.querySelectorAll('.group-header').forEach(btn => {
            btn.addEventListener('click', () => {
                const group = btn.closest('.poi-group').dataset.group;
                this.openGroups[group] = !this.openGroups[group];
                this.render();
            });
        });
    }
}

export const listView = new ListView();
export const initializeListView = () => listView.initialize();