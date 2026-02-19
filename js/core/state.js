/**
 * state.js — Centralized State Management
 * 
 * Lightweight observable state store for sharing data across components
 * without global variable pollution. Uses pub/sub pattern.
 */

const State = (() => {
    /** @type {Map<string, any>} Internal state store */
    const _store = new Map();

    /** @type {Map<string, Set<Function>>} Subscriber registry */
    const _subscribers = new Map();

    /**
     * Set a value in the state store and notify subscribers.
     * @param {string} key
     * @param {any} value
     */
    function set(key, value) {
        const prev = _store.get(key);
        _store.set(key, value);

        // Notify all subscribers of this key
        if (_subscribers.has(key)) {
            _subscribers.get(key).forEach(fn => {
                try {
                    fn(value, prev);
                } catch (err) {
                    console.error(`[State] Subscriber error for key "${key}":`, err);
                }
            });
        }
    }

    /**
     * Get a value from the state store.
     * @param {string} key
     * @param {any} [defaultValue=null]
     * @returns {any}
     */
    function get(key, defaultValue = null) {
        return _store.has(key) ? _store.get(key) : defaultValue;
    }

    /**
     * Subscribe to state changes for a specific key.
     * @param {string} key
     * @param {Function} callback - (newValue, prevValue) => void
     * @returns {Function} Unsubscribe function
     */
    function subscribe(key, callback) {
        if (!_subscribers.has(key)) {
            _subscribers.set(key, new Set());
        }
        _subscribers.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const subs = _subscribers.get(key);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) _subscribers.delete(key);
            }
        };
    }

    /**
     * Remove a key from the store.
     * @param {string} key
     */
    function remove(key) {
        _store.delete(key);
        _subscribers.delete(key);
    }

    /**
     * Clear all state (used on logout).
     */
    function clear() {
        _store.clear();
        _subscribers.clear();
    }

    return Object.freeze({
        set,
        get,
        subscribe,
        remove,
        clear
    });
})();

export default State;
