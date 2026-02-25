/**
 * routes.js — Central Route Registry
 *
 * Role convention:
 *   roles: []            → public (login, unauthorized)
 *   roles: ['admin', …]  → admin is always first; production routes also
 *                          list their specific operator role string so that
 *                          both admins AND the relevant operators can access them.
 *
 * Auth.isAuthorized() does an array overlap check, so listing 'admin'
 * here means an admin user (whose assigned_roles includes 'admin') will
 * always pass the check — even without the isAdmin() bypass.
 */

const ROUTES = [
    // ─── Public Routes ────────────────────────────────────────────────────────
    {
        path:    '#/login',
        title:   'Login',
        roles:   [],
        section: null,
        icon:    null,
        loader:  () => import('./pages/login.js'),
    },
    {
        path:    '#/unauthorized',
        title:   'Access Denied',
        roles:   [],
        section: null,
        icon:    null,
        loader:  () => import('./pages/unauthorized.js'),
    },

    // ─── Production Routes ────────────────────────────────────────────────────
    {
        path:    '#/production/cell-registration',
        title:   'Cell Registration',
        roles:   ['admin', 'Cell Registration'],
        section: 'Production',
        icon:    'battery_std',
        loader:  () => import('./pages/production/cellRegistration.js'),
    },
    {
        path:    '#/production/cell-grading',
        title:   'Cell Grading',
        roles:   ['admin', 'Cell Grading'],
        section: 'Production',
        icon:    'speed',
        loader:  () => import('./pages/production/cellGrading.js'),
    },
    {
        path:    '#/production/cell-sorting',
        title:   'Cell Sorting',
        roles:   ['admin', 'Cell Sorting'],
        section: 'Production',
        icon:    'sort',
        loader:  () => import('./pages/production/cellSorting.js'),
    },
    {
        path:    '#/production/battery-assembly',
        title:   'Assembly & Mapping',
        roles:   ['admin', 'Assembly and Mapping'],
        section: 'Production',
        icon:    'build',
        loader:  () => import('./pages/production/batteryAssembly.js'),
    },
    {
        path:    '#/production/welding',
        title:   'Welding',
        roles:   ['admin', 'Welding'],
        section: 'Production',
        icon:    'bolt',
        loader:  () => import('./pages/production/welding.js'),
    },
    {
        path:    '#/production/bms-mounting',
        title:   'BMS Mounting',
        roles:   ['admin', 'BMS Mounting'],
        section: 'Production',
        icon:    'memory',
        loader:  () => import('./pages/production/bmsMounting.js'),
    },
    {
        path:    '#/production/pack-grading',
        title:   'Pack Testing',
        roles:   ['admin', 'Pack Testing'],
        section: 'Production',
        icon:    'assessment',
        loader:  () => import('./pages/production/packGrading.js'),
    },
    {
        path:    '#/production/pdi-inspection',
        title:   'PDI Inspection',
        roles:   ['admin', 'PDI Inspection'],
        section: 'Production',
        icon:    'fact_check',
        loader:  () => import('./pages/production/pdiInspection.js'),
    },
    {
        path:    '#/production/dispatch',
        title:   'Dispatch',
        roles:   ['admin', 'Dispatch'],
        section: 'Production',
        icon:    'local_shipping',
        loader:  () => import('./pages/production/dispatch.js'),
    },

    // ─── Admin Routes ─────────────────────────────────────────────────────────
    {
        path:    '#/admin/dashboard',
        title:   'Dashboard',
        roles:   ['admin'],
        section: 'Admin Panel',
        icon:    'dashboard',
        loader:  () => import('./pages/admin/dashboard.js'),
    },
    {
        path:    '#/admin/cell-inventory',
        title:   'Cell Inventory Status',
        roles:   ['admin'],
        section: 'Admin Panel',
        icon:    'inventory',
        loader:  () => import('./pages/admin/cellInventory.js'),
    },
    {
        path:    '#/admin/traceability',
        title:   'Battery Traceability',
        roles:   ['admin'],
        section: 'Admin Panel',
        icon:    'timeline',
        loader:  () => import('./pages/admin/traceability.js'),
    },
    {
        path:    '#/admin/user-management',
        title:   'User Management',
        roles:   ['admin'],
        section: 'Admin Panel',
        icon:    'manage_accounts',
        loader:  () => import('./pages/admin/userManagement.js'),
    },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/**
 * Find a route by its hash path.
 * @param {string} hash
 * @returns {Object|undefined}
 */
export function findRoute(hash) {
    return ROUTES.find(r => r.path === hash);
}

/**
 * Get all sidebar-visible routes for a user's assigned_roles array.
 * Admins get everything. Others only get routes where their roles overlap.
 * @param {string[]} assignedRoles
 * @returns {Object[]}
 */
export function getNavigableRoutes(assignedRoles) {
    const isAdmin = assignedRoles.includes('admin');
    return ROUTES.filter(r => {
        if (!r.section) return false;
        if (r.roles.length === 0) return false;
        if (isAdmin) return true;
        return r.roles.some(role => assignedRoles.includes(role));
    });
}

/**
 * Group navigable routes by section.
 * @param {string[]} assignedRoles
 * @returns {Map<string, Object[]>}
 */
export function getRoutesBySection(assignedRoles) {
    const routes   = getNavigableRoutes(assignedRoles);
    const sections = new Map();
    routes.forEach(route => {
        if (!sections.has(route.section)) sections.set(route.section, []);
        sections.get(route.section).push(route);
    });
    return sections;
}

export default ROUTES;