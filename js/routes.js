/**
 * routes.js — Central Route Registry
 * 
 * Every route in the application is registered here with:
 *   - path (hash-based)
 *   - page module loader (dynamic import)
 *   - allowed roles (empty = public)
 *   - page title
 *   - sidebar section grouping
 * 
 * This is the single source of truth for navigation and access control.
 */

const ROUTES = [
    // ─── Public Routes ──────────────────────────────────────────────
    {
        path: '#/login',
        title: 'Login',
        roles: [],                  // Public
        section: null,
        icon: null,
        loader: () => import('./pages/login.js')
    },
    {
        path: '#/unauthorized',
        title: 'Unauthorized',
        roles: [],                  // Public
        section: null,
        icon: null,
        loader: () => import('./pages/unauthorized.js')
    },

    // ─── Production Routes (OPERATOR + ADMIN) ──────────────────────
    {
        path: '#/production/cell-registration',
        title: 'Cell Registration',
        roles: ['OPERATOR', 'ADMIN'],
        section: 'Production',
        icon: 'battery_std',
        loader: () => import('./pages/production/cellRegistration.js')
    },
    {
        path: '#/production/cell-grading',
        title: 'Cell Grading',
        roles: ['OPERATOR', 'ADMIN'],
        section: 'Production',
        icon: 'speed',
        loader: () => import('./pages/production/cellGrading.js')
    },
    {
        path: '#/production/cell-sorting',
        title: 'Cell Sorting',
        roles: ['OPERATOR', 'ADMIN'],
        section: 'Production',
        icon: 'sort',
        loader: () => import('./pages/production/cellSorting.js')
    },
    {
        path: '#/production/battery-assembly',
        title: 'Assembly & Mapping',
        roles: ['OPERATOR', 'ADMIN'],
        section: 'Production',
        icon: 'build',
        loader: () => import('./pages/production/batteryAssembly.js')
    },
    {
        path: '#/production/welding',
        title: 'Welding',
        roles: ['OPERATOR', 'ADMIN'],
        section: 'Production',
        icon: 'bolt',
        loader: () => import('./pages/production/welding.js')
    },
    {
        path: '#/production/bms-mounting',
        title: 'BMS Mounting',
        roles: ['OPERATOR', 'ADMIN'],
        section: 'Production',
        icon: 'memory',
        loader: () => import('./pages/production/bmsMounting.js')
    },
    {
        path: '#/production/pack-grading',
        title: 'Pack Testing',
        roles: ['OPERATOR', 'ADMIN'],
        section: 'Production',
        icon: 'assessment',
        loader: () => import('./pages/production/packGrading.js')
    },
    {
        path: '#/production/pdi-inspection',
        title: 'PDI Inspection',
        roles: ['OPERATOR', 'ADMIN'],
        section: 'Production',
        icon: 'fact_check',
        loader: () => import('./pages/production/pdiInspection.js')
    },
    {
        path: '#/production/dispatch',
        title: 'Dispatch',
        roles: ['OPERATOR', 'ADMIN'],
        section: 'Production',
        icon: 'local_shipping',
        loader: () => import('./pages/production/dispatch.js')
    },

    // ─── Admin Routes (ADMIN ONLY) ──────────────────────────────────
    {
        path: '#/admin/dashboard',
        title: 'Dashboard',
        roles: ['ADMIN'],
        section: 'Admin Panel',
        icon: 'dashboard',
        loader: () => import('./pages/admin/dashboard.js')
    },
    {
        path: '#/admin/cell-inventory',
        title: 'Cell Inventory Status',
        roles: ['ADMIN'],
        section: 'Admin Panel',
        icon: 'inventory',
        loader: () => import('./pages/admin/cellInventory.js')
    },
    {
        path: '#/admin/traceability',
        title: 'Battery Traceability',
        roles: ['ADMIN'],
        section: 'Admin Panel',
        icon: 'timeline',
        loader: () => import('./pages/admin/traceability.js')
    },
    
];

/**
 * Find a route by its hash path.
 * @param {string} hash
 * @returns {Object|undefined}
 */
export function findRoute(hash) {
    return ROUTES.find(r => r.path === hash);
}

/**
 * Get all routes that a given role is allowed to see in sidebar.
 * Only returns routes with a section (excludes login, unauthorized).
 * @param {string} role
 * @returns {Object[]}
 */
export function getNavigableRoutes(role) {
    return ROUTES.filter(r =>
        r.section !== null &&
        r.roles.length > 0 &&
        r.roles.includes(role)
    );
}

/**
 * Group navigable routes by section name.
 * @param {string} role
 * @returns {Map<string, Object[]>}
 */
export function getRoutesBySection(role) {
    const routes = getNavigableRoutes(role);
    const sections = new Map();
    routes.forEach(route => {
        if (!sections.has(route.section)) {
            sections.set(route.section, []);
        }
        sections.get(route.section).push(route);
    });
    return sections;
}

export default ROUTES;
