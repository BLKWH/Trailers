// --- Offline data helpers ---
function getOfflineAnime(anilistId) {
    try {
        const offline = window.massUpdater?.offlineData || {};
        // project file shape: { data: { anime: { id: {...} } } }
        if (offline.data && offline.data.anime && offline.data.anime[anilistId]) return offline.data.anime[anilistId];
        // direct top-level keyed by id
        if (offline[anilistId]) return offline[anilistId];
        if (offline.data && offline.data[anilistId]) return offline.data[anilistId];
        // direct shape: { anime: { id: {...} } }
        if (offline.anime && offline.anime[anilistId]) return offline.anime[anilistId];
        // keyed entries: anime_<id>
        if (offline[`anime_${anilistId}`]) return offline[`anime_${anilistId}`].data || offline[`anime_${anilistId}`];
        return null;
    } catch (e) { return null; } }
// End of window.debugAnimeList

// Global helper: return a readable string from AniList name shapes (string or object)
function readableName(x) {
    if (!x && x !== 0) return '';
    try {
        if (typeof x === 'string') return x;
        if (typeof x === 'number') return String(x);
        if (typeof x === 'object') {
            if (x.full) return x.full;
            if (x.romaji) return x.romaji;
            if (x.english) return x.english;
            if (x.native) return x.native;
            if (x.name) return readableName(x.name);
            if (x.title) return readableName(x.title);
            if (x.first) return x.first + (x.last ? (' ' + x.last) : '');
            // Fallback: try to stringify sensible fields
            if (x.id) return String(x.id);
            return String(x);
        }
        return String(x);
    } catch (e) { return String(x); }
}

function getOfflineStaff(staffId) {
    try {
        const offline = window.massUpdater?.offlineData || {};
        // project file shape
        if (offline.data && offline.data.staff && offline.data.staff[staffId]) return offline.data.staff[staffId];
        // direct top-level keyed by id
        if (offline[staffId]) return offline[staffId];
        if (offline.data && offline.data[staffId]) return offline.data[staffId];
        // direct shape
        if (offline.staff && offline.staff[staffId]) return offline.staff[staffId];
        // keyed entries
        if (offline[`staff_${staffId}`]) return offline[`staff_${staffId}`].data || offline[`staff_${staffId}`];
        return null;
    } catch (e) { return null; } }
// End of window.debugAnimeList

function getOfflineStudio(studioId) {
    try {
        const offline = window.massUpdater?.offlineData || {};
        // project file shape
        if (offline.data && offline.data.studios && offline.data.studios[studioId]) return offline.data.studios[studioId];
        // project file shape (some exports use singular 'studio')
        if (offline.data && offline.data.studio && offline.data.studio[studioId]) return offline.data.studio[studioId];
        // direct top-level keyed by id
        if (offline[studioId]) return offline[studioId];
        if (offline.data && offline.data[studioId]) return offline.data[studioId];
        // direct shape
        if (offline.studios && offline.studios[studioId]) return offline.studios[studioId];
        // direct shape (singular 'studio' map)
        if (offline.studio && (offline.studio[studioId] || offline.studio[String(studioId)])) return offline.studio[studioId] || offline.studio[String(studioId)];
        // keyed entries
        if (offline[`studio_${studioId}`]) return offline[`studio_${studioId}`].data || offline[`studio_${studioId}`];
        // Fallback: scan through offline and offline.data values to find an object with matching id
        const targetId = Number(studioId);
        try {
            // scan top-level keys
            for (const [k, v] of Object.entries(offline)) {
                if (!v || typeof v !== 'object') continue;
                if (v.id && Number(v.id) === targetId) return v;
                if (v.data && typeof v.data === 'object') {
                    if (v.data.id && Number(v.data.id) === targetId) return v.data;
                    // nested studios map
                    if (v.data.studios && v.data.studios[targetId]) return v.data.studios[targetId];
                    if (v.data.studio && v.data.studio[targetId]) return v.data.studio[targetId];
                }
            }
            // scan offline.data specifically
            if (offline.data && typeof offline.data === 'object') {
                for (const [k, v] of Object.entries(offline.data)) {
                    if (!v || typeof v !== 'object') continue;
                    if (v.id && Number(v.id) === targetId) return v;
                    if (v.studios && v.studios[targetId]) return v.studios[targetId];
                    if (v.studio && v.studio[targetId]) return v.studio[targetId];
                }
            }
        } catch (e) {
            // ignore scan errors
        }
        return null;
    } catch (e) { return null; } }
// End of window.debugAnimeList 

function loadOfflineAnime(anilistId) {
    const entry = getOfflineAnime(anilistId);
    if (entry) {
        console.log("📦 Found offline anime data for:", anilistId);
        return entry;
    } else {
        console.warn("📦 No offline anime data for:", anilistId);
        return null;
    }
}

function loadOfflineStaff(staffId) {
    const entry = getOfflineStaff(staffId);
    if (entry) {
        console.log("📦 Found offline staff data for:", staffId);
        return entry;
    } else {
        console.warn("📦 No offline staff data for:", staffId);
        return null;
    }
}

function loadOfflineStudio(studioId) {
    const entry = getOfflineStudio(studioId);
    if (entry) {
        console.log("📦 Found offline studio data for:", studioId);
        return entry;
    } else {
        console.warn("📦 No offline studio data for:", studioId);
        return null;
    }
}

// Normalize offline anime -> staff edges for different offline-data shapes
function normalizeOfflineStaffEdges(offlineAnimeEntry, anilistId) {
    if (!offlineAnimeEntry) return [];
    // GraphQL-style edges
    if (offlineAnimeEntry.staff && Array.isArray(offlineAnimeEntry.staff.edges)) return offlineAnimeEntry.staff.edges;
    // Simple array of staff IDs
    if (offlineAnimeEntry.staff && Array.isArray(offlineAnimeEntry.staff)) {
        return offlineAnimeEntry.staff.map(id => {
            const staffData = loadOfflineStaff(String(id)) || loadOfflineStaff(id) || {};
            // Normalize staff name: prefer .name.full / .name.english / .name.native, but handle when name is a string
            let fullName = `Staff ${id}`;
            try {
                if (staffData.name) {
                    if (typeof staffData.name === 'string') {
                        fullName = staffData.name;
                    } else if (typeof staffData.name === 'object') {
                        fullName = staffData.name.full || staffData.name.english || staffData.name.native || staffData.name.romaji || fullName;
                    }
                } else {
                    fullName = staffData.fullName || staffData.full || fullName;
                }
            } catch (e) {
                fullName = staffData.fullName || staffData.full || `Staff ${id}`;
            }
            // Attempt to derive the staff role for this anime by inspecting staffData.staffMedia.edges
            let role = '';
            try {
                const edges = staffData.staffMedia && staffData.staffMedia.edges ? staffData.staffMedia.edges : (staffData.media && staffData.media.edges ? staffData.media.edges : null);
                if (edges && Array.isArray(edges) && edges.length) {
                    // Helper: attempt multiple id locations
                    const idMatch = edges.find(e => {
                        const possibleId = e.node?.id || (e.node && e.node.node && e.node.node.id) || e.media?.id || e.node?.media?.id || null;
                        return possibleId && String(possibleId) === String(anilistId);
                    });

                    let match = idMatch || null;

                    // If no id match, try matching by title (romaji/english)
                    if (!match && offlineAnimeEntry && offlineAnimeEntry.title) {
                        const targetTitles = [];
                        if (offlineAnimeEntry.title.romaji) targetTitles.push(String(offlineAnimeEntry.title.romaji).toLowerCase());
                        if (offlineAnimeEntry.title.english) targetTitles.push(String(offlineAnimeEntry.title.english).toLowerCase());
                        match = edges.find(e => {
                            const t = e.node && e.node.title ? (e.node.title.romaji || e.node.title.english || e.node.title.native || '') : '';
                            return t && targetTitles.includes(String(t).toLowerCase());
                        }) || null;
                    }

                    // If we still don't have a confident match, employ a conservative fallback:
                    // - prefer edges with media type ANIME
                    // - prefer edges with seasonYear matching the target anime (within +/-1 year)
                    // - if exactly one remaining edge, use its role
                    // - otherwise, if a clear majority role exists among remaining edges, use that
                    if (match) {
                        role = match.staffRole || match.role || match.node?.staffRole || '';
                    } else {
                        try {
                            // Narrow edges to ANIME-type media if available
                            let candidates = edges.filter(e => {
                                const node = e.node || e.media || {};
                                const type = node.type || node.mediaType || null;
                                return !type || String(type).toUpperCase() === 'ANIME';
                            });

                            // Further narrow by seasonYear if anime has that info
                            const targetYear = offlineAnimeEntry && offlineAnimeEntry.seasonYear ? Number(offlineAnimeEntry.seasonYear) : null;
                            if (targetYear) {
                                const byYear = candidates.filter(e => {
                                    const year = e.node?.seasonYear || e.node?.media?.seasonYear || e.node?.title?.seasonYear || e.node?.seasonYear;
                                    if (!year) return false;
                                    const y = Number(year);
                                    return Math.abs(y - targetYear) <= 1; // allow one-year leeway
                                });
                                if (byYear.length > 0) candidates = byYear;
                            }

                            if (candidates.length === 1) {
                                const c = candidates[0];
                                role = c.staffRole || c.role || c.node?.staffRole || '';
                            } else if (candidates.length > 1) {
                                // Check for a majority role string among candidates
                                const counts = {};
                                for (const c of candidates) {
                                    const r = (c.staffRole || c.role || c.node?.staffRole || '').trim();
                                    if (!r) continue;
                                    counts[r] = (counts[r] || 0) + 1;
                                }
                                const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]);
                                if (entries.length > 0 && entries[0][1] > 1 && entries[0][1] >= Math.ceil(candidates.length/2)) {
                                    role = entries[0][0];
                                } else {
                                    role = '';
                                }
                            } else {
                                role = '';
                                if (window && window.DEBUG_OFFLINE_STAFF_ROLE) console.log('DEBUG: No confident staff role match after heuristic for staff', id, 'anime', anilistId);
                            }
                        } catch (fallbackErr) {
                            role = '';
                        }
                    }
                }
            } catch (e) {
                role = '';
            }
            return { node: { id, name: fullName, image: (staffData.image && staffData.image.medium) || null }, role: role || '' };
        });
    }
    return [];
}

// Normalize offline anime -> studio edges for different offline-data shapes
function normalizeOfflineStudioEdges(offlineAnimeEntry, anilistId) {
    if (!offlineAnimeEntry) return [];
    // GraphQL-style edges
    if (offlineAnimeEntry.studios && Array.isArray(offlineAnimeEntry.studios.edges)) return offlineAnimeEntry.studios.edges;
    // Simple array of studio IDs
    if (offlineAnimeEntry.studios && Array.isArray(offlineAnimeEntry.studios)) {
        return offlineAnimeEntry.studios.map(id => {
            const studioDataRaw = loadOfflineStudio(String(id)) || loadOfflineStudio(id) || null;
            // studioData may be a string (name) or an object
            let name = `Studio ${id}`;
            let isMain = false;
            if (studioDataRaw) {
                // If the stored object looks like a studio-like object, extract a readable name safely
                if (typeof studioDataRaw === 'string') {
                    name = studioDataRaw;
                } else if (typeof studioDataRaw === 'object') {
                    // If this object looks like a staff member, skip treating it as a studio
                    const looksLikeStaff = studioDataRaw.name && typeof studioDataRaw.name === 'object' && (studioDataRaw.name.full || studioDataRaw.name.native || studioDataRaw.name.english);
                    if (looksLikeStaff) {
                        if (window && window.DEBUG_OFFLINE_STUDIO) console.log('DEBUG: Skipping staff-like object for studio id', id);
                        // Keep default name (Studio <id>)
                    } else {
                        // If the name field is an object, prefer romaji/english/native; otherwise use the string
                        if (studioDataRaw.name) {
                            if (typeof studioDataRaw.name === 'string') {
                                name = studioDataRaw.name;
                            } else if (typeof studioDataRaw.name === 'object') {
                                name = studioDataRaw.name.romaji || studioDataRaw.name.english || studioDataRaw.name.native || studioDataRaw.name.full || name;
                            }
                        } else if (studioDataRaw.company) {
                            name = studioDataRaw.company;
                        }

                        // try to detect isMain from studioData.media.edges
                        try {
                            const edges = studioDataRaw.media && studioDataRaw.media.edges ? studioDataRaw.media.edges : (studioDataRaw.mediaEdges || null);
                            if (Array.isArray(edges)) {
                                const match = edges.find(e => String(e.node?.id) === String(anilistId));
                                if (match) isMain = !!match.isMainStudio || !!match.isMain || !!match.isMainStudio;
                            }
                        } catch (e) {
                            // ignore
                        }
                    }
                }
            }
            // Skip producers / non-animation studios if flagged explicitly
            if (studioDataRaw && typeof studioDataRaw === 'object' && studioDataRaw.hasOwnProperty('isAnimationStudio') && studioDataRaw.isAnimationStudio === false) {
                return null;
            }
            return { node: { id, name: String(name) }, isMain };
        }).filter(Boolean);
    }
    return [];
}


// --- Example integration point ---
// Replace your old inline lookups in updateViewer / testOfflineDisplay with these helpers.

function updateViewer(anilistId) {
    console.log("🔄 updateViewer called, ID:", anilistId);

    // If we're in offline mode but offline data hasn't finished loading yet,
    // defer the initial rendering until we receive the offlineDataReady signal.
    try {
        const isOffline = window.massUpdater && window.massUpdater.isOfflineMode && window.massUpdater.isOfflineMode();
        const hasAnimeMap = window.massUpdater && window.massUpdater.offlineData && window.massUpdater.offlineData.anime && Object.keys(window.massUpdater.offlineData.anime).length > 0;
        if (isOffline && !hasAnimeMap && !window.__offlineDataHydrated) {
            console.log('⏳ updateViewer: deferring initial render until offlineDataReady');
            const onceHandler = () => {
                try { console.log('✅ offlineDataReady received - retrying updateViewer for', anilistId); updateViewer(anilistId); } catch (e) {}
            };
            window.addEventListener('offlineDataReady', onceHandler, { once: true });
            return;
        }
    } catch (e) { /* ignore */ }

    const offlineAnime = loadOfflineAnime(anilistId);
    if (window.massUpdater?.isOfflineMode() && offlineAnime) {
        // Render from offline cache
        renderAnimeFromCache(offlineAnime);
        return;
    }

    if (window.massUpdater?.isOfflineMode() && !offlineAnime) {
        console.warn("🔌 Offline mode - no cached data available for", anilistId);
        showOfflineUnavailableMessage();
        return;
    }

    // Online mode path
        return fetchAnimeDetails(anilistId)
        .then(data => renderAnimeFromAPI(data))
        .catch(err => {
            console.error("❌ Failed to fetch anime details:", err);
            showErrorMessage(err.message);
        });
}

const AniListRateLimiter = {
    queue: [],
    lastFetchTimestamps: [], // Timestamps of last N fetches
    minInterval: 3000, // 3 seconds between requests
    maxPerMinute: 30, // 30 requests per minute (well below 90)
    isProcessing: false,


    async schedule(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.processQueue();
        });
    },

    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        while (this.queue.length > 0) {
            // Enforce per-minute limit
            const now = Date.now();
            this.lastFetchTimestamps = this.lastFetchTimestamps.filter(ts => now - ts < 60000);
            if (this.lastFetchTimestamps.length >= this.maxPerMinute) {
                const waitMs = 60000 - (now - this.lastFetchTimestamps[0]) + 100;
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }
            // Enforce min interval
            if (this.lastFetchTimestamps.length > 0) {
                const sinceLast = now - this.lastFetchTimestamps[this.lastFetchTimestamps.length - 1];
                if (sinceLast < this.minInterval) {
                    await new Promise(r => setTimeout(r, this.minInterval - sinceLast));
                }
            }
            // Dequeue and run
            const { fn, resolve, reject } = this.queue.shift();
            try {
                this.lastFetchTimestamps.push(Date.now());
                const result = await fn();
                resolve(result);
            } catch (e) {
                reject(e);
            }
        }
        this.isProcessing = false;
    }
}

// Data will be loaded from data/anime.js
// Global debug variable for console logging
const DEBUG_MODE = false; // Default to false to avoid log spam in normal use

// Debug logging helper (move this above CacheManager so it's available)

const debugLog = (...args) => {
    if (DEBUG_MODE) console.log(...args);
};


// Enhanced Cache Manager for persistent storage
const CacheManager = {
    // Cleanup expired entries manually (added to fix missing method error)
    cleanup() {
        let cleaned = 0;
        Object.keys(this.CACHE_TYPES).forEach(type => {
            cleaned += this.clearType(type) || 0;
        });
        return cleaned;
    },
    // Cache configuration with different expiry times
    CACHE_TYPES: {
        STAFF_ROLES: { prefix: 'staff_roles_', expiry: 7 * 24 * 60 * 60 * 1000 }, // 7 days
        ANN_DATA: { prefix: 'ann_data_', expiry: 7 * 24 * 60 * 60 * 1000 }, // 7 days
        ANILIST_DATA: { prefix: 'anilist_data_', expiry: 3 * 24 * 60 * 60 * 1000 }, // 3 days
        STUDIO_DATA: { prefix: 'studio_data_', expiry: 7 * 24 * 60 * 60 * 1000 }, // 7 days
        NAME_VARIATIONS: { prefix: 'name_vars_', expiry: 30 * 24 * 60 * 60 * 1000 } // 30 days
    },
    
    // Cache version for migration support
    CACHE_VERSION: 'v1.2',
    
    // Generate cache key
    generateKey(type, identifier) {
        const config = this.CACHE_TYPES[type];
        if (!config) throw new Error(`Unknown cache type: ${type}`);
        return `${config.prefix}${identifier}_${this.CACHE_VERSION}`;
    },
    
    // Set cache data
    set(type, identifier, data) {
        try {
            const key = this.generateKey(type, identifier);
            const cacheEntry = {
                timestamp: Date.now(),
                data: data,
                version: this.CACHE_VERSION
            };
            localStorage.setItem(key, JSON.stringify(cacheEntry));
            debugLog(`💾 Cached ${type} for: ${identifier}`);
            return true;
        } catch (error) {
            console.warn(`❌ Failed to cache ${type} for ${identifier}:`, error);
            return false;
        }
    },
    
    // Get cache data
    get(type, identifier, maxAge = null) {
        try {
            const key = this.generateKey(type, identifier);
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            
            const cacheEntry = JSON.parse(cached);
            const age = Date.now() - cacheEntry.timestamp;
            const expiry = maxAge || this.CACHE_TYPES[type].expiry;
            
            if (age > expiry) {
                debugLog(`⏰ Cache expired for ${type}: ${identifier}`);
                localStorage.removeItem(key);
                return null;
            }
            
            debugLog(`📦 Cache hit for ${type}: ${identifier} (age: ${Math.round(age / 1000 / 60)}min)`);
            return cacheEntry.data;
        } catch (error) {
            console.warn(`❌ Failed to read cache for ${type}:`, error);
            return null;
        }
    },
    
    // Check if data exists in cache (without reading)
    has(type, identifier) {
        const key = this.generateKey(type, identifier);
        return localStorage.getItem(key) !== null;
    },
    
    // Remove specific cache entry
    remove(type, identifier) {
        const key = this.generateKey(type, identifier);
        localStorage.removeItem(key);
    debugLog(`🗑️ Removed cache for ${type}: ${identifier}`);
    },
    
    // Clear all cache of a specific type
    clearType(type) {
        const config = this.CACHE_TYPES[type];
        if (!config) return;
        const prefix = config.prefix;
        const version = this.CACHE_VERSION;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix) && key.endsWith(`_${version}`)) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
        debugLog(`🗑️ Cleared ${keysToRemove.length} cache entries for type: ${type}`);
        return keysToRemove.length;
    }
};


// Auto-cleanup on page load
CacheManager.cleanup();


// Ensure a basic simpleAniListQuery exists so batch fetchers won't throw when not present
if (typeof window.simpleAniListQuery !== 'function') {
    // Simple global rate limiter used by the query wrapper to reduce request bursts
    window._simpleAniListRateLimiter = window._simpleAniListRateLimiter || {
        lastRequestTs: 0,
        // conservative default: ~1.6 requests/sec (600ms between requests)
        minIntervalMs: 600,
        async wait() {
            const now = Date.now();
            const delta = now - this.lastRequestTs;
            const waitFor = Math.max(0, this.minIntervalMs - delta);
            if (waitFor > 0) await new Promise(r => setTimeout(r, waitFor));
        },
        mark() { this.lastRequestTs = Date.now(); }
    };

    window.simpleAniListQuery = async function(query, variables = {}, tag = '') {
        // Respect offline mode if massUpdater is available
        if (window.massUpdater && typeof window.massUpdater.isOfflineMode === 'function' && window.massUpdater.isOfflineMode()) {
            return Promise.reject(new Error('Offline mode enabled - network queries blocked'));
        }

        // Resolve endpoint from localStorage if present, fallback to localhost proxy
        const rawEndpoint = localStorage.getItem('anilistProxy') || 'http://localhost:4000/graphql';
        const endpoint = rawEndpoint;

        // Retry with conservative exponential backoff + jitter on transient errors (including 429)
        const maxAttempts = 6; // allow a few more attempts but with larger delays
        let attempt = 0;

        while (attempt < maxAttempts) {
            attempt++;

            // Ensure we don't flood the endpoint: wait according to rate limiter
            try {
                await window._simpleAniListRateLimiter.wait();
            } catch (e) {
                // ignore waiting errors
            }

            // Timeout using AbortController for each attempt
            const controller = new AbortController();
            const timeoutMs = 15000; // 15s per request
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                // mark the request time (after waiting)
                window._simpleAniListRateLimiter.mark();
                console.log('🌐 simpleAniListQuery ->', { tag, endpoint, attempt, minInterval: window._simpleAniListRateLimiter.minIntervalMs });

                const resp = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, variables }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (resp.status === 429 || (resp.status >= 500 && resp.status < 600)) {
                    // Rate limited or server error - compute retry delay
                    const retryAfter = resp.headers.get('Retry-After');
                    let baseDelay;
                    if (resp.status === 429) {
                        // honor Retry-After if provided, else use a conservative exponential base
                        baseDelay = retryAfter ? (parseInt(retryAfter, 10) * 1000) : (1000 * Math.pow(2, attempt));
                    } else {
                        baseDelay = 1500 * Math.pow(2, attempt);
                    }

                    // jitter +/- ~20%
                    const jitter = Math.floor(baseDelay * (0.2 * (Math.random() - 0.5)));
                    const delayMs = Math.max(250, baseDelay + jitter);

                    console.warn(`⚠️ simpleAniListQuery received ${resp.status}, retrying after ${delayMs}ms (attempt ${attempt})`);

                    // also nudge the global rate limiter to be more conservative for a while
                    try {
                        window._simpleAniListRateLimiter.minIntervalMs = Math.min(5000, Math.max(window._simpleAniListRateLimiter.minIntervalMs * 1.5, 600));
                    } catch (e) {}

                    await new Promise(r => setTimeout(r, delayMs));
                    continue;
                }

                const json = await resp.json();
                if (json.errors) throw new Error('GraphQL errors: ' + JSON.stringify(json.errors));
                return json.data;
            } catch (e) {
                clearTimeout(timeoutId);
                if (e && e.name === 'AbortError') {
                    console.warn('⚠️ simpleAniListQuery attempt timed out, will retry if attempts remain', { attempt });
                } else if (e && e.message && e.message.includes('GraphQL errors')) {
                    // GraphQL syntax/validation errors are fatal for this query
                    console.error('❌ GraphQL error in simpleAniListQuery:', e.message);
                    return Promise.reject(e);
                } else {
                    console.warn('⚠️ simpleAniListQuery transient error, will retry if attempts remain', { attempt, error: e.message || e });
                }

                // exponential backoff before retry with jitter
                const backoffBase = 1000 * Math.pow(2, attempt);
                const jitter = Math.floor(Math.random() * 500);
                const backoffMs = Math.min(30000, backoffBase + jitter);
                await new Promise(r => setTimeout(r, backoffMs));
            }
        }

        return Promise.reject(new Error('simpleAniListQuery failed after retries'));
    };

}


// Studio name normalization function
function normalizeStudioName(name) {
    if (!name) return name;
    
    // Replace specific studio name variations
    const normalizations = {
        'Gekkō': 'Gekkou',
        'gekkō': 'gekkou'
    };
    
    return normalizations[name] || name;
}

// Co-production detection function
function getCoProduction(animeTitle, currentStudio) {
    if (!animeTitle || !currentStudio) return null;

    console.log(`🤝 Checking co-production for "${animeTitle}" with current studio "${currentStudio}"`);

    // Use the global CO_PRODUCTIONS registry to avoid duplicate sources of truth
    const coProductions = (typeof CO_PRODUCTIONS === 'object' && CO_PRODUCTIONS) ? CO_PRODUCTIONS : {};

    // Try exact match first
    let matchedTitle = null;
    if (coProductions[animeTitle]) {
        matchedTitle = animeTitle;
    } else {
        const normalizedSearchTitle = String(animeTitle).toLowerCase().trim();
        for (const title of Object.keys(coProductions)) {
            try {
                if (String(title).toLowerCase() === normalizedSearchTitle) {
                    matchedTitle = title;
                    break;
                }
            } catch (e) { continue; }
        }
    }

    if (matchedTitle) {
        const normalizedCurrentStudio = normalizeStudioName(currentStudio);
        for (const [studio, partners] of Object.entries(coProductions[matchedTitle] || {})) {
            const normalizedStudio = normalizeStudioName(studio);
            if (normalizedStudio === normalizedCurrentStudio || normalizedStudio.toLowerCase() === normalizedCurrentStudio.toLowerCase()) {
                console.log(`✅ Found co-production: ${animeTitle} by ${studio} with ${partners.join(', ')}`);
                return partners;
            }
        }
    }

    console.log(`❌ No co-production found for "${animeTitle}" with studio "${currentStudio}"`);
    return null;
}

// Helper function to add new co-productions easily
// Global registry for co-productions so additions persist at runtime
const CO_PRODUCTIONS = {
    "Oomuro-ke: dear sisters": {
        "Lings": ["Passione"],
        "Passione": ["Lings"]
    },
    "YURU YURI 10th Anniversary OVA": {
        "TYO Animations": ["Lay-duce"],
        "Lay-duce": ["TYO Animations"]
    },
    "SPY×FAMILY Season 3": {
        "Wit Studio": ["CloverWorks"],
        "CloverWorks": ["Wit Studio"]
    },
    "Disney Twisted-Wonderland The Animation": {
        "Graphinica": ["Disney Japan"],
        "Disney Japan": ["Graphinica"]
    },
    "Who Made Me a Princess": {
        "Studio Deen": ["Bilibili"],
        "Bilibili": ["Studio Deen"]
    }
};

window.addCoProduction = function(animeTitle, studioPartners) {
    try {
        if (!animeTitle || !studioPartners) return null;
        CO_PRODUCTIONS[animeTitle] = studioPartners;
        console.log(`🤝 Added co-production mapping for: ${animeTitle}`);
        return { animeTitle, studioPartners };
    } catch (e) {
        console.error('❌ Failed to add co-production:', e);
        return null;
    }
};

// Helper function to test co-production detection
window.testCoProduction = function(animeTitle, studio) {
    console.log(`🧪 Testing co-production detection:`);
    console.log(`   Anime: "${animeTitle}"`);
    console.log(`   Studio: "${studio}"`);
    const result = getCoProduction(animeTitle, studio);
    if (result) {
        console.log(`✅ Found co-producers: ${result.join(', ')}`);
    } else {
        console.log('❌ No co-producers found.');
    }
    // Return the detected partners (or null) to the caller
    return result || null;
};

// Batch fetcher for AniList staff and studios
class BatchDataFetcher {
    constructor() {
        console.log('🔧 BatchDataFetcher constructor called');
        this.staffCache = new Map();
        this.studioCache = new Map();
        this.lastBatchTime = 0;
        this.requestDelay = 3000; // ms between requests (increased to avoid rate limits)
        this.batchSize = 25; // reduce page size to ease proxy load
        // Per-run studio page limit (configurable via localStorage: 'batchStudioPageLimit')
        this.studioPageLimit = Number(localStorage.getItem('batchStudioPageLimit')) || 60;
        console.log(`🔧 studioPageLimit set to ${this.studioPageLimit}`);
    }

    // Batch fetch studios with pagination
    async batchFetchStudios(page = 1, totalFetched = 0) {
        debugLog(`🏢 Batch fetching studios (page ${page})`);
        console.log(`🏢 batchFetchStudios starting page ${page}`);

        // Prefer a lighter-weight studios list (no nested media) to avoid heavy proxy processing
        const lightQuery = `
            query ($page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo { total currentPage hasNextPage lastPage }
                    studios { id name isAnimationStudio }
                }
            }
        `;

        const variables = { page, perPage: this.batchSize };

        // Local per-page attempts with jittered backoff to avoid hammering the proxy
        const maxLocalAttempts = 3;
        for (let attempt = 1; attempt <= maxLocalAttempts; attempt++) {
            try {
                await this.throttleRequest();
                const data = await simpleAniListQuery(lightQuery, variables, `batch-studios-${page}`);

                if (data?.Page?.studios) {
                    for (const studio of data.Page.studios) {
                        this.studioCache.set(studio.id, studio);
                        this.studioCache.set(studio.name, studio);
                    }

                    const fetchedCount = totalFetched + data.Page.studios.length;
                    console.log(`✅ Fetched ${data.Page.studios.length} studios (${fetchedCount}/${data.Page.pageInfo?.total || 'unknown'} total)`);

                    // Persist after each successful page to avoid losing progress
                    try { this.saveCacheToStorage(); } catch (e) { console.warn('⚠️ Failed to persist studio cache after page:', e); }

                    // Small jittered delay before next page to reduce bursts
                    const jitter = Math.floor(Math.random() * 1000);
                    await new Promise(r => setTimeout(r, this.requestDelay + jitter));

                        if (data.Page.pageInfo.hasNextPage && page < this.studioPageLimit) {
                        return await this.batchFetchStudios(page + 1, fetchedCount);
                    }

                    return fetchedCount;
                }

                // If we reach here, treat as a transient failure and retry locally
                throw new Error('No studios returned for page');

            } catch (err) {
                console.error(`❌ Error fetching studios page ${page} (attempt ${attempt}):`, err && err.message ? err.message : err);

                if (attempt < maxLocalAttempts) {
                    // Wait with exponential backoff + jitter before retrying locally
                    const backoff = this.requestDelay * Math.pow(2, attempt);
                    const jitter = Math.floor(Math.random() * 1500);
                    const waitMs = backoff + jitter;
                    console.log(`⏳ Waiting ${waitMs}ms before local retry ${attempt + 1} for page ${page}`);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }

                // Local attempts exhausted - try scheduling a retry and return progress so far
                console.warn(`🔁 Local retries exhausted for studios page ${page}. Scheduling a deferred retry.`);

                // Schedule a background retry in 5 minutes (avoid multiple schedules)
                try {
                    if (!this._studioRetryScheduled) {
                        this._studioRetryScheduled = true;
                        const retryMs = 5 * 60 * 1000; // 5 minutes
                        console.log(`⏳ Scheduling deferred studio page ${page} retry in ${Math.round(retryMs/1000)}s`);
                        setTimeout(async () => {
                            try {
                                console.log(`🔁 Deferred retry for studios page ${page} starting...`);
                                const retryCount = await this.batchFetchStudios(page, totalFetched);
                                console.log('✅ Deferred studio retry completed, fetched:', retryCount);
                                this.saveCacheToStorage();
                            } catch (retryErr) {
                                console.error('❌ Deferred studio retry failed:', retryErr);
                            } finally {
                                this._studioRetryScheduled = false;
                            }
                        }, retryMs);
                    } else {
                        console.log('🧭 Deferred studio retry already scheduled, skipping new schedule');
                    }
                } catch (scheduleErr) {
                    console.error('❌ Failed to schedule deferred studio retry:', scheduleErr);
                }

                return totalFetched;
            }
        }

        return totalFetched;
    }

    // Throttle requests to avoid rate limits
    async throttleRequest() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastBatchTime;
        
        if (timeSinceLastRequest < this.requestDelay) {
            const waitTime = this.requestDelay - timeSinceLastRequest;
            debugLog(`⏳ Throttling request, waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastBatchTime = Date.now();
    }

    // Batch fetch staff with pagination (defensive - may be limited by AniList schema)
    async batchFetchStaff(page = 1, totalFetched = 0) {
        debugLog(`👥 Batch fetching staff (page ${page})`);
        console.log(`👥 batchFetchStaff starting page ${page}`);

        const query = `
            query ($page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        currentPage
                        hasNextPage
                        lastPage
                    }
                    staff {
                        id
                        name {
                            full
                        }
                        image {
                            medium
                        }
                    }
                }
            }
        `;

        const variables = { page, perPage: this.batchSize };

        try {
            await this.throttleRequest();
            const data = await simpleAniListQuery(query, variables, `batch-staff-${page}`);

            if (data?.Page?.staff) {
                for (const staff of data.Page.staff) {
                    this.staffCache.set(staff.id, staff);
                    if (staff.name && staff.name.full) this.staffCache.set(staff.name.full, staff);
                }

                const fetchedCount = totalFetched + data.Page.staff.length;
                debugLog(`✅ Fetched ${data.Page.staff.length} staff (${fetchedCount}/${data.Page.pageInfo.total} total)`);

                // Continue pagination but limit to avoid massive runs (e.g., 20 pages)
                if (data.Page.pageInfo.hasNextPage && page < 20) {
                    return await this.batchFetchStaff(page + 1, fetchedCount);
                }

                return fetchedCount;
            }
        } catch (error) {
            console.error(`❌ Error batch fetching staff page ${page}:`, error);
        }

        return totalFetched;
    }

    // Get staff from cache first, fallback to individual fetch
    async getStaff(staffName) {
        // Check cache first
        if (this.staffCache.has(staffName)) {
            debugLog(`🎯 Staff cache hit for: ${staffName}`);
            return this.staffCache.get(staffName);
        }

        // If not in cache, try individual fetch (old method)
        debugLog(`🔍 Staff cache miss for: ${staffName}, falling back to individual fetch`);
        return null; // Let existing fetchStaffRoles handle it
    }

    // Get studio from cache first
    async getStudio(studioName) {
        if (this.studioCache.has(studioName)) {
            debugLog(`🎯 Studio cache hit for: ${studioName}`);
            return this.studioCache.get(studioName);
        }
        debugLog(`🔍 Studio cache miss for: ${studioName}`);
        return null;
    }

    // Initialize batch fetching (call this on page load)
    async initializeBatchData() {
    debugLog(`🚀 Initializing batch data fetching...`);
        console.log('🧭 BatchDataFetcher.initializeBatchData() start', { staffCacheSize: this.staffCache.size, studioCacheSize: this.studioCache.size });
        
        try {
            // Run staff then studios sequentially to reduce concurrent load and avoid proxy rate limits
            const staffCount = await this.batchFetchStaff();
            let studioCount = 0;

            // Try studios but don't let studio failures cancel the entire init
            try {
                studioCount = await this.batchFetchStudios();
            } catch (studioErr) {
                console.error('❌ Studio batch fetch failed during init:', studioErr);
                studioCount = 0;

                // Schedule a retry in 5 minutes if not already scheduled
                try {
                    if (!this._studioRetryScheduled) {
                        this._studioRetryScheduled = true;
                        const retryMs = 5 * 60 * 1000; // 5 minutes
                        console.log(`⏳ Scheduling studio batch retry in ${Math.round(retryMs/1000)}s`);
                        setTimeout(async () => {
                            try {
                                console.log('🔁 Retrying batchFetchStudios scheduled retry...');
                                const retryCount = await this.batchFetchStudios();
                                console.log('✅ Scheduled studio retry completed, fetched:', retryCount);
                                this.saveCacheToStorage();
                            } catch (retryErr) {
                                console.error('❌ Scheduled studio retry failed:', retryErr);
                            } finally {
                                this._studioRetryScheduled = false;
                            }
                        }, retryMs);
                    } else {
                        console.log('🧭 Studio retry already scheduled, skipping new schedule');
                    }
                } catch (scheduleErr) {
                    console.error('❌ Failed to schedule studio retry:', scheduleErr);
                }
            }

            debugLog(`✅ Batch initialization complete!`);
            console.log(`   📊 Cached staff after init: ${this.staffCache.size} (fetched: ${staffCount})`);
            console.log(`   🏢 Cached studios after init: ${this.studioCache.size} (fetched: ${studioCount})`);

            // Store in localStorage for persistence
            try {
                // Compact in-memory maps to remove duplicate name keys before saving
                try { this.compactCaches(); } catch (e) {}
                this.saveCacheToStorage();
            } catch (saveErr) {
                console.error('❌ Failed to save batch cache after init:', saveErr);
            }

            return { staffCount, studioCount };
        } catch (error) {
            console.error(`❌ Error initializing batch data:`, error);
            console.log('🧭 BatchDataFetcher.initializeBatchData() failed - current cache sizes', { staffCacheSize: this.staffCache.size, studioCacheSize: this.studioCache.size });
            return { staffCount: this.staffCache.size || 0, studioCount: this.studioCache.size || 0 };
        }
    }

    // Save cache to localStorage
    saveCacheToStorage() {
        try {
            // Serialize only unique numeric-id keyed entries to avoid doubling when names are also used as keys
            const staffEntries = [];
            const seenStaffIds = new Set();
            for (const [k, v] of this.staffCache.entries()) {
                let id = null;
                if (typeof k === 'number') id = k;
                else if (!isNaN(Number(k))) id = Number(k);
                else if (v && typeof v.id !== 'undefined') id = Number(v.id);

                if (id !== null && !seenStaffIds.has(id)) {
                    staffEntries.push([id, v]);
                    seenStaffIds.add(id);
                }
            }

            const studioEntries = [];
            const seenStudioIds = new Set();
            for (const [k, v] of this.studioCache.entries()) {
                let id = null;
                if (typeof k === 'number') id = k;
                else if (!isNaN(Number(k))) id = Number(k);
                else if (v && typeof v.id !== 'undefined') id = Number(v.id);

                if (id !== null && !seenStudioIds.has(id)) {
                    studioEntries.push([id, v]);
                    seenStudioIds.add(id);
                }
            }

            const cacheData = { staff: staffEntries, studios: studioEntries, timestamp: Date.now() };

            localStorage.setItem('anilist-batch-cache', JSON.stringify(cacheData));
            debugLog(`💾 Saved batch cache to localStorage (unique staff: ${staffEntries.length}, unique studios: ${studioEntries.length})`);
        } catch (error) {
            console.error(`❌ Error saving cache to storage:`, error);
        }
    }

    // Compact in-memory maps to keep only numeric-id keyed entries (remove duplicated name keys)
    compactCaches() {
        try {
            const compactStaff = new Map();
            for (const [k, v] of this.staffCache.entries()) {
                let id = null;
                if (typeof k === 'number') id = k;
                else if (!isNaN(Number(k))) id = Number(k);
                else if (v && typeof v.id !== 'undefined') id = Number(v.id);

                if (id !== null && !compactStaff.has(id)) {
                    compactStaff.set(id, v);
                }
            }

            const compactStudios = new Map();
            for (const [k, v] of this.studioCache.entries()) {
                let id = null;
                if (typeof k === 'number') id = k;
                else if (!isNaN(Number(k))) id = Number(k);
                else if (v && typeof v.id !== 'undefined') id = Number(v.id);

                if (id !== null && !compactStudios.has(id)) {
                    compactStudios.set(id, v);
                }
            }

            this.staffCache = compactStaff;
            this.studioCache = compactStudios;

            console.log(`🧹 compactCaches applied: staff=${this.staffCache.size}, studios=${this.studioCache.size}`);
            return true;
        } catch (e) {
            console.warn('⚠️ compactCaches failed:', e);
            return false;
        }
    }

    // Load cache from localStorage
    loadCacheFromStorage() {
        try {
            const raw = localStorage.getItem('anilist-batch-cache');
            if (!raw) {
                console.log('💤 No anilist-batch-cache entry in localStorage');
                return false;
            }

            const cacheData = JSON.parse(raw || '{}');
            
            if (cacheData.timestamp && cacheData.staff && cacheData.studios) {
                // Check if cache is less than 24 hours old
                const cacheAge = Date.now() - cacheData.timestamp;
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (cacheAge < maxAge) {
                    this.staffCache = new Map(cacheData.staff);
                    this.studioCache = new Map(cacheData.studios);
                    
                    debugLog(`✅ Loaded batch cache from localStorage`);
                    console.log('💾 Loaded anilist-batch-cache', { ageMs: cacheAge, staffEntries: this.staffCache.size, studioEntries: this.studioCache.size });
                    return true;
                } else {
                    console.log(`⏰ Batch cache expired (${Math.round(cacheAge / (60 * 60 * 1000))}h old), will refresh`);
                }
            } else {
                console.log('⚠️ anilist-batch-cache found but missing expected properties (timestamp/staff/studios)');
            }
        } catch (error) {
            console.error(`❌ Error loading cache from storage:`, error);
        }
        
        return false;
    }

}
// Mass Data Update System
class MassDataUpdater {
    constructor() {
        this.isUpdating = false;
        this.currentProgress = 0;
        this.totalItems = 0;
        this.updateQueue = [];
        this.offlineData = {};
        this.lastUpdateTimestamp = null;
        this.updateDelay = 2000; // 2 seconds between requests to avoid rate limiting
        
        this.loadOfflineData();
        this.createMassUpdateButton();
    }

    // Load existing offline data
    loadOfflineData() {
        // Start with an empty dataset and perform fresh fetches when Mass Update runs.
        this.offlineData = {};
        this.lastUpdateTimestamp = null;
        this.updateStatusText();
        // Best-effort: try loading split/unified project files in background to populate offlineData
        try {
            if (typeof this.loadFromProjectFile === 'function') {
                // fire-and-forget: merge result if found
                this.loadFromProjectFile().then(res => {
                    try {
                        if (res && res.data) {
                            this.offlineData = this.offlineData || {};
                            this.offlineData.anime = res.data.anime || this.offlineData.anime || {};
                            this.offlineData.staff = res.data.staff || this.offlineData.staff || {};
                            this.offlineData.studio = res.data.studio || this.offlineData.studio || {};
                            this.lastUpdateTimestamp = res.timestamp || Date.now();
                            console.log('📁 MassDataUpdater: loaded offline data from project file (background) — anime entries:', Object.keys(this.offlineData.anime||{}).length);
                            // Signal that offline data has been hydrated so initial renders can proceed
                            try {
                                window.__offlineDataHydrated = true;
                                window.dispatchEvent(new Event('offlineDataReady'));
                                console.log('[MassDataUpdater] offlineDataReady event dispatched');
                            } catch (e) {}
                            // If anime entries look like placeholders (few or smoke-test ids), try to infer IDs from window.animeData
                            try {
                                const currentCount = Object.keys(this.offlineData.anime || {}).length;
                                if (currentCount < 10 && typeof window.animeData === 'object') {
                                    console.log('🔎 MassDataUpdater: attempting to infer missing anime IDs from data/anime.js');
                                    Object.values(window.animeData).forEach(seasonsObj => {
                                        Object.values(seasonsObj || {}).forEach(list => {
                                            (list || []).forEach(item => {
                                                try {
                                                    const annFromField = (item.annId && String(item.annId).trim()) || null;
                                                    let ann = annFromField;
                                                    if (!ann && item.staffLink) {
                                                        const m = String(item.staffLink).match(/anilist\.co\/anime\/(\d+)/);
                                                        if (m) ann = m[1];
                                                    }
                                                    if (ann) {
                                                        if (!this.offlineData.anime) this.offlineData.anime = {};
                                                        if (!this.offlineData.anime[ann]) {
                                                            this.offlineData.anime[ann] = { id: Number(ann), title: { romaji: item.title || item.name || '' }, inferred: true };
                                                        }
                                                    }
                                                } catch (e) {}
                                            });
                                        });
                                    });
                                    console.log('🔎 MassDataUpdater: post-infer anime count', Object.keys(this.offlineData.anime || {}).length);
                                }
                            } catch (e) {}
                        }
                    } catch (e) { console.warn('MassDataUpdater: merge project file result failed', e); }
                }).catch(e => { /* ignore background load errors */ });
            }
        } catch (e) { /* ignore */ }
    }

    // Load from project file (for GitHub hosting)
    async loadFromProjectFile() {
        // Simplified loader: prefer split files for faster/partial loads.
        try {
            // 1) Try split files on local proxy (preferred)
                                const tryProxySplit = async () => {
                                const parts = { anime: null, staff: null, studio: null };
                                // Accept both naming conventions (offline-data-*.json and offline-*.json)
                                const candidates = [
                                    'http://localhost:4000/offline-data-anime.json',
                                    'http://localhost:4000/offline-anime.json'
                                ];
                                for (const url of candidates) {
                                    try { const a = await fetch(url); if (a.ok) { parts.anime = await a.json(); break; } } catch (e) {}
                                }
                                const staffCandidates = [ 'http://localhost:4000/offline-data-staff.json', 'http://localhost:4000/offline-staff.json' ];
                                for (const url of staffCandidates) { try { const s = await fetch(url); if (s.ok) { parts.staff = await s.json(); break; } } catch (e) {} }
                                const studioCandidates = [ 'http://localhost:4000/offline-data-studio.json', 'http://localhost:4000/offline-studio.json' ];
                                for (const url of studioCandidates) { try { const st = await fetch(url); if (st.ok) { parts.studio = await st.json(); break; } } catch (e) {} }
                if (parts.anime || parts.staff || parts.studio) {
                    // Normalize studio shape: some writers use data.studios, others data.studio, or direct map
                    const studioObj = parts.studio?.data?.studios || parts.studio?.data?.studio || parts.studio?.data || parts.studio || {};
                    // If studioObj itself contains a nested wrapper (e.g., { studio: { ... } }), unwrap it
                    const normalizedStudios = studioObj.studios || studioObj.studio || studioObj;
                    return { timestamp: Date.now(), version: '1.0', data: { anime: parts.anime?.data?.anime || parts.anime?.data || parts.anime || {}, staff: parts.staff?.data?.staff || parts.staff?.data || parts.staff || {}, studio: normalizedStudios, studios: normalizedStudios } };
                                }
                                return null;
                        };

            const proxySplit = await tryProxySplit();
            if (proxySplit) { debugLog('📁 Loaded split offline files from proxy'); return proxySplit; }

            // 2) Try unified project file on proxy
            try {
                const resp = await fetch('http://localhost:4000/load-data');
                if (resp.ok) { const data = await resp.json(); debugLog('📁 Loaded unified offline-data from proxy'); return data; }
            } catch (e) {}

            // 3) Try split static files (same-origin)
                const tryStaticSplit = async () => {
                const parts = { anime: null, staff: null, studio: null };
                const animeFiles = ['./offline-data-anime.json', './offline-anime.json'];
                for (const f of animeFiles) { try { const a = await fetch(f); if (a.ok) { parts.anime = await a.json(); break; } } catch (e) {} }
                const staffFiles = ['./offline-data-staff.json', './offline-staff.json'];
                for (const f of staffFiles) { try { const s = await fetch(f); if (s.ok) { parts.staff = await s.json(); break; } } catch (e) {} }
                const studioFiles = ['./offline-data-studio.json', './offline-studio.json'];
                for (const f of studioFiles) { try { const st = await fetch(f); if (st.ok) { parts.studio = await st.json(); break; } } catch (e) {} }
                if (parts.anime || parts.staff || parts.studio) {
                    const studioObj = parts.studio?.data?.studios || parts.studio?.data?.studio || parts.studio?.data || parts.studio || {};
                    const normalizedStudios = studioObj.studios || studioObj.studio || studioObj;
                    return { timestamp: Date.now(), version: '1.0', data: { anime: parts.anime?.data?.anime || parts.anime?.data || parts.anime || {}, staff: parts.staff?.data?.staff || parts.staff?.data || parts.staff || {}, studio: normalizedStudios, studios: normalizedStudios } };
                }
                return null;
            };

            const staticSplit = await tryStaticSplit();
            if (staticSplit) { debugLog('📁 Loaded split offline files from static hosting'); return staticSplit; }

            // 4) Last resort: unified static file (legacy)
            try {
                const u = await fetch('./offline-data.json');
                if (u.ok) {
                    const data = await u.json();
                    console.warn('⚠️ Loaded legacy unified offline-data.json. Consider splitting into offline-data-anime.json / offline-data-staff.json / offline-data-studio.json for better performance.');
                    debugLog(`📁 Static unified offline-data.json loaded: ${Object.keys(data.data || {}).length} entries`);
                    return data;
                }
            } catch (e) {}
        } catch (err) {
            console.error('❌ Error loading project file data:', err);
        }
        return null;
    }

    // Fetch and store staff data (optimized for essential data only)
    async fetchAndStoreStaffData(staffId) {
        if (!staffId) return null;
        try {
            debugLog(`👥 fetchAndStoreStaffData for ${staffId}`);
            // Try to fetch from AniList via simple query if available
            if (typeof simpleAniListQuery === 'function') {
                const q = `query($id:Int){ Staff(id:$id){ id name { full } image { medium } staffMedia { edges { node { id title { romaji english } } } } } }`;
                try {
                    const data = await simpleAniListQuery(q, { id: Number(staffId) }, `fetch-staff-${staffId}`);
                    const staffObj = data && data.Staff ? data.Staff : null;
                    if (staffObj) {
                        if (!this.offlineData) this.offlineData = {};
                        if (!this.offlineData.staff) this.offlineData.staff = {};
                        this.offlineData.staff[String(staffId)] = staffObj;
                        // Persist chunked save when convenient
                        try { this.saveOfflineData(); } catch (e) { /* ignore save errors */ }
                        return staffObj;
                    }
                } catch (e) {
                    console.warn('❌ fetchAndStoreStaffData query failed:', e && e.message ? e.message : e);
                }
            }
            // Fallback: attempt to load from any available offline resources
            const loaded = getOfflineStaff(staffId) || null;
            if (loaded) {
                if (!this.offlineData) this.offlineData = {};
                if (!this.offlineData.staff) this.offlineData.staff = {};
                this.offlineData.staff[String(staffId)] = loaded;
                return loaded;
            }
        } catch (e) {
            console.error('❌ fetchAndStoreStaffData failed:', e);
        }
        return null;
    }

    loadFromLocalStorage() {
        try {
            debugLog(`📦 Attempting to load from localStorage...`);
            
            // First try to load normal format
            const directData = localStorage.getItem('anilist-offline-data');
            if (directData) {
                debugLog(`📦 Found direct localStorage data: ${Math.round(directData.length / 1024)}KB`);
                const data = JSON.parse(directData);
                this.offlineData = data.data || {};
                this.lastUpdateTimestamp = data.timestamp || null;
                const animeCount = this.offlineData.anime ? Object.keys(this.offlineData.anime).length : 0;
                debugLog(`📦 Loaded offline data from localStorage: ${animeCount} anime entries`);
                if (this.lastUpdateTimestamp) {
                    const ageHours = Math.round((Date.now() - this.lastUpdateTimestamp) / (60 * 60 * 1000));
                    const ageMinutes = Math.round((Date.now() - this.lastUpdateTimestamp) / (60 * 1000));
                    console.log(`📅 Data age: ${ageHours}h ${ageMinutes % 60}m (timestamp: ${new Date(this.lastUpdateTimestamp).toLocaleString()})`);
                }
                return;
            }

            // Try per-part localStorage keys for split files
            const partKeys = {
                anime: ['anilist-offline-data-anime', 'anilist-offline-anime'],
                staff: ['anilist-offline-data-staff', 'anilist-offline-staff'],
                studio: ['anilist-offline-data-studio', 'anilist-offline-studio']
            };

            const foundParts = { anime: null, staff: null, studio: null };

            for (const part of Object.keys(partKeys)) {
                for (const key of partKeys[part]) {
                    const val = localStorage.getItem(key);
                    if (val) {
                        try {
                            const parsed = JSON.parse(val);
                            // Accept either { data: { anime: {...}} } or direct { anime entries }
                            if (parsed.data && parsed.data[part]) {
                                foundParts[part] = parsed.data[part];
                            } else if (parsed[part]) {
                                foundParts[part] = parsed[part];
                            } else if (parsed.data) {
                                // maybe data contains full map
                                foundParts[part] = parsed.data;
                            } else {
                                foundParts[part] = parsed;
                            }
                            debugLog(`📦 Found split localStorage part: ${key}`);
                            break;
                        } catch (e) {
                            // Not JSON - skip
                        }
                    }
                }
            }

            if (foundParts.anime || foundParts.staff || foundParts.studio) {
                // Merge into this.offlineData
                this.offlineData = this.offlineData || {};
                this.offlineData.anime = foundParts.anime || this.offlineData.anime || {};
                this.offlineData.staff = foundParts.staff || this.offlineData.staff || {};
                this.offlineData.studio = foundParts.studio || this.offlineData.studio || {};
                this.lastUpdateTimestamp = Date.now();
                const animeCount = this.offlineData.anime ? Object.keys(this.offlineData.anime).length : 0;
                debugLog(`📦 Loaded split localStorage parts: anime=${animeCount} entries`);
                return;
            }
            
            // Try to load chunked format (legacy single-file chunking)
            const metadata = localStorage.getItem('anilist-offline-metadata');
            if (metadata) {
                debugLog('🧩 Found chunked localStorage data');
                const meta = JSON.parse(metadata);
                
                if (meta.isPartial) {
                    console.log(`⚠️ Loading partial chunked data: ${meta.totalChunks} chunks (${meta.partialReason})`);
                } else {
                    console.log(`🧩 Loading complete chunked data: ${meta.totalChunks} chunks`);
                }
                
                let reconstructed = '';
                let loadedChunks = 0;
                
                for (let i = 0; i < meta.totalChunks; i++) {
                    const chunk = localStorage.getItem(`anilist-offline-chunk-${i}`);
                    if (!chunk) {
                        console.error(`❌ Missing chunk ${i} - stopping reconstruction`);
                        break;
                    }
                    reconstructed += chunk;
                    loadedChunks++;
                }
                
                if (loadedChunks > 0) {
                    try {
                        debugLog(`🧩 Reconstructed ${Math.round(reconstructed.length / 1024)}KB from ${loadedChunks}/${meta.totalChunks} chunks`);
                        const data = JSON.parse(reconstructed);
                        this.offlineData = data.data || {};
                        this.lastUpdateTimestamp = data.timestamp || null;
                        const animeCount = this.offlineData.anime ? Object.keys(this.offlineData.anime).length : 0;
                        debugLog(`📦 Loaded chunked offline data: ${animeCount} anime entries`);
                        if (meta.isPartial) {
                            debugLog(`⚠️ Note: This is partial data due to ${meta.partialReason}`);
                        }
                        if (this.lastUpdateTimestamp) {
                            const ageHours = Math.round((Date.now() - this.lastUpdateTimestamp) / (60 * 60 * 1000));
                            const ageMinutes = Math.round((Date.now() - this.lastUpdateTimestamp) / (60 * 1000));
                            debugLog(`📅 Data age: ${ageHours}h ${ageMinutes % 60}m (timestamp: ${new Date(this.lastUpdateTimestamp).toLocaleString()})`);
                        }
                        return;
                    } catch (parseError) {
                        console.error('❌ Failed to parse reconstructed chunked data:', parseError);
                    }
                } else {
                    console.error('❌ No chunks could be loaded');
                }
            }

            // Try split chunked metadata (per-part chunked saves). e.g., anilist-offline-metadata-anime
            const tryPartChunks = (part) => {
                try {
                    const metaKey = `anilist-offline-metadata-${part}`;
                    const metaRaw = localStorage.getItem(metaKey);
                    if (!metaRaw) return null;
                    const metaObj = JSON.parse(metaRaw);
                    if (!metaObj || !metaObj.totalChunks) return null;
                    let reconstructed = '';
                    for (let i = 0; i < metaObj.totalChunks; i++) {
                        const chunk = localStorage.getItem(`anilist-offline-chunk-${part}-${i}`) || localStorage.getItem(`anilist-offline-chunk-${i}`);
                        if (!chunk) return null;
                        reconstructed += chunk;
                    }
                    const parsed = JSON.parse(reconstructed);
                    // parsed may be { data: { anime: {...}} } or direct map
                    if (parsed.data && parsed.data[part]) return parsed.data[part];
                    if (parsed[part]) return parsed[part];
                    return parsed;
                } catch (e) {
                    return null;
                }
            };

            const pAnime = tryPartChunks('anime');
            const pStaff = tryPartChunks('staff');
            const pStudio = tryPartChunks('studio');
            if (pAnime || pStaff || pStudio) {
                this.offlineData = this.offlineData || {};
                this.offlineData.anime = pAnime || this.offlineData.anime || {};
                this.offlineData.staff = pStaff || this.offlineData.staff || {};
                this.offlineData.studio = pStudio || this.offlineData.studio || {};
                debugLog('🧩 Loaded split chunked localStorage parts');
                return;
            }
            
            debugLog(`📦 No localStorage data found`);
            this.offlineData = {};
        } catch (error) {
            console.error('❌ Error loading localStorage data:', error);
            this.offlineData = {};
        }
    }

    // Save offline data to localStorage and file
    async saveOfflineData() {
        try {
            debugLog(`💾 Starting to save offline data: ${Object.keys(this.offlineData).length} entries`);
            const timestamp = Date.now();
            const version = '1.0';

            // Split into three packages to avoid clutter
            const animePackage = { timestamp, version, data: { anime: this.offlineData.anime || {} } };
            const staffPackage = { timestamp, version, data: { staff: this.offlineData.staff || {} } };
            const studioPackage = { timestamp, version, data: { studio: this.offlineData.studio || {} } };

            // Attempt an atomic save of all three split maps to the proxy (safer)
            try {
                await this.saveAllToProxyAtomic({ anime: animePackage, staff: staffPackage, studio: studioPackage });
            } catch (e) {
                // Fallback to separate saves if atomic fails
                console.warn('Atomic proxy save failed, falling back to separate saves:', e && e.message ? e.message : e);
                this.saveToProjectFile(animePackage, 'offline-data-anime.json');
                this.saveToProjectFile(staffPackage, 'offline-data-staff.json');
                this.saveToProjectFile(studioPackage, 'offline-data-studio.json');
            }

            // Create downloadable files for each
            this.createDataFile(animePackage, 'offline-data-anime.json');
            this.createDataFile(staffPackage, 'offline-data-staff.json');
            this.createDataFile(studioPackage, 'offline-data-studio.json');
            debugLog(`💾 Completed save operation: ${Object.keys(this.offlineData).length} entries`);
        } catch (error) {
            console.error('❌ Error saving offline data:', error);
        }
    }

    // Save data in chunks to avoid localStorage quota limits
    saveWithChunking(dataPackage) {
        try {
            console.log('🧩 Attempting chunked localStorage save...');
            
            // Clear any existing chunks
            // Clear existing chunk keys dynamically to avoid magic limits
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('anilist-offline-chunk-')) keysToRemove.push(key);
            }
            keysToRemove.forEach(k => {
                try { localStorage.removeItem(k); } catch (e) {}
            });
            
            const dataString = JSON.stringify(dataPackage);
            
            // Use smaller chunks (250KB) to work with restrictive localStorage limits
            const chunkSize = 250 * 1024; // 250KB chunks
            const chunks = [];
            
            for (let i = 0; i < dataString.length; i += chunkSize) {
                chunks.push(dataString.substring(i, i + chunkSize));
            }
            
            console.log(`🧩 Splitting data into ${chunks.length} chunks of ~${Math.round(chunkSize / 1024)}KB each`);
            
            // Save chunk metadata first
            const metadata = {
                totalChunks: chunks.length,
                timestamp: dataPackage.timestamp,
                totalSize: dataString.length,
                version: dataPackage.version
            };
            
            localStorage.setItem('anilist-offline-metadata', JSON.stringify(metadata));
            
            // Save each chunk with error handling
            let savedChunks = 0;
            for (let i = 0; i < chunks.length; i++) {
                try {
                    localStorage.setItem(`anilist-offline-chunk-${i}`, chunks[i]);
                    savedChunks++;
                } catch (chunkError) {
                    console.error(`❌ Failed to save chunk ${i}:`, chunkError);
                    
                    // If we hit quota again, try to save what we can
                    if (chunkError.name === 'QuotaExceededError') {
                        console.log(`⚠️ Quota exceeded at chunk ${i}, saved ${savedChunks}/${chunks.length} chunks`);
                        
                        // Update metadata to reflect actual saved chunks
                        const partialMetadata = {
                            ...metadata,
                            totalChunks: savedChunks,
                            isPartial: true,
                            partialReason: 'quota_exceeded'
                        };
                        
                        // Start of try block for AniList fetch
                        localStorage.setItem('anilist-offline-metadata', JSON.stringify(partialMetadata));
                        console.log(`✅ Saved partial data: ${savedChunks} chunks of ${chunks.length}`);
                        



                        // If error occurs during saving metadata, catch and log
                        // (no inner try needed)
                        // catch (metaError) follows the try for saving partial metadata
                        
                        break;
                    }
                    
                    throw chunkError;
                }
            }
            
            if (savedChunks === chunks.length) {
                console.log(`✅ Successfully saved all ${chunks.length} chunks to localStorage`);
                
                // Verify chunked save
                this.verifyChunkedSave(metadata);
            } else {
                console.log(`⚠️ Partially saved: ${savedChunks}/${chunks.length} chunks`);
            }
            
        } catch (chunkError) {
            console.error('❌ Chunked save failed:', chunkError);
            
            // Fallback: Save only essential data (anime entries)
            this.saveEssentialDataOnly(dataPackage);
        }
    }

    // Verify that chunked data can be reconstructed
    verifyChunkedSave(metadata) {
        try {
            let reconstructed = '';
            for (let i = 0; i < metadata.totalChunks; i++) {
                const chunk = localStorage.getItem(`anilist-offline-chunk-${i}`);
                if (!chunk) {
                    console.error(`❌ Missing chunk ${i}`);
                    return false;
                }
                reconstructed += chunk;
            }
            
            const parsed = JSON.parse(reconstructed);
            const entryCount = Object.keys(parsed.data || {}).length;
            console.log(`✅ Chunked save verified: ${entryCount} entries reconstructed`);
            return true;
        } catch (error) {
            console.error('❌ Chunked save verification failed:', error);
            return false;
        }
    }

    // Fallback: Save only anime data, skip detailed staff/studio info
    saveEssentialDataOnly(dataPackage) {
        try {
            console.log('🔧 Fallback: Saving essential data only...');
            
            // Filter to only anime entries
            const essentialData = {};
            for (const key in dataPackage.data) {
                if (key.startsWith('anime_')) {
                    essentialData[key] = dataPackage.data[key];
                }
            }
            
            const essentialPackage = {
                timestamp: dataPackage.timestamp,
                version: dataPackage.version + '-essential',
                data: essentialData
            };
            
            const essentialString = JSON.stringify(essentialPackage);
            console.log(`🔧 Essential data size: ${Math.round(essentialString.length / 1024)}KB`);
            
            localStorage.setItem('anilist-offline-data', essentialString);
            console.log(`✅ Essential data saved: ${Object.keys(essentialData).length} anime entries`);
            
        } catch (essentialError) {
            console.error('❌ Even essential data save failed:', essentialError);
        }
    }

    // Save data to project file for GitHub hosting
    async saveToProjectFile(dataPackage, filename = 'offline-data.json') {
        try {
            const base = this.getProxySaveBase();
            const response = await fetch(base + '/save-data', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    // Optional save auth token if configured in localStorage
                    'X-Save-Auth': localStorage.getItem('save_token') || ''
                },
                body: JSON.stringify({
                    filename,
                    data: dataPackage
                })
            });

            const text = await response.text().catch(() => '');
            if (response.ok) {
                console.log(`📁 Data saved to project file: ${filename}`);
                try {
                    window.dispatchEvent(new CustomEvent('proxySaveResult', { detail: { filename, ok: true, status: response.status, info: text } }));
                } catch (e) {}
            } else {
                console.warn(`⚠️ Could not save to project file (${filename}), using localStorage/download only - server: ${text}`);
                try {
                    window.dispatchEvent(new CustomEvent('proxySaveResult', { detail: { filename, ok: false, status: response.status, error: text } }));
                } catch (e) {}
            }
        } catch (error) {
            console.warn('⚠️ Project file save failed, using localStorage/download only:', error.message);
            try {
                window.dispatchEvent(new CustomEvent('proxySaveResult', { detail: { filename, ok: false, error: error.message } }));
            } catch (e) {}
        }
    }

    // Atomic save of all split files: posts a single payload to the proxy
    async saveAllToProxyAtomic({ anime, staff, studio }) {
        try {
            const base = this.getProxySaveBase();
            const response = await fetch(base + '/save-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Save-Auth': localStorage.getItem('save_token') || ''
                },
                body: JSON.stringify({ atomic: true, payload: { anime, staff, studio } })
            });

            const text = await response.text().catch(() => '');
            if (response.ok) {
                let json = {};
                try { json = JSON.parse(text); } catch(e) { json = { raw: text }; }
                console.log('📁 Atomic save to proxy succeeded');
                try { window.dispatchEvent(new CustomEvent('proxySaveResult', { detail: { filename: 'atomic', ok: true, status: response.status, info: json } })); } catch(e){}
                return json;
            } else {
                console.warn('⚠️ Atomic proxy save failed, server response:', text);
                try { window.dispatchEvent(new CustomEvent('proxySaveResult', { detail: { filename: 'atomic', ok: false, status: response.status, error: text } })); } catch(e){}
                throw new Error(`Proxy returned ${response.status}: ${text}`);
            }
        } catch (err) {
            try { window.dispatchEvent(new CustomEvent('proxySaveResult', { detail: { filename: 'atomic', ok: false, error: err.message } })); } catch(e){}
            throw err;
        }
    }

    // Create downloadable data file
    createDataFile(data, filename = `anilist-offline-data-${new Date().toISOString().split('T')[0]}.json`) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create a unique download link per filename
        const id = `offline-data-download-${filename.replace(/[^a-z0-9-_\.]/gi, '_')}`;
        let downloadLink = document.getElementById(id);
        if (!downloadLink) {
            downloadLink = document.createElement('a');
            downloadLink.id = id;
            downloadLink.style.display = 'none';
            document.body.appendChild(downloadLink);
        }

        downloadLink.href = url;
        downloadLink.download = filename;
        debugLog(`📁 Data file created and ready for download: ${filename}`);
    }

    // Create the Mass Update button
    createMassUpdateButton() {
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'mass-update-container';
        buttonContainer.className = 'data-debug-panel';
        buttonContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 10000;
            background: transparent;
            padding: 15px;
            border-radius: 12px;
            border: none;
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            min-width: 200px;
            min-height: 80px;
        `;

        // Data Debug title
        const titleText = document.createElement('div');
        titleText.className = 'debug-title';
        titleText.textContent = 'Data Debug';
        titleText.style.cssText = `
            color: transparent;
            font-size: 10px;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Nunito', sans-serif;
        `;

        // Button row container
        const buttonRow = document.createElement('div');
        buttonRow.className = 'debug-buttons';
        buttonRow.style.cssText = `
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
        `;

        // Mass Update button
        const updateButton = document.createElement('button');
        updateButton.id = 'mass-update-btn';
        updateButton.textContent = 'Mass Update';
        updateButton.style.cssText = `
            background: #0098ff;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.3s ease;
            font-family: 'Nunito', sans-serif;
        `;
        updateButton.onclick = () => this.startMassUpdate();

        // Download Data button
        const downloadButton = document.createElement('button');
        downloadButton.id = 'download-data-btn';
        downloadButton.textContent = 'Download';
        downloadButton.style.cssText = `
            background: #28a745;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.3s ease;
            font-family: 'Nunito', sans-serif;
        `;
        downloadButton.onclick = () => this.downloadData();

        // Update Current Season button
        const currentSeasonButton = document.createElement('button');
        currentSeasonButton.id = 'current-season-btn';
        currentSeasonButton.textContent = 'Current Season';
        currentSeasonButton.style.cssText = `
            background: #17a2b8;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.3s ease;
            font-family: 'Nunito', sans-serif;
        `;
        currentSeasonButton.onclick = () => this.updateCurrentSeason();

        // Toggle Offline Mode button
        const offlineButton = document.createElement('button');
        offlineButton.id = 'offline-mode-btn';
    offlineButton.textContent = this.isOfflineMode() ? 'Offline' : 'Online';
        offlineButton.style.cssText = `
            background: ${this.isOfflineMode() ? '#dc3545' : '#ffc107'};
            color: ${this.isOfflineMode() ? 'white' : 'black'};
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.3s ease;
            font-family: 'Nunito', sans-serif;
        `;
        offlineButton.onclick = () => this.toggleOfflineMode();

        // Staffless Mode toggle (moved from header into debug panel)
        const stafflessToggleBtn = document.createElement('button');
        stafflessToggleBtn.id = 'staffless-toggle-btn';
        stafflessToggleBtn.textContent = 'Staffless: ON';
        stafflessToggleBtn.style.cssText = `
            background: #6f42c1;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.3s ease;
            font-family: 'Nunito', sans-serif;
        `;
        // Initialize staffless state: default ON unless sessionStorage explicitly '0'
        (function(){
            try {
                const stored = sessionStorage.getItem('stafflessMode');
                const enabled = (stored === null) ? true : (stored === '1');
                if (enabled) document.body.classList.add('staffless-mode');
                else document.body.classList.remove('staffless-mode');
                stafflessToggleBtn.textContent = enabled ? 'Staffless: ON' : 'Staffless: OFF';
            } catch (e) { console.warn('Staffless init failed', e); }
        })();
        stafflessToggleBtn.onclick = () => {
            try {
                const now = !document.body.classList.contains('staffless-mode');
                if (now) document.body.classList.add('staffless-mode'); else document.body.classList.remove('staffless-mode');
                try { sessionStorage.setItem('stafflessMode', now ? '1' : '0'); } catch (e) {}
                stafflessToggleBtn.textContent = now ? 'Staffless: ON' : 'Staffless: OFF';
            } catch (e) { console.warn('Staffless toggle click failed', e); }
        };

        // Hide button
        const hideButton = document.createElement('button');
        hideButton.id = 'hide-debug-btn';
        hideButton.textContent = 'Hide';
        hideButton.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            color: #ccc;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            font-weight: 500;
            transition: all 0.3s ease;
            font-family: 'Nunito', sans-serif;
            margin-top: 8px;
            opacity: 0;
            transform: translateY(10px);
            pointer-events: none;
        `;
        hideButton.onclick = () => this.hideDebugPanel();

        // Status text
        const statusText = document.createElement('div');
        statusText.id = 'mass-update-status';
        statusText.style.cssText = `
            color: transparent;
            font-size: 9px;
            margin-top: 8px;
            font-family: 'Nunito', sans-serif;
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        this.updateStatusText();

        // Area to show proxy save results
        const saveResults = document.createElement('div');
        saveResults.id = 'proxy-save-results';
        saveResults.style.cssText = 'margin-top:8px;color:#bdbdbd;font-size:11px;max-height:120px;overflow:auto;';
        this.saveResultsEl = saveResults;

        // Listen for proxySaveResult events
        try {
            window.addEventListener('proxySaveResult', (e) => {
                const d = e.detail || {};
                const el = document.createElement('div');
                el.textContent = `${d.filename}: ${d.ok ? 'Saved' : 'Failed'}${d.status ? ' (HTTP ' + d.status + ')' : ''}${d.error ? ' - ' + d.error : ''}`;
                el.style.cssText = `padding:4px 6px;border-radius:4px;margin-bottom:6px;background:${d.ok ? 'rgba(40,167,69,0.08)' : 'rgba(220,53,69,0.06)'};color:${d.ok ? '#9ae6b4' : '#fca5a5'};font-family:Nunito,Segoe UI,Arial,sans-serif;font-size:11px;`;
                if (this.saveResultsEl) this.saveResultsEl.prepend(el);
                // Auto-remove after 12s
                setTimeout(() => { try { el.remove(); } catch(e){} }, 12000);
            });
        } catch (e) {}

        // Add buttons to row
        buttonRow.appendChild(updateButton);

    // Proxy save verification area
    const proxyVerify = document.createElement('div');
    proxyVerify.id = 'proxy-verify';
    proxyVerify.style.cssText = 'margin-top:8px;font-size:12px;color:#ddd;';
    buttonRow.appendChild(proxyVerify);
    buttonRow.appendChild(downloadButton);
    buttonRow.appendChild(currentSeasonButton);
    buttonRow.appendChild(offlineButton);
    buttonRow.appendChild(stafflessToggleBtn);

        // Add all elements to container
        buttonContainer.appendChild(titleText);
        buttonContainer.appendChild(buttonRow);
        buttonContainer.appendChild(hideButton);
    buttonContainer.appendChild(statusText);
    buttonContainer.appendChild(saveResults);
        
        // Add reveal functionality
        buttonContainer.onclick = (e) => {
            // Don't trigger on button clicks
            if (e.target.tagName === 'BUTTON') return;
            this.revealDebugPanel();
        };

        document.body.appendChild(buttonContainer);
        // Check proxy save availability on startup and update UI
        try {
            this.checkProxySaveAvailability && this.checkProxySaveAvailability();
        } catch (e) {}
    }

    // Reveal the debug panel
    revealDebugPanel() {
        const container = document.getElementById('mass-update-container');
        const title = container.querySelector('.debug-title');
        const buttons = container.querySelector('.debug-buttons');
        const status = document.getElementById('mass-update-status');
        const hideBtn = document.getElementById('hide-debug-btn');

        if (container && title && buttons && status) {
            // Reveal background
            container.style.background = 'rgba(0, 0, 0, 0.85)';
            container.style.backdropFilter = 'blur(10px)';
            container.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            container.style.cursor = 'default';

            // Reveal text elements
            title.style.color = '#0098ff';
            status.style.color = '#ccc';

            // Reveal buttons with pointer events
            buttons.style.opacity = '1';
            buttons.style.transform = 'translateY(0)';
            buttons.style.pointerEvents = 'auto';
            
            // Show hide button with pointer events
            hideBtn.style.opacity = '1';
            hideBtn.style.transform = 'translateY(0)';
            hideBtn.style.pointerEvents = 'auto';
        }
    }

    // Hide the debug panel
    hideDebugPanel() {
        const container = document.getElementById('mass-update-container');
        const title = container.querySelector('.debug-title');
        const buttons = container.querySelector('.debug-buttons');
        const status = document.getElementById('mass-update-status');
        const hideBtn = document.getElementById('hide-debug-btn');

        if (container && title && buttons && status) {
            // Hide background
            container.style.background = 'transparent';
            container.style.backdropFilter = 'none';
            container.style.border = 'none';
            container.style.cursor = 'pointer';

            // Hide text elements
            title.style.color = 'transparent';
            status.style.color = 'transparent';

            // Hide buttons and disable pointer events
            buttons.style.opacity = '0';
            buttons.style.transform = 'translateY(10px)';
            buttons.style.pointerEvents = 'none';
            
            // Hide hide button and disable pointer events
            hideBtn.style.opacity = '0';
            hideBtn.style.transform = 'translateY(10px)';
            hideBtn.style.pointerEvents = 'none';
        }
    }

    // Update status text
    updateStatusText() {
        const statusEl = document.getElementById('mass-update-status');
        if (statusEl) {
            const dataCount = this.offlineData && this.offlineData.anime ? Object.keys(this.offlineData.anime).length : 0;
            const ageText = this.lastUpdateTimestamp ? 
                `${Math.round((Date.now() - this.lastUpdateTimestamp) / (60 * 60 * 1000))}h ago` : 
                'Never';
            statusEl.textContent = `${dataCount} anime entries • Updated ${ageText} • ${this.isOfflineMode() ? 'OFFLINE' : 'ONLINE'}`;
        }
    }

    // Check if offline mode is enabled
    isOfflineMode() {
        return localStorage.getItem('anilist-offline-mode') === 'true';
    }

    // Return the proxy origin/base URL for save endpoints.
    // If user stored an `anilistProxy` that includes a path (e.g. '/graphql'), this returns only the origin
    // Example: 'http://localhost:4000/graphql' -> 'http://localhost:4000'
    getProxySaveBase() {
        const raw = localStorage.getItem('anilistProxy') || 'http://localhost:4000';
        try {
            // Ensure we have a protocol; URL will throw if invalid
            const u = new URL(raw);
            return u.origin;
        } catch (e) {
            // If user stored just a host like 'localhost:4000' or similar, try to normalize
            if (/^https?:\/\//i.test(raw)) {
                return raw.replace(/\/$/, '');
            }
            return 'http://localhost:4000';
        }
    }

    // Probe the proxy save endpoint to give early feedback in the UI
    async checkProxySaveAvailability() {
    const proxy = this.getProxySaveBase();
        const el = document.getElementById('proxy-verify');
        if (!el) return;
        el.textContent = 'Checking proxy save availability...';

        try {
            // First try non-destructive probe endpoint if available
            try {
                const check = await fetch(proxy + '/save-check', { method: 'GET' });
                if (check && check.ok) {
                    const info = await check.json().catch(() => ({}));
                    if (info.allowed) {
                        el.textContent = 'Proxy saves enabled — server reports saves allowed.';
                        el.style.color = '#9ae6b4';
                    } else {
                        el.textContent = `Proxy save disabled: ${info.message || 'disabled'}`;
                        el.style.color = '#fca5a5';
                    }
                    return;
                }
            } catch (e) {
                // ignore and fall back to legacy probe
            }

            // Fallback: Try an OPTIONS first to avoid a write
            const resp = await fetch(proxy + '/save-data', { method: 'OPTIONS' });
            if (resp && resp.status === 204) {
                // OPTIONS allowed — server reachable; now try a harmless POST that should fail with 403 when disabled
                const probe = await fetch(proxy + '/save-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Save-Auth': localStorage.getItem('save_token') || '' },
                    body: JSON.stringify({ filename: 'offline-data-anime.json', data: { probe: true } })
                });
                const text = await probe.text().catch(() => '');
                if (probe.ok) {
                    el.textContent = 'Proxy saves enabled — server accepted test write.';
                    el.style.color = '#9ae6b4';
                } else {
                    el.textContent = `Proxy save disabled: ${probe.status} ${text || ''}`;
                    el.style.color = '#fca5a5';
                }
            } else {
                // Some servers do not allow OPTIONS or return different semantics; attempt a lightweight POST
                const probe = await fetch(proxy + '/save-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Save-Auth': localStorage.getItem('save_token') || '' },
                    body: JSON.stringify({ filename: 'offline-data-anime.json', data: { probe: true } })
                });
                const text = await probe.text().catch(() => '');
                if (probe.ok) {
                    el.textContent = 'Proxy saves enabled — server accepted test write.';
                    el.style.color = '#9ae6b4';
                } else {
                    el.textContent = `Proxy save disabled: ${probe.status} ${text || ''}`;
                    el.style.color = '#fca5a5';
                }
            }
        } catch (e) {
            el.textContent = `Proxy unreachable: ${e && e.message ? e.message : String(e)}`;
            el.style.color = '#fca5a5';
        }
    }

    // Toggle offline mode
    toggleOfflineMode() {
        const currentMode = this.isOfflineMode();
        localStorage.setItem('anilist-offline-mode', (!currentMode).toString());
        
        const button = document.getElementById('offline-mode-btn');
        if (button) {
            const newMode = !currentMode;
            // Show the label representing the CURRENT mode after toggle
            button.textContent = newMode ? 'Offline' : 'Online';
            button.style.background = newMode ? '#dc3545' : '#ffc107';
            button.style.color = newMode ? 'white' : 'black';
        }
        
        this.updateStatusText();
        console.log(`🔄 ${!currentMode ? 'Offline mode enabled' : 'Online mode enabled'}`);
    }

    // Download current data
    downloadData() {
        const downloadLink = document.getElementById('offline-data-download');
        if (downloadLink) {
            downloadLink.click();
            console.log('📥 Data download initiated');
        } else {
            console.warn('❌ No data file available for download');
        }
    }

    // Update current season data
    async updateCurrentSeason() {
        if (this.isUpdating) {
            alert('Mass update is already in progress!');
            return;
        }

        // Auto-detect current season
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-12
        
    let season;
    if (month >= 1 && month <= 3) season = 'Winter';
    else if (month >= 4 && month <= 6) season = 'Spring';
    else if (month >= 7 && month <= 9) season = 'Summer';  // Jul-Sep = Summer
    else season = 'Fall';  // Oct-Dec = Fall
        
        const seasonName = `${season} ${year}`;
        
        if (!confirm(`Update all data for ${seasonName}? This will fetch complete staff and studio data for the current season.`)) {
            return;
        }

        console.log(`🎬 Starting ${seasonName} update...`);
        
        // Set updating state and show overlay
        this.isUpdating = true;
        this.currentProgress = 0;
        this.showUpdateOverlay();
        
        // Update overlay title for current season
        const overlayTitle = document.querySelector('#mass-update-overlay h2');
        if (overlayTitle) {
            overlayTitle.textContent = `Updating ${seasonName}...`;
        }
        
        try {
            // Update initial progress
            this.updateProgress(0, 1, `Starting ${seasonName} update...`);
            
            const result = await window.startSeasonMassUpdate(season, year);
            
            if (result) {
                // Show completion status
                this.updateProgress(1, 1, `${seasonName} update complete!`);
                
                console.log(`🎉 ${seasonName} update complete!`);
                console.log(`📊 Processed: ${result.processed} anime`);
                console.log(`📊 Data added: +${result.dataAdded} entries`);
                
                // Update UI status
                this.updateStatusText();
                
                // Brief delay to show completion
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                alert(`${seasonName} update complete!\nProcessed: ${result.processed} anime\nData added: +${result.dataAdded} entries`);
            } else {
                console.warn(`❌ ${seasonName} update failed or returned no results`);
                alert(`${seasonName} update failed. Check console for details.`);
            }
        } catch (error) {
            console.error(`❌ ${seasonName} update error:`, error);
            alert(`${seasonName} update failed: ${error.message}`);

        } finally {
            // Always hide overlay and reset state
            this.hideUpdateOverlay();
            this.isUpdating = false;
        }
    }

    // Start the mass update process
    async startMassUpdate() {
        if (this.isUpdating) {
            alert('Mass update is already in progress!');
            return;
        }

    // Show a dry-run preview first to avoid accidental heavy operations
    const proceed = await this.showMassUpdatePreview();
    if (!proceed) return;

        this.isUpdating = true;
        this.currentProgress = 0;
        this.showUpdateOverlay();

        try {
            await this.performMassUpdate();
            this.hideUpdateOverlay();
            alert('Mass update completed successfully! All data has been saved offline.');


        } catch (error) {
            console.error('❌ Mass update failed:', error);
            this.hideUpdateOverlay();
            alert('Mass update failed. Check console for details.');
        } finally {
            this.isUpdating = false;
        }
    }

    // Show dry-run preview: list count and ask user to confirm
    async showMassUpdatePreview() {
        // Gather anime list from animeData (same method used by performMassUpdate)
        let animeCount = 0;
        const animeIds = [];
        Object.keys(animeData).forEach(year => {
            Object.keys(animeData[year]).forEach(season => {
                animeData[year][season].forEach(anime => {
                    let foundId = null;
                    if (anime.anilistId) foundId = anime.anilistId;
                    else if (anime.annId) foundId = parseInt(anime.annId) || null;
                    else if (anime.staffLink) {
                        const match = anime.staffLink.match(/\/anime\/(\d+)/);
                        if (match) foundId = parseInt(match[1]);
                    }
                    if (foundId) {
                        animeIds.push(foundId);
                        animeCount++;
                    }
                });
            });
        });

        // Build modal
        return new Promise(resolve => {
            const modal = document.createElement('div');
            modal.id = 'mass-update-preview';
            modal.style.cssText = `position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);z-index:100001;padding:20px;`;
            const card = document.createElement('div');
            card.style.cssText = `background:#111;color:#fff;padding:18px;border-radius:8px;max-width:640px;width:100%;font-family:Arial,sans-serif;`;
            const title = document.createElement('h3'); title.textContent = 'Mass Update Preview'; title.style.marginTop='0';
            const body = document.createElement('div'); body.innerHTML = `<p>This will attempt to fetch data for <strong>${animeCount}</strong> anime entries from AniList, plus associated staff and studio data. Estimated requests: <strong>${Math.max(1, Math.round(animeCount * 1.5))}</strong>. Proceed?</p>`;
            const btnRow = document.createElement('div'); btnRow.style.cssText='display:flex;gap:8px;justify-content:flex-end;margin-top:12px;';
            const cancelBtn = document.createElement('button'); cancelBtn.textContent='Cancel'; cancelBtn.style.cssText='padding:6px 10px;border-radius:4px;';
            const okBtn = document.createElement('button'); okBtn.textContent='Start Update'; okBtn.style.cssText='padding:6px 10px;border-radius:4px;background:#0098ff;color:white;border:none;';
            btnRow.appendChild(cancelBtn); btnRow.appendChild(okBtn);
            card.appendChild(title); card.appendChild(body); card.appendChild(btnRow); modal.appendChild(card); document.body.appendChild(modal);

            cancelBtn.onclick = () => { modal.remove(); resolve(false); };
            okBtn.onclick = () => { modal.remove(); resolve(true); };

        });
    }

    // Show update overlay
    showUpdateOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'mass-update-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 100000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: Arial, sans-serif;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Gathering Data...';
        title.style.cssText = 'margin: 0 0 20px 0; color: #0098ff;';

        const progress = document.createElement('div');
        progress.id = 'mass-update-progress';
        progress.style.cssText = `
            width: 400px;
            height: 20px;
            background: #333;
            border-radius: 10px;
            overflow: hidden;
            margin: 20px 0;
        `;

        const progressBar = document.createElement('div');
        progressBar.id = 'mass-update-progress-bar';
        progressBar.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #0098ff, #00d4ff);
            transition: width 0.3s ease;
        `;

        const status = document.createElement('div');
        status.id = 'mass-update-status-text';
        status.textContent = 'Initializing...';
        status.style.cssText = 'text-align: center; margin-top: 10px;';

        progress.appendChild(progressBar);
        overlay.appendChild(title);
        overlay.appendChild(progress);
        overlay.appendChild(status);
        document.body.appendChild(overlay);
    }

    // Hide update overlay
    hideUpdateOverlay() {
        const overlay = document.getElementById('mass-update-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Update progress display
    updateProgress(current, total, status) {
        this.currentProgress = current;
        this.totalItems = total;

        const progressBar = document.getElementById('mass-update-progress-bar');
        const statusText = document.getElementById('mass-update-status-text');

        if (progressBar) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            progressBar.style.width = `${percentage}%`;
        }

        if (statusText) {
            statusText.textContent = `${status} (${current}/${total})`;
        }
    }

    // Perform the actual mass update
    async performMassUpdate() {
        // Debug: Confirm animeData is loaded
        if (typeof animeData === 'undefined') {
            console.error('❌ animeData not found. Make sure data/anime.js is loaded.');
            alert('❌ animeData not found. Check if data/anime.js is loaded.');
            return;
        }

        // Normalize: clear and re-init offlineData structure
        this.offlineData = {
            anime: {},
            staff: {},
            studio: {}
        };

        // Gather all anime IDs from all seasons/years in animeData
        const animeIds = [];
        Object.keys(animeData).forEach(year => {
            Object.keys(animeData[year]).forEach(season => {
                animeData[year][season].forEach(anime => {
                    let foundId = null;
                    if (anime.anilistId) foundId = anime.anilistId;
                    else if (anime.staffLink) {
                        const match = anime.staffLink.match(/\/anime\/(\d+)/);
                        if (match) foundId = parseInt(match[1]);
                    } else if (anime.id) foundId = anime.id;
                    if (foundId) {
                        animeIds.push(foundId);
                        debugLog(`🐞 Found anime: ${anime.title || 'Untitled'} (ID: ${foundId})`);
                    } else {
                        console.warn('⚠️ Could not extract AniList ID for anime:', anime);
                    }
                });
            });
        });

        console.log(`📋 Found ${animeIds.length} anime to process from animeData`);

        // Process each anime, collect all staff/studio IDs
        const allStaffIds = new Set();
        const allStudioIds = new Set();
        for (let i = 0; i < animeIds.length; i++) {
            const animeId = animeIds[i];
            this.updateProgress(i + 1, animeIds.length, `Processing anime ${animeId}...`);
            try {
                // Fetch anime details
                const animeDataObj = await this.fetchAnimeDetails(animeId);
                if (!animeDataObj) {
                    console.warn(`⚠️ No data for anime ${animeId}`);
                    continue;
                }
                // Collect staff and studio IDs
                const staffIds = [];
                if (animeDataObj.staff && animeDataObj.staff.edges) {
                    for (const edge of animeDataObj.staff.edges) {
                        if (edge.node && edge.node.id) {
                            staffIds.push(edge.node.id);
                            allStaffIds.add(edge.node.id);
                        }
                    }
                }
                const studioIds = [];
                if (animeDataObj.studios && animeDataObj.studios.edges) {
                    for (const edge of animeDataObj.studios.edges) {
                        if (edge.node && edge.node.id) {
                            studioIds.push(edge.node.id);
                            allStudioIds.add(edge.node.id);
                        }
                    }
                }
                // Store normalized anime entry (reference only staff/studio IDs)
                this.offlineData.anime[animeId] = {
                    id: animeDataObj.id,
                    title: animeDataObj.title,
                    description: animeDataObj.description,
                    format: animeDataObj.format,
                    status: animeDataObj.status,
                    episodes: animeDataObj.episodes,
                    duration: animeDataObj.duration,
                    source: animeDataObj.source,
                    season: animeDataObj.season,
                    seasonYear: animeDataObj.seasonYear,
                    genres: animeDataObj.genres,
                    averageScore: animeDataObj.averageScore,
                    coverImage: {
                        medium: animeDataObj.coverImage?.medium || '',
                        large: animeDataObj.coverImage?.large || '',
                        extraLarge: animeDataObj.coverImage?.extraLarge || ''
                    },
                    bannerImage: animeDataObj.bannerImage,
                    staff: staffIds,
                    studios: studioIds,
                    timestamp: Date.now()
                };
                if (i < animeIds.length - 1) {
                    await this.delay(this.updateDelay);
                }
            } catch (error) {
                console.error(`❌ Failed to process anime ${animeId}:`, error);
            }
        }

        // Fetch and store all unique staff
        let staffIndex = 0;
        for (const staffId of allStaffIds) {
            this.updateProgress(staffIndex + 1, allStaffIds.size, `Fetching staff works ${staffIndex + 1}/${allStaffIds.size}...`);
            const staffData = await this.fetchStaffDetailsNormalized(staffId);
            if (staffData) {
                this.offlineData.staff[staffId] = staffData;
            } else {
                console.warn(`[MassUpdate] Staff ID ${staffId} NOT saved!`);
            }
            staffIndex++;
        }
        // Fetch and store all unique studios
        let studioIndex = 0;
        for (const studioId of allStudioIds) {
            this.updateProgress(studioIndex + 1, allStudioIds.size, `Fetching studio works ${studioIndex + 1}/${allStudioIds.size}...`);
            const studioData = await this.fetchStudioDetailsNormalized(studioId);
            if (studioData) {
                this.offlineData.studio[studioId] = studioData;
            } else {
                console.warn(`[MassUpdate] Studio ID ${studioId} NOT saved!`);
            }
            studioIndex++;
        }

        // Save all collected data
        this.saveOfflineData();
        debugLog(`🐞 Final offlineData size: anime=${Object.keys(this.offlineData.anime).length}, staff=${Object.keys(this.offlineData.staff).length}, studio=${Object.keys(this.offlineData.studio).length}`);
        this.updateStatusText();
    }

    // Fetch staff details for normalized storage
    async fetchStaffDetailsNormalized(staffId) {
        // Paginate through staffMedia to collect all edges.
        try {
            const perPage = 50;
            let page = 1;
            let allEdges = [];

            let staffData = null;
            while (true) {
                const query = `
                    query ($id: Int, $page: Int) {
                        Staff(id: $id) {
                            id
                            name { full native }
                            image { medium }
                            staffMedia(perPage: ${perPage}, page: $page, sort: POPULARITY_DESC) {
                                pageInfo { hasNextPage }
                                edges { staffRole node { id title { romaji english native } coverImage { extraLarge large medium } format seasonYear averageScore type } }
                            }
                        }
                    }
                `;

                const pageResp = await this.makeAniListRequest(query, { id: staffId, page });
                if (!pageResp) break;
                // Prefer the first non-empty name object we encounter
                if (!staffData && pageResp && pageResp.name) staffData = pageResp;
                // Always push edges from pageResp
                const edges = (pageResp.staffMedia && pageResp.staffMedia.edges) ? pageResp.staffMedia.edges : [];
                
                allEdges.push(...edges);

                const hasNext = pageResp.staffMedia && pageResp.staffMedia.pageInfo && pageResp.staffMedia.pageInfo.hasNextPage;
                if (!hasNext) break;
                page++;
                // avoid hammering API
                await this.delay(300);
            }

            if (allEdges.length === 0) return null;

            // Filter out voice acting and other non-production roles
            const productionWorks = allEdges.filter(edge => {
                const role = (edge.staffRole || '').toLowerCase();
                return !role.includes('voice') && !role.includes('vocal') && !role.includes('narrator') && !role.includes('theme song');
            });

            const patchedEdges = productionWorks.map(edge => {
                if (edge.node && edge.node.coverImage) {
                    edge.node.coverImage = {
                        medium: edge.node.coverImage.medium || '',
                        large: edge.node.coverImage.large || '',
                        extraLarge: edge.node.coverImage.extraLarge || ''
                    };
                }
                if (edge.node && edge.node.type) {
                    edge.node.mediaType = edge.node.type;
                }
                return edge;
            });

            // Use the canonical staff name object returned by AniList (if available)
            return {
                id: staffId,
                name: (staffData && staffData.name) ? staffData.name : { full: '' },
                image: (staffData && staffData.image) ? { medium: staffData.image.medium || '' } : null,
                staffMedia: { edges: patchedEdges },
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('[MassDataUpdater] fetchStaffDetailsNormalized error:', error);
            return null;
        }
    }

    

    // Fetch studio details for normalized storage
    async fetchStudioDetailsNormalized(studioId) {
        try {
            const perPage = 50;
            let page = 1;
            let allEdges = [];

            let studioData = null;
            while (true) {
                const query = `
                    query ($id: Int, $page: Int) {
                        Studio(id: $id) {
                            id
                            name
                            media(perPage: ${perPage}, page: $page, sort: POPULARITY_DESC) {
                                pageInfo { hasNextPage }
                                edges { isMainStudio node { id title { romaji english native } coverImage { extraLarge large medium } format seasonYear averageScore } }
                            }
                        }
                    }
                `;

                const pageResp = await this.makeAniListRequest(query, { id: studioId, page });
                if (!pageResp) break;
                if (!studioData && pageResp && pageResp.name) studioData = pageResp;
                const edges = (pageResp.media && pageResp.media.edges) ? pageResp.media.edges : [];
                allEdges.push(...edges);

                const hasNext = pageResp.media && pageResp.media.pageInfo && pageResp.media.pageInfo.hasNextPage;
                if (!hasNext) break;
                page++;
                await this.delay(300);
            }

            if (allEdges.length === 0) return null;

            const mainProductions = allEdges.filter(edge => edge.isMainStudio).slice(0, 50);
            // Prefer the Studio.name value returned by AniList (studioData.name) rather than media node names
            return {
                id: studioId,
                name: (studioData && studioData.name) ? studioData.name : (allEdges.length > 0 && allEdges[0].node && (allEdges[0].node.title || allEdges[0].node.name)) ? (allEdges[0].node.name || allEdges[0].node.title) : '',
                media: { edges: mainProductions },
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('[MassDataUpdater] fetchStudioDetailsNormalized error:', error);
            return null;
        }
    }

    // Check if data is fresh (less than 24 hours old)
    isDataFresh(timestamp) {
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        return timestamp && (Date.now() - timestamp) < maxAge;
    }

    // Delay helper
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get offline data for a specific item
    getOfflineData(type, id) {
        if (!this.isOfflineMode()) {
            return null;
        }

        const key = `${type}_${id}`;
        const cached = this.offlineData[key];
        
        if (cached && this.isDataFresh(cached.timestamp)) {
            console.log(`📦 Using offline data for ${type} ${id}`);
            return cached.data;
        }

        return null;
    }

    // Smoke-test saved data (checks proxy/static endpoints and localStorage split/unified keys)
    async smokeTestSavedData() {
        const results = {
            proxy: { unified: false, anime: false, staff: false, studio: false },
            static: { unified: false, anime: false, staff: false, studio: false },
            localStorage: { unified: false, anime: false, staff: false, studio: false },
            chunked: { unified: false, anime: false, staff: false, studio: false }
        };

        // Helper fetch wrapper
        const tryFetchJson = async (url) => {
            try {
                const resp = await fetch(url);
                if (!resp.ok) return null;
                return await resp.json();
            } catch (e) {
                return null;
            }
        };

        // Proxy endpoints
        try {
            const p = await tryFetchJson('http://localhost:4000/load-data');
            if (p) results.proxy.unified = true;
        } catch (e) {}
        try { if (await tryFetchJson('http://localhost:4000/offline-data-anime.json')) results.proxy.anime = true; } catch (e) {}
        try { if (await tryFetchJson('http://localhost:4000/offline-data-staff.json')) results.proxy.staff = true; } catch (e) {}
        try { if (await tryFetchJson('http://localhost:4000/offline-data-studio.json')) results.proxy.studio = true; } catch (e) {}

        // Static same-origin
        try {
            const s = await tryFetchJson('./offline-data.json');
            if (s) results.static.unified = true;
        } catch (e) {}
        try { if (await tryFetchJson('./offline-data-anime.json')) results.static.anime = true; } catch (e) {}
        try { if (await tryFetchJson('./offline-data-staff.json')) results.static.staff = true; } catch (e) {}
        try { if (await tryFetchJson('./offline-data-studio.json')) results.static.studio = true; } catch (e) {}

        // LocalStorage checks
        try {
            const unified = localStorage.getItem('anilist-offline-data');
            if (unified) results.localStorage.unified = true;
        } catch (e) {}
        try {
            if (localStorage.getItem('anilist-offline-data-anime') || localStorage.getItem('anilist-offline-anime')) results.localStorage.anime = true;
            if (localStorage.getItem('anilist-offline-data-staff') || localStorage.getItem('anilist-offline-staff')) results.localStorage.staff = true;
            if (localStorage.getItem('anilist-offline-data-studio') || localStorage.getItem('anilist-offline-studio')) results.localStorage.studio = true;
        } catch (e) {}

        // Chunked checks
        try {
            if (localStorage.getItem('anilist-offline-metadata')) results.chunked.unified = true;
            if (localStorage.getItem('anilist-offline-metadata-anime')) results.chunked.anime = true;
            if (localStorage.getItem('anilist-offline-metadata-staff')) results.chunked.staff = true;
            if (localStorage.getItem('anilist-offline-metadata-studio')) results.chunked.studio = true;
        } catch (e) {}

        // Summarize counts from this.offlineData if available
        const counts = { anime: 0, staff: 0, studio: 0 };
        try {
            counts.anime = this.offlineData && this.offlineData.anime ? Object.keys(this.offlineData.anime).length : 0;
            counts.staff = this.offlineData && this.offlineData.staff ? Object.keys(this.offlineData.staff).length : 0;
            counts.studio = this.offlineData && this.offlineData.studio ? Object.keys(this.offlineData.studio).length : 0;
        } catch (e) {}

        console.log('🧪 smokeTestSavedData results:', { results, counts });
        return { results, counts };
    }

    // Simulate split localStorage entries for testing loader merge
    async simulateSplitLocalStorageTest(cleanup = true) {
        try {
            console.log('🧪 simulateSplitLocalStorageTest: creating temporary split entries');
            const sampleAnime = { timestamp: Date.now(), version: '1.0', data: { anime: { '1': { id: 1, title: { romaji: 'Test Anime' } } } } };
            const sampleStaff = { timestamp: Date.now(), version: '1.0', data: { staff: { '10': { id: 10, name: { full: 'Test Staff' }, staffMedia: { edges: [] } } } } };
            const sampleStudio = { timestamp: Date.now(), version: '1.0', data: { studio: { '20': { id: 20, name: 'Test Studio', media: { edges: [] } } } } };

            localStorage.setItem('anilist-offline-data-anime', JSON.stringify(sampleAnime));
            localStorage.setItem('anilist-offline-data-staff', JSON.stringify(sampleStaff));
            localStorage.setItem('anilist-offline-data-studio', JSON.stringify(sampleStudio));

            // Force reload from localStorage
            this.loadFromLocalStorage();

            // Run smoke test to summarize
            const res = await this.smokeTestSavedData();

            if (cleanup) {
                console.log('🧹 simulateSplitLocalStorageTest: cleaning up temporary keys');
                localStorage.removeItem('anilist-offline-data-anime');
                localStorage.removeItem('anilist-offline-data-staff');
                localStorage.removeItem('anilist-offline-data-studio');
            }

            console.log('🧪 simulateSplitLocalStorageTest result:', res);
            return res;
        } catch (e) {
            console.error('❌ simulateSplitLocalStorageTest failed:', e);
            return null;
        }
    }

    // Fetch anime details (used by performMassUpdate and debug helpers)
    async fetchAnimeDetails(anilistId) {
        try {
            if (!anilistId) return null;
            const query = `
                query ($id: Int) {
                    Media(id: $id, type: ANIME) {
                        id
                        title { romaji english native }
                        description
                        format
                        status
                        episodes
                        duration
                        source
                        season
                        seasonYear
                        genres
                        averageScore
                        coverImage { medium large extraLarge }
                        bannerImage
                        staff { edges { role node { id name { full native } image { medium } } } }
                        studios { edges { isMain node { id name } } }
                    }
                }
            `;

            const res = await simpleAniListQuery(query, { id: parseInt(anilistId) }, `fetchAnimeDetails-${anilistId}`);
            if (res && res.Media) return res.Media;
            return null;
        } catch (error) {
            console.error(`[MassDataUpdater] fetchAnimeDetails failed for ${anilistId}:`, error);
            return null;
        }
    }

    // Convenience: fetch anime details and store into this.offlineData in normalized form
    async fetchAndStoreAnimeData(animeId) {
        try {
            const animeDataObj = await this.fetchAnimeDetails(animeId);
            if (!animeDataObj) {
                throw new Error('No data returned from AniList');
            }

            // Normalize staff and studios to simple arrays / edges where appropriate
            const staffIds = [];
            if (animeDataObj.staff && Array.isArray(animeDataObj.staff.edges)) {
                for (const edge of animeDataObj.staff.edges) {
                    if (edge.node && edge.node.id) staffIds.push(edge.node.id);
                }
            }
            const studioIds = [];
            if (animeDataObj.studios && Array.isArray(animeDataObj.studios.edges)) {
                for (const edge of animeDataObj.studios.edges) {
                    if (edge.node && edge.node.id) studioIds.push(edge.node.id);
                }
            }

            const entry = {
                id: animeDataObj.id,
                title: animeDataObj.title,
                description: animeDataObj.description,
                format: animeDataObj.format,
                status: animeDataObj.status,
                episodes: animeDataObj.episodes,
                duration: animeDataObj.duration,
                source: animeDataObj.source,
                season: animeDataObj.season,
                seasonYear: animeDataObj.seasonYear,
                genres: animeDataObj.genres,
                averageScore: animeDataObj.averageScore,
                coverImage: animeDataObj.coverImage || {},
                bannerImage: animeDataObj.bannerImage || '',
                staff: animeDataObj.staff || { edges: [] },
                studios: animeDataObj.studios || { edges: [] },
                timestamp: Date.now()
            };

            // Ensure structure exists
            if (!this.offlineData) this.offlineData = { anime: {}, staff: {}, studio: {} };
            if (!this.offlineData.anime) this.offlineData.anime = {};

            // Save under numeric keyed map to match performMassUpdate shape
            this.offlineData.anime[animeId] = entry;

            // Also maintain a keyed entry for compatibility with other helpers
            try {
                this.offlineData[`anime_${animeId}`] = { timestamp: entry.timestamp, data: entry };
            } catch (e) {
                // non-fatal
            }

            // Return stored entry
            return entry;
        } catch (error) {
            console.error(`[MassDataUpdater] fetchAndStoreAnimeData failed for ${animeId}:`, error);
            return null;
        }
    }

    // Wrapper around simpleAniListQuery to return useful nested objects
    async makeAniListRequest(query, variables = {}, tag = '') {
        try {
            const res = await simpleAniListQuery(query, variables, tag);
            if (!res) return null;
            // Common GraphQL response wrappers - return the most likely desired object
            if (res.Staff) return res.Staff;
            if (res.Studio) return res.Studio;
            if (res.Page) return res.Page;
            if (res.Media) return res.Media;
            return res;
        } catch (error) {
            console.error('[MassDataUpdater] makeAniListRequest failed:', error);
            return null;
        }
    }
}
// Global mass data updater instance
window.massUpdater = new MassDataUpdater();

// Initialize batch fetcher to fix the error
try {
    window.batchFetcher = new BatchDataFetcher();
    console.log('✅ Batch fetcher initialized successfully (constructed)');
    try {
        console.log('🧭 Global init: attempting immediate batch cache load...');
        const globalCacheLoaded = window.batchFetcher.loadCacheFromStorage();
        console.log('🧭 Global init: loadCacheFromStorage() returned:', globalCacheLoaded);
        if (globalCacheLoaded) {
            console.log('📊 Global init: batch cache sizes', { staff: window.batchFetcher.staffCache.size, studios: window.batchFetcher.studioCache.size });
        } else {
            // Start background initialization immediately if not already running
            try {
                const isOffline = window.massUpdater && window.massUpdater.isOfflineMode && window.massUpdater.isOfflineMode();
                if (isOffline) {
                    console.log('🚫 Global init: MassDataUpdater is in OFFLINE mode; network queries are blocked.');
                    console.log('👉 To force a batch fetch now, run: window.forceStartBatchInit() or toggle offline mode via the UI.');
                } else {
                    if (!window._batchInitInProgress) {
                        window._batchInitInProgress = true;
                        console.log('⚡ Global init: No cache - starting initializeBatchData() immediately (global)');
                        window.batchFetcher.initializeBatchData().then(res => {
                            console.log('✅ Global init: immediate initializeBatchData() completed:', res);
                            window._batchInitInProgress = false;
                        }).catch(err => {
                            console.error('❌ Global init: immediate initializeBatchData() failed:', err);
                            window._batchInitInProgress = false;
                        });
                    } else {
                        console.log('🧭 Global init: batch init already in progress');
                    }
                }
            } catch (startErr) {
                console.error('❌ Global init: error starting immediate batch init:', startErr);
            }
        }
    } catch (cacheErr) {
        console.error('❌ Global init: error loading batch cache:', cacheErr);
    }
} catch (error) {
    console.error('❌ Error initializing batch fetcher:', error);
}

// Dev helper: force reload offline split/unified project files and print summary
try {
    window.forceLoadOfflineFromProject = async function() {
        try {
            if (!window.massUpdater || typeof window.massUpdater.loadFromProjectFile !== 'function') {
                console.warn('forceLoadOfflineFromProject: massUpdater or loader not available');
                return null;
            }
            const res = await window.massUpdater.loadFromProjectFile();
            if (res && res.data) {
                const animeCount = Object.keys(res.data.anime || {}).length;
                const staffCount = Object.keys(res.data.staff || {}).length;
                const studioCount = Object.keys(res.data.studios || {}).length;
                console.log('forceLoadOfflineFromProject: loaded counts', { anime: animeCount, staff: staffCount, studios: studioCount });
                // identify sample missing metadata
                const missingStaff = Object.entries(res.data.staff || {}).filter(([id, v]) => !v || (v.name && !v.name.full) || !v.name);
                const missingStudios = Object.entries(res.data.studios || {}).filter(([id, v]) => !v || !v.name);
                console.log('forceLoadOfflineFromProject: sample missing staff (first 10 ids)', missingStaff.slice(0,10).map(x=>x[0]));
                console.log('forceLoadOfflineFromProject: sample missing studios (first 10 ids)', missingStudios.slice(0,10).map(x=>x[0]));
            }
            return res;
        } catch (e) { console.warn('forceLoadOfflineFromProject failed', e); return null; }
    };
} catch (e) {}

// Migration helper: enrich missing staff/studio names in loaded project files
try {
    window.migrateEnrichMissingNames = async function(options = {}) {
        // options: { dryRun: true, limit: 200, delay: 250 }
        const opts = Object.assign({ dryRun: true, limit: 500, delay: 250, verbose: false }, options || {});
        console.log('🔧 migrateEnrichMissingNames starting', opts);

        if (!window.massUpdater || typeof window.massUpdater.loadFromProjectFile !== 'function') {
            throw new Error('massUpdater or loader not available');
        }

        const project = await window.massUpdater.loadFromProjectFile();
        if (!project || !project.data) {
            throw new Error('No project data found from loadFromProjectFile()');
        }

        const staffMap = project.data.staff || {};
        const studioMap = project.data.studios || project.data.studio || project.data.studio || {};

        const missingStaffIds = Object.entries(staffMap).filter(([id, v]) => {
            try {
                if (!v) return true;
                if (typeof v === 'string') return false; // name string is acceptable
                if (v.name && typeof v.name === 'object') return !(v.name.full || v.name.native || v.name.first);
                if (v.name && typeof v.name === 'string') return false;
                return !v.name;
            } catch (e) { return true; }
        }).map(([id]) => Number(id));

        const missingStudioIds = Object.entries(studioMap).filter(([id, v]) => {
            try {
                if (!v) return true;
                if (typeof v === 'string') return false;
                if (v.name && typeof v.name === 'string' && v.name.trim()) return false;
                if (v.name && typeof v.name === 'object' && (v.name.full || v.name.native)) return false;
                return !v.name;
            } catch (e) { return true; }
        }).map(([id]) => Number(id));

        console.log(`🔎 Found ${missingStaffIds.length} staff and ${missingStudioIds.length} studios with missing names (before limits)`);

        const toProcessStaff = missingStaffIds.slice(0, opts.limit);
        const toProcessStudios = missingStudioIds.slice(0, opts.limit);

        const updatedStaff = {};
        const updatedStudios = {};

        // Helper to wait
        const wait = (ms) => new Promise(r => setTimeout(r, ms));

        // Fetch staff details
        for (let i = 0; i < toProcessStaff.length; i++) {
            const id = toProcessStaff[i];
            if (opts.verbose) console.log(`🧾 Fetching staff ${i+1}/${toProcessStaff.length}: ${id}`);
            try {
                const data = await window.massUpdater.fetchStaffDetailsNormalized(id);
                if (data) {
                    updatedStaff[id] = data;
                    if (opts.verbose) console.log('✅ Fetched staff:', id, data.name);
                } else {
                    if (opts.verbose) console.log('⚠️ No staff data for', id);
                }
            } catch (e) {
                console.error('❌ Error fetching staff', id, e);
            }
            await wait(opts.delay);
        }

        // Fetch studio details
        for (let i = 0; i < toProcessStudios.length; i++) {
            const id = toProcessStudios[i];
            if (opts.verbose) console.log(`🏢 Fetching studio ${i+1}/${toProcessStudios.length}: ${id}`);
            try {
                const data = await window.massUpdater.fetchStudioDetailsNormalized(id);
                if (data) {
                    updatedStudios[id] = data;
                    if (opts.verbose) console.log('✅ Fetched studio:', id, data.name);
                } else {
                    if (opts.verbose) console.log('⚠️ No studio data for', id);
                }
            } catch (e) {
                console.error('❌ Error fetching studio', id, e);
            }
            await wait(opts.delay);
        }

        console.log(`🔁 Fetched ${Object.keys(updatedStaff).length} staff and ${Object.keys(updatedStudios).length} studios`);

        if (opts.dryRun) {
            console.log('💤 Dry-run enabled — not saving. Preview of updates:', { staff: updatedStaff, studios: updatedStudios });
            return { updatedStaff, updatedStudios };
        }

        // Merge updates back into project data shape
        for (const [id, data] of Object.entries(updatedStaff)) {
            staffMap[id] = data;
        }
        for (const [id, data] of Object.entries(updatedStudios)) {
            studioMap[id] = data;
        }

        // Save back to split files via massUpdater.saveToProjectFile
        try {
            const timestamp = Date.now();
            const version = '1.0';
            const staffPackage = { timestamp, version, data: { staff: staffMap } };
            const studioPackage = { timestamp, version, data: { studio: studioMap } };

            console.log('💾 Saving updated staff and studios to project files via proxy (saveToProjectFile)');
            await window.massUpdater.saveToProjectFile(staffPackage, 'offline-data-staff.json');
            await wait(200);
            await window.massUpdater.saveToProjectFile(studioPackage, 'offline-data-studio.json');

            console.log('✅ Migration save complete');
            return { updatedStaff, updatedStudios };
        } catch (e) {
            console.error('❌ Failed to save migration updates:', e);
            throw e;
        }
    };
} catch (e) {
    console.warn('migrateEnrichMissingNames helper not installed:', e);
}

// Helper: Force-start batch initialization even if offline mode is enabled
window.forceStartBatchInit = async function() {
    if (!window.batchFetcher) {
        window.batchFetcher = new BatchDataFetcher();
    }
    const wasOffline = window.massUpdater && window.massUpdater.isOfflineMode && window.massUpdater.isOfflineMode();
    try {
        if (wasOffline) {
            console.log('🔧 Temporarily disabling offline mode to force batch init');
            localStorage.setItem('anilist-offline-mode', 'false');
        }
        window._batchInitInProgress = true;
        const res = await window.batchFetcher.initializeBatchData();
        console.log('✅ forceStartBatchInit completed:', res);
        return res;
    } catch (err) {
        console.error('❌ forceStartBatchInit failed:', err);
        throw err;
    } finally {
        window._batchInitInProgress = false;
        if (wasOffline) {
            console.log('🔁 Restoring offline mode');
            localStorage.setItem('anilist-offline-mode', 'true');
        }
    }
};

// Convenience functions for mass updater
window.startMassUpdate = function() {
    if (window.massUpdater) {
        window.massUpdater.startMassUpdate();
    } else {
        console.error('❌ Mass updater not available');
    }
};

window.toggleOfflineMode = function() {
    if (window.massUpdater) {
        window.massUpdater.toggleOfflineMode();
    } else {
        console.error('❌ Mass updater not available');
    }
};

window.downloadOfflineData = function() {
    if (window.massUpdater) {
        window.massUpdater.downloadData();
    } else {
        console.error('❌ Mass updater not available');
    }
};

window.smokeTestSavedData = async function() {
    if (!window.massUpdater) {
        console.error('❌ Mass updater not available');
        return null;
    }
    return await window.massUpdater.smokeTestSavedData();
};

// Helper: simulate writing split data to localStorage and test loader merge
window.testSplitLocalStorage = async function(cleanup = true) {
    if (!window.massUpdater) {
        console.error('❌ Mass updater not available');
        return null;
    }
    return await window.massUpdater.simulateSplitLocalStorageTest ? await window.massUpdater.simulateSplitLocalStorageTest(cleanup) : (console.error('❌ simulateSplitLocalStorageTest not available'), null);
};

window.checkOfflineData = function() {
    if (window.massUpdater) {
        const dataCount = Object.keys(window.massUpdater.offlineData).length;
        const isOffline = window.massUpdater.isOfflineMode();
        const lastUpdate = window.massUpdater.lastUpdateTimestamp;
        const ageHours = lastUpdate ? Math.round((Date.now() - lastUpdate) / (60 * 60 * 1000)) : 'Never';
        
    debugLog('📊 Offline Data Status:');
    debugLog(`   Mode: ${isOffline ? 'OFFLINE' : 'ONLINE'}`);
    debugLog(`   Entries: ${dataCount}`);
    debugLog(`   Last Update: ${ageHours} hours ago`);
    debugLog(`   Data Size: ${JSON.stringify(window.massUpdater.offlineData).length} characters`);
        
        // Break down by type
        let animeCount = 0, staffCount = 0, studioCount = 0, staffNameCount = 0, studioNameCount = 0;
        for (const key of Object.keys(window.massUpdater.offlineData)) {
            if (key.startsWith('anime_')) animeCount++;
            else if (key.startsWith('staff_name_')) staffNameCount++;
            else if (key.startsWith('staff_')) staffCount++;
            else if (key.startsWith('studio_name_')) studioNameCount++;
            else if (key.startsWith('studio_')) studioCount++;
        }
        
        console.log(`   Breakdown: ${animeCount} anime, ${staffCount} staff (${staffNameCount} by name), ${studioCount} studios (${studioNameCount} by name)`);
        
        // Sample some recent staff data to verify structure
        console.log('\n🔍 Sample recent staff data:');
        const staffIds = Object.keys(window.massUpdater.offlineData.staff || {}).slice(-5);
        staffIds.forEach(staffId => {
            const data = window.massUpdater.offlineData.staff[staffId];
            console.log(`   ${staffId}: ${data?.name?.full || 'No name'} (${data?.staffMedia?.edges?.length || 0} media)`);
        });

        // Sample some recent studio data
        console.log('\n🏢 Sample recent studio data:');
        const studioIds = Object.keys(window.massUpdater.offlineData.studio || {}).slice(-5);
        studioIds.forEach(studioId => {
            const data = window.massUpdater.offlineData.studio[studioId];
            console.log(`   ${studioId}: ${data?.name || 'No name'} (${data?.media?.edges?.length || 0} media)`);
        });
        
        return {
            mode: isOffline ? 'offline' : 'online',
            entries: dataCount,
            lastUpdateHours: ageHours,
            breakdown: { 
                anime: animeCount, 
                staff: staffCount, 
                staffByName: staffNameCount,
                studios: studioCount,
                studiosByName: studioNameCount
            }
        };
    } else {
        console.error('❌ Mass updater not available');
        return null;
    }
};

// Debug function to test offline mode staff/studio lookup
window.testOfflineDataLookup = function() {
    debugLog('🧪 Testing Offline Data Lookup Functionality');
    debugLog('============================================');
    
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    const isOffline = window.massUpdater.isOfflineMode();
    console.log(`📦 Current mode: ${isOffline ? 'OFFLINE' : 'ONLINE'}`);
    
    if (!isOffline) {
        console.log('⚠️ Not in offline mode. Enable offline mode first with: toggleOfflineMode()');
        return;
    }
    
    // Get some sample staff names to test
    const staffNameKeys = Object.keys(window.massUpdater.offlineData)
        .filter(k => k.startsWith('staff_name_'))
        .slice(0, 5);
    
    console.log(`\n🎭 Testing staff lookup with ${staffNameKeys.length} samples:`);
    
    staffNameKeys.forEach(key => {
        const staffName = key.replace('staff_name_', '').replace(/_/g, ' ');
        const properName = staffName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        console.log(`\n🔍 Testing: "${properName}"`);
        
        // Test the actual fetchStaffRoles function
        window.fetchStaffRoles(properName, false, 'ANIME').then(roles => {
            console.log(`   ✅ fetchStaffRoles returned ${roles.length} roles`);
            if (roles.length > 0) {
                console.log(`   📋 First role: ${roles[0].node?.title?.romaji || 'Unknown'} (${roles[0].staffRole || 'Unknown role'})`);
            }
        }).catch(error => {
            console.log(`   ❌ fetchStaffRoles error: ${error.message}`);
        });
    });
    
    // Test studio lookup
    const studioNameKeys = Object.keys(window.massUpdater.offlineData)
        .filter(k => k.startsWith('studio_name_'))
        .slice(0, 3);
    
    console.log(`\n🏢 Testing studio lookup with ${studioNameKeys.length} samples:`);
    
    studioNameKeys.forEach(key => {
        const studioName = key.replace('studio_name_', '').replace(/_/g, ' ');
        const properName = studioName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        console.log(`\n🔍 Testing: "${properName}"`);
        
        // Test the actual fetchStudioAnime function
        window.fetchStudioAnime(properName).then(anime => {
            console.log(`   ✅ fetchStudioAnime returned ${anime.length} anime`);
            if (anime.length > 0) {
                console.log(`   📋 First anime: ${anime[0].node?.title?.romaji || 'Unknown'}`);
            }
        }).catch(error => {
            console.log(`   ❌ fetchStudioAnime error: ${error.message}`);
        });
    });
    
    // Test if the main lookup functions respect offline mode
    console.log('\n🔒 Testing offline mode enforcement:');
    
    // Check if simpleAniListQuery is blocked
    try {
        window.simpleAniListQuery('query { test }', {}).then(result => {
            console.log('❌ simpleAniListQuery should be blocked in offline mode!');
        }).catch(error => {
            console.log('✅ simpleAniListQuery correctly blocked in offline mode');
        });
    } catch (error) {
        console.log('✅ simpleAniListQuery correctly blocked in offline mode');
    }
    
    console.log('\n📋 Summary: Check above for any errors in staff/studio lookup');
    console.log('💡 If roles/anime counts are 0, the offline data might not be properly structured');
};

// Debug function to check why studios weren't saved
window.debugStudioMissing = function() {
    debugLog('🏢 Debugging Studio Data Issues');
    debugLog('===============================');
    
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    // Check a few anime entries to see if they have studio data
    const animeKeys = Object.keys(window.massUpdater.offlineData)
        .filter(k => k.startsWith('anime_'))
        .slice(0, 5);
    
    console.log(`\n🎬 Checking ${animeKeys.length} anime entries for studio data:`);
    
    animeKeys.forEach(key => {
        const animeData = window.massUpdater.offlineData[key];
        const anime = animeData?.data;
        
        if (anime) {
            console.log(`\n📺 ${anime.title?.romaji || 'Unknown Title'} (ID: ${anime.id})`);
            
            if (anime.studios && anime.studios.edges) {
                console.log(`   🏢 Found ${anime.studios.edges.length} studios:`);
                anime.studios.edges.forEach(edge => {
                    console.log(`      - ${edge.node.name} (ID: ${edge.node.id}) [${edge.isMainStudio ? 'Main' : 'Producer'}]`);
                });
            } else {
                console.log(`   ❌ No studio data found in anime object`);
                console.log(`   📋 Available keys:`, Object.keys(anime));
            }
        }
    });
    
    // Check if any studios were attempted to be fetched
    console.log('\n🔍 Studio fetch attempts:');
    const loggedStudioAttempts = [];
    
    // This would show if studios were found but failed to save
    console.log('💡 If anime have studio data but 0 studios saved, check console for studio fetch errors');
    console.log('💡 If anime have no studio data, the GraphQL query might be missing studios field');
};

// Simple function to check one anime for studio data
window.checkAnimeStudios = function() {
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    const animeKeys = Object.keys(window.massUpdater.offlineData).filter(k => k.startsWith('anime_'));
    if (animeKeys.length === 0) {
        console.log('❌ No anime data found');
        return;
    }
    
    console.log('🎬 Checking anime for studio data...');
    
    // Check first anime
    const firstAnimeKey = animeKeys[0];
    const animeData = window.massUpdater.offlineData[firstAnimeKey].data;
    
    console.log(`📺 Sample: ${animeData.title?.romaji || 'Unknown'} (ID: ${animeData.id})`);
    
    if (animeData.studios && animeData.studios.edges) {
        console.log(`✅ Found ${animeData.studios.edges.length} studios:`);
        animeData.studios.edges.forEach(edge => {
            console.log(`   🏢 ${edge.node.name} (ID: ${edge.node.id})`);
        });
        return animeData.studios.edges;
    } else {
        console.log('❌ No studios found in anime data');
        console.log('🔍 Available anime fields:', Object.keys(animeData));
        return null;
    }
};

// Debug function to test specific anime offline data
window.testAnimeOfflineData = function(animeTitle) {
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    console.log(`🔍 Testing offline data for: "${animeTitle}"`);
    
    // Find anime in current data
    const animeKeys = Object.keys(window.massUpdater.offlineData).filter(k => k.startsWith('anime_'));
    let found = false;
    
    for (const key of animeKeys) {
        const animeData = window.massUpdater.offlineData[key].data;
        if (animeData.title && 
            (animeData.title.romaji?.toLowerCase().includes(animeTitle.toLowerCase()) ||
             animeData.title.english?.toLowerCase().includes(animeTitle.toLowerCase()))) {
            
            found = true;
            debugLog(`✅ Found anime: ${animeData.title.romaji} (${animeData.title.english || 'No English title'})`);
            console.log(`   ID: ${animeData.id}`);
            console.log(`   Staff: ${animeData.staff?.edges?.length || 0} members`);
            console.log(`   Studios: ${animeData.studios?.edges?.length || 0} studios`);
            
            if (animeData.staff?.edges?.length > 0) {
                console.log(`   Sample staff: ${animeData.staff.edges.slice(0, 3).map(e => e.node.name.full).join(', ')}`);
            }
            
            if (animeData.studios?.edges?.length > 0) {
                console.log(`   Studios: ${animeData.studios.edges.map(e => e.node.name).join(', ')}`);
            }
            
            return animeData;
        }
    }
    
    if (!found) {
        console.log(`❌ No offline data found for "${animeTitle}"`);
        console.log('📋 Available anime titles:');
        animeKeys.slice(0, 10).forEach(key => {
            const animeData = window.massUpdater.offlineData[key].data;
            console.log(`   • ${animeData.title?.romaji || 'Unknown'}`);
        });
    }
    
    return null;
};

// Debug command to test specific anime ID lookup
window.testAnimeByID = function(animeId) {
    if (!window.massUpdater || !window.massUpdater.offlineData) {
        console.log("❌ Mass updater or offline data not available");
        return;
    }
    
    const key = `anime_${animeId}`;
    const animeData = window.massUpdater.offlineData[key];
    
    if (animeData) {
        console.log(`✅ Found anime by ID: ${animeId}`);
        console.log(`📝 Title: ${animeData.data.title?.english || animeData.data.title?.romaji || 'Unknown'}`);
        console.log(`📊 Staff: ${animeData.data.staff?.edges?.length || 0}`);
        console.log(`🏢 Studios: ${animeData.data.studios?.edges?.length || 0}`);
        console.log(`⏰ Cached: ${new Date(animeData.timestamp).toLocaleString()}`);
        return animeData.data;
    } else {
        console.log(`❌ No data found for anime ID: ${animeId}`);
        console.log(`🔍 Searched for key: ${key}`);
        return null;
    }
};

// Debug command to check current anime page data
window.debugCurrentAnimePage = function() {
    // Find current anime object
    const urlPath = window.location.pathname;
    console.log('🔍 Current URL path:', urlPath);
    
    // Check for getCurrentAnime function
    if (typeof getCurrentAnime === 'function') {
        try {
            const currentAnime = getCurrentAnime();
            if (currentAnime) {
                console.log('📺 Current anime object found:', currentAnime);
                console.log('📺 Title:', currentAnime.title);
                console.log('📺 Staff Link:', currentAnime.staffLink);
                
                if (currentAnime.staffLink) {
                    const anilistIdMatch = currentAnime.staffLink.match(/\/anime\/(\d+)/);
                    if (anilistIdMatch) {
                        console.log('📺 Extracted AniList ID:', anilistIdMatch[1]);
                        return anilistIdMatch[1];
                    } else {
                        console.log('❌ Could not extract AniList ID from staff link');
                        console.log('❌ Staff link format:', currentAnime.staffLink);
                    }
                } else {
                    console.log('❌ No staff link found in current anime');
                }
            } else {
                console.log('❌ getCurrentAnime() returned null/undefined');
            }
        } catch (error) {
            console.log('❌ Error calling getCurrentAnime():', error);
        }
    } else {
        console.log('❌ getCurrentAnime function not found');
    }
    
    // Check if viewer is visible
    const viewer = document.getElementById('animeViewer');
    if (viewer) {
        console.log('📺 Anime viewer element:', viewer.classList.contains('hidden') ? 'hidden' : 'visible');
        const title = document.getElementById('viewerTitle');
        if (title) {
            console.log('📺 Viewer title:', title.textContent);
        }
    }
    
    return null;
};

// Debug command to check offline mode status
window.debugOfflineMode = function() {
    console.log('🔧 Checking offline mode status...');
    
    if (window.massUpdater) {
        console.log('✅ Mass updater available');
        console.log('📡 Offline mode:', window.massUpdater.isOfflineMode());
        console.log('💾 Offline data keys count:', Object.keys(window.massUpdater.offlineData).length);
        
        // Check if the specific anime exists
        const testId = '153800'; // One Punch Man
        const animeKey = `anime_${testId}`;
        const hasAnime = window.massUpdater.offlineData[animeKey];
        console.log(`🎌 One Punch Man (${testId}) in offline data:`, !!hasAnime);
        
        if (hasAnime) {
            console.log(`📊 Staff count: ${hasAnime.data.staff?.edges?.length || 0}`);
            console.log(`🏢 Studio count: ${hasAnime.data.studios?.edges?.length || 0}`);
        }
    } else {
        console.log('❌ Mass updater not available');
    }
};

// Debug command to track staff/studio function calls
window.debugFunctionCalls = function() {
    console.log('🔧 Setting up function call tracking...');
    
    // Track fetchStaffRoles calls
    const originalFetchStaffRoles = window.fetchStaffRoles;
    window.fetchStaffRoles = function(...args) {
        console.log('📞 fetchStaffRoles called with:', args);
        console.log('📞 Stack trace:', new Error().stack.split('\n').slice(1, 4));
        return originalFetchStaffRoles.apply(this, args);
    };
    
    // Track fetchStudioAnime calls
    const originalFetchStudioAnime = window.fetchStudioAnime;
    if (originalFetchStudioAnime) {
        window.fetchStudioAnime = function(...args) {
            console.log('📞 fetchStudioAnime called with:', args);
            console.log('📞 Stack trace:', new Error().stack.split('\n').slice(1, 4));
            return originalFetchStudioAnime.apply(this, args);
        };
    }
    
    console.log('✅ Function call tracking enabled');
};

// Debug function to check what anime data exists
window.listOfflineAnime = function() {
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    const animeKeys = Object.keys(window.massUpdater.offlineData).filter(k => k.startsWith('anime_'));
    console.log(`📺 Found ${animeKeys.length} anime entries:`);
    
    animeKeys.forEach(key => {
        const animeData = window.massUpdater.offlineData[key].data;
        const id = key.replace('anime_', '');
        console.log(`   ${id}: ${animeData.title?.romaji || 'Unknown'}`);
    });
    
    if (animeKeys.length === 0) {
        console.log('❌ No anime data found at all!');
        console.log('🔍 This suggests the anime data storage during mass update failed');
        
        // Check if any data exists at all
        const allKeys = Object.keys(window.massUpdater.offlineData);
        console.log(`📊 Total offline entries: ${allKeys.length}`);
        console.log(`📊 Sample keys:`, allKeys.slice(0, 10));
    }
    
    return animeKeys;
};

window.debugOfflineStaff = function(staffName) {
    if (!window.massUpdater) {
        console.error('❌ Mass updater not available');
        return;
    }
    
    console.log(`🔍 Debugging offline data for staff: "${staffName}"`);
    
    // Check direct name lookup
    const nameKey = `staff_name_${staffName.toLowerCase()}`;
    if (window.massUpdater.offlineData[nameKey]) {
        console.log(`✅ Found direct name lookup: ${nameKey}`);
        console.log(window.massUpdater.offlineData[nameKey]);
        return true;
    } else {
        console.log(`❌ No direct name lookup found for: ${nameKey}`);
    }
    
    // Check all staff entries
    let found = false;
    for (const [key, value] of Object.entries(window.massUpdater.offlineData)) {
        if (key.startsWith('staff_') && value.data && value.data.name && 
            value.data.name.full && value.data.name.full.toLowerCase() === staffName.toLowerCase()) {
            console.log(`✅ Found in general staff data: ${key}`);
            console.log(value);
            found = true;
        }
    }
    
    if (!found) {
        console.log(`❌ No offline data found for staff: "${staffName}"`);
        console.log('Available staff names:');
        for (const [key, value] of Object.entries(window.massUpdater.offlineData)) {
            if (key.startsWith('staff_name_') && value.data && value.data.name && value.data.name.full) {
                console.log(`  - ${value.data.name.full}`);
            }
        }
    }
    
    return found;
};

window.fetchMissingStaff = async function(staffName) {
    if (!window.massUpdater) {
        console.error('❌ Mass updater not available');
        return;
    }
    
    console.log(`🔍 Searching AniList for staff: "${staffName}"`);
    
    // Search for staff by name
    const searchQuery = `
        query ($search: String) {
            Staff(search: $search) {
                id
                name { 
                    full 
                    native
                }
                image { 
                    medium 
                    large
                }
                description
                staffMedia(perPage: 50, type: ANIME) {
                    edges {
                        staffRole
                        node {
                            id
                            title { 
                                romaji 
                                english 
                                native 
                            }
                            coverImage { extraLarge large medium }
                                medium 
                                large 
                            }
                            type
                            format
                            status
                            startDate { year }
                            endDate { year }
                        }
                    }
                    pageInfo {
                        total
                        hasNextPage
                    }
                }
            }
        }
    `;
    
    try {
        const response = await fetch('http://localhost:4000/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: searchQuery, 
                variables: { search: staffName }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.errors) {
            console.error('❌ GraphQL errors:', result.errors);
            return null;
        }
        
        const staffData = result.data?.Staff;
        if (staffData) {
            console.log(`✅ Found staff: ${staffData.name?.full} (ID: ${staffData.id})`);
            
            // Store the data
            window.massUpdater.offlineData[`staff_${staffData.id}`] = {
                timestamp: Date.now(),
                data: staffData
            };
            
            if (staffData.name && staffData.name.full) {
                const nameKey = `staff_name_${staffData.name.full.toLowerCase()}`;
                window.massUpdater.offlineData[nameKey] = {
                    timestamp: Date.now(),
                    data: staffData
                };
                console.log(`✅ Stored as: ${nameKey}`);
            }
            
            // Save to storage
            window.massUpdater.saveOfflineData();
            window.massUpdater.updateStatusText();
            
            return staffData;
        } else {
            console.log(`❌ No staff found for: "${staffName}"`);
            return null;
        }
    } catch (error) {
        console.error('❌ Error fetching staff:', error);
        return null;
    }
};

// Debug command: Test specific staff lookup
window.testStaffLookup = function(staffName) {
    if (!window.massUpdater || !window.massUpdater.isOfflineMode()) {
        console.log('❌ Not in offline mode or mass updater not available');
        return;
    }
    
    console.log(`🔍 Testing lookup for staff: "${staffName}"`);
    
    // Try direct name lookup
    const nameKey = `staff_name_${staffName.toLowerCase()}`;
    console.log(`🔍 Checking direct key: ${nameKey}`);
    const directLookup = window.massUpdater.offlineData[nameKey];
    
    if (directLookup) {
        console.log('✅ Found via direct lookup:', directLookup);
        const mediaCount = directLookup.data?.staffMedia?.edges?.length || 0;
        console.log(`📊 Media count: ${mediaCount}`);
        return directLookup;
    }
    
    // Try fallback search
    console.log('🔍 Trying fallback search...');
    for (const [key, value] of Object.entries(window.massUpdater.offlineData)) {
        if (key.startsWith('staff_') && value.data && value.data.name && 
            value.data.name.full && value.data.name.full.toLowerCase() === staffName.toLowerCase()) {
            console.log(`✅ Found via fallback search (key: ${key}):`, value);
            const mediaCount = value.data?.staffMedia?.edges?.length || 0;
            console.log(`📊 Media count: ${mediaCount}`);
            return value;
        }
    }
    
    console.log('❌ No offline data found for staff:', staffName);
    
    // Show available staff names for reference
    const availableStaff = [];
    for (const [key, value] of Object.entries(window.massUpdater.offlineData)) {
        if (key.startsWith('staff_') && value.data && value.data.name && value.data.name.full) {
            availableStaff.push(value.data.name.full);
        }
    }
    console.log('📋 Available staff names (first 20):', availableStaff.slice(0, 20));
    return null;
};

// Debug command: Test offline mode enforcement
window.testOfflineModeEnforcement = function() {
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    const isOffline = window.massUpdater.isOfflineMode();
    console.log(`📦 Offline mode status: ${isOffline ? 'ENABLED' : 'DISABLED'}`);
    
    if (!isOffline) {
        console.log('ℹ️ To test offline mode, run: enableOfflineMode()');
        return;
    }
    
    console.log('🧪 Testing offline mode enforcement...');
    
    // Test staff lookup
    const testStaff = 'Hiroyuki Imaishi';
    console.log(`🧪 Testing staff lookup: "${testStaff}"`);
    window.testStaffLookup(testStaff);
    
    // Test if fetchStaffRoles respects offline mode
    console.log('🧪 Testing fetchStaffRoles in offline mode...');
    window.fetchStaffRoles(testStaff, false, 'ANIME').then(roles => {
        console.log(`✅ fetchStaffRoles returned ${roles.length} roles in offline mode`);
    }).catch(error => {
        console.log(`❌ fetchStaffRoles error in offline mode:`, error);
    });
    
    // Test simpleAniListQuery protection
    console.log('🧪 Testing simpleAniListQuery protection...');
    try {
        window.simpleAniListQuery('query { test }', {}).then(result => {
            console.log('❌ simpleAniListQuery should not execute in offline mode!');
        }).catch(error => {
            console.log('✅ simpleAniListQuery correctly blocked in offline mode:', error.message);
        });
    } catch (error) {
        console.log('✅ simpleAniListQuery correctly blocked in offline mode:', error.message);
    }
};

// Debug command: Test mass update process
window.debugMassUpdate = function() {
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    console.log('🧪 Testing mass update process...');
    
    // Check initial state
    const initialCount = Object.keys(window.massUpdater.offlineData).length;
    console.log(`📊 Initial data entries: ${initialCount}`);
    
    // Get anime cards from page - try multiple selectors
    let animeCards = document.querySelectorAll('.anime-card');
    if (animeCards.length === 0) {
        animeCards = document.querySelectorAll('.studio-anime-card');
        console.log(`📋 Found ${animeCards.length} studio anime cards on page`);
    } else {
        console.log(`📋 Found ${animeCards.length} anime cards on page`);
    }
    
    // Debug: Show what cards were found
    if (animeCards.length === 0) {
        console.log('🔍 No .anime-card or .studio-anime-card elements found. Checking for alternative selectors...');
        
        // Try other possible selectors
        const altSelectors = [
            '.card', 
            '[class*="anime"]', 
            '[class*="card"]',
            'a[href*="anilist.co"]'
        ];
        
        for (const selector of altSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`   Found ${elements.length} elements with selector: ${selector}`);
            }
        }
        
        // Show current page URL and available classes
        console.log(`   Current page: ${window.location.href}`);
        const allElements = document.querySelectorAll('*[class]');
        const classes = new Set();
        allElements.forEach(el => {
            el.className.split(' ').forEach(cls => {
                if (cls.includes('anime') || cls.includes('card')) {
                    classes.add(cls);
                }
            });
        });
        console.log(`   Available anime/card classes:`, Array.from(classes));
    } else {
        // Show what links we found in the cards
        console.log(`   Analyzing ${animeCards.length} cards for AniList links...`);
        
        // Debug: Check the first few cards in detail
        for (let i = 0; i < Math.min(3, animeCards.length); i++) {
            const card = animeCards[i];
            console.log(`   Card ${i + 1}:`);
            console.log(`     HTML:`, card.outerHTML.substring(0, 200) + '...');
            
            // Check all links in this card
            const allLinks = card.querySelectorAll('a');
            console.log(`     All links (${allLinks.length}):`);
            allLinks.forEach((link, j) => {
                console.log(`       ${j + 1}. href="${link.href}" text="${link.textContent.trim()}"`);
            });
            
            // Check for any AniList links
            const anilistLinks = card.querySelectorAll('a[href*="anilist.co"]');
            console.log(`     AniList links: ${anilistLinks.length}`);
            
            // Check for data attributes that might contain IDs
            console.log(`     Data attributes:`, Array.from(card.attributes).filter(attr => attr.name.startsWith('data-')));
        }
    }
    
    // Extract anime IDs
    const animeIds = Array.from(animeCards).map((card, index) => {
        // Try multiple methods to find anime ID
        
        // Method 1: AniList links
        const links = card.querySelectorAll('a[href*="anilist.co/anime/"]');
        for (const link of links) {
            const match = link.href.match(/\/anime\/(\d+)/);
            if (match) {
                console.log(`   Card ${index + 1}: Found ID ${match[1]} via AniList link`);
                return parseInt(match[1]);
            }
        }
        
        // Method 2: Image src URLs (AniList CDN)
        const images = card.querySelectorAll('img[src*="anilist.co"]');
        for (const img of images) {
            // Look for pattern like: /media/anime/cover/medium/b186743-hash.jpg
            const match = img.src.match(/\/media\/anime\/cover\/\w+\/b?x?(\d+)/);
            if (match) {
                console.log(`   Card ${index + 1}: Found ID ${match[1]} via image URL: ${img.src}`);
                return parseInt(match[1]);
            }
        }
        
        // Method 3: Data attributes
        if (card.dataset.animeId) {
            console.log(`   Card ${index + 1}: Found ID ${card.dataset.animeId} via data-anime-id`);
            return parseInt(card.dataset.animeId);
        }
        
        if (card.dataset.id) {
            console.log(`   Card ${index + 1}: Found ID ${card.dataset.id} via data-id`);
            return parseInt(card.dataset.id);
        }
        
        // Method 4: Look for any numeric IDs in href attributes
        const allLinks = card.querySelectorAll('a[href]');
        for (const link of allLinks) {
            const numericMatch = link.href.match(/(\d{4,})/); // Look for 4+ digit numbers
            if (numericMatch) {
                console.log(`   Card ${index + 1}: Found potential ID ${numericMatch[1]} in link ${link.href}`);
                return parseInt(numericMatch[1]);
            }
        }
        
        if (index < 3) { // Only log details for first 3 cards to avoid spam
            console.log(`   Card ${index + 1}: No anime ID found`);
        }
        return null;
    }).filter(id => id !== null);
    
    console.log(`🎯 Extracted anime IDs:`, animeIds.slice(0, 5), animeIds.length > 5 ? `... and ${animeIds.length - 5} more` : '');
    
    if (animeIds.length === 0) {
        console.log('❌ No anime IDs found. Make sure you\'re on a page with anime cards.');
        return;
    }
    
    // Test fetching one anime
    const testId = animeIds[0];
    console.log(`🧪 Testing fetch for anime ID: ${testId}`);
    
    window.massUpdater.fetchAnimeDetails(testId).then(data => {
        if (data) {
            console.log(`✅ Successfully fetched anime data:`, data.title);
            if (data.staff && data.staff.edges) {
                console.log(`👥 Found ${data.staff.edges.length} staff members`);
                const staffNames = data.staff.edges.slice(0, 3).map(e => e.node?.name?.full).filter(n => n);
                console.log(`👥 Sample staff:`, staffNames);
            } else {
                console.log('❌ No staff data in response');
            }
        } else {
            console.log('❌ Failed to fetch anime data');
        }
    }).catch(error => {
        console.log('❌ Error fetching anime data:', error);
    });
    
    return { initialCount, animeCardsFound: animeCards.length, animeIds: animeIds.slice(0, 10) };
};


// Debug command: Test API connectivity
window.testApiConnection = function() {
    console.log('🔌 Testing API connectivity...');
    
    // Test proxy connection
    fetch('http://localhost:4000/health')
        .then(response => {
            if (response.ok) {
                console.log('✅ Proxy server is accessible');
                return response.text();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        })
        .then(health => {
            console.log('✅ Proxy health:', health);
        })
        .catch(error => {
            console.log('❌ Proxy server not accessible:', error.message);
        });
    
    // Test AniList API via proxy with the actual query structure
    const testQuery = `query ($id: Int) { Media(id: $id, type: ANIME) { id title { romaji english native } } }`;
    
    console.log('🔍 Testing with query:', testQuery);
    console.log('🔍 Variables:', { id: 1 });
    
    fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ 
            query: testQuery,
            variables: { id: 1 }
        })
    })
    .then(response => response.json())
    .then(response => {
        console.log('🔍 Response status:', response.status);
        console.log('🔍 Response ok:', response.ok);
        if (response.headers && typeof response.headers.entries === 'function') {
            console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
        } else {
            console.log('🔍 Response headers not available or not iterable');
        }
        return response.json();
    })
    .then(data => {
        console.log('🔍 Full response data:', data);
        if (data.data && data.data.Media) {
            console.log('✅ AniList API working via proxy:', data.data.Media.title.romaji);
        } else if (data.errors) {
            console.log('❌ AniList API GraphQL errors:', data.errors);
            data.errors.forEach((error, i) => {
                console.log(`   Error ${i + 1}: ${error.message}`);
                if (error.locations) {
                    console.log(`   Location: line ${error.locations[0].line}, column ${error.locations[0].column}`);
                }
            });
        } else {
            console.log('❌ AniList API returned unexpected data:', data);
        }
    })
    .catch(error => {
        console.log('❌ AniList API request failed:', error);
    });
};

// Debug command: Inspect app data structure
window.inspectAppData = function() {
    console.log('🔍 Inspecting app data structure...');
    
    // Log all global functions that might be relevant
    const relevantFunctions = Object.getOwnPropertyNames(window).filter(name => {
        const item = window[name];
        return typeof item === 'function' && (
            name.toLowerCase().includes('anime') ||
            name.toLowerCase().includes('season') ||
            name.toLowerCase().includes('load') ||
            name.toLowerCase().includes('get') ||
            name.toLowerCase().includes('current')
        );
    });
    
    console.log('🔧 Relevant functions found:', relevantFunctions);
    
    // Try common functions that might return current data
    const functionsToTest = ['getCurrentAnime', 'getCurrentSeason', 'getSeasonData', 'loadSeason'];
    
    for (const funcName of functionsToTest) {
        if (typeof window[funcName] === 'function') {
            try {
                const result = window[funcName]();
                console.log(`✅ ${funcName}() returned:`, {
                    type: typeof result,
                    isArray: Array.isArray(result),
                    length: result?.length,
                    sample: Array.isArray(result) ? result[0] : result
                });
            } catch (error) {
                console.log(`❌ ${funcName}() error:`, error.message);
            }
        }
    }
    
    // Check for anime data in DOM elements
    const animeCards = document.querySelectorAll('[data-anime-id], .anime-card, .anime-item, .card');
    if (animeCards.length > 0) {
        console.log(`📄 Found ${animeCards.length} anime cards in DOM`);
        const sampleCard = animeCards[0];
        console.log('📋 Sample card attributes:', {
            className: sampleCard.className,
            dataset: sampleCard.dataset,
            innerHTML: sampleCard.innerHTML.substring(0, 200) + '...'
        });
    }
    
    // Look for specific data structures
    const dataStructures = ['seasons', 'animeData', 'currentSeasonAnime', 'animeList'];
    for (const structure of dataStructures) {
        if (typeof window[structure] !== 'undefined') {
            const data = window[structure];
            console.log(`📊 ${structure}:`, {
                type: typeof data,
                isArray: Array.isArray(data),
                isHTMLElement: data instanceof HTMLElement,
                keys: typeof data === 'object' && data !== null ? Object.keys(data) : null,
                length: data?.length,
                sample: Array.isArray(data) ? data[0] : (typeof data === 'object' ? JSON.stringify(data).substring(0, 200) : data)
            });
        }
    }
    
    // Check for season-specific data in seasons object
    if (typeof seasons !== 'undefined' && typeof seasons === 'object') {
        console.log('🗓️ Seasons object structure:');
        for (const year in seasons) {
            console.log(`  Year ${year}:`, Object.keys(seasons[year] || {}));
            for (const season in seasons[year] || {}) {
                const seasonData = seasons[year][season];
                if (Array.isArray(seasonData)) {
                    console.log(`    ${season}: ${seasonData.length} anime`);
                    if (seasonData.length > 0) {
                        console.log(`      Sample:`, seasonData[0]);
                    }
                }
            }
        }
    }
};

window.debugLocalStorage = function() {
    console.log('🔍 Debugging localStorage...');
    
    // Check if localStorage is available
    try {
        const testKey = 'test_storage';
        localStorage.setItem(testKey, 'test');
        const testValue = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        console.log(`✅ LocalStorage is working: ${testValue === 'test' ? 'PASS' : 'FAIL'}`);
    } catch (error) {
        console.error('❌ LocalStorage test failed:', error);
        return;
    }
    
    // Check our specific data
    const ourData = localStorage.getItem('anilist-offline-data');
    if (ourData) {
        try {
            const parsed = JSON.parse(ourData);
            console.log(`📦 Found our data in localStorage:`);
            console.log(`   Size: ${Math.round(ourData.length / 1024)}KB`);
            console.log(`   Entries: ${Object.keys(parsed.data || {}).length}`);
            console.log(`   Timestamp: ${new Date(parsed.timestamp).toLocaleString()}`);
            console.log(`   Version: ${parsed.version}`);
            
            // Check for recent updates
            const ageMinutes = Math.round((Date.now() - parsed.timestamp) / (60 * 1000));
            console.log(`   Age: ${ageMinutes} minutes`);
            
            if (ageMinutes < 30) {
                console.log(`✅ Data is recent (less than 30 minutes old)`);
            } else {
                console.log(`⚠️ Data is old (${ageMinutes} minutes old)`);
            }
            
        } catch (parseError) {
            console.error('❌ Failed to parse localStorage data:', parseError);
        }
    } else {
        console.log('❌ No anilist-offline-data found in localStorage');
    }
    
    // Check localStorage usage
    let totalSize = 0;
    console.log(`🗂️ All localStorage keys:`);
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            const keySize = localStorage[key].length;
            totalSize += keySize;
            console.log(`   ${key}: ${Math.round(keySize / 1024)}KB`);
        }
    }
    console.log(`📊 Total localStorage usage: ${Math.round(totalSize / 1024)}KB`);
    
    // Check quota (approximate)
    try {
        const testData = 'a'.repeat(1024 * 1024); // 1MB test
        localStorage.setItem('quota_test', testData);
        localStorage.removeItem('quota_test');
        console.log(`✅ LocalStorage has space for at least 1MB more`);
    } catch (quotaError) {
        console.warn(`⚠️ LocalStorage may be near quota limit`);
    }
};

window.forceReloadData = function() {
    console.log('🔄 Force reloading data...');
    if (window.massUpdater) {
        window.massUpdater.loadFromLocalStorage();
        console.log(`📊 Reloaded: ${Object.keys(window.massUpdater.offlineData).length} entries`);
    } else {
        console.log('❌ Mass updater not available');
    }
};

window.compareDataSources = function() {
    console.log('🔍 Comparing data sources...');
    
    // Check mass updater's in-memory data
    if (window.massUpdater) {
        const memoryData = window.massUpdater.offlineData;
        console.log(`📋 Mass updater memory: ${Object.keys(memoryData).length} entries`);
        console.log(`   Sample keys:`, Object.keys(memoryData).slice(0, 5));
    } else {
        console.log('❌ Mass updater not available');
    }
    
    // Check localStorage main key
    const mainData = localStorage.getItem('anilist-offline-data');
    if (mainData) {
        const parsed = JSON.parse(mainData);
        console.log(`📦 LocalStorage main key: ${Object.keys(parsed.data || {}).length} entries`);
        console.log(`   Timestamp: ${new Date(parsed.timestamp).toLocaleString()}`);
        console.log(`   Sample keys:`, Object.keys(parsed.data || {}).slice(0, 5));
    } else {
        console.log('❌ No main localStorage data found');
    }
    
    // Check for chunked data
    const metadata = localStorage.getItem('anilist-offline-metadata');
    if (metadata) {
        const meta = JSON.parse(metadata);
        console.log(`🧩 LocalStorage chunked data: ${meta.totalChunks} chunks`);
        console.log(`   Total size: ${Math.round(meta.totalSize / 1024)}KB`);
        console.log(`   Timestamp: ${new Date(meta.timestamp).toLocaleString()}`);
    } else {
        console.log('🧩 No chunked localStorage data found');
    }
    
    // Count individual cache keys (like we saw in the debug)
    let individualCacheCount = 0;
    const cacheKeys = [];
    for (let key in localStorage) {
        if (key.startsWith('staff_') || key.startsWith('studio_') || key.startsWith('anime_') || key.startsWith('anilist_')) {
            if (key !== 'anilist-offline-data' && key !== 'anilist-offline-mode' && key !== 'anilistProxy' && !key.startsWith('anilist-offline-chunk-') && key !== 'anilist-offline-metadata') {
                individualCacheCount++;
                cacheKeys.push(key);
            }
        }
    }
    console.log(`🗂️ Individual cache keys: ${individualCacheCount} keys`);
    console.log(`   Sample cache keys:`, cacheKeys.slice(0, 10));
    
    // Check if there's a data structure mismatch
    console.log('🔍 Checking for data structure issues...');
};

window.testChunkedSave = function() {
    console.log('🧪 Testing chunked save system...');
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    const currentEntries = Object.keys(window.massUpdater.offlineData).length;
    console.log(`📊 Current memory data: ${currentEntries} entries`);
    
    if (currentEntries === 0) {
        console.log('⚠️ No data in memory to save');
        return;
    }
    
    // Clear old localStorage data first
    try {
        localStorage.removeItem('anilist-offline-data');
        localStorage.removeItem('anilist-offline-metadata');
        for (let i = 0; i < 100; i++) {
            localStorage.removeItem(`anilist-offline-chunk-${i}`);
        }
        console.log('🧹 Cleared old localStorage data');
    } catch (e) {}
    
    // Try the new save system
    console.log('💾 Attempting new chunked save...');
    window.massUpdater.saveOfflineData();
    
    // Check results after a brief delay
    setTimeout(() => {
        compareDataSources();
    }, 1000);
};

window.debugSaveOperation = function() {
    console.log('🔍 DEBUG: Testing save operation...');
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    const beforeSave = Object.keys(window.massUpdater.offlineData).length;
    console.log(`📊 Before save: ${beforeSave} entries in massUpdater.offlineData`);
    console.log(`   Sample keys:`, Object.keys(window.massUpdater.offlineData).slice(0, 5));
    
    // Check what's currently in localStorage
    const currentLS = localStorage.getItem('anilist-offline-data');
    if (currentLS) {
        const parsed = JSON.parse(currentLS);
        console.log(`📦 Before save - localStorage: ${Object.keys(parsed.data || {}).length} entries`);
    }
    
    // Call save
    console.log('💾 Calling saveOfflineData()...');
    window.massUpdater.saveOfflineData();
    
    // Check immediately after
    setTimeout(() => {
        const afterLS = localStorage.getItem('anilist-offline-data');
        if (afterLS) {
            const parsed = JSON.parse(afterLS);
            console.log(`📦 After save - localStorage: ${Object.keys(parsed.data || {}).length} entries`);
            console.log(`   Timestamp: ${new Date(parsed.timestamp).toLocaleString()}`);
        } else {
            console.log('❌ No data in localStorage after save!');
        }
        
        const afterMemory = Object.keys(window.massUpdater.offlineData).length;
        console.log(`📊 After save: ${afterMemory} entries in massUpdater.offlineData`);
        
        if (beforeSave !== afterMemory) {
            console.log(`⚠️ WARNING: Memory data changed during save: ${beforeSave} → ${afterMemory}`);
        }
    }, 100);
};

window.inspectAllStorageKeys = function() {
    debugLog('🔍 Inspecting all localStorage keys...');
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            const value = localStorage[key];
            const size = Math.round(value.length / 1024);
            console.log(`📦 Key: "${key}" (${size}KB)`);
            
            // Try to parse as JSON and show structure
            try {
                const parsed = JSON.parse(value);
                if (typeof parsed === 'object' && parsed !== null) {
                    console.log(`   Type: Object`);
                    console.log(`   Keys: ${Object.keys(parsed).join(', ')}`);
                    if (parsed.data && typeof parsed.data === 'object') {
                        console.log(`   Data entries: ${Object.keys(parsed.data).length}`);
                    }
                    if (parsed.timestamp) {
                        console.log(`   Timestamp: ${new Date(parsed.timestamp).toLocaleString()}`);
                    }
                }
            } catch (e) {
                console.log(`   Type: String (${value.substring(0, 100)}...)`);
            }
        }
    }
};

// Debug command: Comprehensive mass update diagnosis
window.diagnoseMassUpdate = function() {
    console.log('🔬 Comprehensive Mass Update Diagnosis');
    console.log('=====================================');
    
    // 1. Check mass updater status
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    console.log('✅ Mass updater available');
    
    // 2. Check current data count
    const currentCount = Object.keys(window.massUpdater.offlineData).length;
    console.log(`📊 Current offline data entries: ${currentCount}`);
    
    // 3. Check API connectivity
    console.log('🔗 Testing API connectivity...');
    fetch('http://localhost:4000/health')
        .then(response => response.ok ? console.log('✅ Proxy accessible') : console.log('❌ Proxy not accessible'))
        .catch(() => console.log('❌ Proxy connection failed'));
    
    // 4. Test a simple GraphQL query
    console.log('🧪 Testing GraphQL query...');
    const testQuery = `query { Media(id: 1, type: ANIME) { id title { romaji } } }`;
    
    fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery })
    })
    .then(response => response.json())
    .then(data => {
        if (data.errors) {
            console.log('❌ GraphQL errors:', data.errors);
        } else if (data.data && data.data.Media) {
            console.log('✅ GraphQL working:', data.data.Media.title.romaji);
        } else {
            console.log('❓ Unexpected GraphQL response:', data);
        }
    })
    .catch(error => console.log('❌ GraphQL test failed:', error));
    
    // 5. Check for anime data on current page
    console.log('📄 Checking current page for anime data...');
    const animeCards = document.querySelectorAll('.anime-card');
    console.log(`   Found ${animeCards.length} anime cards`);
    
    if (animeCards.length === 0) {
        console.log('💡 No anime cards found. Try navigating to the main anime page first.');
        console.log('💡 Or try: window.debugMassUpdate() to see what data is available.');
    } else {
        // Test extracting IDs from the first card
        const firstCard = animeCards[0];
        const links = firstCard.querySelectorAll('a[href*="anilist.co/anime/"]');
        if (links.length > 0) {
            const href = links[0].href;
            const match = href.match(/\/anime\/(\d+)/);
            if (match) {
                console.log(`✅ Found anime ID in first card: ${match[1]}`);
            }
        }
    }
    
    // 6. Test fetching a single anime
    console.log('🧪 Testing single anime fetch...');
    window.massUpdater.fetchAnimeDetails(1).then(data => {
        if (data) {
            console.log('✅ Single anime fetch working');
            console.log('📋 Sample data keys:', Object.keys(data));
        } else {
            console.log('❌ Single anime fetch returned null');
        }
    }).catch(error => {
        console.log('❌ Single anime fetch failed:', error);
    });
    
    return {
        massUpdaterAvailable: !!window.massUpdater,
        currentDataCount: currentCount,
        animeCardsFound: animeCards.length
    };
};

// Debug command: Test data saving functionality
window.testDataSaving = async function() {
    console.log('💾 Testing Data Saving Functionality');
    console.log('===================================');
    
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    // 1. Add some test data
    console.log('📝 Adding test data...');
    const testData = {
        test_anime_123: {
            timestamp: Date.now(),
            data: {
                id: 123,
                title: { romaji: 'Test Anime', english: 'Test Anime EN' },
                staff: { edges: [] },
                studios: { edges: [] }
            }
        },
        test_staff_456: {
            timestamp: Date.now(),
            data: {
                id: 456,
                name: { full: 'Test Staff Member' },
                staffMedia: { edges: [] }
            }
        }
    };
    
    // Add test data to offline storage
    Object.assign(window.massUpdater.offlineData, testData);
    console.log(`✅ Added test data. Total entries: ${Object.keys(window.massUpdater.offlineData).length}`);
    
    // 2. Test localStorage saving
    console.log('💿 Testing localStorage save...');
    try {
        const dataPackage = {
            timestamp: Date.now(),
            version: '1.0',
            data: window.massUpdater.offlineData
        };
        localStorage.setItem('anilist-offline-data', JSON.stringify(dataPackage));
        console.log('✅ localStorage save successful');
    } catch (error) {
        console.log('❌ localStorage save failed:', error);
    }
    
    // 3. Test file saving via proxy
    console.log('📁 Testing file save via proxy...');
    try {
        const base = (window.massUpdater && typeof window.massUpdater.getProxySaveBase === 'function') ? window.massUpdater.getProxySaveBase() : 'http://localhost:4000';
        const response = await fetch(base + '/save-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: 'offline-data.json',
                data: {
                    timestamp: Date.now(),
                    version: '1.0',
                    data: window.massUpdater.offlineData
                }
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ File save successful:', result);
        } else {
            console.log('❌ File save failed:', response.status, response.statusText);
        }
    } catch (error) {
        console.log('❌ File save error:', error);
    }
    
    // 4. Test file loading
    console.log('📂 Testing file load...');
    try {
        const response = await fetch('http://localhost:4000/load-data');
        if (response.ok) {
            const data = await response.json();
            console.log('✅ File load successful. Data entries:', Object.keys(data.data || {}).length);
        } else {
            console.log('❌ File load failed:', response.status);
        }
    } catch (error) {
        console.log('❌ File load error:', error);
    }
    
    // 5. Clean up test data
    console.log('🧹 Cleaning up test data...');
    delete window.massUpdater.offlineData.test_anime_123;
    delete window.massUpdater.offlineData.test_staff_456;
    
    console.log('✅ Data saving test complete!');
};

// Debug command: Run complete system diagnosis
window.runFullDiagnosis = async function() {
    console.log('🔬 FULL SYSTEM DIAGNOSIS');
    console.log('========================');
    
    // Test 1: Basic connectivity
    console.log('\n1️⃣ Testing basic connectivity...');
    try {
        const healthResponse = await fetch('http://localhost:4000/health');
        console.log(healthResponse.ok ? '✅ Proxy server accessible' : '❌ Proxy server not accessible');
    } catch (error) {
        console.log('❌ Proxy server connection failed:', error.message);
        return; // Can't continue without proxy
    }
    
    // Test 2: GraphQL functionality  
    console.log('\n2️⃣ Testing GraphQL functionality...');
    try {
        const response = await fetch('http://localhost:4000/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'query { Media(id: 1, type: ANIME) { id title { romaji } } }'
            })
        });
        const data = await response.json();
        if (data.errors) {
            console.log('❌ GraphQL errors:', data.errors);
        } else if (data.data?.Media) {
            console.log('✅ GraphQL working:', data.data.Media.title.romaji);
        } else {
            console.log('❓ Unexpected GraphQL response:', data);
        }
    } catch (error) {
        console.log('❌ GraphQL test failed:', error.message);
    }
    
    // Test 3: Mass updater status
    console.log('\n3️⃣ Checking mass updater...');
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    const currentCount = Object.keys(window.massUpdater.offlineData).length;
    console.log(`✅ Mass updater available with ${currentCount} entries`);
    
    // Test 4: Data saving functionality
    console.log('\n4️⃣ Testing data saving...');
    await window.testDataSaving();
    
    // Test 5: Current page analysis
    console.log('\n5️⃣ Analyzing current page...');
    const animeCards = document.querySelectorAll('.anime-card');
    console.log(`📄 Found ${animeCards.length} anime cards on page`);
    
    // Test 6: Mass update diagnosis
    console.log('\n6️⃣ Running mass update diagnosis...');
    window.diagnoseMassUpdate();
    
    console.log('\n🎉 Full diagnosis complete!');
    console.log('📋 Available debug commands:');
    console.log('   • testApiConnection() - Test API connectivity');
    console.log('   • diagnoseMassUpdate() - Diagnose mass update issues');
    console.log('   • testDataSaving() - Test data saving functionality');
    console.log('   • inspectAppData() - Inspect app data structure');
    console.log('   • checkOfflineData() - Check offline data status');
    console.log('   • startMassUpdate() - Start mass update process');
};

// Debug command: Monitor mass update in real-time
window.monitorMassUpdate = function() {
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    console.log('📊 Starting mass update monitoring...');
    const startDataCount = Object.keys(window.massUpdater.offlineData).length;
    console.log(`📊 Starting with ${startDataCount} entries`);
    
    // Monitor data changes
    const monitorInterval = setInterval(() => {
        const currentCount = Object.keys(window.massUpdater.offlineData).length;
        if (currentCount > startDataCount) {
            console.log(`📈 Data entries increased: ${startDataCount} → ${currentCount} (+${currentCount - startDataCount})`);
            
            // Show latest entries
            const allKeys = Object.keys(window.massUpdater.offlineData);
            const latestKeys = allKeys.slice(-5);
            console.log(`   Latest entries:`, latestKeys);
        }
    }, 5000); // Check every 5 seconds
    
    // Stop monitoring after 5 minutes
    setTimeout(() => {
        clearInterval(monitorInterval);
        const finalCount = Object.keys(window.massUpdater.offlineData).length;
        console.log(`📊 Mass update monitoring complete. Final count: ${finalCount} (started with ${startDataCount})`);
    }, 300000);
    
    console.log('📊 Monitoring started. Will check every 5 seconds for 5 minutes.');
    return { startDataCount, monitorInterval };
};

// Debug command: Check current page for anime data
window.checkCurrentPage = function() {
    console.log('📍 Checking current page for anime data...');
    console.log(`   URL: ${window.location.href}`);
    
    // Check for anime cards
    const animeCards = document.querySelectorAll('.anime-card');
    console.log(`   Anime cards (.anime-card): ${animeCards.length}`);
    
    // Check for AniList links
    const anilistLinks = document.querySelectorAll('a[href*="anilist.co"]');
    console.log(`   AniList links: ${anilistLinks.length}`);
    
    if (anilistLinks.length > 0) {
        console.log(`   Sample AniList links:`);
        Array.from(anilistLinks).slice(0, 5).forEach((link, i) => {
            const match = link.href.match(/\/anime\/(\d+)/);
            const animeId = match ? match[1] : 'No ID';
            console.log(`     ${i + 1}. ${link.textContent.trim()} (ID: ${animeId})`);
        });
    }
    
    // Check page title and content
    console.log(`   Page title: ${document.title}`);
    
    // Check if this looks like a season page
    const isSeasonPage = document.title.toLowerCase().includes('season') || 
                        window.location.href.includes('season') ||
                        document.querySelector('h1, h2, h3')?.textContent.toLowerCase().includes('season');
    
    console.log(`   Looks like season page: ${isSeasonPage}`);
    
    // Suggest navigation if no anime found
    if (animeCards.length === 0 && anilistLinks.length === 0) {
        console.log('💡 Suggestions:');
        console.log('   - Navigate to a season page (e.g., Fall 2024, Summer 2024)');
        console.log('   - Make sure the page has loaded completely');
        console.log('   - Check if the anime cards use a different CSS class');
    }
    
    return {
        animeCards: animeCards.length,
        anilistLinks: anilistLinks.length,
        isSeasonPage,
        url: window.location.href
    };
};

// Debug command: Comprehensive page analysis
window.analyzePageData = function() {
    console.log('🔬 Comprehensive Page Data Analysis');
    console.log('==================================');
    
    // 1. Check if anime data is loaded globally
    console.log('📊 Checking global anime data...');
    if (typeof animeData !== 'undefined') {
        console.log('✅ animeData global variable found');
        console.log('   Years available:', Object.keys(animeData));
        
        // Check current year/season data
        const currentYear = new Date().getFullYear();
        if (animeData[currentYear]) {
            console.log(`   ${currentYear} seasons:`, Object.keys(animeData[currentYear]));
            Object.keys(animeData[currentYear]).forEach(season => {
                const seasonData = animeData[currentYear][season];
                if (Array.isArray(seasonData)) {
                    console.log(`   ${season} ${currentYear}: ${seasonData.length} anime`);
                    if (seasonData.length > 0) {
                        console.log(`     Sample: ${seasonData[0].title || seasonData[0].name || 'Unknown'}`);
                    }
                }
            });
        }
    } else {
        console.log('❌ animeData global variable not found');
    }
    
    // 2. Check various selectors for anime cards
    console.log('\n🎯 Checking for anime cards with various selectors...');
    const selectors = [
        '.anime-card',
        '.anime-item', 
        '#animeList .anime-card',
        '#animeList > div',
        '#fullAnimeGrid > div',
        '[data-anime-id]',
        '[href*="anilist.co/anime"]',
        '.card',
        '.anime',
        '#animeList *'
    ];
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`   ${selector}: ${elements.length} elements`);
        if (elements.length > 0 && elements.length < 10) {
            console.log(`     First element:`, elements[0].outerHTML.substring(0, 100) + '...');
        }
    });
    
    // 3. Check if animeList container exists and has content
    console.log('\n📦 Checking animeList container...');
    const animeListContainer = document.getElementById('animeList');
    if (animeListContainer) {
        console.log('✅ #animeList container found');
        console.log(`   Children: ${animeListContainer.children.length}`);
        console.log(`   innerHTML length: ${animeListContainer.innerHTML.length}`);
        console.log(`   Classes: ${animeListContainer.className}`);
        console.log(`   Style display: ${animeListContainer.style.display}`);
        console.log(`   Computed display: ${getComputedStyle(animeListContainer).display}`);
        
        if (animeListContainer.children.length > 0) {
            console.log(`   First child classes: ${animeListContainer.children[0].className}`);
            console.log(`   First child tag: ${animeListContainer.children[0].tagName}`);
        }
    } else {
        console.log('❌ #animeList container not found');
    }
    
    // 4. Check if season data functions exist
    console.log('\n🔧 Checking season functions...');
    const functions = ['getCurrentAnime', 'loadSeason', 'populateAnimeList', 'createAnimeCard'];
    functions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName} function available`);
        } else {
            console.log(`❌ ${funcName} function not found`);
        }
    });
    
    // 5. Check current page state
    console.log('\n📄 Current page state...');
    console.log(`   URL: ${window.location.href}`);
    console.log(`   Title: ${document.title}`);
    console.log(`   Body classes: ${document.body.className}`);
    
    // 6. Try to trigger anime loading if function exists
    console.log('\n🚀 Attempting to load anime data...');
    if (typeof window.loadSeason === 'function') {
        try {
            window.loadSeason();
            console.log('✅ loadSeason() called - check #animeList again');
            
            // Wait a moment then check again
            setTimeout(() => {
                const animeCards = document.querySelectorAll('#animeList > div');
                console.log(`   After loadSeason(): ${animeCards.length} cards in #animeList`);
            }, 1000);
        } catch (error) {
            console.log('❌ loadSeason() error:', error);
        }
    }
    
    return {
        animeDataAvailable: typeof animeData !== 'undefined',
        animeListContainer: !!document.getElementById('animeList'),
        animeCards: document.querySelectorAll('.anime-card').length
    };
};

// Debug command: Force load current season anime
window.forceLoadCurrentSeason = function() {
    console.log('🔄 Force loading current season...');
    
    // Try to determine current season - FIXED FOR SEPTEMBER = FALL
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    
    let season;
            if (month >= 1 && month <= 3) season = 'Winter';
            else if (month >= 4 && month <= 6) season = 'Spring';
            else if (month >= 7 && month <= 9) season = 'Summer';  // Jul-Sep = Summer
            else season = 'Fall'; // Oct-Dec = Fall
    
    console.log(`   Detected season: ${season} ${year}`);
    
    // Check if animeData has this season
    if (typeof animeData !== 'undefined' && animeData[year] && animeData[year][season]) {
        const seasonAnime = animeData[year][season];
        console.log(`   Found ${seasonAnime.length} anime for ${season} ${year}`);
        
        // Try to populate the anime list
        const animeListContainer = document.getElementById('animeList');
        if (animeListContainer) {
            console.log('   Populating #animeList...');
            animeListContainer.innerHTML = ''; // Clear existing content
            
            seasonAnime.forEach((anime, index) => {
                const animeCard = document.createElement('div');
                animeCard.className = 'anime-card';
                animeCard.setAttribute('data-anime-id', anime.id || index);
                
                animeCard.innerHTML = `
                    <h3>${anime.title || anime.name || 'Unknown Title'}</h3>
                    <p>Studio: ${anime.studio || 'Unknown'}</p>
                    <a href="https://anilist.co/anime/${anime.id}" target="_blank">View on AniList</a>
                `;
                
                animeListContainer.appendChild(animeCard);
            });
            
            // Make the container visible
            animeListContainer.style.display = 'block';
            
            console.log(`   ✅ Created ${seasonAnime.length} anime cards`);
            
            return seasonAnime.length;
        } else {
            console.log('   ❌ #animeList container not found');
            return 0;
        }
    } else {
        console.log(`   ❌ No data found for ${season} ${year}`);
        
        // Try other seasons/years
        if (typeof animeData !== 'undefined') {
            console.log('   Available data:');
            Object.keys(animeData).forEach(yr => {
                Object.keys(animeData[yr]).forEach(ssn => {
                    const count = animeData[yr][ssn].length;
                    console.log(`     ${ssn} ${yr}: ${count} anime`);
                });
            });
        }
        
        return 0;
    }
};

// Debug command: Start comprehensive multi-season mass update
window.startComprehensiveMassUpdate = async function() {
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    console.log('🌍 Starting comprehensive mass update using animeData...');
    console.log('This will process ALL seasons from the anime.js data file.');
    
    // Use the new all seasons update function
    return await window.startAllSeasonsUpdate();
};

// Debug command: Find available season data variables
window.findSeasonData = function() {
    console.log('🔍 Searching for available season data variables...');
    
    // Check if getCurrentAnime function can give us current anime
    if (typeof getCurrentAnime === 'function') {
        try {
            const currentAnime = getCurrentAnime();
            console.log('✅ getCurrentAnime() result:', currentAnime);
        } catch (error) {
            console.log('❌ getCurrentAnime() error:', error.message);
        }
    }
    
    // Check for season-related global objects
    const seasonVars = ['seasons', 'animeSeasons', 'seasonData', 'currentSeasonAnime'];
    seasonVars.forEach(varName => {
        if (typeof window[varName] !== 'undefined') {
            console.log(`✅ Found ${varName}:`, window[varName]);
        }
    });
    
    // Look for data in the seasons object (if it exists)
    if (typeof seasons !== 'undefined') {
        console.log('🎬 Seasons object found:', seasons);
        
        // Check for current year/season data
        const currentYear = new Date().getFullYear();
        const years = [currentYear, currentYear - 1, currentYear + 1];
        const seasonNames = ['Fall', 'Winter', 'Spring', 'Summer'];
        
        for (const year of years) {
            if (seasons[year]) {
                console.log(`📅 Found data for year ${year}:`, Object.keys(seasons[year]));
                for (const season of seasonNames) {
                    if (seasons[year][season]) {
                        console.log(`   📺 ${season} ${year}: ${seasons[year][season].length} anime`);
                        if (seasons[year][season].length > 0) {
                            console.log(`   📋 Sample anime:`, seasons[year][season][0]);
                        }
                    }
                }
            }
        }
    }
    
    // Check common variable names
    const possibleVars = [
        'currentSeasonData',
        'seasonData', 
        'animeData',
        'currentAnimeList',
        'animeList',
        'loadedAnime',
        'animes'
    ];
    
    const availableVars = [];
    
    for (const varName of possibleVars) {
        if (typeof window[varName] !== 'undefined') {
            const data = window[varName];
            console.log(`✅ Found ${varName}:`, {
                type: typeof data,
                isArray: Array.isArray(data),
                length: data?.length,
                sample: Array.isArray(data) ? data[0] : data
            });
            availableVars.push(varName);
        }
    }
    
    // Also check global scope for any variables with "anime" or "season" in the name
    const globalVars = Object.getOwnPropertyNames(window).filter(name => 
        name.toLowerCase().includes('anime') || name.toLowerCase().includes('season')
    );
    
    console.log('🔍 Global variables containing "anime" or "season":', globalVars);
    
    if (availableVars.length === 0) {
        console.log('❌ No common season data variables found');
        console.log('💡 Try checking the Network tab or console to see how your app loads season data');
    }
    
    return { availableVars, globalVars };
};

// Debug command: Mass update using season data instead of DOM cards
window.startSeasonMassUpdate = async function(specificSeason = null, specificYear = null) {
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    console.log('🎬 Starting season-based mass update...');
    
    // Use current season if none specified
    let targetSeason = specificSeason;
    let targetYear = specificYear;
    
    if (!targetSeason || !targetYear) {
        // Get current season from global variable or detect it
        if (typeof currentSeason !== 'undefined' && currentSeason) {
            const [seasonName, year] = currentSeason.split(' ');
            targetSeason = seasonName;
            targetYear = parseInt(year);
        } else {
            // Auto-detect current season - FIXED FOR SEPTEMBER = FALL
            const now = new Date();
            targetYear = now.getFullYear();
            const month = now.getMonth() + 1;
            
            if (month >= 1 && month <= 3) targetSeason = 'Winter';
            else if (month >= 4 && month <= 6) targetSeason = 'Spring';
            else if (month >= 7 && month <= 9) targetSeason = 'Summer';  // Jul-Sep = Summer
            else targetSeason = 'Fall'; // Oct-Dec = Fall
        }
    }
    
    console.log(`🎯 Target season: ${targetSeason} ${targetYear}`);
    
    // Dynamically fetch all anime for the season from AniList
    const query = `
        query ($season: MediaSeason, $seasonYear: Int, $page: Int) {
            Page(page: $page, perPage: 50) {
                media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC) {
                    id
                    title { romaji english }
                }
            }
        }
    `;

    let animeIds = [];
    let page = 1;
    let keepGoing = true;
    while (keepGoing) {
        try {
            const res = await window.massUpdater.makeAniListRequest(query, {
                season: targetSeason.toUpperCase(),
                seasonYear: targetYear,
                page
            });
            if (res && res.media && res.media.length > 0) {
                animeIds.push(...res.media.map(m => m.id));
                if (res.media.length < 50) {
                    keepGoing = false;
                } else {
                    page++;
                }
            } else {
                keepGoing = false;
            }
        } catch (e) {
            console.error('❌ Error fetching anime IDs:', e);
            keepGoing = false;
        }
        if (!keepGoing && animeIds.length === 0) {
            console.log('❌ No anime IDs found for this season/year');
            return;
        }

    const initialDataCount = Object.keys(window.massUpdater.offlineData).length;
    console.log(`📊 Starting with ${initialDataCount} existing entries`);
    window.massUpdater.updateProgress(0, animeIds.length, `Starting ${targetSeason} ${targetYear} mass update...`);

    // Process each anime
    for (let i = 0; i < animeIds.length; i++) {
        const animeId = animeIds[i];
        window.massUpdater.updateProgress(i + 1, animeIds.length, `Processing: Anime ${animeId}`);
        try {
            await window.massUpdater.fetchAndStoreAnimeData(animeId);
            if (i < animeIds.length - 1) {
                await new Promise(resolve => setTimeout(resolve, window.massUpdater.updateDelay));
            }
        } catch (error) {
            console.error(`❌ Failed to process anime ${animeId}:`, error);
        }
    }
    
    // Save all collected data
    console.log(`💾 About to save data: ${Object.keys(window.massUpdater.offlineData).length} entries`);
    window.massUpdater.saveOfflineData();
    window.massUpdater.updateStatusText();
    
    const finalDataCount = Object.keys(window.massUpdater.offlineData).length;
    console.log(`🎉 ${targetSeason} ${targetYear} mass update complete!`);
    console.log(`📊 Final data: ${initialDataCount} → ${finalDataCount} (+${finalDataCount - initialDataCount} new entries)`);
    console.log(`💾 Save operation completed, verifying data persistence...`);
    
    // Verify save worked by checking localStorage
    const savedData = localStorage.getItem('anilist-offline-data');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            const savedCount = Object.keys(parsed.data || {}).length;
            console.log(`✅ LocalStorage verification: ${savedCount} entries saved`);
        } catch (e) {
            console.error(`❌ LocalStorage data corrupted during save verification`);
        }
    } else {
        console.error(`❌ No data found in localStorage after save!`);
    }
    
    // Show breakdown
    window.checkOfflineData();
    
    return {
        season: `${targetSeason} ${targetYear}`,
        processed: animeIds.length,
        dataAdded: finalDataCount - initialDataCount
    };
};

// Debug command: Update ALL seasons from animeData
window.startAllSeasonsUpdate = async function() {
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    if (typeof animeData === 'undefined') {
        console.log('❌ animeData not found. Make sure anime.js is loaded.');
        return;
    }
    
    console.log('🌍 Starting comprehensive update of ALL seasons (from animeData)...');
    const allSeasons = [];
    Object.keys(animeData).forEach(year => {
        Object.keys(animeData[year]).forEach(season => {
            allSeasons.push({ year: parseInt(year), season, count: animeData[year][season].length });
        });
    });
    console.log(`📋 Found ${allSeasons.length} seasons to process:`);
    allSeasons.forEach(s => console.log(`   ${s.season} ${s.year}: ${s.count} anime`));
    if (!confirm(`This will process ${allSeasons.length} seasons. This may take a very long time. Continue?`)) {
        console.log('❌ Cancelled by user');
        return;
    }
    const results = [];
    let totalProcessed = 0;
    let totalAdded = 0;
    for (let i = 0; i < allSeasons.length; i++) {
        const { year, season } = allSeasons[i];
        console.log(`\n🎬 Processing season ${i + 1}/${allSeasons.length}: ${season} ${year}`);
        try {
            const result = await window.startSeasonMassUpdate(season, year);
            if (result) {
                results.push(result);
                totalProcessed += result.processed;
                totalAdded += result.dataAdded;
            }
            // Longer delay between seasons to be extra safe with rate limits
            if (i < allSeasons.length - 1) {
                console.log('⏳ Waiting 10 seconds before next season...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        } catch (error) {
            console.error(`❌ Failed to process ${season} ${year}:`, error);
        }
    }
    console.log('\n🎉 ALL SEASONS UPDATE COMPLETE!');
    console.log(`📊 Total anime processed: ${totalProcessed}`);
    console.log(`📊 Total data entries added: ${totalAdded}`);
    console.log('🔍 Season results:');
    results.forEach(r => console.log(`   ${r.season}: ${r.processed} anime, +${r.dataAdded} data entries`));
    // Final save
    window.massUpdater.saveOfflineData();
    window.checkOfflineData();
    return results;
};

// Debug command: Quick test with just first 3 anime
window.quickSeasonTest = async function() {
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    console.log('🧪 Quick test with first 3 anime from Fall 2025...');
    
    if (typeof animeData === 'undefined') {
        console.log('❌ animeData not found');
        return;
    }
    
    const seasonData = animeData[2025]?.Fall;
    if (!seasonData) {
        console.log('❌ No Fall 2025 data found');
        return;
    }
    
    console.log(`📋 Found ${seasonData.length} total anime, testing first 3...`);
    
    const testAnime = seasonData.slice(0, 3);
    const animeIds = testAnime.map(anime => {
        if (anime.staffLink) {
            const match = anime.staffLink.match(/\/anime\/(\d+)/);
            if (match) return parseInt(match[1]);
        }
        return null;
    }).filter(id => id !== null);
    
    console.log(`🎯 Testing anime IDs:`, animeIds);
    console.log(`📋 Titles:`, testAnime.map(a => a.title));
    
    if (animeIds.length === 0) {
        console.log('❌ No valid anime IDs found');
        return;
    }
    
    const initialDataCount = Object.keys(window.massUpdater.offlineData).length;
    console.log(`📊 Starting with ${initialDataCount} existing entries`);
    
    // Process each anime with longer delays
    for (let i = 0; i < animeIds.length; i++) {
        const animeId = animeIds[i];
        const anime = testAnime[i];
        
        console.log(`\n🎬 Processing ${i + 1}/${animeIds.length}: ${anime.title} (ID: ${animeId})`);
        
        try {
            // Force fetch detailed data even if anime is cached
            const animeData = await window.massUpdater.fetchAnimeDetails(animeId);
            if (animeData) {
                // Store anime data
                window.massUpdater.offlineData[`anime_${animeId}`] = {
                    timestamp: Date.now(),
                    data: animeData
                };
                
                let staffCount = 0;
                let studioCount = 0;
                
                // Force fetch staff data
                if (animeData.staff && animeData.staff.edges) {
                    console.log(`👥 Found ${animeData.staff.edges.length} staff members`);
                    for (const edge of animeData.staff.edges) {
                        if (edge.node && edge.node.id) {
                            await window.massUpdater.fetchAndStoreStaffData(edge.node.id);
                            staffCount++;
                        }
                    }
                }

                // Force fetch studio data
                if (animeData.studios && animeData.studios.edges) {
                    console.log(`🏢 Found ${animeData.studios.edges.length} studios`);
                    for (const edge of animeData.studios.edges) {
                        if (edge.node && edge.node.id) {
                            await window.massUpdater.fetchAndStoreStudioData(edge.node.id);
                            studioCount++;
                        }
                    }
                }
                
                console.log(`✅ Completed ${anime.title} (${staffCount} staff, ${studioCount} studios)`);
            } else {
                console.log(`❌ No data found for ${anime.title}`);
            }
        } catch (error) {
            console.error(`❌ Failed ${anime.title}:`, error.message);
        }
        
        // Longer delay between anime
        if (i < animeIds.length - 1) {
            console.log(`⏳ Waiting 3 seconds before next anime...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    const finalDataCount = Object.keys(window.massUpdater.offlineData).length;
    console.log(`\n🎉 Quick test complete!`);
    console.log(`📊 Data: ${initialDataCount} → ${finalDataCount} (+${finalDataCount - initialDataCount} new entries)`);
    
    window.checkOfflineData();
    
    return {
        processed: animeIds.length,
        dataAdded: finalDataCount - initialDataCount
    };
};

window.clearOfflineData = function() {
    if (window.massUpdater && confirm('Clear all offline data? This cannot be undone.')) {
        window.massUpdater.offlineData = {};
        window.massUpdater.lastUpdateTimestamp = null;
        window.massUpdater.saveOfflineData();
        window.massUpdater.updateStatusText();
        console.log('🗑️ Offline data cleared');
    }
};

window.createOfflineDataFile = async function() {
    if (window.massUpdater) {
        const dataCount = Object.keys(window.massUpdater.offlineData).length;
        if (dataCount === 0) {
            console.warn('⚠️ No offline data to save. Run Mass Update first.');
            return false;
        }
        
        const dataPackage = {
            timestamp: window.massUpdater.lastUpdateTimestamp || Date.now(),
            version: '1.0',
            data: window.massUpdater.offlineData
        };
        
        // Save via proxy server (prefer atomic save if available)
        try {
            if (window.massUpdater.saveAllToProxyAtomic) {
                await window.massUpdater.saveAllToProxyAtomic({ anime: dataPackage, staff: { timestamp: dataPackage.timestamp, version: dataPackage.version, data: {} }, studio: { timestamp: dataPackage.timestamp, version: dataPackage.version, data: {} } });
            } else {
                window.massUpdater.saveToProjectFile(dataPackage);
            }
        } catch (e) {
            console.warn('Atomic save failed, falling back to single-file save:', e && e.message ? e.message : e);
            try { window.massUpdater.saveToProjectFile(dataPackage); } catch(_) {}
        }
        
        console.log(`📁 Created offline-data.json with ${dataCount} entries for GitHub hosting`);
        return true;
    }
    return false;
};

// Helper functions for batch management
window.refreshBatchCache = async function() {
    console.log('🔄 Manually refreshing batch cache...');
    try {
        const result = await window.batchFetcher.initializeBatchData();
        console.log('✅ Manual batch refresh completed:', result);
        return result;
    } catch (error) {
        console.error('❌ Manual batch refresh failed:', error);
        return null;
    }
};

window.checkBatchCache = function() {
    console.log('📊 Batch Cache Status:');
    console.log(`   Staff: ${window.batchFetcher.staffCache.size} entries`);
    console.log(`   Studios: ${window.batchFetcher.studioCache.size} entries`);
    
    // Check localStorage cache age
    try {
        const cacheData = JSON.parse(localStorage.getItem('anilist-batch-cache') || '{}');
        if (cacheData.timestamp) {
            const ageHours = Math.round((Date.now() - cacheData.timestamp) / (60 * 60 * 1000));
            console.log(`   Cache age: ${ageHours} hours`);
        } else {
            console.log('   No persistent cache found');
        }
    } catch (error) {
        console.log('   Error checking cache age:', error.message);
    }
    
    return {
        staffCount: window.batchFetcher.staffCache.size,
        studioCount: window.batchFetcher.studioCache.size
    };
};

window.clearBatchCache = function() {
    console.log('🗑️ Clearing batch cache...');
    window.batchFetcher.staffCache.clear();
    window.batchFetcher.studioCache.clear();
    localStorage.removeItem('anilist-batch-cache');
    console.log('✅ Batch cache cleared');
};

// Manual recovery functions for stuck loading
window.fixStuckLoading = function(type = 'both') {
    console.log(`🔧 Manual recovery for ${type} loading...`);
    
    if (type === 'staff' || type === 'both') {
        const staffContainer = document.getElementById('anilistInfo');
        if (staffContainer && staffContainer.innerHTML.includes('Loading…')) {
            console.log('🔧 Recovering stuck staff loading');
            const currentAnime = getCurrentAnime();
            if (currentAnime) {
                const anilistIdMatch = currentAnime.staffLink ? currentAnime.staffLink.match(/\/anime\/(\d+)/) : null;
                const anilistId = anilistIdMatch ? anilistIdMatch[1] : currentAnime.title;
                loadingStateMonitor.recoverStuckLoading('anilistInfo', anilistId, 'staff');
            }
        } else {
            console.log('✅ Staff container is not stuck');
        }
    }
    
    if (type === 'studio' || type === 'both') {
        const studioContainer = document.getElementById('studioInfo');
        if (studioContainer && studioContainer.innerHTML.includes('Loading…')) {
            console.log('🔧 Recovering stuck studio loading');
            const currentAnime = getCurrentAnime();
            if (currentAnime) {
                const anilistIdMatch = currentAnime.staffLink ? currentAnime.staffLink.match(/\/anime\/(\d+)/) : null;
                const anilistId = anilistIdMatch ? anilistIdMatch[1] : currentAnime.title;
                loadingStateMonitor.recoverStuckLoading('studioInfo', anilistId, 'studio');
            }
        } else {
            console.log('✅ Studio container is not stuck');
        }
    }
};

window.forceReload = function() {
    console.log('🔄 Force reloading current anime data...');
    sessionStorage.setItem('forceStaffReload', 'true');
    sessionStorage.setItem('forceStudioReload', 'true');
    updateViewer();
};

// Debug function to check loading states
window.debugLoadingStates = function() {
    console.log('🔍 Loading States Debug:');
    
    const staffContainer = document.getElementById('anilistInfo');
    const studioContainer = document.getElementById('studioInfo');
    
    if (staffContainer) {
        const staffLoading = staffContainer.innerHTML.includes('Loading…');
        const staffLoadingTime = Date.now() - (window.staffLoadingStartTime || 0);
        console.log(`📊 Staff Container:`, {
            isLoading: staffLoading,
            loadingTime: Math.round(staffLoadingTime/1000) + 's',
            content: staffContainer.innerHTML.substring(0, 100) + '...',
            visible: !staffContainer.classList.contains('hidden'),
            display: window.getComputedStyle(staffContainer).display
        });
    } else {
        console.log('❌ Staff container (anilistInfo) not found!');
    }
    
    if (studioContainer) {
        const studioLoading = studioContainer.innerHTML.includes('Loading…');
        const studioLoadingTime = Date.now() - (window.studioLoadingStartTime || 0);
        console.log(`🏢 Studio Container:`, {
            isLoading: studioLoading,
            loadingTime: Math.round(studioLoadingTime/1000) + 's',
            content: studioContainer.innerHTML.substring(0, 100) + '...',
            visible: !studioContainer.classList.contains('hidden'),
            display: window.getComputedStyle(studioContainer).display
        });
    } else {
        console.log('❌ Studio container (studioInfo) not found!');
    }
    
    // Also check the main viewer
    const animeViewer = document.getElementById('animeViewer');
    if (animeViewer) {
        console.log(`🎬 Anime Viewer:`, {
            visible: !animeViewer.classList.contains('hidden'),
            display: window.getComputedStyle(animeViewer).display
        });
    } else {
        console.log('❌ Anime viewer not found!');
    }
    
    console.log(`🎯 Current Anime:`, getCurrentAnime()?.title || 'Unknown');
    console.log(`📡 Loading Monitor States:`, Object.keys(loadingStateMonitor.loadingStates || {}));
    
    // Check if stuck and trigger manual recovery
    if (staffContainer && staffContainer.innerHTML.includes('Loading…')) {
        const staffLoadingTime = Date.now() - (window.staffLoadingStartTime || 0);
        if (staffLoadingTime > 3000) {
            console.log('🔧 Staff appears stuck, triggering manual recovery');
            fixStuckLoading('staff');
        }
    }
    
    if (studioContainer && studioContainer.innerHTML.includes('Loading…')) {
        const studioLoadingTime = Date.now() - (window.studioLoadingStartTime || 0);
        if (studioLoadingTime > 3000) {
            console.log('🔧 Studio appears stuck, triggering manual recovery');
            fixStuckLoading('studio');
        }
    }
};

// Force show containers if they're hidden
window.showContainers = function() {
    console.log('🔧 Force showing staff/studio containers...');
    
    const staffContainer = document.getElementById('anilistInfo');
    const studioContainer = document.getElementById('studioInfo');
    const animeViewer = document.getElementById('animeViewer');
    
    if (staffContainer) {
        staffContainer.classList.remove('hidden');
        staffContainer.style.display = '';
        console.log('✅ Staff container forced visible');
    } else {
        console.log('❌ Staff container not found');
    }
    
    if (studioContainer) {
        studioContainer.classList.remove('hidden');
        studioContainer.style.display = '';
        console.log('✅ Studio container forced visible');
    } else {
        console.log('❌ Studio container not found');
    }
    
    if (animeViewer) {
        animeViewer.classList.remove('hidden');
        animeViewer.style.display = '';
        console.log('✅ Anime viewer forced visible');
    } else {
        console.log('❌ Anime viewer not found');
    }
    
    // Force update viewer to refresh content
    updateViewer();
};

// Test batch system
window.testBatchSystem = async function() {
    console.log('🧪 Testing batch system...');
    
    // Clear any existing cache for clean test
    window.clearBatchCache();
    
    // Test fetching a few pages
    console.log('📦 Testing staff fetch...');
    const staffResult = await window.batchFetcher.batchFetchStaff(1);
    console.log(`✅ Fetched ${staffResult} staff members`);
    
    console.log('🏢 Testing studio fetch...');
    const studioResult = await window.batchFetcher.batchFetchStudios(1);
    console.log(`✅ Fetched ${studioResult} studios`);
    
    // Test cache lookup
    const firstStaffName = Array.from(window.batchFetcher.staffCache.keys())[0];
    if (firstStaffName && typeof firstStaffName === 'string') {
        console.log(`🎯 Testing cache lookup for: ${firstStaffName}`);
        const cached = await window.batchFetcher.getStaff(firstStaffName);
        console.log(`✅ Cache lookup result:`, cached ? 'Found' : 'Not found');
    }
    
    // Save to storage
    window.batchFetcher.saveCacheToStorage();
    
    return { staffResult, studioResult };
};

// Loading state monitoring and auto-recovery system
let loadingStateMonitor = {
    timers: new Map(),
    maxLoadingTime: 15000, // 15 seconds max loading time
    
    startMonitoring(containerId, animeId, type = 'staff') {
        // Safety check: don't start monitoring in offline mode
        if (window.massUpdater && window.massUpdater.isOfflineMode()) {
            console.log(`📦 Offline mode - not starting ${type} monitor for ${containerId}`);
            return;
        }
        
        // Use a fallback ID if animeId is undefined
        const safeAnimeId = animeId || 'current';
        const key = `${containerId}-${safeAnimeId}-${type}`;
        
        // Clear any existing timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }
        
        console.log(`🔍 Starting ${type} loading monitor for ${safeAnimeId} in ${containerId}`);
        
        const timer = setTimeout(() => {
            console.warn(`⚠️ ${type} loading stuck for ${safeAnimeId} in ${containerId}, attempting recovery`);
            this.recoverStuckLoading(containerId, safeAnimeId, type);
        }, this.maxLoadingTime);
        
        this.timers.set(key, timer);
    },
    
    stopMonitoring(containerId, animeId, type = 'staff') {
        const safeAnimeId = animeId || 'current';
        const key = `${containerId}-${safeAnimeId}-${type}`;
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
            console.log(`✅ Stopped ${type} loading monitor for ${animeId}`);
        }
    },
    
    clearAllMonitoring() {
        console.log('🧹 Clearing all loading monitors');
        this.timers.forEach((timer, key) => {
            clearTimeout(timer);
            console.log(`🧹 Cleared monitor: ${key}`);
        });
        this.timers.clear();
    },
    
    getActiveMonitors() {
        return Array.from(this.timers.keys());
    },
    
    recoverStuckLoading(containerId, animeId, type) {
        // Prevent infinite loops with cooldown mechanism - ENHANCED
        const key = `${containerId}-${animeId}-${type}`;
        const now = Date.now();
        
        // Check if we've recently attempted recovery for this item
        if (this.lastRecovery && this.lastRecovery[key] && (now - this.lastRecovery[key]) < 10000) {
            console.warn(`🚫 Skipping recovery for ${animeId} (${type}) - too recent (${Math.round((now - this.lastRecovery[key])/1000)}s ago)`);
            return;
        }
        
        // Initialize lastRecovery if needed
        if (!this.lastRecovery) {
            this.lastRecovery = {};
        }
        this.lastRecovery[key] = now;
        
        console.log(`🔧 Attempting to recover stuck ${type} loading for ${animeId}`);
        
        // Check if we're in offline mode and should not attempt recovery
        if (window.massUpdater && window.massUpdater.isOfflineMode()) {
            console.log('📦 Offline mode detected - checking if offline data should be displayed instead');
            
            const container = document.getElementById(containerId);
            if (container && container.innerHTML.includes('Loading…')) {
                // Try to display offline data instead of attempting API recovery
                const currentAnime = getCurrentAnime();
                if (currentAnime && currentAnime.staffLink) {
                    const anilistIdMatch = currentAnime.staffLink.match(/\/anime\/(\d+)/);
                    if (anilistIdMatch) {
                        const anilistId = anilistIdMatch[1];
                        const animeKey = `anime_${anilistId}`;
                        const offlineAnimeEntry = window.massUpdater.offlineData[animeKey];
                        
                        if (offlineAnimeEntry && offlineAnimeEntry.data) {
                            console.log('📦 Found offline data, displaying instead of showing error');
                            const offlineAnimeData = offlineAnimeEntry.data;
                            
                            // Helper to get a readable name from possible AniList shapes (string, object with full/native, or other)
                            function readableName(x) {
                                if (!x) return '';
                                try {
                                    if (typeof x === 'string') return x;
                                    if (typeof x === 'object') {
                                        if (x.full) return x.full;
                                        if (x.name) return readableName(x.name);
                                        if (x.native) return x.native;
                                        if (x.romaji) return x.romaji;
                                    }
                                    return String(x);
                                } catch (e) { return String(x); }
                            }

                            if (type === 'staff' && offlineAnimeData.staff && offlineAnimeData.staff.edges) {
                                let staffHtml = '<h3>Staff</h3>';
                                for (const edge of offlineAnimeData.staff.edges) {
                                    const staffNode = edge.node || {};
                                    const staffName = readableName(staffNode.name) || readableName(staffNode.staffName) || readableName(staffNode) || 'Unknown';
                                    const role = edge.role || edge.staffRole || 'Unknown Role';
                                    staffHtml += `<div class="staff-member">
                                        <span class="staff-name" onclick="showStaffView('${String(staffName).replace(/'/g, "\\'")}')">${staffName}</span>
                                        <span class="staff-role">${role}</span>
                                    </div>`;
                                }
                                // End of offline data display block
                                container.innerHTML = staffHtml;
                                console.log('✅ Recovered with offline staff data');
                                return;
                            }
                            else if (type === 'studio' && offlineAnimeData.studios && offlineAnimeData.studios.edges) {
                                let studioHtml = '<h3>Studios</h3>';
                                for (const edge of offlineAnimeData.studios.edges) {
                                    const studioNode = edge.node || {};
                                    const studioName = readableName(studioNode.name) || readableName(studioNode) || `Studio ${edge.node?.id || 'Unknown'}`;
                                    const isMain = edge.isMain ? ' (Main Studio)' : '';
                                    studioHtml += `<div class="studio-item">
                                        <span class="studio-name" onclick="showStudioView('${String(studioName).replace(/'/g, "\\'")}')">${studioName}${isMain}</span>
                                    </div>`;
                                }
                                container.innerHTML = studioHtml;
                                console.log('✅ Recovered with offline studio data');
                                return;
                            }
                        }
                    }
                }
                
                // If no offline data available, show offline message instead of attempting API calls
                container.innerHTML = `<h4>${type === 'staff' ? 'Staff' : 'Studios'}</h4><div class="offline-notice">🔌 Offline mode - no data available</div>`;
                console.log('📦 No offline data available, showing offline message');
            }
            return;
        }
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`🚫 Container ${containerId} not found for recovery`);
            return;
        }
        
        // Check if still showing loading state
        if (container.innerHTML.includes('Loading…')) {
            console.log(`🔧 Confirmed stuck loading, triggering recovery for ${type}`);
            
            // CRITICAL FIX: Clear the stuck loading state first
            console.log(`🧹 Clearing stuck loading state for ${type}`);
            
            // Reset loading tracking - with null checks
            if (type === 'staff') {
                window.staffLoadingStartTime = null;
                if (this.loadingStates && this.loadingStates['anilistInfo']) {
                    delete this.loadingStates['anilistInfo'];
                }
            } else if (type === 'studio') {
                window.studioLoadingStartTime = null;
                if (this.loadingStates && this.loadingStates['studioInfo']) {
                    delete this.loadingStates['studioInfo'];
                }
            }
            
            // Force clear the container and restart loading
            container.innerHTML = `<h4>${type === 'staff' ? 'Staff' : 'Studios'}</h4><p style="color: #ccc;">Reloading...</p>`;
            
            // Wait a moment then trigger fresh load
            setTimeout(async () => {
                try {
                    console.log(`🔄 Triggering fresh ${type} data load`);
                    
                    if (type === 'staff') {
                        // Force fresh staff data load with direct API call
                        const currentAnime = getCurrentAnime();
                        if (currentAnime && currentAnime.staffLink) {
                            console.log(`🔄 Forcing fresh staff load for: ${currentAnime.title}`);
                            
                            // Clear cache
                            CacheManager.remove('STAFF_ROLES', currentAnime.title);
                            
                            // Reset container and tracking
                            container.innerHTML = "<h4>Staff</h4><p>Reloading staff data...</p>";
                            window.staffLoadingStartTime = Date.now();
                            
                            // Stop existing monitoring
                            this.stopMonitoring('anilistInfo', animeId, 'staff');
                            
                            // Start fresh monitoring (only if not in offline mode)
                            if (!window.massUpdater || !window.massUpdater.isOfflineMode()) {
                                this.startMonitoring('anilistInfo', animeId, 'staff');
                            }
                            
                            // Directly call staff fetching with force fresh
                            try {
                                const anilistIdMatch = currentAnime.staffLink.match(/\/anime\/(\d+)/);
                                if (anilistIdMatch) {
                                    const anilistId = anilistIdMatch[1];
                                    
                                    // Force fresh AniList staff query
                                    const staffQuery = `
                                        query ($id: Int) {
                                            Media(id: $id, type: ANIME) {
                                                staff {
                                                    edges {
                                                        node {
                                                            name {
                                                                full
                                                            }
                                                        }
                                                        role
                                                    }
                                                }
                                            }
                                        }
                                    `;
                                    
                                    const staffData = await simpleAniListQuery(staffQuery, { id: parseInt(anilistId) }, `recovery-staff-${Date.now()}`);
                                    
                                    if (staffData?.Media?.staff?.edges) {
                                        this.displayRecoveredStaffDataFromAniList(container, staffData.Media.staff.edges);
                                        console.log('✅ Successfully recovered staff data via fresh API call');
                                    } else {
                                        throw new Error('No staff data in response');
                                    }
                                }
                            } catch (apiError) {
                                console.error('❌ Fresh API call failed, showing error message:', apiError);
                                container.innerHTML = `
                                    <h4>Staff</h4>
                                    <p style="color: #ffaa00;">⚠️ Loading failed. <button onclick="fixStuckLoading('staff')" style="background: #0098ff; color: white; border: none; padding: 3px 8px; border-radius: 3px; cursor: pointer; margin-left: 5px;">Retry</button></p>
                                `;
                                // Clear the stuck loading timestamp to prevent repeated attempts
                                window.staffLoadingStartTime = null;
                            }
                        }
                    } else if (type === 'studio') {
                        // Force fresh studio data load with direct API call
                        const currentAnime = getCurrentAnime();
                        if (currentAnime && currentAnime.staffLink) {
                            console.log(`🔄 Forcing fresh studio load for: ${currentAnime.title}`);
                            
                            // Clear cache
                            CacheManager.remove('ANN_DATA', animeId?.toString());
                            
                            // Reset container and tracking
                            container.innerHTML = "<h4>Studios</h4><p>Reloading studio data...</p>";
                            window.studioLoadingStartTime = Date.now();
                            
                            // Stop existing monitoring
                            this.stopMonitoring('studioInfo', animeId, 'studio');
                            
                            // Start fresh monitoring (only if not in offline mode)
                            if (!window.massUpdater || !window.massUpdater.isOfflineMode()) {
                                this.startMonitoring('studioInfo', animeId, 'studio');
                            }
                            
                            // Directly call studio fetching
                            try {
                                const anilistIdMatch = currentAnime.staffLink.match(/\/anime\/(\d+)/);
                                if (anilistIdMatch) {
                                    const anilistId = anilistIdMatch[1];
                                    
                                    // Force fresh AniList studio query
                                    const studioQuery = `
                                        query ($id: Int) {
                                            Media(id: $id, type: ANIME) {
                                                studios {
                                                    edges {
                                                        node {
                                                            id
                                                            name
                                                        }
                                                        isMain
                                                    }
                                                }
                                            }
                                        }
                                    `;
                                    
                                    const studioData = await simpleAniListQuery(studioQuery, { id: parseInt(anilistId) }, `recovery-studio-${Date.now()}`);
                                    
                                    if (studioData?.Media?.studios?.edges) {
                                        this.displayRecoveredStudioDataFromAniList(container, studioData.Media.studios.edges, currentAnime.title);
                                        console.log('✅ Successfully recovered studio data via fresh API call');
                                    } else {
                                        throw new Error('No studio data in response');
                                    }
                                }
                            } catch (apiError) {
                                console.error('❌ Fresh API call failed, showing error message:', apiError);
                                container.innerHTML = `
                                    <h4>Studios</h4>
                                    <p style="color: #ffaa00;">⚠️ Loading failed. <button onclick="fixStuckLoading('studio')" style="background: #0098ff; color: white; border: none; padding: 3px 8px; border-radius: 3px; cursor: pointer; margin-left: 5px;">Retry</button></p>
                                `;
                                // Clear the stuck loading timestamp to prevent repeated attempts
                                window.studioLoadingStartTime = null;
                            }
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error triggering fresh ${type} load:`, error);
                    // Fallback to cached data recovery
                    if (type === 'staff') {
                        this.recoverStaffData(container, animeId);
                    } else if (type === 'studio') {
                        this.recoverStudioData(container, animeId);
                    }
                }
            }, 500);
        }
    },
    
    recoverStaffData(container, animeId) {
        // Try to get cached ANN data first
        const cachedANN = CacheManager.get('ANN_DATA', animeId?.toString());
        if (cachedANN && cachedANN.staff && cachedANN.staff.length > 0) {
            console.log('🔧 Recovering with cached ANN staff data');
            this.displayRecoveredStaffData(container, cachedANN.staff);
            return;
        }
        
        // If no cached data, show a helpful message
        container.innerHTML = `
            <h4>Staff</h4>
            <p style="color: #ccc;">Staff information temporarily unavailable.</p>
            <button onclick="forceReload()" style="background: #0098ff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                Retry Loading
            </button>
        `;
    },
    
    recoverStudioData(container, animeId) {
        // Try to get cached ANN data first
        const cachedANN = CacheManager.get('ANN_DATA', animeId?.toString());
        if (cachedANN && cachedANN.studios && cachedANN.studios.length > 0) {
            console.log('🔧 Recovering with cached ANN studio data');
            this.displayRecoveredStudioData(container, cachedANN.studios);
            return;
        }
        
        // If no cached data, show a helpful message
        container.innerHTML = `
            <h4>Studios</h4>
            <p style="color: #ccc;">Studio information temporarily unavailable.</p>
            <button onclick="forceReload()" style="background: #0098ff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                Retry Loading
            </button>
        `;
    },
    
    displayRecoveredStaffData(container, staffData) {
        container.innerHTML = "<h4>Staff</h4>";
        
        // Show a subset of the most important staff
        const importantStaff = staffData.slice(0, 5); // Show first 5
        importantStaff.forEach(staff => {
            const div = document.createElement('div');
            div.className = 'staff-row';
            const staffName = (staff.name && (staff.name.full || staff.name)) || staff.node?.name?.full || staff.node?.name || staff.staffName || 'Unknown';
            const staffRole = staff.role || staff.staffRole || 'Unknown Role';
            div.innerHTML = `
                <span style="color: #0098ff;">${staffName}</span>
                <span style="color: #ccc;"> — ${staffRole}</span>
            `;
            container.appendChild(div);
        });
        
        if (staffData.length > 5) {
            const moreDiv = document.createElement('div');
            moreDiv.innerHTML = `<p style="color: #ccc; font-size: 0.9em;">... and ${staffData.length - 5} more (cached data)</p>`;
            container.appendChild(moreDiv);
        }
    },
    
    displayRecoveredStudioData(container, studioData) {
        container.innerHTML = "<h4>Studios</h4>";
        
        studioData.forEach(studio => {
            const div = document.createElement('div');
            div.innerHTML = `
                <span style="color: #0098ff; cursor: pointer;" onclick="showStudio('${studio.name}')">${studio.name}</span>
                <span style="color: #ccc;"> (cached data)</span>
            `;
            container.appendChild(div);
        });
    },
    
    displayRecoveredStaffDataFromAniList(container, staffEdges) {
        container.innerHTML = "<h4>Staff</h4>";
        
        // Show the most important staff first
        const importantStaff = staffEdges.slice(0, 8); // Show first 8
        importantStaff.forEach(edge => {
            const div = document.createElement('div');
            div.className = 'staff-row';
            div.innerHTML = `
                <span style="color: #0098ff; cursor: pointer;" onclick="showStaff('${String(readableName(edge.node?.name)).replace(/'/g, "\\'")}')">${readableName(edge.node?.name)}</span>
                <span style="color: #ccc;"> — ${edge.role || 'Unknown Role'}</span>
            `;
            container.appendChild(div);
        });
        
        if (staffEdges.length > 8) {
            const moreDiv = document.createElement('div');
            moreDiv.innerHTML = `<p style="color: #ccc; font-size: 0.9em;">... and ${staffEdges.length - 8} more (recovered data)</p>`;
            container.appendChild(moreDiv);
        }
    },
    
    displayRecoveredStudioDataFromAniList(container, studioEdges, animeTitle) {
        container.innerHTML = "<h4>Studios</h4>";

        studioEdges.forEach(edge => {
            const studio = edge.node || {};
            const isMainStudio = edge.isMain;
            const studioName = studio.name?.full || studio.name || `Studio ${studio.id || 'Unknown'}`;

            const div = document.createElement('div');
            div.innerHTML = `
                <button onclick="showStudio('${String(studioName).replace(/'/g, "\\'")}')" class="staff-link studio-btn" style="background: ${isMainStudio ? '#0098ff' : '#666'};">
                    View ${studioName} Works${isMainStudio ? ' (Main)' : ''}
                </button>
            `;
            container.appendChild(div);

            // Check for co-production
            const coProducers = getCoProduction(animeTitle, studioName);
            if (coProducers && coProducers.length > 0) {
                const coDiv = document.createElement('div');
                coDiv.innerHTML = `<p class="co-production">Co-production with: <span class="co-studios">${coProducers.join(', ')}</span></p>`;
                container.appendChild(coDiv);
            }
        });

        if (studioEdges.length === 0) {
            container.innerHTML += '<p style="color: #ccc;">No studio information available</p>';
        }
    },
    
    async forceStaffReload(anime, container) {
        try {
            console.log('🔄 Force reloading staff for', anime.title);
            
            // Clear any existing loading IDs to prevent conflicts
            if (window.currentStaffLoadingId) {
                delete window.currentStaffLoadingId;
            }
            
            // Generate new loading ID
            const newLoadingId = Date.now() + Math.random();
            window.currentStaffLoadingId = newLoadingId;
            
            // Force fresh staff fetch
            const staffData = await getAnimeStaff(anime, true); // Force refresh
            
            // Check if this loading is still valid
            if (window.currentStaffLoadingId !== newLoadingId) {
                console.log('🚫 Staff loading superseded during force reload');
                return;
            }
            
            if (staffData && staffData.length > 0) {
                displayStaffRoles(staffData, container);
                console.log('✅ Force staff reload successful');
            } else {
                container.innerHTML = "<h4>Staff</h4><p>No staff information available.</p>";
            }
            
        } catch (error) {
            console.error('❌ Force staff reload failed:', error);
            container.innerHTML = "<h4>Staff</h4><p>Failed to load staff information.</p>";
        }
    },
    
    async forceStudioReload(animeId) {
        try {
            console.log('🔄 Force reloading studios for', animeId);
            
            const anime = animeData.find(a => a.id === animeId);
            if (!anime) return;
            
            // Force fresh studio extraction
            const studios = await getAnimeStudios(anime, true); // Force refresh
            
            const studioContainer = document.getElementById('studioInfo');
            if (!studioContainer) return;
            
            if (studios && studios.length > 0) {
                let studioContent = '<h4>Studios</h4>';
                studios.forEach(studio => {
                    const normalizedName = normalizeStudioName(studio.name);
                    studioContent += `
                        <div class="studio-item">
                            <button onclick="showStudio('${studio.name}')" class="staff-link studio-btn">
                                View ${normalizedName} Works
                            </button>
                        </div>
                    `;
                });
                studioContainer.innerHTML = studioContent;
                console.log('✅ Force studio reload successful');
            } else {
                studioContainer.innerHTML = '<h4>Studios</h4><p>No studio information available.</p>';
            }
            
        } catch (error) {
            console.error('❌ Force studio reload failed:', error);
            const studioContainer = document.getElementById('studioInfo');
            if (studioContainer) {
                studioContainer.innerHTML = '<h4>Studios</h4><p>Failed to load studio information.</p>';
            }
        }
    }
};

// Function to check and fix stuck loading states - IMPROVED VERSION
function checkAndFixStuckLoading() {
    // Check if we're in offline mode and should not attempt recovery
    if (window.massUpdater && window.massUpdater.isOfflineMode()) {
        console.log('📦 Offline mode - skipping stuck loading check');
        return;
    }
    
    const staffContainer = document.getElementById('anilistInfo');
    const studioContainer = document.getElementById('studioInfo');
    
    // Reduce cooldown to be more aggressive
    const now = Date.now();
    if (window.lastStuckCheck && (now - window.lastStuckCheck) < 1500) {
        return; // Skip if checked within last 1.5 seconds
    }
    window.lastStuckCheck = now;
    
    if (staffContainer && staffContainer.innerHTML.includes('Loading…')) {
        // Fix timing calculation - handle null/undefined timestamps
        const staffStartTime = window.staffLoadingStartTime;
        const loadingTime = staffStartTime ? (Date.now() - staffStartTime) : 0;
        
        if (loadingTime > 5000 && staffStartTime) { // Only if we have a valid start time
            console.log('🔧 Detected stuck staff loading after', Math.round(loadingTime/1000), 'seconds');
            const currentAnime = getCurrentAnime();
            if (currentAnime) {
                const anilistIdMatch = currentAnime.staffLink ? currentAnime.staffLink.match(/\/anime\/(\d+)/) : null;
                const anilistId = anilistIdMatch ? anilistIdMatch[1] : currentAnime.title;
                console.log('🔧 Triggering staff recovery for:', anilistId);
                loadingStateMonitor.recoverStuckLoading('anilistInfo', anilistId, 'staff');
            }
        } else if (!staffStartTime) {
            // If no start time set, initialize it now
            console.log('🔧 Staff loading detected without start time, initializing...');
            window.staffLoadingStartTime = Date.now();
        }
    }
    
    if (studioContainer && studioContainer.innerHTML.includes('Loading…')) {
        // Fix timing calculation - handle null/undefined timestamps
        const studioStartTime = window.studioLoadingStartTime;
        const loadingTime = studioStartTime ? (Date.now() - studioStartTime) : 0;
        
        if (loadingTime > 5000 && studioStartTime) { // Only if we have a valid start time
            console.log('🔧 Detected stuck studio loading after', Math.round(loadingTime/1000), 'seconds');
            const currentAnime = getCurrentAnime();
            if (currentAnime) {
                const anilistIdMatch = currentAnime.staffLink ? currentAnime.staffLink.match(/\/anime\/(\d+)/) : null;
                const anilistId = anilistIdMatch ? anilistIdMatch[1] : currentAnime.title;
                console.log('🔧 Triggering studio recovery for:', anilistId);
                loadingStateMonitor.recoverStuckLoading('studioInfo', anilistId, 'studio');
            }
        } else if (!studioStartTime) {
            // If no start time set, initialize it now
            console.log('🔧 Studio loading detected without start time, initializing...');
            window.studioLoadingStartTime = Date.now();
        }
    }
}

// Helper function to get current anime
function getCurrentAnime() {
    try {
        const [seasonName, year] = currentSeason.split(' ');
        const raw = animeData[year]?.[seasonName] || [];
        const list = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
        return list?.[currentIndex];
    } catch (error) {
        console.error('Error getting current anime:', error);
        return null;
    }
}

// Global variables for application state
let currentSeason = "Fall 2025"; // Default season
var viewerUpdateInProgress = false; // Prevent concurrent updateViewer calls (use var so it's hoisted and safe if updateViewer is called early)
// currentIndex is defined later with enhanced debugging

// ...existing code...

// =====================
// CORE VIEW FUNCTIONS - Defined first to ensure availability
// =====================

function showAnimeViewer() {
    console.log('🎬 showAnimeViewer() called');
    
    // CRITICAL: Clear all protection flags when returning to viewer
    localStorage.setItem('viewMode', 'viewer');
    sessionStorage.removeItem('viewTransition');
    sessionStorage.removeItem('studioNavigationIndex');
    console.log('🎬 Cleared all navigation protection flags');
    
    // Reset scroll position to top  
    resetScrollToTop();
    
    // Disable scroll prevention when leaving staff/studio view
    if (window.disableScrollPrevention) window.disableScrollPrevention();
    
    // Remove both staff and studio view CSS classes
    document.body.classList.remove("staff-view-mode", "studio-view-mode");
    // Set offline/online visual mode
    if (window.massUpdater && window.massUpdater.isOfflineMode()) {
        document.body.classList.add("offline-view-mode");
        document.body.classList.remove("online-view-mode");
    } else {
        document.body.classList.add("online-view-mode");
        document.body.classList.remove("offline-view-mode");
    }
    const staffViewEl = document.getElementById("staffView");
    const studioViewEl = document.getElementById("studioView");
    if (staffViewEl) staffViewEl.classList.remove("staff-view-active");
    if (studioViewEl) studioViewEl.classList.remove("studio-view-active");
    
    // Hide other views
    if (studioViewEl) {
        studioViewEl.classList.add("hidden");
        console.log('🎬 Hidden studioView');
    }
    if (staffViewEl) {
        staffViewEl.classList.add("hidden");
        console.log('🎬 Hidden staffView');
    }
    
    const animeViewer = document.getElementById("animeViewer");
    if (animeViewer) {
        animeViewer.classList.remove("hidden");
        console.log('🎬 Removed hidden class from animeViewer');
        console.log('🎬 animeViewer classes after removal:', animeViewer.className);
        console.log('🎬 animeViewer hidden status:', animeViewer.classList.contains('hidden'));
    } else {
        console.error('❌ animeViewer element not found!');
    }
    
    console.log('🎬 Set animeViewer visible, others hidden');
    
    // Restore header controls (no toggle button anymore)
    const yearSelect = document.querySelector(".year-select");
    const seasonTabs = document.querySelector(".season-tabs");
    const viewFullListBtn = document.getElementById("viewFullListBtn");
    const backToViewerBtn = document.getElementById("backToViewerBtn");
    const headerBar = document.querySelector(".header-bar");
    
    if (yearSelect) yearSelect.classList.remove("hidden");
    if (seasonTabs) seasonTabs.classList.remove("hidden");
    if (viewFullListBtn) viewFullListBtn.classList.remove("hidden");
    if (backToViewerBtn) backToViewerBtn.classList.add("hidden");
    if (headerBar) headerBar.classList.remove("studio-mode");
    
    // Update season tabs to match current data structure
    const [seasonName, year] = currentSeason.split(' ');
    if (typeof updateSeasonTabs === 'function' && year) {
        console.log('🎬 Updating season tabs for year:', year);
        
        // Check if we're in back button restoration mode
        const isBackButtonRestore = sessionStorage.getItem('backButtonRestore') === 'true';
        console.log('🎬 Back button restore mode:', isBackButtonRestore);
        
        updateSeasonTabs(year, isBackButtonRestore);
        
        // Also ensure year selector is correctly set
        if (yearSelect && yearSelect.value !== year) {
            console.log('🎬 Setting year selector to:', year);
            // CRITICAL: Set a flag to prevent the change handler from triggering loadSeason
            window.suppressYearChangeHandler = true;
            yearSelect.value = year;
            // Clear the flag after a brief delay
            setTimeout(() => {
                window.suppressYearChangeHandler = false;
            }, 10);
        }
    }
    
    // Ensure viewer has content loaded and update counter
    console.log('🎬 About to call updateViewer()');
    if (typeof updateViewer === 'function') {
        // Force fresh loading if returning from staff/studio view
        const isBackButtonRestore = sessionStorage.getItem('backButtonRestore') === 'true';
        if (isBackButtonRestore) {
            console.log('🎬 Forcing fresh content load for back button restore');
            // Clear containers first to ensure fresh loading
            const staffContainer = document.getElementById('anilistInfo');
            const studioContainer = document.getElementById('studioInfo');
            if (staffContainer) staffContainer.innerHTML = '';
            if (studioContainer) studioContainer.innerHTML = '';
            
            // Force a new update ID to bypass caching
            if (window.currentAnimeUpdateId) {
                window.currentAnimeUpdateId = `anime_update_fresh_${++window.requestIdCounter}_${Date.now()}`;
                console.log('🎬 Set fresh update ID for content reload:', window.currentAnimeUpdateId);
            }
            
            // Reset any cached anime comparison to force full reload
            window.lastAnimeId = null;
        }
        
        updateViewer();
        console.log('🎬 updateViewer() completed');
        
        // Ensure the anime viewer content is properly visible
        setTimeout(() => {
            const titleEl = document.getElementById('viewerTitle');
            const trailerEl = document.getElementById('viewerTrailer');
            const currentAnime = getCurrentAnime();
            
            if (currentAnime && titleEl && !titleEl.textContent) {
                console.log('🔧 Title missing after updateViewer, forcing reload');
                titleEl.textContent = currentAnime.title;
            }
            
            if (currentAnime && trailerEl && currentAnime.trailer && !trailerEl.src) {
                console.log('🔧 Trailer missing after updateViewer, forcing reload');
                trailerEl.src = currentAnime.trailer;
            }

            try { if (typeof window.repositionViewerHeader === 'function') window.repositionViewerHeader(); } catch(e){}

            console.log('🎬 Viewer content verification completed');
        }, 100);
    }
    
    if (typeof updateShowCounter === 'function') {
        updateShowCounter();
    }
    console.log('🎬 showAnimeViewer() completed');
    
    // Clear studio/staff state and save
    localStorage.removeItem("currentStudio");
    localStorage.removeItem("currentStaff");
    localStorage.setItem("viewMode", "viewer");
    if (typeof saveState === 'function') saveState();
    
    // Update browser history
    history.pushState({ view: 'viewer' }, 'Anime Viewer', location.pathname);
}

function showStudioView(studioName, isAfterRefresh = false) {
    // Set offline/online visual mode
    if (window.massUpdater && window.massUpdater.isOfflineMode()) {
        document.body.classList.add("offline-view-mode");
        document.body.classList.remove("online-view-mode");
    } else {
        document.body.classList.add("online-view-mode");
        document.body.classList.remove("offline-view-mode");
    }
    console.log('🏢 showStudioView called with:', studioName);
    
    // CRITICAL: Set protection flags to prevent index reset
    sessionStorage.setItem('viewTransition', 'true');
    localStorage.setItem('viewMode', 'studio');
    sessionStorage.setItem('studioNavigationIndex', String(currentIndex));
    console.log('🏢 Set protection flags - currentIndex:', currentIndex);
    
    // Check if required elements exist
    const studioView = document.getElementById("studioView");
    const studioNameEl = document.getElementById("studioName");
    const studioAnimeList = document.getElementById("studioAnimeList");
    
    console.log('🏢 Element check:', {
        studioView: !!studioView,
        studioNameEl: !!studioNameEl,
        studioAnimeList: !!studioAnimeList
    });
    
    if (!studioView || !studioNameEl || !studioAnimeList) {
        console.error('🏢 Missing required elements for studio view');
        return;
    }
    
    // Reset scroll position to top
    if (typeof resetScrollToTop === 'function') resetScrollToTop();
    
    // Additional aggressive scroll reset for studio view
    setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        console.log('🏢 Delayed scroll reset for studio view');
    }, 100);
    
    // Another scroll reset after the view is fully set up
    setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        console.log('🏢 Final scroll reset for studio view after setup');
    }, 300);
    
    // Remove staff view CSS classes
    document.body.classList.remove("staff-view-mode");
    const staffViewEl = document.getElementById("staffView");
    if (staffViewEl) staffViewEl.classList.remove("staff-view-active");
    
    console.log('📺 Hiding/showing views for studio...');
    // Hide other views and show studio view
    const animeList = document.getElementById("animeList");
    const animeViewer = document.getElementById("animeViewer");
    if (animeList) animeList.classList.add("hidden");
    if (animeViewer) animeViewer.classList.add("hidden");
    if (staffViewEl) staffViewEl.classList.add("hidden");
    studioView.classList.remove("hidden");
    
    console.log('🏢 View visibility after changes:', {
        animeList: animeList ? animeList.classList.contains("hidden") : 'not found',
        animeViewer: animeViewer ? animeViewer.classList.contains("hidden") : 'not found',
        staffView: staffViewEl ? staffViewEl.classList.contains("hidden") : 'not found',
        studioView: studioView.classList.contains("hidden")
    });
    
    // Hide full list modal if open
    if (typeof hideFullListModal === 'function') hideFullListModal();
    
    // Add studio view CSS classes
    document.body.classList.add("studio-view-mode");
    
    // Show loading indicator immediately
    console.log('🏢 Found studioAnimeList element:', !!studioAnimeList);
    if (studioAnimeList) {
        studioAnimeList.innerHTML = `
            <div class="loading-message">
                <h3>Loading ${studioName} anime...</h3>
                <p>Fetching data from AniList...</p>
                <div class="loading-spinner">⏳</div>
                <p><small>This may take up to 30 seconds for studios with large catalogs.</small></p>
            </div>
        `;
        console.log('🏢 Set loading message');
    }
    studioView.classList.add("studio-view-active");
    
    // Hide header controls and show back button
    const yearSelect = document.querySelector(".year-select");
    const seasonTabs = document.querySelector(".season-tabs");
    const viewFullListBtn = document.getElementById("viewFullListBtn");
    const backToViewerBtn = document.getElementById("backToViewerBtn");
    const headerBar = document.querySelector(".header-bar");
    
    if (yearSelect) yearSelect.classList.add("hidden");
    if (seasonTabs) seasonTabs.classList.add("hidden");
    if (viewFullListBtn) viewFullListBtn.classList.add("hidden");
    if (backToViewerBtn) backToViewerBtn.classList.remove("hidden");
    if (headerBar) headerBar.classList.add("studio-mode");
    
    // Update studio name
    studioNameEl.textContent = studioName;
    console.log('🏢 Set studio name to:', studioName);
    
    // Save state and update browser history
    localStorage.setItem("currentStudio", studioName);
    localStorage.setItem("viewMode", "studio");
    
    // Save current anime index so we can return to it later - CRITICAL FIX
    console.log('🔥 SAVING INDEX - currentIndex at save time:', currentIndex);
    console.log('🔥 SAVING INDEX - currentSeason at save time:', currentSeason);
    
    // CRITICAL: Save the index IMMEDIATELY in a way that can't be overridden
    sessionStorage.setItem('studioNavigationIndex', String(currentIndex));
    sessionStorage.setItem('studioNavigationSeason', currentSeason);
    sessionStorage.setItem('studioNavigationTimestamp', String(Date.now()));
    console.log('🔥 Saved immediate studio navigation context - index:', currentIndex, 'season:', currentSeason, 'timestamp:', Date.now());
    
    saveAnimeIndexForReturn();
    console.log('🔥 INDEX SAVED - checking what was stored...');
    // Verify what was actually saved
    // Save studio state immediately when entering studio view (before any loading)
    // This ensures that if user refreshes during loading, we stay on this studio page
    sessionStorage.setItem('currentStudioState', studioName);
    sessionStorage.setItem('studioEntryTime', Date.now().toString());
    console.log('🔄 Saved studio state immediately:', studioName);

    const savedIndex = localStorage.getItem('returnToAnimeIndex');
    const savedContext = localStorage.getItem('returnToAnimeContext');
    console.log('🔥 Verification - saved to localStorage returnToAnimeIndex:', savedIndex);
    console.log('🔥 Verification - saved to localStorage returnToAnimeContext:', savedContext);
    
    history.pushState({ view: 'studio', studioName: studioName }, `${studioName} - Studio View`, `#studio/${encodeURIComponent(studioName)}`);
    
    // Skip refresh logic if this is called after a refresh or from initialization
    if (isAfterRefresh) {
        console.log('🔄 Skipping refresh logic - called after refresh or from initialization');
    } else {
        // Emergency brake: check for too many recent refreshes
        const refreshHistory = JSON.parse(sessionStorage.getItem('studioRefreshHistory') || '[]');
        const now = Date.now();
        const recentRefreshes = refreshHistory.filter(time => (now - time) < 10000); // Last 10 seconds
        
        if (recentRefreshes.length >= 3) {
            console.log('🚨 EMERGENCY BRAKE: Too many refreshes in 10 seconds, skipping refresh');
            sessionStorage.setItem('studioRefreshBlocked', now.toString());
            return;
        }
        
        // Check if this is being called after a refresh (no refresh needed)
        const isAfterRefreshStorage = sessionStorage.getItem('loadStudioAfterRefresh');
        const refreshTimestamp = sessionStorage.getItem('loadStudioRefreshTime');
        
        // ENHANCED protection against rapid refresh loops
        const refreshCooldown = 3000; // Increased to 3 seconds for better protection
        const lastRefreshTime = parseInt(refreshTimestamp) || 0;
        const timeSinceLastRefresh = now - lastRefreshTime;
        
        // Additional protection: check if we're already in a refresh cycle
        const refreshInProgress = sessionStorage.getItem('studioRefreshInProgress');
        const refreshBlocked = sessionStorage.getItem('studioRefreshBlocked');
        const timeSinceBlocked = refreshBlocked ? (now - parseInt(refreshBlocked)) : Infinity;
        
        console.log('🔄 Studio refresh check:', {
            studioName,
            isAfterRefreshStorage,
            timeSinceLastRefresh,
            refreshCooldown,
            refreshInProgress,
            refreshBlocked: !!refreshBlocked,
            timeSinceBlocked,
            recentRefreshCount: recentRefreshes.length,
            shouldRefresh: !isAfterRefreshStorage && !refreshInProgress && !refreshBlocked && timeSinceLastRefresh > refreshCooldown
        });
        
        // Clear emergency brake after 30 seconds
        if (refreshBlocked && timeSinceBlocked > 30000) {
            sessionStorage.removeItem('studioRefreshBlocked');
            console.log('🔄 Cleared emergency brake after 30 seconds');
        }
        
        // DISABLED: Page refresh causing "two clicks" issue
        // Commenting out the automatic refresh mechanism
        /*
        if (!isAfterRefreshStorage && !refreshInProgress && !refreshBlocked && timeSinceLastRefresh > refreshCooldown) {
            // Record this refresh attempt
            recentRefreshes.push(now);
            sessionStorage.setItem('studioRefreshHistory', JSON.stringify(recentRefreshes));
            
            // Mark refresh in progress to prevent multiple simultaneous refreshes
            sessionStorage.setItem('studioRefreshInProgress', 'true');
            sessionStorage.setItem('loadStudioAfterRefresh', studioName);
            sessionStorage.setItem('loadStudioRefreshTime', now.toString());
            console.log('🔄 Triggering page refresh for studio view scroll reset');
            (window.safeReload || function(){ try{ location.reload(); } catch(e) { try { document.location.reload(); } catch(e2){} } })();
            return; // Exit early since we're refreshing
        } else
        */
        if (isAfterRefreshStorage) {
            // Clear the refresh flags now that we've used them
            sessionStorage.removeItem('loadStudioAfterRefresh');
            sessionStorage.removeItem('loadStudioRefreshTime');
            sessionStorage.removeItem('studioRefreshInProgress');
            console.log('🔄 Cleared refresh flags for studio view');
        } else {
            // Too soon to refresh again, or refresh already in progress
            console.log('🔄 Skipping refresh - reason:', {
                tooSoon: timeSinceLastRefresh <= refreshCooldown,
                alreadyInProgress: refreshInProgress,
                emergencyBlocked: !!refreshBlocked,
                timeSinceLastRefresh: timeSinceLastRefresh + 'ms'
            });
        }
    }
    
    // Hide loading screen now that view is set up
    if (typeof hideLoadingScreen === 'function') hideLoadingScreen();
    
    // Check if we have cached data to show immediately
    if (typeof getStudioCache === 'function') {
        const cached = getStudioCache(studioName);
        if (cached) {
            console.log('Showing cached data for', studioName);
            console.log('🏢 Cached data length:', cached.length);
            console.log('🏢 displayStudioAnime function available for cache:', typeof displayStudioAnime === 'function');
            if (typeof displayStudioAnime === 'function') {
                console.log('🏢 Calling displayStudioAnime with cached data...');
                displayStudioAnime(cached, studioName);
                console.log('🏢 displayStudioAnime call completed for cached data');
            } else {
                console.error('🏢 displayStudioAnime function not available for cached data!');
            }
        }
    }
    
    // Fetch fresh data
    if (typeof fetchStudioAnime === 'function') {
        fetchStudioAnime(studioName).then(animeList => {
            console.log('🏢 Received anime list:', animeList?.length || 0, 'items');
            console.log('🏢 About to call displayStudioAnime with:', animeList);
            
            if (animeList && animeList.length > 0) {
                console.log('🏢 displayStudioAnime function available:', typeof displayStudioAnime === 'function');
                if (typeof displayStudioAnime === 'function') {
                    console.log('🏢 Calling displayStudioAnime...');
                    displayStudioAnime(animeList, studioName);
                    console.log('🏢 displayStudioAnime call completed');
                } else {
                    console.error('🏢 displayStudioAnime function not available!');
                    studioAnimeList.innerHTML = `
                        <div class="error-message">
                            <h3>Display Error</h3>
                            <p>Found ${animeList.length} anime but cannot display them (displayStudioAnime function missing)</p>
                            <button onclick="showAnimeViewer()" class="retry-btn">Back to Viewer</button>
                        </div>
                    `;
                }
            } else {
                console.log('🏢 No anime found, showing message');
                studioAnimeList.innerHTML = `
                    <div class="no-results">
                        <h3>No anime found for ${studioName}</h3>
                        <p>This could be due to:</p>
                        <ul>
                            <li>Studio name not found in AniList database</li>
                            <li>Network connection issues</li>
                            <li>API rate limiting</li>
                        </ul>
                        <button onclick="(window.safeReload?window.safeReload(): (function(){ try{ location.reload(); } catch(e){ try{ document.location.reload(); } catch(e2){} } })())" class="retry-btn">Retry</button>
                    </div>
                `;
            }
        }).catch(error => {
            console.error('🏢 Error fetching studio anime:', error);
            studioAnimeList.innerHTML = `
                <div class="error-message">
                    <h3>Error loading ${studioName}</h3>
                    <p>Error: ${error.message}</p>
                    <button onclick="(window.safeReload?window.safeReload(): (function(){ try{ location.reload(); } catch(e){ try{ document.location.reload(); } catch(e2){} } })())" class="retry-btn">Retry</button>
                </div>
            `;
        });
    } else {
        console.error('🏢 fetchStudioAnime function not available');
        studioAnimeList.innerHTML = `
            <div class="error-message">
                <h3>Error: Studio fetching not available</h3>
                <p>The fetchStudioAnime function is not defined.</p>
                <button onclick="showAnimeViewer()" class="retry-btn">Back to Viewer</button>
            </div>
        `;
    }
}

// Debug function to test navigation
function testNavigation() {
    const [seasonName, year] = currentSeason.split(' ');
    const raw = animeData[year]?.[seasonName] || [];
    const list = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
    
    console.log('🧪 Navigation Test:');
    console.log('🧪 Current season:', currentSeason);
    console.log('🧪 Current index:', currentIndex);
    console.log('🧪 List length:', list.length);
    console.log('🧪 Valid range: 0 to', list.length - 1);
    
    if (list.length > 0) {
        console.log('🧪 Current anime:', list[currentIndex]?.title || 'INVALID INDEX');
        console.log('🧪 First anime:', list[0]?.title);
        console.log('🧪 Last anime:', list[list.length - 1]?.title);
        
        // Test if we can navigate to first entry
        if (currentIndex === 0) {
            console.log('🧪 Already at first entry');
        } else {
            console.log('🧪 Can navigate to first entry by clicking prev', currentIndex, 'times');
        }
    } else {
        console.error('🧪 ERROR: No anime list found!');
    }
    
    return {
        season: currentSeason,
        index: currentIndex,
        listLength: list.length,
        currentTitle: list[currentIndex]?.title,
        canAccessFirst: list.length > 0
    };
}

// Function to test the currentIndex reset protection
function testIndexResetProtection() {
    console.log('🧪 Testing currentIndex reset protection...');
    
    const originalIndex = currentIndex;
    console.log('🧪 Original index:', originalIndex);
    
    // Test 1: Try to reset without protection (should succeed)
    console.log('🧪 Test 1: Reset without protection');
    currentIndex = 0;
    console.log('🧪 After reset to 0:', currentIndex);
    
    // Restore
    currentIndex = originalIndex;
    console.log('🧪 Restored to:', currentIndex);
    
    // Test 2: Set protection flags and try to reset (should be blocked)
    console.log('🧪 Test 2: Reset with studio protection');
    localStorage.setItem('viewMode', 'studio');
    sessionStorage.setItem('viewTransition', 'true');
    
    currentIndex = 0; // This should be blocked
    console.log('🧪 After protected reset attempt:', currentIndex);
    
    // Clear protection
    localStorage.setItem('viewMode', 'viewer');
    sessionStorage.removeItem('viewTransition');
    console.log('🧪 Protection cleared');
    
    return {
        originalIndex,
        finalIndex: currentIndex,
        protectionWorked: currentIndex === originalIndex
    };
}

// Function to force navigation to first entry (for debugging)
function goToFirstEntry() {
    console.log('🧪 Forcing navigation to first entry');
    const [seasonName, year] = currentSeason.split(' ');
    const raw = animeData[year]?.[seasonName] || [];
    const list = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
    
    if (list.length > 0) {
        console.log('🧪 Before: currentIndex =', currentIndex);
        
        // Set flag to allow navigation to index 0
        sessionStorage.setItem('allowNavigationToZero', 'true');
        console.log('🧪 Set flag to allow navigation to index 0');
        
        currentIndex = 0;
        console.log('🧪 After: currentIndex =', currentIndex);
        updateViewer();
        updateShowCounter();
        saveAnimeIndexForReturn();
        console.log('🧪 Successfully navigated to first entry:', list[0]?.title);
        return true;
    } else {
        console.error('🧪 ERROR: No anime list available');
        return false;
    }
}

// Function to force navigation to last entry (for debugging)
function goToLastEntry() {
    console.log('🧪 Forcing navigation to last entry');
    const [seasonName, year] = currentSeason.split(' ');
    const raw = animeData[year]?.[seasonName] || [];
    const list = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
    
    if (list.length > 0) {
        console.log('🧪 Before: currentIndex =', currentIndex);
        currentIndex = list.length - 1;
        console.log('🧪 After: currentIndex =', currentIndex);
        updateViewer();
        updateShowCounter();
        saveAnimeIndexForReturn();
        console.log('🧪 Successfully navigated to last entry:', list[currentIndex]?.title);
        return true;
    } else {
        console.error('🧪 ERROR: No anime list available');
        return false;
    }
}

// Wrapper functions for onclick handlers
function showStaff(staffName) {
    console.log('🎭 showStaff wrapper called for:', staffName);
    showStaffView(staffName);
}

function showStudio(studioName) {
    console.log('🏢 showStudio wrapper called for:', studioName);
    showStudioView(studioName);
}

function showStaffView(staffName, forceFresh = false, verifyAnimeTitle = null) {
    // Set offline/online visual mode
    if (window.massUpdater && window.massUpdater.isOfflineMode()) {
        document.body.classList.add("offline-view-mode");
        document.body.classList.remove("online-view-mode");
    } else {
        document.body.classList.add("online-view-mode");
        document.body.classList.remove("offline-view-mode");
    }
    console.log('🎬 showStaffView called with:', staffName, 'verify anime:', verifyAnimeTitle);
    
    // Store verification anime title for other functions to access
    if (verifyAnimeTitle) {
        sessionStorage.setItem('currentStaffVerifyAnime', verifyAnimeTitle);
    } else {
        sessionStorage.removeItem('currentStaffVerifyAnime');
    }
    
    // CRITICAL: Set protection flags to prevent index reset
    sessionStorage.setItem('viewTransition', 'true');
    localStorage.setItem('viewMode', 'staff');
    sessionStorage.setItem('studioNavigationIndex', String(currentIndex));
    console.log('🎬 Set protection flags - currentIndex:', currentIndex);
    
    // Save staff state immediately when entering staff view (before any loading)
    // This ensures that if user refreshes during loading, we stay on this staff page
    sessionStorage.setItem('currentStaffState', staffName);
    sessionStorage.setItem('staffEntryTime', Date.now().toString());
    console.log('🔄 Saved staff state immediately:', staffName);
    
    // Check if required elements exist
    const staffView = document.getElementById("staffView");
    const staffNameEl = document.getElementById("staffName");
    const staffAnimeList = document.getElementById("staffAnimeList");
    
    console.log('🎬 Element check:', {
        staffView: !!staffView,
        staffNameEl: !!staffNameEl,
        staffAnimeList: !!staffAnimeList
    });
    
    if (!staffView || !staffNameEl || !staffAnimeList) {
        console.error('🎬 Missing required elements for staff view');
        return;
    }
    
    // Reset scroll position to top
    if (typeof resetScrollToTop === 'function') resetScrollToTop();
    
} // <-- Close showStaffView function
    // Cancel any ongoing staff fetch
    if (typeof currentStaffRequest !== 'undefined' && currentStaffRequest) {
        console.log('🚫 Cancelling previous staff request for new search');
        currentStaffRequest.abort();
    }
    
    console.log('📺 Hiding/showing views...');
    // Hide other views and show staff view
    const animeList = document.getElementById("animeList");
    const animeViewer = document.getElementById("animeViewer");
    const studioView = document.getElementById("studioView");
    
    if (animeList) animeList.classList.add("hidden");
    if (animeViewer) animeViewer.classList.add("hidden");
    if (studioView) studioView.classList.add("hidden");
    staffView.classList.remove("hidden");
    
    // Hide full list modal if open
    if (typeof hideFullListModal === 'function') hideFullListModal();
    
    console.log('🎨 Adding CSS classes...');
    // Add CSS classes
    document.body.classList.add("staff-view-mode");
    staffView.classList.add("staff-view-active");
    
    // Hide header controls and show back button
    const yearSelect = document.querySelector(".year-select");
    const seasonTabs = document.querySelector(".season-tabs");
    const viewFullListBtn = document.getElementById("viewFullListBtn");
    const backToViewerBtn = document.getElementById("backToViewerBtn");
    const headerBar = document.querySelector(".header-bar");
    
    if (yearSelect) yearSelect.classList.add("hidden");
    if (seasonTabs) seasonTabs.classList.add("hidden");
    if (viewFullListBtn) viewFullListBtn.classList.add("hidden");
    if (backToViewerBtn) backToViewerBtn.classList.remove("hidden");
    if (headerBar) headerBar.classList.add("studio-mode");
    
    // Update staff name (show normalized version for display)
    staffNameEl.textContent = normalizeStaffNameForDisplay(staffName);
    
    // Save current anime index before switching views - with context
    saveAnimeIndexForReturn();
    
    // Save state and update browser history
    localStorage.setItem("currentStaff", staffName);
    localStorage.setItem("viewMode", "staff");
    history.pushState({ view: 'staff', staffName: staffName }, `${staffName} - Staff View`, `#staff/${encodeURIComponent(staffName)}`);
    
    // DISABLED: Page refresh causing "two clicks" issue for staff pages
    // Commenting out the automatic refresh mechanism
    /*
    // Check if this is being called after a refresh (no refresh needed)
    const isAfterRefresh = sessionStorage.getItem('loadStaffAfterRefresh');
    const refreshTimestamp = sessionStorage.getItem('loadStaffRefreshTime');
    const now = Date.now();
    
    // Prevent infinite loops: if we refreshed less than 5 seconds ago, don't refresh again
    if (!isAfterRefresh && (!refreshTimestamp || (now - parseInt(refreshTimestamp)) > 5000)) {
        // Force page refresh to ensure proper scroll reset
        sessionStorage.setItem('loadStaffAfterRefresh', staffName);
        sessionStorage.setItem('loadStaffRefreshTime', now.toString());
        console.log('🔄 Triggering page refresh for staff view scroll reset');
    (window.safeReload || function(){ try{ location.reload(); } catch(e) { try { document.location.reload(); } catch(e2){} } })();
        return; // Exit early since we're refreshing
    } else {
        // Clear the flag now that we've used it to prevent infinite loops
        sessionStorage.removeItem('loadStaffAfterRefresh');
        sessionStorage.removeItem('loadStaffRefreshTime');
        console.log('🔄 Cleared refresh flag for staff view');
    }
    */
    
    // Hide loading screen now that view is set up
    if (typeof hideLoadingScreen === 'function') hideLoadingScreen();
    
    // Show loading message initially
    staffAnimeList.innerHTML = `
        <div class="loading-message">
            <h3>🔍 Searching for ${staffName}...</h3>
            <p>Fetching roles from AniList database...</p>
        </div>
    `;
    
    // Load anime tab by default and create tabs with counts
    initializeStaffTabsWithCounts(staffName, forceFresh, verifyAnimeTitle);
}

// Function to initialize staff tabs with project counts
async function initializeStaffTabsWithCounts(staffName, forceFresh = false, verifyAnimeTitle = null) {
    console.log(`🎬 Initializing tabs with counts for ${staffName}`);
    
    const staffAnimeList = document.getElementById("staffAnimeList");
    const staffNameEl = document.getElementById("staffName");
    
    if (!staffAnimeList || !staffNameEl) return;
    
    // Show initial loading
    staffAnimeList.innerHTML = `
        <div class="loading-message">
            <h3>🔍 Searching for ${staffName}...</h3>
            <p>Fetching project counts from AniList database...</p>
        </div>
    `;
    
    try {
        // Always use offline data in offline mode for tab counts and roles
        let animeRoles = [], mangaRoles = [], allRoles = [];
        let isOffline = window.massUpdater && window.massUpdater.isOfflineMode && window.massUpdater.isOfflineMode();
        if (isOffline) {
            // Fetch all roles from offline data (ALL types)
            const all = await fetchStaffRoles(staffName, false, 'ALL', verifyAnimeTitle);
            allRoles = all || [];
            animeRoles = allRoles.filter(r => (r.mediaType === 'ANIME' || r.type === 'ANIME'));
            mangaRoles = allRoles.filter(r => (r.mediaType === 'MANGA' || r.type === 'MANGA'));
        } else {
            // Online: fetch separately
            [animeRoles, mangaRoles] = await Promise.all([
                fetchStaffRoles(staffName, forceFresh, 'ANIME', verifyAnimeTitle),
                fetchStaffRoles(staffName, forceFresh, 'MANGA', verifyAnimeTitle)
            ]);
            allRoles = [];
            if (animeRoles) allRoles.push(...animeRoles);
            if (mangaRoles) allRoles.push(...mangaRoles);
        }
        const animeCount = animeRoles ? animeRoles.length : 0;
        const mangaCount = mangaRoles ? mangaRoles.length : 0;
        const totalCount = allRoles.length;
        
        // Create tabs with counts
        const tabsHtml = `
            <div class="staff-tabs">
                <button class="staff-tab-btn active" data-type="ALL">All <span class="tab-count">(${totalCount})</span></button>
                <button class="staff-tab-btn" data-type="ANIME">Anime <span class="tab-count">(${animeCount})</span></button>
                <button class="staff-tab-btn" data-type="MANGA">Manga, LN & Other <span class="tab-count">(${mangaCount})</span></button>
            </div>
        `;

        // Remove existing tabs if any
        let existingTabs = document.querySelector('.staff-tabs');
        if (existingTabs) {
            existingTabs.remove();
        }

        // Insert tabs in the staff-header div after the staff name
        const staffHeader = document.querySelector('.staff-header');
        let tabsContainer;
        if (staffHeader) {
            staffHeader.insertAdjacentHTML('beforeend', tabsHtml);
            tabsContainer = staffHeader.querySelector('.staff-tabs');
        } else if (staffNameEl) {
            staffNameEl.insertAdjacentHTML('afterend', tabsHtml);
            tabsContainer = staffNameEl.parentElement.querySelector('.staff-tabs');
        } else {
            console.error('❌ Could not find staff-header or staffNameEl to insert staff tabs!');
        }

        // Add event delegation for tab switching
        if (tabsContainer) {
            tabsContainer.addEventListener('click', function(e) {
                const btn = e.target.closest('.staff-tab-btn');
                if (!btn) return;
                const type = btn.dataset.type;
                if (!type) return;
                // Remove active from all, add to clicked
                tabsContainer.querySelectorAll('.staff-tab-btn').forEach(tab => tab.classList.remove('active'));
                btn.classList.add('active');
                // Call switchStaffTab
                if (typeof switchStaffTab === 'function') {
                    switchStaffTab(type, staffName);
                } else {
                    console.error('❌ switchStaffTab function not found!');
                }
            });
        } else {
            console.error('❌ staff-tabs container not found after insertion!');
        }
        
        // Load all content by default (ALL tab)
        if (allRoles.length > 0) {
            allRoles.sort((a, b) => {
                if (a.year && b.year) return b.year - a.year;
                if (a.year && !b.year) return -1;
                if (!a.year && b.year) return 1;
                return (b.popularity || 0) - (a.popularity || 0);
            });
            displayStaffRoles(allRoles);
        } else {
            staffAnimeList.innerHTML = `
                <div class="no-results">
                    <h3>No projects found for ${staffName}</h3>
                    <p>This staff member may not be listed in the AniList database or their name might be spelled differently.</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error initializing staff tabs:', error);
        staffAnimeList.innerHTML = `<div class="no-results">❌ Error loading staff information. Please try again.</div>`;
    }
}

// Function to switch between staff tabs
function switchStaffTab(mediaType, staffName) {
    console.log(`🎬 Switching to ${mediaType} tab for ${staffName}`);
    
    // Update tab active states
    const tabs = document.querySelectorAll('.staff-tab-btn');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.type === mediaType) {
            tab.classList.add('active');
        }
    });
    
    // Always use offline data in offline mode for tab switching
    let isOffline = window.massUpdater && window.massUpdater.isOfflineMode && window.massUpdater.isOfflineMode();
    if (isOffline) {
        // Fetch all roles from offline data once, then filter by tab
        fetchStaffRoles(staffName, false, 'ALL').then(allRoles => {
            if (!allRoles) allRoles = [];
            let filtered = allRoles;
            if (mediaType === 'ANIME') filtered = allRoles.filter(r => (r.mediaType === 'ANIME' || r.type === 'ANIME'));
            else if (mediaType === 'MANGA') filtered = allRoles.filter(r => (r.mediaType === 'MANGA' || r.type === 'MANGA'));
            filtered.sort((a, b) => {
                if (a.year && b.year) return b.year - a.year;
                if (a.year && !b.year) return -1;
                if (!a.year && b.year) return 1;
                return (b.popularity || 0) - (a.popularity || 0);
            });
            displayStaffRoles(filtered);
        });
    } else {
        if (mediaType === 'ALL') {
            loadAllStaffMediaTypes(staffName);
        } else {
            loadStaffMediaType(staffName, mediaType, false);
        }
    }
}

// Function to load all media types combined
async function loadAllStaffMediaTypes(staffName) {
    console.log(`🎬 Loading all media types for ${staffName}`);
    
    // Get verification anime title from session storage
    const verifyAnimeTitle = sessionStorage.getItem('currentStaffVerifyAnime');

    const staffAnimeList = document.getElementById("staffAnimeList");
    const staffNameEl = document.getElementById("staffName");
    if (!staffAnimeList) return;
    
    // Show loading message
    staffAnimeList.innerHTML = `
        <div class="loading-message">
            <h3>🔍 Loading all projects for ${staffName}...</h3>
            <p>Combining anime and manga from AniList database...</p>
        </div>
    `;
    
    try {
        // Fetch both anime and manga roles
        const [animeRoles, mangaRoles] = await Promise.all([
            fetchStaffRoles(staffName, false, 'ANIME', verifyAnimeTitle),
            fetchStaffRoles(staffName, false, 'MANGA', verifyAnimeTitle)
        ]);
        
        // Combine and sort all roles
        const allRoles = [];
        if (animeRoles) allRoles.push(...animeRoles);
        if (mangaRoles) allRoles.push(...mangaRoles);
        
        if (allRoles.length > 0) {
            // Sort by year and popularity
            allRoles.sort((a, b) => {
                if (a.year && b.year) return b.year - a.year;
                if (a.year && !b.year) return -1;
                if (!a.year && b.year) return 1;
                return (b.popularity || 0) - (a.popularity || 0);
            });
            
            displayStaffRoles(allRoles);
        } else {
            staffAnimeList.innerHTML = `
                <div class="no-results">
                    <h3>No projects found for ${staffName}</h3>
                    <p>This staff member may not be listed in the AniList database.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading all media types:', error);
        staffAnimeList.innerHTML = `<div class="no-results">❌ Error loading projects. Please try again.</div>`;
    }
}

// Function to load staff content for specific media type
function loadStaffMediaType(staffName, mediaType, forceFresh = false) {
    console.log(`🎬 Loading ${mediaType} for ${staffName}`);
    
    // Get verification anime title from session storage
    const verifyAnimeTitle = sessionStorage.getItem('currentStaffVerifyAnime');
    
    const staffAnimeList = document.getElementById("staffAnimeList");
    if (!staffAnimeList) return;
    
    // Show loading message
    staffAnimeList.innerHTML = `
        <div class="loading-message">
            <h3>🔍 Searching for ${staffName} ${mediaType.toLowerCase()}...</h3>
            <p>Fetching roles from AniList database...</p>
        </div>
    `;
    
    // Check for cached staff roles first
    if (!forceFresh) {
        const cacheKey = `staff_${staffName.replace(/\s+/g, '_')}_${mediaType}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsedCache = JSON.parse(cached);
                const age = Date.now() - parsedCache.timestamp;
                if (age < 24 * 60 * 60 * 1000) { // 24 hours cache
                    console.log(`🎬 Using cached ${mediaType} roles for:`, staffName);
                    if (typeof displayStaffRoles === 'function') {
                        displayStaffRoles(parsedCache.data);
                    }
                    return;
                }
            } catch (e) {
                console.log('🎬 Cache parse error, fetching fresh');
            }
        }
    }
    
    // Fetch roles for specific media type
    if (typeof fetchStaffRoles === 'function') {
        fetchStaffRoles(staffName, forceFresh, mediaType, verifyAnimeTitle).then(rolesList => {
            // Double-check that this is still the current staff being viewed
            const currentDisplayedStaff = document.getElementById("staffName")?.textContent;
            if (currentDisplayedStaff !== staffName) {
                console.log(`🚫 Ignoring outdated fetch for ${staffName}, currently viewing ${currentDisplayedStaff}`);
                return;
            }
            
            if (rolesList && rolesList.length > 0) {
                if (typeof displayStaffRoles === 'function') {
                    displayStaffRoles(rolesList);
                }
            } else {
                staffAnimeList.innerHTML = `
                    <div class="no-results">
                        <h3>No ${mediaType.toLowerCase()} roles found for ${staffName}</h3>
                        <p>This could be because:</p>
                        <ul style="text-align: left; margin: 1rem 0;">
                            <li>This staff member has no ${mediaType.toLowerCase()} roles in the AniList database</li>
                            <li>Their name might be spelled differently on AniList</li>
                            <li>They may work primarily in other media types</li>
                        </ul>
                        <p><small>Note: Some industry professionals from ANN may not have complete AniList profiles.</small></p>
                    </div>
                `;
            }
        }).catch(error => {
            console.error(`Error loading ${mediaType} roles:`, error);
            if (error.name !== 'AbortError') {
                staffAnimeList.innerHTML = `<div class="no-results">❌ Error loading ${mediaType.toLowerCase()} information. Please try again.</div>`;
            }
        });
    } else {
        console.error('🎬 fetchStaffRoles function not available');
        staffAnimeList.innerHTML = `
            <div class="error-message">
                <h3>Error: Staff fetching not available</h3>
                <p>The fetchStaffRoles function is not defined.</p>
                <button onclick="showAnimeViewer()" class="retry-btn">Back to Viewer</button>
            </div>
        `;
    }
    
    // Check if we have cached data to show immediately
    if (typeof getStaffCache === 'function') {
        const cached = getStaffCache(staffName);
        if (cached) {
            console.log('Showing cached data for staff', staffName);
            if (typeof displayStaffRoles === 'function') {
                displayStaffRoles(cached);
            }
        }
    }
    
    // Fetch fresh data
    if (typeof fetchStaffRoles === 'function') {
        fetchStaffRoles(staffName, forceFresh, 'ANIME', verifyAnimeTitle).then(rolesList => {
            // Double-check that this is still the current staff being viewed
            const staffNameElLocal = document.getElementById("staffName");
            const currentDisplayedStaff = staffNameElLocal ? staffNameElLocal.textContent : null;
            if (currentDisplayedStaff !== staffName) {
                console.log(`🚫 Ignoring outdated response for ${staffName}, currently viewing ${currentDisplayedStaff}`);
                return;
            }

            if (rolesList && rolesList.length > 0) {
                if (typeof displayStaffRoles === 'function') {
                    displayStaffRoles(rolesList);

                    // Add a note if the data appears incomplete
                    if (rolesList.length <= 2) {
                        const staffAnimeList = document.getElementById('staffAnimeList');
                        if (staffAnimeList) {
                            const note = document.createElement('div');
                            note.className = 'incomplete-data-note';
                            note.style.cssText = 'margin-top: 20px; padding: 15px; background: #2a2a3e; border: 1px solid #444; border-radius: 8px; text-align: center; color: #ccc;';
                            note.innerHTML = `
                                <p style="margin: 0 0 10px 0; color: #ffa500;"><strong>⚠️ Limited Data Notice</strong></p>
                                <p style="margin: 0; font-size: 0.9rem;">Only ${rolesList.length} role(s) found for ${staffName}. This staff member may have more works that aren't fully linked in AniList's database.</p>
                                <p style="margin: 5px 0 0 0; font-size: 0.8rem; color: #888;">Some industry professionals have incomplete AniList profiles compared to their actual filmography.</p>
                            `;
                            staffAnimeList.appendChild(note);
                        }
                    }
                }
            } else {
                staffAnimeList.innerHTML = `
                    <div class="no-results">
                        <h3>No roles found for ${staffName}</h3>
                        <p>This could be because:</p>
                        <ul style="text-align: left; margin: 1rem 0;">
                            <li>This staff member is not listed in the AniList database</li>
                            <li>Their name might be spelled differently on AniList</li>
                            <li>They may work primarily in roles not tracked by AniList</li>
                        </ul>
                        <p><small>Note: Some industry professionals from ANN may not have complete AniList profiles.</small></p>
                    </div>
                `;
            }
        }).catch(error => {
            // Double-check that this is still the current staff being viewed
            const staffNameElLocal = document.getElementById("staffName");
            const currentDisplayedStaff = staffNameElLocal ? staffNameElLocal.textContent : null;
            if (currentDisplayedStaff !== staffName) {
                console.log(`🚫 Ignoring outdated error for ${staffName}, currently viewing ${currentDisplayedStaff}`);
                return;
            }

            console.error('Error loading staff roles:', error);
            if (error.name !== 'AbortError') {
                staffAnimeList.innerHTML = '<div class="no-results">❌ Error loading staff information. Please try again.</div>';
            }
        });
    } else {
        console.error('🎬 fetchStaffRoles function not available');
        staffAnimeList.innerHTML = `
            <div class="error-message">
                <h3>Error: Staff fetching not available</h3>
                <p>The fetchStaffRoles function is not defined.</p>
                <button onclick="showAnimeViewer()" class="retry-btn">Back to Viewer</button>
            </div>
        `;
    }
}

// =====================
// DISPLAY FUNCTIONS - Essential for showing content
// =====================

function displayStudioAnime(animeList, studioName) {
    console.log('🎬 displayStudioAnime called with', animeList?.length || 0, 'anime for studio:', studioName);
    
    const container = document.getElementById("studioAnimeList");
    if (!container) {
        console.error('🎬 studioAnimeList container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    if (!animeList || animeList.length === 0) {
        container.innerHTML = '<div class="no-results">No anime found for this studio.</div>';
        console.log('🎬 No anime to display');
        return;
    }
    
    // Additional deduplication at display level
    const uniqueAnime = animeList.reduce((acc, anime) => {
        // Check for duplicates by ID, title, or anilistId
        const isDuplicate = acc.find(existing => 
            existing.id === anime.id || 
            existing.anilistId === anime.anilistId ||
            (existing.title === anime.title && existing.year === anime.year)
        );
        
        if (!isDuplicate) {
            acc.push(anime);
        }
        return acc;
    }, []);
    
    console.log('🎬 After display-level deduplication:', uniqueAnime.length, 'unique anime');
    console.log('🎬 Displaying anime list for', studioName, ':', uniqueAnime.map(a => `${a.name || a.title} (${a.year})`));
    
    // Group by year
    const groupedByYear = uniqueAnime.reduce((acc, anime) => {
        const year = anime.year;
        if (!acc[year]) acc[year] = [];
        acc[year].push(anime);
        return acc;
    }, {});
    
    console.log('🎬 Grouped by year:', Object.keys(groupedByYear));
    
    // Sort years - TBA first, then newest first, then Unknown, then Cancelled at the very bottom
    const sortedYears = Object.keys(groupedByYear).sort((a, b) => {
        // Cancelled comes last
        if (a === 'Cancelled' && b !== 'Cancelled') return 1;
        if (a !== 'Cancelled' && b === 'Cancelled') return -1;
        
        // Unknown comes second to last (before Cancelled)
        if (a === 'Unknown' && b !== 'Unknown' && b !== 'Cancelled') return 1;
        if (a !== 'Unknown' && b === 'Unknown' && a !== 'Cancelled') return -1;
        
        // TBA comes first (but after Cancelled and Unknown checks)
        if (a === 'TBA' && b !== 'TBA' && b !== 'Cancelled' && b !== 'Unknown') return -1;
        if (a !== 'TBA' && b === 'TBA' && a !== 'Cancelled' && a !== 'Unknown') return 1;
        
        // Both are years, sort newest first
        if (a !== 'TBA' && b !== 'TBA' && a !== 'Cancelled' && b !== 'Cancelled' && a !== 'Unknown' && b !== 'Unknown') {
            return parseInt(b) - parseInt(a);
        }
        
        return 0;
    });
    
    console.log('🎬 Sorted years:', sortedYears);
    
    // Display all years at once
    sortedYears.forEach(year => {
        const yearSection = document.createElement('div');
        yearSection.className = 'year-section';
        
        const yearHeader = document.createElement('h3');
        yearHeader.className = 'year-header';
        yearHeader.textContent = year;
        yearSection.appendChild(yearHeader);
        
        const yearGrid = document.createElement('div');
        yearGrid.className = 'year-grid';
        
        groupedByYear[year].forEach(anime => {
            const animeCard = createStudioAnimeCard(anime, studioName);
            yearGrid.appendChild(animeCard);
        });
        
        yearSection.appendChild(yearGrid);
        container.appendChild(yearSection);
    });
    
    console.log('🎬 displayStudioAnime completed - added', uniqueAnime.length, 'anime cards grouped by year');
    
    // CRITICAL: Clear protection flags after studio view is fully loaded
    setTimeout(() => {
        sessionStorage.removeItem('viewTransition');
        sessionStorage.removeItem('studioNavigationIndex');
        console.log('🏢 Cleared studio navigation protection flags');
    }, 1000); // Small delay to ensure everything is loaded
    
    // Force scroll to top after content is displayed
    setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        console.log('🎬 Post-display scroll reset completed');
    }, 50);
}

function createStudioAnimeCard(anime, currentStudio) {
    const card = document.createElement('div');
    card.className = 'studio-anime-card';
    
 // Always use highest quality available
const imageUrl = (anime.coverImage && (anime.coverImage.extraLarge || anime.coverImage.large || anime.coverImage.medium)) || anime.picture || 'default-poster.jpg';
    
    // Check if the anime has been released (only show scores for released anime)
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    let isReleased = false;
    if (anime.year !== 'TBA') {
        const animeYear = parseInt(anime.year);
        if (animeYear < currentYear) {
            isReleased = true;
        } else if (animeYear === currentYear) {
            // For current year, check if it's likely finished based on season or status
            if (anime.season === 'WINTER' || anime.season === 'SPRING' || 
                (anime.season === 'SUMMER' && currentMonth >= 10) ||
                anime.status === 'FINISHED') {
                isReleased = true;
            }
        }
    }
    
    // Create score display for both scoring systems (only if released)
    let scoreDisplay = '';
    if (isReleased) {
        const scores = [];
        
        // Use the updated field names from the enhanced fetch
        if (anime.averageScore) {
            const avgScore = (anime.averageScore / 10).toFixed(1);
            scores.push(`<div class="score-row"><span>Avg:</span><span>${avgScore}</span></div>`);
        }
        
        if (anime.meanScore) {
            const meanScore = (anime.meanScore / 10).toFixed(1);
            scores.push(`<div class="score-row"><span>Mean:</span><span>${meanScore}</span></div>`);
        }
        
        // Add popularity indicator if available
        if (anime.popularity) {
            scores.push(`<div class="score-row popularity"><span>👥</span><span>${anime.popularity}</span></div>`);
        }
        
        if (scores.length > 0) {
            scoreDisplay = `<div class="anime-scores">⭐<div class="score-values">${scores.join('')}</div></div>`;
        }
    }
    
    // Check for co-production information - use correct title field
    console.log(`🎬 Checking co-production for "${anime.title}" in studio "${currentStudio}"`);
    const coProducers = typeof getCoProduction === 'function' ? getCoProduction(anime.title, currentStudio) : null;
    let coProductionDisplay = '';
    if (coProducers && coProducers.length > 0) {
        const coProducerText = coProducers.length === 1 ? 
            coProducers[0] : 
            coProducers.join(', ');
        coProductionDisplay = `<p class="co-production">Co-production with: <span class="co-studios">${coProducerText}</span></p>`;
        console.log(`✅ Adding co-production display for "${anime.title}": ${coProducerText}`);
    } else {
        console.log(`❌ No co-production display for "${anime.title}"`);
    }
    
    card.innerHTML = `
        <div class="anime-poster">
            <img src="${imageUrl}" alt="${anime.title}" onerror="this.src='default-poster.jpg'">
        </div>
        <div class="anime-info">
            <h4 class="anime-title">${anime.title}</h4>
            <div class="anime-meta">
                <p class="anime-type">${anime.type}</p>
                ${scoreDisplay}
            </div>
            <p class="anime-year">${anime.year}</p>
            ${coProductionDisplay}
        </div>
    `;
    
    return card;
}

function displayStaffRoles(rolesList) {
    console.log('🎬 displayStaffRoles called with', rolesList?.length || 0, 'roles');
    
    // Stop loading monitoring for staff since we're now displaying data
    const currentAnime = getCurrentAnime();
    if (currentAnime && currentAnime.staffLink) {
        const anilistIdMatch = currentAnime.staffLink.match(/\/anime\/(\d+)/);
        const anilistId = anilistIdMatch ? anilistIdMatch[1] : null;
        loadingStateMonitor.stopMonitoring('anilistInfo', anilistId, 'staff');
    }
    
    const container = document.getElementById("staffAnimeList");
    if (!container) {
        console.error('🎬 staffAnimeList container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    if (!rolesList || rolesList.length === 0) {
        container.innerHTML = '<div class="no-results">No roles found for this staff member.</div>';
        console.log('🎬 No roles to display');
        return;
    }

    // Group roles by anime ID
    const grouped = {};
    for (const role of rolesList) {
        if (!role.id) continue;
        if (!grouped[role.id]) {
            grouped[role.id] = {
                ...role,
                roles: [role.role]
            };
        } else {
            // Only add if not already present (deduplicate)
            if (!grouped[role.id].roles.includes(role.role)) {
                grouped[role.id].roles.push(role.role);
            }
        }
    }

    // Sort by year (desc), then by popularity (desc)
    const sorted = Object.values(grouped).sort((a, b) => {
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        if (yearA !== yearB) return yearB - yearA;
        const popA = a.popularity || 0;
        const popB = b.popularity || 0;
        return popB - popA;
    });

    // Group by year for display
    const rolesByYear = {};
    for (const entry of sorted) {
        const year = entry.year || 'Unknown';
        if (!rolesByYear[year]) rolesByYear[year] = [];
        rolesByYear[year].push(entry);
    }

    const years = Object.keys(rolesByYear).sort((a, b) => {
        if (a === 'Unknown') return 1;
        if (b === 'Unknown') return -1;
        return parseInt(b) - parseInt(a);
    });

    years.forEach(year => {
        const yearSection = document.createElement('div');
        yearSection.className = 'year-section';
        const yearHeader = document.createElement('h3');
        yearHeader.className = 'year-header';
        yearHeader.textContent = year;
        yearSection.appendChild(yearHeader);
        const yearGrid = document.createElement('div');
        yearGrid.className = 'year-anime-grid';
        for (const entry of rolesByYear[year]) {
            const roleCard = document.createElement('div');
            roleCard.className = 'role-card-staff';
            // Always use highest quality available, handle both object and string
            let imgSrc = '';
            if (entry.coverImage && typeof entry.coverImage === 'object') {
                imgSrc = entry.coverImage.extraLarge || entry.coverImage.large || entry.coverImage.medium || '';
            } else if (typeof entry.coverImage === 'string') {
                imgSrc = entry.coverImage;
            }
            let thumbnailHtml = '';
            if (imgSrc) {
                thumbnailHtml = `<div class="anime-thumbnail">
                    <img src="${imgSrc}" alt="${entry.title}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22><rect width=%22100%22 height=%22150%22 fill=%22%23ddd%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%23999%22>No Image</text></svg>'">
                </div>`;
            } else {
                thumbnailHtml = `<div class="anime-thumbnail no-image">
                    <div class="no-image-placeholder">📺</div>
                </div>`;
            }
            const scoreHtml = entry.averageScore ? `<div class="anime-score">⭐ ${entry.averageScore}%</div>` : '';
            const rolesHtml = `<p class="staff-role">${entry.roles.join(', ')}</p>`;
            roleCard.innerHTML = `
                ${thumbnailHtml}
                <div class="anime-info">
                    <h4 class="anime-title">${entry.title}</h4>
                    ${rolesHtml}
                    ${scoreHtml}
                    ${entry.popularity ? `<p class="anime-popularity">👥 ${entry.popularity.toLocaleString()}</p>` : ''}
                </div>
            `;
            yearGrid.appendChild(roleCard);
        }
        yearSection.appendChild(yearGrid);
        container.appendChild(yearSection);
    });
    console.log('🎬 displayStaffRoles completed - grouped by anime, combined roles per show.');
    
    // CRITICAL: Clear protection flags after staff view is fully loaded
    setTimeout(() => {
        sessionStorage.removeItem('viewTransition');
        sessionStorage.removeItem('studioNavigationIndex');
        if (window.staffLoadingState) {
            window.staffLoadingState.isLoading = false;
        }
        console.log('🎬 Cleared staff navigation protection flags and loading state');
    }, 1000); // Small delay to ensure everything is loaded
}

// =====================
// ESSENTIAL FUNCTIONS FOR ANIME CONTENT
// =====================

// Update the anime viewer with current anime data
async function updateViewer() {
    const caller = new Error().stack.split('\n')[1]?.trim(); // Get caller info
    // If we're offline and offline data hasn't finished loading yet, defer initial render
    try {
        const isOffline = window.massUpdater && window.massUpdater.isOfflineMode && window.massUpdater.isOfflineMode();
        const hasAnimeMap = window.massUpdater && window.massUpdater.offlineData && window.massUpdater.offlineData.anime && Object.keys(window.massUpdater.offlineData.anime).length > 0;
        if (isOffline && !hasAnimeMap && !window.__offlineDataHydrated) {
            console.log('⏳ updateViewer(no-arg): deferring initial render until offlineDataReady');
            window.addEventListener('offlineDataReady', function once() { try { console.log('✅ offlineDataReady received - calling updateViewer()'); updateViewer(); } catch(e){} }, { once: true });
            return;
        }
    } catch (e) {}
    console.log('🔄 updateViewer called, currentIndex:', currentIndex, 'caller:', caller);
    
    if (viewerUpdateInProgress) {
        console.log('🔄 updateViewer already in progress, skipping');
        return;
    }
    
    viewerUpdateInProgress = true;
    
    try {
        const [seasonName, year] = currentSeason.split(' ');
        const raw = animeData[year]?.[seasonName] || [];
        const animeList = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
        
        if (!animeList || animeList.length === 0) {
            console.error('❌ No anime data for season (after filtering hidden entries):', currentSeason);
            viewerUpdateInProgress = false;
            return;
        }
        
        const anime = animeList[currentIndex];
        if (!anime) {
            console.error('❌ No anime at index (after filtering):', currentIndex);
            viewerUpdateInProgress = false;
            return;
        }
        
        console.log('🔄 Updating viewer for anime:', anime.title);
        
        // Check if this is the same anime as last time
        const currentAnimeId = `${anime.title}_${anime.annId || 'no-ann'}`;
        const isSameAnime = lastAnimeId === currentAnimeId;
        
        // Only update tracking and generate new ID if this is actually a different anime
        if (!isSameAnime) {
            lastAnimeId = currentAnimeId;
            const updateId = `anime_update_${++requestIdCounter}_${Date.now()}`;
            currentAnimeUpdateId = updateId;
            console.log(`🆔 New anime detected, update ID: ${updateId}`);
        } else {
            console.log('🔄 Same anime as last update, keeping existing update ID:', currentAnimeUpdateId);
        }
        
        // Check if we're returning from staff/studio view
        const returningFromView = sessionStorage.getItem('backButtonRestore') === 'true' || 
                                sessionStorage.getItem('viewTransition') === 'true';
        
        // Check for forced reload flags
        let forceStaffReload = sessionStorage.getItem('forceStaffReload') === 'true';
        let forceStudioReload = sessionStorage.getItem('forceStudioReload') === 'true';

        // If flags were set, clear immediately and log; these should bypass the "same anime" skip
        if (forceStaffReload) {
            try { sessionStorage.removeItem('forceStaffReload'); } catch (e) {}
            console.log('🔄 Force staff reload flag detected and cleared');
        }
        if (forceStudioReload) {
            try { sessionStorage.removeItem('forceStudioReload'); } catch (e) {}
            console.log('🔄 Force studio reload flag detected and cleared');
        }
        
    // Skip most processing if same anime and containers aren't stuck AND not returning from view
    // Note: forceStaffReload/forceStudioReload flags bypass this skip (they were cleared above)
    if (isSameAnime && !returningFromView && !forceStaffReload && !forceStudioReload) {
            const staffContainer = document.getElementById('anilistInfo');
            const studioContainer = document.getElementById('studioInfo');
            
            // Check if containers are actually stuck or broken
            const staffStuck = staffContainer && staffContainer.innerHTML.includes('Loading…') && 
                              (Date.now() - (window.staffLoadingStartTime || 0)) > 10000;
            const studioStuck = studioContainer && studioContainer.innerHTML.includes('Loading…') && 
                               (Date.now() - (window.studioLoadingStartTime || 0)) > 10000;
            
            if (!staffStuck && !studioStuck) {
                console.log('🔄 Same anime, containers OK, skipping update');
                viewerUpdateInProgress = false;
                return;
            } else {
                console.log('🔄 Same anime but containers stuck, continuing update');
            }
        } else if (returningFromView) {
            console.log('🔄 Returning from view, forcing full update regardless of same anime');
        }
        
        // Clear both staff and studio containers immediately to prevent old content from showing
        const staffContainer = document.getElementById('anilistInfo');
        const studioContainer = document.getElementById('studioInfo');
        
        // Clear any existing loading monitors for clean state
        loadingStateMonitor.clearAllMonitoring();
        
        // Extract AniList ID for monitoring
        const anilistIdMatch = anime.staffLink ? anime.staffLink.match(/\/anime\/(\d+)/) : null;
        const anilistId = anilistIdMatch ? anilistIdMatch[1] : anime.title; // Fallback to title if no ID
        
        if (staffContainer) {
            if (returningFromView && !forceStaffReload) {
                console.log('🔄 Returning from view - preserving staff container state');
                
                // Check if we have offline data that should be preserved
                const hasValidStaffContent = staffContainer.innerHTML.includes('staff-member') || 
                                           staffContainer.innerHTML.includes('staff-name') ||
                                           staffContainer.innerHTML.includes('🔌 Offline mode') ||
                                           (staffContainer.innerHTML.includes('<h3>Staff</h3>') && staffContainer.innerHTML.includes('<div class="staff-member">')) ||
                                           staffContainer.innerHTML.includes('—');
                
                // Only update to loading if container is truly empty or has no valid content
                if (!staffContainer.innerHTML || 
                    (staffContainer.innerHTML.includes('<h4>Staff</h4>') && !staffContainer.innerHTML.includes('Loading') && !hasValidStaffContent)) {
                    staffContainer.innerHTML = "<h4>Staff</h4><p>Loading…</p>";
                    window.staffLoadingStartTime = Date.now(); // Track loading start time
                    
                    // Only start monitoring if not in offline mode
                    if (!window.massUpdater || !window.massUpdater.isOfflineMode()) {
                        loadingStateMonitor.startMonitoring('anilistInfo', anilistId, 'staff');
                    } else {
                        console.log('📦 Offline mode - skipping staff loading monitor');
                    }
                } else {
                    console.log('🔄 Preserving existing staff content - no loading needed');
                }
            } else {
                console.log(forceStaffReload ? '🔄 Force reloading staff container' : '🔄 Normal staff container initialization');
                staffContainer.innerHTML = "<h4>Staff</h4><p>Loading…</p>";
                window.staffLoadingStartTime = Date.now(); // Track loading start time
                
                // Only start monitoring if not in offline mode
                if (!window.massUpdater || !window.massUpdater.isOfflineMode()) {
                    loadingStateMonitor.startMonitoring('anilistInfo', anilistId, 'staff');
                } else {
                    console.log('📦 Offline mode - skipping staff loading monitor');
                }
            }
        }
        if (studioContainer) {
            if (returningFromView && !forceStudioReload) {
                console.log('🔄 Returning from view - preserving studio container state');
                
                // Check if we have offline data that should be preserved
                const hasValidStudioContent = studioContainer.innerHTML.includes('studio-item') || 
                                            studioContainer.innerHTML.includes('studio-name') ||
                                            studioContainer.innerHTML.includes('🔌 Offline mode') ||
                                            (studioContainer.innerHTML.includes('<h3>Studios</h3>') && studioContainer.innerHTML.includes('<div class="studio-item">')) ||
                                            studioContainer.innerHTML.includes('View');
                
                // Only update to loading if container is truly empty or has no valid content
                if (!studioContainer.innerHTML || 
                    (studioContainer.innerHTML.includes('<h4>Studios</h4>') && !studioContainer.innerHTML.includes('Loading') && !hasValidStudioContent)) {
                    studioContainer.innerHTML = "<h4>Studios</h4><p>Loading…</p>";
                    window.studioLoadingStartTime = Date.now(); // Track loading start time
                    
                    // Only start monitoring if not in offline mode
                    if (!window.massUpdater || !window.massUpdater.isOfflineMode()) {
                        loadingStateMonitor.startMonitoring('studioInfo', anilistId, 'studio');
                    } else {
                        console.log('📦 Offline mode - skipping studio loading monitor');
                    }
                } else {
                    console.log('🔄 Preserving existing studio content - no loading needed');
                }
            } else {
                console.log(forceStudioReload ? '🔄 Force reloading studio container' : '🔄 Normal studio container initialization');
                studioContainer.innerHTML = "<h4>Studios</h4><p>Loading…</p>";
                window.studioLoadingStartTime = Date.now(); // Track loading start time
                
                // Only start monitoring if not in offline mode
                if (!window.massUpdater || !window.massUpdater.isOfflineMode()) {
                    loadingStateMonitor.startMonitoring('studioInfo', anilistId, 'studio');
                } else {
                    console.log('📦 Offline mode - skipping studio loading monitor');
                }
            }
        }
        
        // Update title (title only) and populate the independent subtitle container
        const titleEl = document.getElementById('viewerTitle');
        const subtitleEl = document.getElementById('viewerSubtitle');
        try {
            if (titleEl) titleEl.textContent = anime.title || anime.name || '';
        } catch (e) {}
        try {
            if (subtitleEl) {
                const raw = anime.subtitle || '';
                // Support three formats:
                // - string with literal newlines "line1\nline2"
                // - array of strings ["line1","line2"]
                // - plain single-line string
                let pieces = [];
                if (Array.isArray(raw)) {
                    pieces = raw.map(x => x == null ? '' : String(x));
                } else if (typeof raw === 'string') {
                    // split on CRLF or LF
                    pieces = raw.split(/\r?\n/);
                } else {
                    pieces = [String(raw)];
                }
                // Escape text to avoid injecting HTML; then join with <br> for visual rows
                const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                // Render each piece as its own block so short lines don't collapse into one.
                subtitleEl.innerHTML = pieces.map(esc).filter((s,i)=>!(s==='' && i===pieces.length-1)).map(s => `<span class="viewer-subtitle-line">${s}</span>`).join('');
            }
        } catch (e) {}
        try { if (typeof window.repositionViewerHeader === 'function') window.repositionViewerHeader(); } catch(e){}
        
        // Update trailer: support remote iframe trailers and local file playback
        const trailerEl = document.getElementById('viewerTrailer');
        const localVideoEl = document.getElementById('viewerLocal');
        const localFileInput = document.getElementById('viewerLocalFileInput');

        // Helper to show iframe and hide local video
        function showIframe(src) {
            try {
                if (localVideoEl) {
                    // stop playback and clear source
                    try { localVideoEl.pause(); } catch (e) {}
                    try { if (localVideoEl.src && localVideoEl._objectUrl) { URL.revokeObjectURL(localVideoEl._objectUrl); localVideoEl._objectUrl = null; } } catch(e){}
                    localVideoEl.classList.add('hidden');
                    localVideoEl.removeAttribute('controls');
                    localVideoEl.removeAttribute('src');
                }
                if (trailerEl) {
                    trailerEl.classList.remove('hidden');
                    trailerEl.src = src || '';
                }
            } catch (e) { console.warn('showIframe failed', e); }
        }

        // Helper to show local video and hide iframe
        function showLocalVideo(urlOrFile) {
            try {
                if (trailerEl) {
                    trailerEl.src = '';
                    trailerEl.classList.add('hidden');
                }
                if (!localVideoEl) return;
                // If passed a File, create object URL; if a string, use as-is (relative path)
                if (urlOrFile instanceof File) {
                    // revoke previous
                    try { if (localVideoEl._objectUrl) { URL.revokeObjectURL(localVideoEl._objectUrl); localVideoEl._objectUrl = null; } } catch(e){}
                    const obj = URL.createObjectURL(urlOrFile);
                    localVideoEl._objectUrl = obj;
                    localVideoEl.src = obj;
                } else if (typeof urlOrFile === 'string' && urlOrFile) {
                    // Use as a relative/absolute URL
                    try { if (localVideoEl._objectUrl) { URL.revokeObjectURL(localVideoEl._objectUrl); localVideoEl._objectUrl = null; } } catch(e){}
                    localVideoEl.src = urlOrFile;
                } else {
                    localVideoEl.src = '';
                }
                localVideoEl.classList.remove('hidden');
                localVideoEl.setAttribute('controls', '');
                // Do not autoplay local trailers. Previously the player attempted to
                // play immediately which caused unwanted autoplay in some browsers.
                // Keep the play call available behind a runtime flag in case the user
                // explicitly enables autoplay in the debug UI later.
                try {
                    const allowAuto = (window.__blk_allowLocalAutoplay === true);
                    if (allowAuto) { try { localVideoEl.play().catch(()=>{}); } catch(e){} }
                } catch (e) {}
            } catch (e) { console.warn('showLocalVideo failed', e); }
        }

    // Try persisted local trailer stored in IndexedDB for this anime first
        try {
            let triedPersisted = false;
            try {
                if (typeof window._blk_tryLoadPersistedLocalTrailer === 'function') {
                    triedPersisted = await window._blk_tryLoadPersistedLocalTrailer(anime);
                }
            } catch (e) { triedPersisted = false; }

            // Otherwise prefer anime.localTrailer or a user-selected temp file
            let usedLocal = false;
            if (!triedPersisted && anime && anime.localTrailer) {
                // Use provided local trailer path (relative or absolute)
                showLocalVideo(String(anime.localTrailer));
                usedLocal = true;
                try { console.info('Using localTrailer from data for', anime.title, "→ set 'localTrailer' to a relative path in data/anime.js to keep this change"); } catch(e){}
            } else if (!triedPersisted && localFileInput && localFileInput.files && localFileInput.files.length > 0) {
                // User attached a file at runtime
                showLocalVideo(localFileInput.files[0]);
                usedLocal = true;
                try { console.info('Playing local file chosen via file picker. This selection is temporary for this session. Use `attachLocalTrailerFile(file)` or set `localTrailer` in `data/anime.js` to persist a path.'); } catch(e){}
            }

            if (!triedPersisted && !usedLocal) {
                // Fall back to remote trailer iframe if present
                if (trailerEl && anime.trailer) {
                    showIframe(anime.trailer);
                } else if (trailerEl) {
                    // clear both if none
                    showIframe('');
                }
            }
        } catch (e) { console.warn('Trailer selection failed', e); }

        // Expose a small helper so advanced users can attach a local file programmatically
        try {
            window.attachLocalTrailerFile = function(file) {
                try {
                    const input = document.getElementById('viewerLocalFileInput');
                    if (!input) return false;
                    // Clear previous
                    try { input.value = null; } catch(e){}
                    // Note: programmatic file assignment is restricted; but callers can pass a File to showLocalVideo
                    if (file instanceof File) {
                        showLocalVideo(file);
                        return true;
                    }
                    return false;
                } catch (e) { return false; }
            };
        } catch (e) {}

        // Wire the hidden file input change listener (idempotent)
        try {
            if (localFileInput && !localFileInput._attachedChange) {
                localFileInput.addEventListener('change', function() {
                    try {
                        if (localFileInput.files && localFileInput.files.length > 0) {
                            const f = localFileInput.files[0];
                            showLocalVideo(f);
                            // persist in-memory only; do not store files in localStorage
                        }
                    } catch (e) { console.warn('localFileInput change handler failed', e); }
                });
                localFileInput._attachedChange = true;
            }
        } catch (e) {}

        // Small helper to trigger the hidden file picker so users can attach a local trailer
        try {
            window.openLocalTrailerPicker = function() {
                try {
                    const inp = document.getElementById('viewerLocalFileInput');
                    if (!inp) return false;
                    inp.value = null; // clear previous selection
                    inp.click();
                    return true;
                } catch (e) { return false; }
            };
        } catch (e) {}

        // --- IndexedDB helpers for persistent local trailers ---
        (function(){
            const DB_NAME = 'blk-trailers-local-trailers';
            const DB_VERSION = 1;
            const STORE_NAME = 'localTrailers';
            let dbPromise = null;

            function openDb() {
                if (dbPromise) return dbPromise;
                dbPromise = new Promise((resolve, reject) => {
                    try {
                        const req = indexedDB.open(DB_NAME, DB_VERSION);
                        req.onupgradeneeded = function(e) {
                            const db = e.target.result;
                            if (!db.objectStoreNames.contains(STORE_NAME)) {
                                db.createObjectStore(STORE_NAME, { keyPath: 'animeId' });
                            }
                        };
                        req.onsuccess = function(e) { resolve(e.target.result); };
                        req.onerror = function(e) { reject(e.target.error || new Error('IndexedDB open failed')); };
                    } catch (err) { reject(err); }
                });
                return dbPromise;
            }

            async function saveLocalTrailer(animeId, file) {
                if (!animeId || !file) throw new Error('Missing animeId or file');
                const db = await openDb();
                return new Promise((resolve, reject) => {
                    try {
                        const tx = db.transaction(STORE_NAME, 'readwrite');
                        const store = tx.objectStore(STORE_NAME);
                        const reader = new FileReader();
                        reader.onload = function(ev) {
                            const data = ev.target.result; // ArrayBuffer
                            const rec = { animeId: String(animeId), blob: data, name: file.name, type: file.type, ts: Date.now() };
                            const putReq = store.put(rec);
                            putReq.onsuccess = function() { resolve(true); };
                            putReq.onerror = function(e) { reject(e.target.error || new Error('put failed')); };
                        };
                        reader.onerror = function(e) { reject(e.target.error || new Error('read failed')); };
                        reader.readAsArrayBuffer(file);
                    } catch (err) { reject(err); }
                });
            }

            async function getLocalTrailer(animeId) {
                if (!animeId) return null;
                const db = await openDb();
                return new Promise((resolve, reject) => {
                    try {
                        const tx = db.transaction(STORE_NAME, 'readonly');
                        const store = tx.objectStore(STORE_NAME);
                        const req = store.get(String(animeId));
                        req.onsuccess = function(e) {
                            const val = e.target.result;
                            if (!val || !val.blob) return resolve(null);
                            // Reconstruct blob
                            try {
                                const ab = val.blob;
                                const blob = new Blob([ab], { type: val.type || 'video/mp4' });
                                resolve({ blob, name: val.name, type: val.type });
                            } catch (err) { resolve(null); }
                        };
                        req.onerror = function(e) { reject(e.target.error || new Error('get failed')); };
                    } catch (err) { reject(err); }
                });
            }

            async function deleteLocalTrailer(animeId) {
                if (!animeId) return false;
                const db = await openDb();
                return new Promise((resolve, reject) => {
                    try {
                        const tx = db.transaction(STORE_NAME, 'readwrite');
                        const store = tx.objectStore(STORE_NAME);
                        const req = store.delete(String(animeId));
                        req.onsuccess = function() { resolve(true); };
                        req.onerror = function(e) { reject(e.target.error || new Error('delete failed')); };
                    } catch (err) { reject(err); }
                });
            }

            async function listLocalTrailers() {
                const db = await openDb();
                return new Promise((resolve, reject)=>{
                    try {
                        const tx = db.transaction(STORE_NAME, 'readonly');
                        const store = tx.objectStore(STORE_NAME);
                        const req = store.getAll();
                        req.onsuccess = function(e) { resolve(e.target.result || []); };
                        req.onerror = function(e) { reject(e.target.error || new Error('getAll failed')); };
                    } catch (err) { reject(err); }
                });
            }

            // Expose APIs
            try { window._blk_localTrailerDB = { saveLocalTrailer, getLocalTrailer, deleteLocalTrailer, listLocalTrailers }; } catch(e){}

            // Attach/remove UI was intentionally removed from the visible UI. The
            // runtime APIs remain available via `window._blk_localTrailerDB` for
            // scripted or debug usage. This avoids dangling DOM references.

            // On updateViewer load, try to auto-load persisted trailer if present for current anime
            try {
                // Wrap a small helper to be called from update flow
                window._blk_tryLoadPersistedLocalTrailer = async function(anime) {
                    try {
                        if (!anime) return false;
                        const key = anime.annId || anime.id || anime.title || null;
                        if (!key) return false;
                        const rec = await getLocalTrailer(key);
                        if (!rec || !rec.blob) return false;
                        showLocalVideo(rec.blob);
                        console.info('Loaded persisted local trailer for', key);
                        return true;
                    } catch (e) { return false; }
                };
            } catch(e){}
        })();

        // Convenience helpers for devtools / scripted use
        try {
            window.saveLocalTrailerForCurrent = async function() {
                try {
                    if (!window._blk_localTrailerDB) throw new Error('DB not ready');
                    const [sy, syYear] = (typeof currentSeason === 'string' ? currentSeason.split(' ') : (window.currentSeason||'').split(' '));
                    const raw = animeData[syYear]?.[sy] || [];
                    const animeList = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
                    const anime = animeList[currentIndex];
                    if (!anime) throw new Error('No current anime');
                    const key = anime.annId || anime.id || anime.title || null;
                    if (!key) throw new Error('No key for current anime');
                    const picker = document.getElementById('viewerLocalFileInput');
                    if (!picker) throw new Error('File input not found');
                    picker.click();
                    return new Promise((resolve, reject) => {
                        const handler = async function(){
                            try {
                                if (picker.files && picker.files.length > 0) {
                                    const f = picker.files[0];
                                    await window._blk_localTrailerDB.saveLocalTrailer(key, f);
                                    resolve(true);
                                } else resolve(false);
                            } catch (e) { reject(e); }
                            picker.removeEventListener('change', handler);
                        };
                        picker.addEventListener('change', handler);
                    });
                } catch (e) { console.warn('saveLocalTrailerForCurrent failed', e); return false; }
            };

            window.removeLocalTrailerForCurrent = async function() {
                try {
                    if (!window._blk_localTrailerDB) throw new Error('DB not ready');
                    const [sy, syYear] = (typeof currentSeason === 'string' ? currentSeason.split(' ') : (window.currentSeason||'').split(' '));
                    const raw = animeData[syYear]?.[sy] || [];
                    const animeList = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
                    const anime = animeList[currentIndex];
                    if (!anime) throw new Error('No current anime');
                    const key = anime.annId || anime.id || anime.title || null;
                    if (!key) throw new Error('No key for current anime');
                    await window._blk_localTrailerDB.deleteLocalTrailer(key);
                    console.info('Removed persisted local trailer for', key);
                    try { updateViewer(); } catch(e){}
                    return true;
                } catch (e) { console.warn('removeLocalTrailerForCurrent failed', e); return false; }
            };

            window.listLocalTrailers = async function() {
                try {
                    if (!window._blk_localTrailerDB) throw new Error('DB not ready');
                    return await window._blk_localTrailerDB.listLocalTrailers();
                } catch (e) { console.warn('listLocalTrailers failed', e); return []; }
            };
        } catch(e) {}

        // Usage hint once
        try { console.info('Local trailer persistence ready: use Attach Local Trailer button or window.saveLocalTrailerForCurrent()/window.removeLocalTrailerForCurrent()'); } catch(e){}
        
        // Studio info will be handled by ANN integration below
        // (Commented out to prevent conflicts with ANN data loading)
        /*
        // Update studio info with integrated studio page functionality (support multiple studios)
        const studioEl = document.getElementById('studioInfo');
        if (studioEl) {
            console.log('🏢 Updating studio info for:', anime.title);
            
            // Show loading state initially
            studioEl.innerHTML = `<h3>Studio</h3><div class="loading-studio">Loading studio information...</div>`;
            
            // Fetch studios asynchronously
            (async () => {
                try {
                    const studios = await getAnimeStudios(anime);
                    console.log('🏢 Found studios:', studios.map(s => s.name));
                    
                    let studioContent = `<h3>Studio${studios.length > 1 ? 's' : ''}</h3>`;
                    
                    if (anime.staffLink && studios.length > 0) {
                        studios.forEach(studio => {
                            const normalizedName = normalizeStudioName(studio.name);
                            console.log('🏢 Adding studio button for:', normalizedName);
                            studioContent += `
                                <button onclick="showStudio('${studio.name}')" class="staff-link studio-btn">
                                    View ${normalizedName} Works
                                </button>
                            `;
                        });
                    } else {
                        console.log('🏢 No studios found for:', anime.title);
                        studioContent += `<p>Studio information not available</p>`;
                    }
                    
                    studioEl.innerHTML = studioContent;
                } catch (error) {
                    console.error('🏢 Error loading studio info:', error);
                    // Fallback to synchronous method
                    const fallbackStudios = getAnimeStudiosSync(anime);
                    let studioContent = `<h3>Studio${fallbackStudios.length > 1 ? 's' : ''}</h3>`;
                    
                    if (anime.staffLink && fallbackStudios.length > 0) {
                        fallbackStudios.forEach(studio => {
                            const normalizedName = normalizeStudioName(studio.name);
                            studioContent += `
                                <button onclick="showStudio('${studio.name}')" class="staff-link studio-btn">
                                    View ${normalizedName} Works
                                </button>
                            `;
                        });
                    } else {
                        studioContent += `<p>Studio information not available</p>`;
                    }
                    
                    studioEl.innerHTML = studioContent;
                }
            })();
        }
        */
        
        // Update AniList info with ANN data fetching (enhanced from backup script)
        const anilistEl = document.getElementById('anilistInfo');
        const studioInfoEl = document.getElementById('studioInfo');
        
        if (anilistEl && studioInfoEl) {
            // Check if we're returning from staff/studio view - preserve existing content if valid
            const returningFromView = sessionStorage.getItem('backButtonRestore') === 'true' || 
                                    sessionStorage.getItem('viewTransition') === 'true';
            
            if (returningFromView) {
                console.log('🔄 Returning from view - checking if containers have valid content');
                
                // Only reset to loading if containers are empty or have placeholder content
                // Check for offline data indicators to prevent re-loading when offline data is present
                const hasOfflineStaffData = anilistEl.innerHTML.includes('staff-member') || 
                                          anilistEl.innerHTML.includes('🔌 Offline mode') ||
                                          (anilistEl.innerHTML.includes('<h3>Staff</h3>') && anilistEl.innerHTML.includes('<div class="staff-member">')) ||
                                          anilistEl.innerHTML.includes('staff-name');
                const hasOfflineStudioData = studioInfoEl.innerHTML.includes('studio-item') || 
                                            studioInfoEl.innerHTML.includes('🔌 Offline mode') ||
                                            (studioInfoEl.innerHTML.includes('<h3>Studios</h3>') && studioInfoEl.innerHTML.includes('<div class="studio-item">')) ||
                                            studioInfoEl.innerHTML.includes('studio-name');
                
                const staffNeedsLoading = !anilistEl.innerHTML || 
                                        (anilistEl.innerHTML === '<h4>Staff</h4>' && !hasOfflineStaffData) ||
                                        (anilistEl.innerHTML === '<h4>Staff</h4><p>Loading…</p>') ||
                                        (anilistEl.innerHTML.includes('<h4>Staff</h4>') && !anilistEl.innerHTML.includes('—') && !anilistEl.innerHTML.includes('No staff') && !hasOfflineStaffData);
                
                const studioNeedsLoading = !studioInfoEl.innerHTML || 
                                         (studioInfoEl.innerHTML === '<h4>Studios</h4>' && !hasOfflineStudioData) ||
                                         (studioInfoEl.innerHTML === '<h4>Studios</h4><p>Loading…</p>') ||
                                         (studioInfoEl.innerHTML.includes('<h4>Studios</h4>') && !studioInfoEl.innerHTML.includes('View') && !studioInfoEl.innerHTML.includes('No studio') && !hasOfflineStudioData);
                
                // Stop monitoring if data is already loaded
                if (hasOfflineStaffData) {
                    console.log('🔄 Offline staff data detected, stopping monitoring');
                    loadingStateMonitor.stopMonitoring('anilistInfo', anime.annId || anilistId, 'staff');
                }
                if (hasOfflineStudioData) {
                    console.log('🔄 Offline studio data detected, stopping monitoring');
                    loadingStateMonitor.stopMonitoring('studioInfo', anime.annId || anilistId, 'studio');
                }
                
                if (staffNeedsLoading) {
                    console.log('🔄 Staff needs loading - current content:', anilistEl.innerHTML.substring(0, 100));
                    
                    // If in offline mode, try to load offline data immediately instead of showing loading
                    if (window.massUpdater && window.massUpdater.isOfflineMode() && anime.staffLink) {
                        const anilistIdMatch = anime.staffLink.match(/\/anime\/(\d+)/);
                        if (anilistIdMatch) {
                            const anilistId = anilistIdMatch[1];
                            const offlineAnimeEntry = loadOfflineAnime(anilistId);
                            const staffEdges = normalizeOfflineStaffEdges(offlineAnimeEntry, anilistId);
                            if (staffEdges && staffEdges.length) {
                                console.log('📦 Loading offline staff data immediately during return');
                                let staffHtml = '<h3>Staff</h3>';
                                for (const edge of staffEdges) {
                                    const staffName = readableName(edge.node?.name) || readableName(edge.node?.staffName) || readableName(edge.node) || `Staff ${edge.node?.id || ''}`;
                                    const role = edge.role || 'Unknown Role';
                                    staffHtml += `<div class="staff-member">
                                        <span class="staff-name" onclick="showStaffView('${(String(staffName)).replace(/'/g, "\\'")}')">${staffName}</span>
                                        <span class="staff-role">${role}</span>
                                    </div>`;
                                }
                                anilistEl.innerHTML = staffHtml;
                                console.log('✅ Loaded offline staff data immediately during return');
                            } else {
                                setTimeout(() => {
                                    if (anilistEl.innerHTML === '<h4>Staff</h4>' || (!anilistEl.innerHTML.includes('—') && !hasOfflineStaffData)) {
                                        anilistEl.innerHTML = "<h4>Staff</h4><p>Loading…</p>";
                                    }
                                }, 50);
                            }
                        } else {
                            setTimeout(() => {
                                if (anilistEl.innerHTML === '<h4>Staff</h4>' || (!anilistEl.innerHTML.includes('—') && !hasOfflineStaffData)) {
                                    anilistEl.innerHTML = "<h4>Staff</h4><p>Loading…</p>";
                                }
                            }, 50);
                        }
                    } else {
                        setTimeout(() => {
                            if (anilistEl.innerHTML === '<h4>Staff</h4>' || (!anilistEl.innerHTML.includes('—') && !hasOfflineStaffData)) {
                                anilistEl.innerHTML = "<h4>Staff</h4><p>Loading…</p>";
                            }
                        }, 50);
                    }
                } else {
                    console.log('✅ Staff loading skipped - content already present');
                }
                
                if (studioNeedsLoading) {
                    console.log('🔄 Studio needs loading - current content:', studioInfoEl.innerHTML.substring(0, 100));
                    
                    // If in offline mode, try to load offline data immediately instead of showing loading
                    if (window.massUpdater && window.massUpdater.isOfflineMode() && anime.staffLink) {
                        const anilistIdMatch = anime.staffLink.match(/\/anime\/(\d+)/);
                        if (anilistIdMatch) {
                            const anilistId = anilistIdMatch[1];
                            const offlineAnimeEntry = loadOfflineAnime(anilistId);
                            const studioEdges = normalizeOfflineStudioEdges(offlineAnimeEntry, anilistId);
                            if (studioEdges && studioEdges.length) {
                                console.log('📦 Loading offline studio data immediately during return');
                                console.log('DEBUG studioEdges (return):', JSON.parse(JSON.stringify(studioEdges)));
                                let studioHtml = '<h3>Studios</h3>';
                                for (const edge of studioEdges) {
                                    console.log('DEBUG studio edge node:', edge.node);
                                    const studioName = readableName(edge.node?.name) || readableName(edge.node) || `Studio ${edge.node?.id || ''}`;
                                    const isMain = edge.isMain ? ' (Main Studio)' : '';
                                    studioHtml += `<div class="studio-item">
                                        <span class="studio-name" onclick="showStudioView('${(String(studioName)).replace(/'/g, "\\'")}')">${studioName}${isMain}</span>
                                    </div>`;
                                }
                                studioInfoEl.innerHTML = studioHtml;
                                console.log('✅ Loaded offline studio data immediately during return');
                            } else {
                                setTimeout(() => {
                                    if (studioInfoEl.innerHTML === '<h4>Studios</h4>' || (!studioInfoEl.innerHTML.includes('View') && !hasOfflineStudioData)) {
                                        studioInfoEl.innerHTML = "<h4>Studios</h4><p>Loading…</p>";
                                    }
                                }, 50);
                            }
                        } else {
                            setTimeout(() => {
                                if (studioInfoEl.innerHTML === '<h4>Studios</h4>' || (!studioInfoEl.innerHTML.includes('View') && !hasOfflineStudioData)) {
                                    studioInfoEl.innerHTML = "<h4>Studios</h4><p>Loading…</p>";
                                }
                            }, 50);
                        }
                    } else {
                        setTimeout(() => {
                            if (studioInfoEl.innerHTML === '<h4>Studios</h4>' || (!studioInfoEl.innerHTML.includes('View') && !hasOfflineStudioData)) {
                                studioInfoEl.innerHTML = "<h4>Studios</h4><p>Loading…</p>";
                            }
                        }, 50);
                    }
                } else {
                    console.log('✅ Studio loading skipped - content already present');
                }
            } else {
                // Initialize both containers with loading state normally
                anilistEl.innerHTML = "<h4>Staff</h4><p>Loading…</p>";
                studioInfoEl.innerHTML = "<h4>Studios</h4><p>Loading…</p>";
                
                // If in offline mode, try to load offline data immediately
                if (window.massUpdater && window.massUpdater.isOfflineMode() && anime.staffLink) {
                    console.log('📦 Offline mode - attempting immediate offline data load');
                    const anilistIdMatch = anime.staffLink.match(/\/anime\/(\d+)/);
                    if (anilistIdMatch) {
                        const anilistId = anilistIdMatch[1];
                        const offlineAnimeEntry = loadOfflineAnime(anilistId);
                        if (offlineAnimeEntry) {
                            console.log('📦 Loading offline staff/studio data immediately');
                            // Staff
                            const staffEdges2 = normalizeOfflineStaffEdges(offlineAnimeEntry, anilistId);
                            if (staffEdges2 && staffEdges2.length) {
                                let staffHtml = '<h3>Staff</h3>';
                                for (const edge of staffEdges2) {
                                    const staffName = readableName(edge.node?.name) || readableName(edge.node?.staffName) || readableName(edge.node) || `Staff ${edge.node?.id || ''}`;
                                    const role = edge.role || 'Unknown Role';
                                    staffHtml += `<div class="staff-member">
                                        <span class="staff-name" onclick="showStaffView('${(String(staffName)).replace(/'/g, "\\'")}')">${staffName}</span>
                                        <span class="staff-role">${role}</span>
                                    </div>`;
                                }
                                anilistEl.innerHTML = staffHtml;
                                console.log('✅ Loaded offline staff data immediately');
                            }
                            // Studio
                            const studioEdges2 = normalizeOfflineStudioEdges(offlineAnimeEntry, anilistId);
                            if (studioEdges2 && studioEdges2.length) {
                                console.log('DEBUG studioEdges (init):', JSON.parse(JSON.stringify(studioEdges2)));
                                let studioHtml = '<h3>Studios</h3>';
                                for (const edge of studioEdges2) {
                                    console.log('DEBUG studio edge node (init):', edge.node);
                                    const studioName = readableName(edge.node?.name) || readableName(edge.node) || `Studio ${edge.node?.id || ''}`;
                                    const isMain = edge.isMain ? ' (Main Studio)' : '';
                                    studioHtml += `<div class="studio-item">
                                        <span class="studio-name" onclick="showStudioView('${(String(studioName)).replace(/'/g, "\\'")}')">${studioName}${isMain}</span>
                                    </div>`;
                                }
                                studioInfoEl.innerHTML = studioHtml;
                                console.log('✅ Loaded offline studio data immediately');
                            }
                        } else {
                            console.log('📦 No offline data available for anime:', anilistId);
                        }
                    }
                }
            }

            if (!anime.annId) {
                // Handle AniList-only shows (donghua, etc.)
                if (anime.staffLink) {
                    console.log('🔄 No ANN ID but has AniList staff link, fetching AniList data only');
                    
                    // Check if returning from view for AniList-only shows
                    const returningFromView = sessionStorage.getItem('backButtonRestore') === 'true' || 
                                            sessionStorage.getItem('viewTransition') === 'true';
                    
                    // For debugging: always fetch if returning from view, even for AniList-only shows
                    if (returningFromView) {
                        console.log('🔄 AniList-only show returning from view, forcing fresh fetch');
                    }
                    
                    (async () => {
                        const anilistUpdateId = currentAnimeUpdateId;
                        // Early return if offline mode and data already loaded
                        if (window.massUpdater && window.massUpdater.isOfflineMode()) {
                            const anilistIdMatch = anime.staffLink.match(/\/anime\/(\d+)/);
                            if (anilistIdMatch) {
                                const anilistId = anilistIdMatch[1];
                                const offlineAnimeEntry = loadOfflineAnime(anilistId);
                                // Check if containers already have data loaded
                                const staffContainer = document.getElementById('anilistInfo');
                                const studioContainer = document.getElementById('studioInfo');
                                const staffLoaded = staffContainer && (staffContainer.innerHTML.includes('staff-member') || staffContainer.innerHTML.includes('<h3>Staff</h3>'));
                                const studioLoaded = studioContainer && (studioContainer.innerHTML.includes('studio-item') || studioContainer.innerHTML.includes('<h3>Studios</h3>'));
                                if (offlineAnimeEntry && staffLoaded && studioLoaded) {
                                    console.log('📦 Offline data already loaded immediately, skipping async fetch');
                                    return;
                                }
                            }
                        }
                        // The rest of the AniList-only fetch logic should be implemented here as needed.
                    })(); // Properly close async IIFE for AniList-only shows
                }
            }
        }
        // End of updateViewer try block
    } catch (e) {
        console.error('Error in updateViewer:', e);
    } finally {
        viewerUpdateInProgress = false;
        try {
            const q = document.getElementById('quickLoadingOverlay'); if (q) q.remove();
            window.viewerUpdateInProgress = false;
        } catch (e) {}
    }
}

// Load anime data for a specific season
function loadSeason(season, isInitialLoad = false, backButtonRestore = false) {
    console.log('📅 loadSeason called:', season, 'initial:', isInitialLoad, 'backButton:', backButtonRestore);
    
    const [seasonName, year] = season.split(' ');
    const raw = animeData[year]?.[seasonName] || [];
    const animeList = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
    
    if (!raw || raw.length === 0) {
        console.error('❌ No data for season (raw):', season);
        return;
    }
    
    // Store the previous season to check if it changed
    const previousSeason = currentSeason;
    currentSeason = season;
    
    // Only reset index if not restoring from back button and actually changing seasons
    const seasonChanged = previousSeason !== season;
    if (!backButtonRestore && !sessionStorage.getItem('backButtonRestore') && seasonChanged) {
        console.log('📅 Season changed from', previousSeason, 'to', season, '- resetting currentIndex to 0');
        currentIndex = 0;
    } else if (!seasonChanged) {
        console.log('📅 Same season, preserving currentIndex:', currentIndex);
    } else {
        console.log('📅 Preserving currentIndex during back button restore:', currentIndex);
    }
    
    // Update the UI (viewer uses filtered list)
    updateViewer();
    updateShowCounter();
    
    console.log('📅 loadSeason completed for:', season, 'with (raw/visible)', raw.length, '/', animeList.length, 'anime');
}

// Update season tabs for a given year
function updateSeasonTabs(year, backButtonRestore = false) {
    console.log('📅 updateSeasonTabs called for year:', year, 'backButton:', backButtonRestore);
    
    const seasonTabsEl = document.querySelector('.season-tabs');
    if (!seasonTabsEl) {
        console.error('❌ Season tabs element not found');
        return;
    }
    
    seasonTabsEl.innerHTML = '';
    seasonTabsEl.setAttribute('data-year', year);
    
    const availableSeasons = animeData[year] ? Object.keys(animeData[year]) : [];
    console.log('📅 Available seasons for', year + ':', availableSeasons);
    
    availableSeasons.forEach(season => {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.textContent = season;
        tab.setAttribute('data-season', season);

        // Set active tab
        const currentSeasonName = currentSeason.split(' ')[0];
        if (season === currentSeasonName) {
            tab.classList.add('active');
        }

        // Add click handler
        tab.addEventListener('click', () => {
            console.log('📅 Season tab clicked:', season, 'for year:', year);
            document.querySelectorAll('.season-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const newSeason = `${season} ${year}`;
            console.log('📅 Loading new season:', newSeason);
            // Check if data exists for this season
            if (animeData[year]?.[season]) {
                console.log('📅 Found data for season:', newSeason, '- count:', animeData[year][season].length);
                loadSeason(newSeason, false, backButtonRestore);
            } else {
                console.error('❌ No data found for season:', season, 'year:', year);
                console.log('📅 Available data:', animeData[year]);
            }
        });
        seasonTabsEl.appendChild(tab);
    });
    
    // Restore view mode
    const savedMode = localStorage.getItem('viewMode') || 'viewer';
    const savedStudio = localStorage.getItem('currentStudio');
    const savedStaff = localStorage.getItem('currentStaff');

    // Restore season
    const savedSeason = localStorage.getItem('currentSeason');
    if (savedSeason && animeData) {
        const [seasonName, year] = savedSeason.split(' ');
        if (animeData[year]?.[seasonName]) {
            currentSeason = savedSeason;
            console.log('🔄 Restored season:', savedSeason);
        }
    }


// Ensure restoreState is available globally before initialization
function restoreState() {
    // Restore view mode
    const savedMode = localStorage.getItem('viewMode') || 'viewer';
    const savedStudio = localStorage.getItem('currentStudio');
    const savedStaff = localStorage.getItem('currentStaff');

    // Restore season
    const savedSeason = localStorage.getItem('currentSeason');
    if (savedSeason && typeof animeData !== 'undefined') {
        const [seasonName, year] = savedSeason.split(' ');
        if (animeData[year]?.[seasonName]) {
            currentSeason = savedSeason;
            console.log('🔄 Restored season:', savedSeason);
        }
    }

    // Restore index (but be careful not to override back button restoration)
    const savedIndex = localStorage.getItem('viewerIndex');
    const shouldRestoreIndex = savedIndex && !sessionStorage.getItem('backButtonRestore');

    // Check if this is a fresh page load (no session storage indicating active session)
    const isNewSession = !sessionStorage.getItem('sessionActive');
    if (isNewSession) {
        console.log('🔄 New session detected - starting from index 0');
        currentIndex = 0;
        sessionStorage.setItem('sessionActive', 'true');
    } else if (shouldRestoreIndex) {
        const parsedIndex = parseInt(savedIndex, 10);
        if (!isNaN(parsedIndex)) {
            currentIndex = parsedIndex;
            console.log('🔄 Restored index:', parsedIndex);
        }
    } else {
        console.log('🔄 No index to restore, staying at:', currentIndex);
    }

    console.log('🔄 State restored:', { savedMode, savedStudio, savedStaff, currentSeason, currentIndex });
    return { savedMode, savedStudio, savedStaff };
}

// Expose globally so init code can call it
window.restoreState = restoreState;


// Save current application state
function saveState() {
    localStorage.setItem('viewMode', 'viewer');
    localStorage.setItem('currentSeason', currentSeason);
    localStorage.setItem('viewerIndex', String(currentIndex));
    console.log('💾 State saved:', { currentSeason, currentIndex });
}

// Show/hide modal functions
function showFullListModal() {
    const modal = document.getElementById('fullListModal');
    const grid = document.getElementById('fullAnimeGrid');
    
    if (!modal || !grid) {
        console.error('❌ Modal elements not found');
        return;
    }
    
    // Get current season data
    if (!currentSeason) {
        console.warn('⚠️ showFullListModal: currentSeason is not set, attempting fallback');
        // Try window.currentSeason if available
        currentSeason = window.currentSeason || currentSeason;
    }

    if (!currentSeason) {
        console.error('❌ showFullListModal: No season available to populate modal');
        modal.classList.remove('hidden');
        grid.innerHTML = '<div class="no-results"><h3>No season data available.</h3></div>';
        return;
    }

    const [seasonName, year] = String(currentSeason).split(' ');
    const rawList = (typeof animeData !== 'undefined' && animeData[year] && animeData[year][seasonName]) ? animeData[year][seasonName] : [];
    // Only render entries visible in main viewer (exclude schedule-only entries marked mainHidden === 'T')
    const animeList = (rawList || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
    
    // Clear previous content
    grid.innerHTML = '';
    
    // Debug: Log all anime titles and indices for the modal
    console.log('[FullListModal] Populating modal with anime for', seasonName, year);
    animeList.forEach((anime, index) => {
        console.log(`[FullListModal] #${index}:`, anime.title);
        const item = document.createElement('div');
        item.className = 'anime-item';
        item.innerHTML = `<h3>${anime.title}</h3>`;
        // Add click handler to jump to specific anime
        item.addEventListener('click', () => {
            console.log(`[FullListModal] Clicked index ${index}:`, anime.title);
            // Immediate visual feedback: show quick loading overlay so user knows something happened
            try {
                if (!document.getElementById('quickLoadingOverlay')) {
                    const ov = document.createElement('div');
                    ov.id = 'quickLoadingOverlay';
                    ov.className = 'loading-overlay';
                    ov.innerHTML = `<div class="loading-content"><div class="loading-spinner"></div><h2>Loading...</h2><p>Preparing trailer...</p></div>`;
                    document.body.appendChild(ov);
                }
                // Do not set viewerUpdateInProgress here - updateViewer() will set it itself.
            } catch (e) { console.warn('Could not show quick loading overlay', e); }

            // We only rendered visible entries, so index maps directly to viewer index
            currentIndex = index;
            updateViewer();
            updateShowCounter();
            // Persist this selection immediately so restore flows won't overwrite it
            try {
                // Allow navigation to zero if we've set index 0 intentionally
                if (currentIndex === 0) sessionStorage.setItem('allowNavigationToZero', 'true');
                // Save to return context / multiple storages for resilience
                if (typeof saveAnimeIndexForReturn === 'function') saveAnimeIndexForReturn();
                // Also mirror to the simpler viewerIndex keys
                try { localStorage.setItem('viewerIndex', String(currentIndex)); sessionStorage.setItem('viewerIndex', String(currentIndex)); } catch (e) {}
            } catch (e) { console.warn('Failed to persist modal-selected index:', e); }
            hideFullListModal();
            // Clean up the quick overlay after a reasonable fallback timeout in case updateViewer doesn't remove it
            setTimeout(() => { try { const q = document.getElementById('quickLoadingOverlay'); if (q) q.remove(); viewerUpdateInProgress = false; window.viewerUpdateInProgress = false; } catch(e){} }, 3500);
        });
        // Highlight current anime (currentIndex refers to the visible list index)
        if (index === currentIndex) {
            item.style.background = '#4a4a4a';
            item.style.borderColor = '#888';
        }
        grid.appendChild(item);
    });
    
    modal.classList.remove('hidden');
}

function hideFullListModal() {
    const modal = document.getElementById('fullListModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Initialize data availability check
console.log('🚀 Script loaded, animeData:', typeof animeData !== 'undefined' ? 'loaded' : 'not loaded yet');

// Test data availability immediately
setTimeout(() => {
    console.log('🔍 Data check after timeout:', {
        animeDataExists: typeof animeData !== 'undefined',
        windowAnimeData: typeof window.animeData !== 'undefined',
        globalAnimeData: typeof globalThis.animeData !== 'undefined'
    });
    
    if (typeof animeData !== 'undefined') {
        console.log('📊 AnimeData structure:', Object.keys(animeData));
        console.log('📊 2025 data:', animeData[2025] ? Object.keys(animeData[2025]) : 'No 2025 data');
        if (animeData[2025] && animeData[2025]['Fall']) {
            console.log('📊 Fall 2025 anime count:', animeData[2025]['Fall'].length);
        }
    } else {
        console.error('❌ animeData is still not available after timeout!');
    }
}, 100);

// Add debugging for currentIndex changes
let _currentIndex = 0;

// Enhanced debugging to catch index resets
Object.defineProperty(window, 'currentIndex', {
    get() { return _currentIndex; },
    set(value) {
        const oldValue = _currentIndex;
        
        // AGGRESSIVE PROTECTION: Prevent inappropriate resets to 0
        if (oldValue !== 0 && value === 0) {
            console.error('🚨 CRITICAL: currentIndex being reset from', oldValue, 'to 0! Stack trace:');
            console.trace();
            
            // EXCEPTION: Allow legitimate navigation to first entry
            const isLegitimateNavigation = sessionStorage.getItem('allowNavigationToZero') === 'true';
            if (isLegitimateNavigation) {
                console.log('✅ ALLOWING legitimate navigation to index 0');
                sessionStorage.removeItem('allowNavigationToZero'); // Clean up flag
                _currentIndex = value;
                return;
            }
            
            // Check if this is during studio navigation setup
            const studioNavigationPending = sessionStorage.getItem('studioNavigationIndex') !== null;
            const currentViewMode = localStorage.getItem('viewMode');
            const isStudioView = currentViewMode === 'studio';
            const isStaffView = currentViewMode === 'staff';
            
            if (studioNavigationPending || isStudioView || isStaffView) {
                console.error('🚨 BLOCKING inappropriate reset during studio/staff navigation!');
                console.error('🚨 Context:', { studioNavigationPending, isStudioView, isStaffView, currentViewMode });
                return; // Block the reset
            }
            
            // Check if this is during back button restoration
            const backButtonRestore = sessionStorage.getItem('backButtonRestore') === 'true';
            if (backButtonRestore) {
                console.error('🚨 BLOCKING inappropriate reset during back button restore!');
                return; // Block the reset
            }
            
            // Check if we're in the middle of a view transition
            const viewTransitionFlag = sessionStorage.getItem('viewTransition');
            if (viewTransitionFlag) {
                console.error('🚨 BLOCKING inappropriate reset during view transition!');
                return; // Block the reset
            }
            
            console.error('🚨 Allowing reset (no protection context detected)');
        }
        
        console.log(`🔄 currentIndex changing from ${oldValue} to ${value} - Stack:`, new Error().stack.split('\n')[2].trim());
        _currentIndex = value;
    }
});

// Initialize the tracked currentIndex
currentIndex = 0;

// Helper functions for anime index management
function saveAnimeIndexForReturn() {
    const contextToSave = {
        index: currentIndex,
        season: currentSeason,
        timestamp: Date.now()
    };
    
    // Save in multiple formats for maximum persistence
    localStorage.setItem("returnToAnimeIndex", String(currentIndex));
    localStorage.setItem("returnToAnimeContext", JSON.stringify(contextToSave));
    
    // CRITICAL: Also save in sessionStorage for refresh survival
    sessionStorage.setItem("returnToAnimeIndex", String(currentIndex));
    sessionStorage.setItem("returnToAnimeContext", JSON.stringify(contextToSave));
    
    // AND save as regular viewer state for additional redundancy
    localStorage.setItem('viewerIndex', String(currentIndex));
    localStorage.setItem('viewerSeason', currentSeason);
    localStorage.setItem('animeIndex', String(currentIndex));
    localStorage.setItem('animeSeason', currentSeason);
    
    console.log('💾 Saved anime index for return (refresh-safe):', currentIndex, 'with context:', contextToSave);
    console.log('💾 Saved to localStorage AND sessionStorage for refresh survival');
    
    // ADDITIONAL: Force save to immediate studio navigation context for extra persistence
    sessionStorage.setItem('studioNavigationIndex', String(currentIndex));
    sessionStorage.setItem('studioNavigationSeason', currentSeason);
    sessionStorage.setItem('studioNavigationTimestamp', Date.now().toString());
    console.log('💾 ALSO saved to immediate studio navigation context for extra persistence');
}

function restoreAnimeIndexFromReturn() {
    console.log('🔄 Attempting to restore anime index from return context');
    
    // PRIORITY 1: Check for immediate studio navigation context (most reliable)
    const immediateIndex = sessionStorage.getItem('studioNavigationIndex');
    const immediateSeason = sessionStorage.getItem('studioNavigationSeason');
    const immediateTimestamp = sessionStorage.getItem('studioNavigationTimestamp');
    
    if (immediateIndex !== null && immediateSeason === currentSeason) {
        const parsedIndex = parseInt(immediateIndex, 10);
        const timestamp = parseInt(immediateTimestamp, 10);
        const age = Date.now() - timestamp;
        
        // Only use if timestamp is recent (within 30 seconds)
        if (!isNaN(parsedIndex) && age < 30000) {
            currentIndex = parsedIndex;
            console.log('🔄 ✅ Restored index from immediate studio navigation context:', currentIndex, 'age:', age + 'ms');
            // Clean up immediate context
            sessionStorage.removeItem('studioNavigationIndex');
            sessionStorage.removeItem('studioNavigationSeason');
            sessionStorage.removeItem('studioNavigationTimestamp');
            return true;
        } else if (age >= 30000) {
            console.log('🔄 ⚠️ Immediate studio navigation context too old (', age, 'ms), ignoring');
            // Clean up stale context
            sessionStorage.removeItem('studioNavigationIndex');
            sessionStorage.removeItem('studioNavigationSeason');
            sessionStorage.removeItem('studioNavigationTimestamp');
        }
    }
    
    // PRIORITY 2: Try context-aware restoration (check both localStorage and sessionStorage)
    let savedContextStr = localStorage.getItem('returnToAnimeContext') || sessionStorage.getItem('returnToAnimeContext');
    if (savedContextStr) {
        try {
            const savedContext = JSON.parse(savedContextStr);
            console.log('🔄 Found saved context:', savedContext);
            
            // Verify the context is for the current season
            if (savedContext.season === currentSeason) {
                currentIndex = savedContext.index;
                console.log('🔄 Restored index from context:', currentIndex);
                
                // Clean up from both storages
                localStorage.removeItem('returnToAnimeIndex');
                localStorage.removeItem('returnToAnimeContext');
                sessionStorage.removeItem('returnToAnimeIndex');
                sessionStorage.removeItem('returnToAnimeContext');
                return true;
            } else {
                console.log('🔄 Context season mismatch, trying simple index');
            }
        } catch (error) {
            console.log('🔄 Error parsing context, trying simple index');
        }
    }
    
    // PRIORITY 3: Fallback to simple index restoration (check both storages)
    let savedAnimeIndex = localStorage.getItem('returnToAnimeIndex') || sessionStorage.getItem('returnToAnimeIndex');
    if (savedAnimeIndex !== null) {
        const parsedIndex = parseInt(savedAnimeIndex, 10);
        if (!isNaN(parsedIndex)) {
            currentIndex = parsedIndex;
            console.log('🔄 Restored index from simple storage:', currentIndex);
            
            // Clean up from both storages
            localStorage.removeItem('returnToAnimeIndex');
            localStorage.removeItem('returnToAnimeContext');
            sessionStorage.removeItem('returnToAnimeIndex');
            sessionStorage.removeItem('returnToAnimeContext');
            return true;
        }
    }
    
    console.log('🔄 No valid index to restore');
    return false;
}

// Simplified scroll reset - consolidated function
const resetScrollToTop = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    debugLog('📜 Scroll reset to top');
};

// Test functions
window.testManualNavigation = function() {
    console.log('🧪 TESTING MANUAL NAVIGATION SEQUENCE');
    console.log('=====================================');
    
    console.log('🔍 Starting index:', currentIndex);
    
    // Manually navigate to index 5
    console.log('\n🎯 Manually setting index to 5...');
    currentIndex = 5;
    if (typeof updateViewer === 'function') {
        updateViewer();
    }
    
    setTimeout(() => {
        console.log('\n📊 After manual navigation:');
        console.log('   currentIndex:', currentIndex);
        console.log('   localStorage returnToAnimeIndex:', localStorage.getItem('returnToAnimeIndex'));
        console.log('   sessionStorage returnToAnimeIndex:', sessionStorage.getItem('returnToAnimeIndex'));
        
        console.log('\n🏢 Now go to a studio page and test back navigation manually');
        console.log('Expected: Should return to index 5');
    }, 500);
};

// Clear session storage function
window.clearSessionStorage = function() {
    sessionStorage.removeItem('loadStudioAfterRefresh');
    sessionStorage.removeItem('loadStaffAfterRefresh');
    sessionStorage.removeItem('loadStudioRefreshTime');
    sessionStorage.removeItem('loadStaffRefreshTime');
    sessionStorage.removeItem('preserveCurrentSeason');
    sessionStorage.removeItem('currentStudioState');
    sessionStorage.removeItem('currentStaffState');
    sessionStorage.removeItem('studioEntryTime');
    sessionStorage.removeItem('staffEntryTime');
    sessionStorage.removeItem('studioRefreshInProgress');
    sessionStorage.removeItem('studioRefreshBlocked');
    sessionStorage.removeItem('studioRefreshHistory');
    console.log('🧹 Cleared sessionStorage including new state flags and emergency brake');
};

// Check for pending staff/studio loads and hide list early
if (sessionStorage.getItem('loadStaffAfterRefresh') || sessionStorage.getItem('loadStudioAfterRefresh')) {
    // Add a style to hide the list immediately
    const style = document.createElement('style');
    style.textContent = '#animeList { display: none !important; }';
    document.head.appendChild(style);
    console.log('⚡ Hiding anime list early - pending staff/studio load detected');
}

// Global delegated fallback handlers for header buttons/select
// These run even if the main initialization returned early or failed to attach listeners.
try {
    document.addEventListener('click', function(e) {
        try {
            const btn = e.target.closest && e.target.closest('button, [id]');
            if (!btn) return;
            // View Full List
            if (btn.id === 'viewFullListBtn') {
                console.log('⚡ [DELEGATE] viewFullListBtn clicked');
                if (typeof showFullListModal === 'function') {
                    try { showFullListModal(); } catch (err) { console.error('Error in delegated showFullListModal:', err); }
                } else {
                    const modal = document.getElementById('fullListModal');
                    if (modal) modal.classList.remove('hidden');
                }
                e.stopPropagation();
                return;
            }

            // Prev / Next navigation
            // NOTE: delegate no longer handles prev/next to avoid duplicate handlers
            // Prev/next are handled by dedicated element listeners; keeping this
            // branch caused multiple handlers to run (delegate + fallback + main)
            // and produced multi-step jumps when switching seasons.

            if (btn.id === 'backToViewerBtn') {
                console.log('⚡ [DELEGATE] backToViewerBtn clicked');
                if (typeof showAnimeViewer === 'function') {
                    try { showAnimeViewer(); } catch (err) { console.error('Delegated backToViewer error:', err); }
                }
                e.stopPropagation();
                return;
            }
        } catch (inner) { console.error('Header delegate click handler failed:', inner); }
    }, true);

    // Year select delegated change handler
    document.addEventListener('change', function(e) {
        try {
            const target = e.target;
            if (!target) return;
            if (target.id === 'yearSelect') {
                console.log('⚡ [DELEGATE] yearSelect changed to', target.value);
                const year = target.value;
                if (typeof updateSeasonTabs === 'function') {
                    try { updateSeasonTabs(year); } catch (err) { console.error('Delegated updateSeasonTabs error:', err); }
                }
                // Ensure a season is loaded if possible
                try {
                    if (typeof animeData !== 'undefined' && animeData[year]) {
                        const seasons = Object.keys(animeData[year]);
                        if (seasons.length) {
                            const newSeason = `${seasons[0]} ${year}`;
                            console.log('⚡ [DELEGATE] Loading fallback season:', newSeason);
                            if (typeof loadSeason === 'function') loadSeason(newSeason);
                        }
                    }
                } catch (err) { console.error('Delegated yearSelect loadSeason fallback failed:', err); }
            }
        } catch (inner) { console.error('Header delegate change handler failed:', inner); }
    }, true);
} catch (e) { console.warn('Failed to install header delegates:', e); }

document.addEventListener("DOMContentLoaded", function () {
    console.log('🚀 DOM Content Loaded - Starting initialization...');
    debugLog('DOM Content Loaded');
    debugLog('AnimeData available:', !!window.animeData);
    debugLog('AnimeData keys:', window.animeData ? Object.keys(window.animeData) : 'none');
    
    // Show system status on startup
    setTimeout(() => {
        if (window.systemStatus) window.systemStatus();
    }, 1000);
    
    try {
        // Get UI elements
        const viewerEl = document.getElementById("animeViewer");
        const yearSelectEl = document.getElementById('yearSelect');
        const prevBtnEl = document.getElementById('prevAnime');
        const nextBtnEl = document.getElementById('nextAnime');

        console.log('🔍 Elements found during initialization:', {
            viewerEl: !!viewerEl,
            yearSelectEl: !!yearSelectEl,
            prevBtnEl: !!prevBtnEl,
            nextBtnEl: !!nextBtnEl
        });

        debugLog('Elements found:', {
            viewerEl: !!viewerEl
        });

        if (!viewerEl) {
            console.error('❌ Required viewer element not found!');
            return;
        }

        // Set up event handlers first, then load content
        // Set up year select handler
        if (yearSelectEl) {
            debugLog('Year select found, adding event handler');
            yearSelectEl.addEventListener('change', () => {
                try {
                    // Check if we should suppress this handler (during programmatic setting)
                    if (window.suppressYearChangeHandler) {
                        console.log('🔇 Year change handler suppressed (programmatic setting)');
                        return;
                    }

                    // CRITICAL: Check if we're in studio/staff navigation and should suppress
                    const viewTransition = sessionStorage.getItem('viewTransition');
                    const currentViewMode = localStorage.getItem('viewMode');
                    if (viewTransition || currentViewMode === 'studio' || currentViewMode === 'staff') {
                        console.log('🔇 Year change handler suppressed during view transition');
                        console.log('🔇 Context:', { viewTransition, currentViewMode });
                        return;
                    }

                    debugLog('Year changed to:', yearSelectEl.value);
                    const year = yearSelectEl.value;

                    // Defensive: ensure animeData has this year
                    if (typeof animeData === 'undefined' || !animeData[year]) {
                        console.warn('⚠️ Selected year has no data:', year, 'animeData keys:', animeData ? Object.keys(animeData) : 'NO_DATA');
                        // Try to pick any available year as fallback
                        const fallbackYear = animeData ? Object.keys(animeData)[0] : null;
                        if (fallbackYear) {
                            console.log('🔁 Falling back to available year:', fallbackYear);
                            yearSelectEl.value = fallbackYear;
                            updateSeasonTabs(fallbackYear);
                            const firstSeason = Object.keys(animeData[fallbackYear])[0];
                            currentSeason = `${firstSeason} ${fallbackYear}`;
                            loadSeason(currentSeason);
                        }
                        return;
                    }

                    updateSeasonTabs(year);
                    // Load the first available season for the selected year
                    const seasons = Object.keys(animeData[year] || {});
                    const firstSeason = seasons.length ? seasons[0] : null;
                    if (firstSeason) {
                        currentSeason = `${firstSeason} ${year}`;
                        console.log('Loading new season:', currentSeason);
                        loadSeason(currentSeason);
                    } else {
                        console.warn('⚠️ No seasons available for year:', year);
                    }
                } catch (e) {
                    console.error('Error in yearSelect change handler:', e);
                }
            });
        } else {
            console.error('❌ Year select element not found!');
        }

        // Season tab click handlers are now set up dynamically in updateSeasonTabs()
        // This ensures handlers work for both initial and dynamically created tabs

        // Set up prev/next buttons for viewer mode
        console.log('🔧 Setting up navigation buttons:', { prevBtnEl: !!prevBtnEl, nextBtnEl: !!nextBtnEl });
        
        if (prevBtnEl) {
            prevBtnEl.addEventListener('click', () => {
                console.log('🔄 PREV BUTTON CLICKED - Handler called!');
                
                // Cancel any active staff requests before navigation
                console.log(`🚫 Cancelling ${activeStaffRequests.size} active staff requests`);
                for (const [id, controller] of activeStaffRequests.entries()) {
                    controller.abort();
                    activeStaffRequests.delete(id);
                }
                
                const [seasonName, year] = currentSeason.split(' ');
                const raw = animeData[year]?.[seasonName] || [];
                const list = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
                if (list.length > 0) {
                    console.log('🔄 Before prev - currentIndex:', currentIndex, 'listLength:', list.length);
                    
                    // Enhanced debugging for first entry access
                    if (currentIndex === 1) {
                        console.log('🔄 SPECIAL: About to navigate to first entry (index 0)');
                    }
                    
                    // Ensure list is the visible filtered list
                    const [seasonName, year] = currentSeason.split(' ');
                    const raw = animeData[year]?.[seasonName] || [];
                    const listVisible = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
                    const newIndex = (currentIndex - 1 + listVisible.length) % listVisible.length;
                    console.log('🔄 Calculated new index:', newIndex);
                    
                    // Set flag if navigating to index 0 to allow it through protection
                    if (newIndex === 0) {
                        sessionStorage.setItem('allowNavigationToZero', 'true');
                        console.log('🔄 Set flag to allow navigation to index 0');
                    }
                    
                    currentIndex = newIndex;
                    // Ensure we force a fresh AniList/offline data reload for the new index
                    try {
                        lastAnimeId = null; // clear last seen id so updateViewer does not skip
                    } catch (e) {}
                    sessionStorage.setItem('forceStaffReload', 'true');
                    sessionStorage.setItem('forceStudioReload', 'true');
                    console.log('🔄 After prev - currentIndex:', currentIndex);
                    console.log('🔄 Current anime:', list[currentIndex]?.title || 'INVALID');
                    
                    // Clear return state flags to ensure proper loading
                    sessionStorage.removeItem('backButtonRestore');
                    sessionStorage.removeItem('viewTransition');
                    
                    updateViewer();
                    updateShowCounter();
                    // CRITICAL FIX: Save index after navigation
                    saveAnimeIndexForReturn();
                    console.log('🔄 Saved index after prev navigation:', currentIndex);
                    
                    // Check for stuck loading states and fix them - MORE AGGRESSIVE
                    if (!window.massUpdater || !window.massUpdater.isOfflineMode()) {
                        setTimeout(() => checkAndFixStuckLoading(), 1000);
                        setTimeout(() => checkAndFixStuckLoading(), 3000);
                        setTimeout(() => checkAndFixStuckLoading(), 6000);
                    } else {
                        console.log('📦 Offline mode - skipping stuck loading monitors');
                    }
                } else {
                    console.log('🔄 No list data available for prev navigation');
                }
            });
            // Flag that main handler is attached so fallback won't duplicate
            try { prevBtnEl._mainHandlerAttached = true; } catch (e) {}
        } else {
            console.error('❌ Previous button not found!');
        }

        if (nextBtnEl) {
            nextBtnEl.addEventListener('click', () => {
                console.log('🔄 NEXT BUTTON CLICKED - Handler called!');
                
                // Cancel any active staff requests before navigation
                console.log(`🚫 Cancelling ${activeStaffRequests.size} active staff requests`);
                for (const [id, controller] of activeStaffRequests.entries()) {
                    controller.abort();
                    activeStaffRequests.delete(id);
                }
                
                const [seasonName, year] = currentSeason.split(' ');
                const raw = animeData[year]?.[seasonName] || [];
                const list = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
                if (list.length > 0) {
                    console.log('🔄 Before next - currentIndex:', currentIndex, 'listLength:', list.length);
                    
                    // Enhanced debugging for wraparound to first entry
                    if (currentIndex === list.length - 1) {
                        console.log('🔄 SPECIAL: About to wrap around to first entry (index 0)');
                    }
                    
                    // Ensure list is the visible filtered list
                    const [seasonName, year] = currentSeason.split(' ');
                    const raw = animeData[year]?.[seasonName] || [];
                    const listVisible = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
                    const newIndex = (currentIndex + 1) % listVisible.length;
                    console.log('🔄 Calculated new index:', newIndex);
                    
                    // Set flag if navigating to index 0 to allow it through protection
                    if (newIndex === 0) {
                        sessionStorage.setItem('allowNavigationToZero', 'true');
                        console.log('🔄 Set flag to allow navigation to index 0');
                    }
                    
                    currentIndex = newIndex;
                    // Ensure we force a fresh AniList/offline data reload for the new index
                    try {
                        lastAnimeId = null; // clear last seen id so updateViewer does not skip
                    } catch (e) {}
                    sessionStorage.setItem('forceStaffReload', 'true');
                    sessionStorage.setItem('forceStudioReload', 'true');
                    console.log('🔄 After next - currentIndex:', currentIndex);
                    console.log('🔄 Current anime:', list[currentIndex]?.title || 'INVALID');
                    
                    // Clear return state flags to ensure proper loading
                    sessionStorage.removeItem('backButtonRestore');
                    sessionStorage.removeItem('viewTransition');
                    
                    updateViewer();
                    updateShowCounter();
                    // CRITICAL FIX: Save index after navigation
                    saveAnimeIndexForReturn();
                    console.log('🔄 Saved index after next navigation:', currentIndex);
                    
                    // Check for stuck loading states and fix them - MORE AGGRESSIVE
                    if (!window.massUpdater || !window.massUpdater.isOfflineMode()) {
                        setTimeout(() => checkAndFixStuckLoading(), 1000);
                        setTimeout(() => checkAndFixStuckLoading(), 3000);
                        setTimeout(() => checkAndFixStuckLoading(), 6000);
                    } else {
                        console.log('📦 Offline mode - skipping stuck loading monitors');
                    }
                } else {
                    console.log('🔄 No list data available for next navigation');
                }
            });
            // Flag that main handler is attached so fallback won't duplicate
            try { nextBtnEl._mainHandlerAttached = true; } catch (e) {}
        } else {
            console.error('❌ Next button not found!');
        }

        // Set up back to viewer button for studio and staff views
        document.getElementById('backToViewerBtn').addEventListener('click', () => {
            console.log('🔙 Back to Trailers button clicked');
            console.log('🔙 Current index before restoration:', currentIndex);
            
            // CRITICAL: Set back button restoration flag FIRST to prevent any interference
            sessionStorage.setItem('backButtonRestore', 'true');
            
            // Try to restore the saved index using the helper function
            const restored = restoreAnimeIndexFromReturn();
            
            if (restored) {
                console.log('🔙 Successfully restored index to:', currentIndex);
            } else {
                console.log('🔙 No valid saved index found, keeping current index:', currentIndex);
            }
            
            // Store the restored index in session storage for immediate use
            sessionStorage.setItem('backButtonIndex', String(currentIndex));
            
            // CRITICAL: Save to ALL storage locations BEFORE calling showAnimeViewer
            // This ensures no other function can override our restored index
            localStorage.setItem('animeIndex', String(currentIndex));
            localStorage.setItem('animeSeason', currentSeason);
            localStorage.setItem('viewerIndex', String(currentIndex));
            localStorage.setItem('viewerSeason', currentSeason);
            console.log('🔙 Pre-saved index to prevent override:', currentIndex);
            
            // CRITICAL: Temporarily disable the yearSelect change handler to prevent loadSeason conflicts
            window.suppressYearChangeHandler = true;
            
            // Now call showAnimeViewer which will use the updated currentIndex
            showAnimeViewer();
            
            // Clean up flags and re-enable handlers after the viewer is fully loaded
            setTimeout(() => {
                sessionStorage.removeItem('backButtonRestore');
                sessionStorage.removeItem('backButtonIndex');
                window.suppressYearChangeHandler = false;
                console.log('🔙 Back button restoration complete, flags cleared');
            }, 1500); // Longer delay to ensure all operations complete
        });

        // Handle browser back button for studio/staff views
        window.addEventListener('popstate', (event) => {
            console.log('🔙 Browser back button pressed, event state:', event.state);
            
            // Check if we're currently in studio or staff view
            const currentViewMode = localStorage.getItem('viewMode');
            const studioView = document.getElementById('studioView');
            const staffView = document.getElementById('staffView');
            const animeViewer = document.getElementById('animeViewer');
            
            if (currentViewMode === 'studio' || currentViewMode === 'staff' || 
                (!studioView.classList.contains('hidden')) || (!staffView.classList.contains('hidden'))) {
                
                console.log('🔙 Detected back navigation from studio/staff view');
                
                // Set back button restoration flag
                sessionStorage.setItem('backButtonRestore', 'true');
                
                // Try to restore the saved index
                const restored = restoreAnimeIndexFromReturn();
                
                if (restored) {
                    console.log('🔙 Successfully restored index to:', currentIndex);
                } else {
                    console.log('🔙 No valid saved index found, keeping current index:', currentIndex);
                }
                
                // Store the restored index in session storage for immediate use
                sessionStorage.setItem('backButtonIndex', String(currentIndex));
                
                // Save to ALL storage locations BEFORE calling showAnimeViewer
                localStorage.setItem('animeIndex', String(currentIndex));
                localStorage.setItem('animeSeason', currentSeason);
                localStorage.setItem('viewerIndex', String(currentIndex));
                localStorage.setItem('viewerSeason', currentSeason);
                console.log('🔙 Pre-saved index to prevent override:', currentIndex);
                
                // Temporarily disable the yearSelect change handler
                window.suppressYearChangeHandler = true;
                
                // Return to anime viewer
                showAnimeViewer();
                
                // Clean up flags and re-enable handlers after the viewer is fully loaded
                setTimeout(() => {
                    sessionStorage.removeItem('backButtonRestore');
                    sessionStorage.removeItem('backButtonIndex');
                    window.suppressYearChangeHandler = false;
                    console.log('🔙 Browser back button restoration complete, flags cleared');
                }, 1500);
            }
        });

        // Full list modal functionality
        const viewFullListBtn = document.getElementById('viewFullListBtn');
        const closeModalBtn = document.getElementById('closeModal');
        const fullListModal = document.getElementById('fullListModal');
        
        if (viewFullListBtn) {
            // Defensive: ensure showFullListModal exists
            if (typeof showFullListModal !== 'function') {
                console.warn('⚠️ showFullListModal is not defined yet - creating fallback');
                window.showFullListModal = showFullListModal = function() {
                    try {
                        const modal = document.getElementById('fullListModal');
                        if (modal) modal.classList.remove('hidden');
                        console.log('🔧 Fallback showFullListModal opened modal');
                    } catch (e) { console.error('Fallback showFullListModal failed:', e); }
                };
            }

            viewFullListBtn.addEventListener('click', () => {
                console.log('View Full List button clicked');
                try { showFullListModal(); } catch (e) { console.error('Error calling showFullListModal:', e); }
            });
        }
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                console.log('Close modal button clicked');
                hideFullListModal();
            });
        }
        
        if (fullListModal) {
            // Close modal when clicking outside
            fullListModal.addEventListener('click', (e) => {
                console.log('Modal clicked, target:', e.target.id);
                if (e.target.id === 'fullListModal') {
                    console.log('Clicked outside modal content, closing');
                    hideFullListModal();
                }
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('fullListModal');
                if (!modal.classList.contains('hidden')) {
                    hideFullListModal();
                }
            }
        });

        // Initialize the application
        console.log('Initializing application...');
        console.log('🔧 Function availability check:', {
            showAnimeViewer: typeof showAnimeViewer,
            updateViewer: typeof updateViewer,
            loadSeason: typeof loadSeason
        });
        
        // Always do basic initialization
        console.log('🔄 Normal initialization - checking saved state');
        
        const { savedMode, savedStudio, savedStaff } = restoreState();

// Listen for proxy save results and verify split files after atomic save
window.addEventListener('proxySaveResult', async (evt) => {
    try {
        const detail = evt.detail || {};
        const el = document.getElementById('proxy-verify');
        if (!el) return;
        if (detail.filename === 'atomic' && detail.ok) {
            el.textContent = 'Verifying proxy files...';
            try {
                const base = (localStorage.getItem('anilistProxy') || 'http://localhost:4000').replace(/\/$/, '');
                const paths = ['/offline-data-anime.json','/offline-data-staff.json','/offline-data-studio.json'];
                const results = await Promise.all(paths.map(p => fetch(base + p).then(r => ({ ok: r.ok, status: r.status })).catch(() => ({ ok: false }))));
                const allOk = results.every(r => r && r.ok);
                el.textContent = allOk ? 'Proxy verification: ✅ All files available' : `Proxy verification: ❌ Missing files (${results.map((r,i)=> r.ok ? '' : i).filter(i=>i!=='').length})`;
            } catch (e) {
                el.textContent = 'Proxy verification: ❌ Error';
            }
        } else if (detail.filename === 'atomic' && !detail.ok) {
            el.textContent = 'Proxy verification: ❌ Save failed';
        }
    } catch (e) {}
});
        console.log('🔄 Restored state:', { savedMode, savedStudio, savedStaff });
        
        // Always load season content first
        console.log('🔄 About to load season:', currentSeason);
        console.log('🔄 animeData available before loadSeason:', typeof animeData !== 'undefined');
        
        if (typeof animeData === 'undefined') {
            console.error('❌ CRITICAL: animeData is undefined at initialization!');
            console.log('Checking window.animeData:', typeof window.animeData);
            
            // Try to wait for data
            let attempts = 0;
            const waitForData = () => {
                attempts++;
                console.log(`🔄 Attempt ${attempts} to find animeData...`);
                
                if (typeof animeData !== 'undefined' || typeof window.animeData !== 'undefined') {
                    console.log('✅ Found animeData on attempt', attempts);
                    loadSeason(currentSeason, true);
                } else if (attempts < 10) {
                    setTimeout(waitForData, 100);
                } else {
                    console.error('❌ Failed to load animeData after 10 attempts');
                }
            };
            
            waitForData();
            return; // Exit early, we'll try again when data is available
        }
        
        loadSeason(currentSeason, true); // true = initial load
        
        // CRITICAL: Initialize season tabs after data is loaded
        const [seasonName, year] = currentSeason.split(' ');
        if (year && typeof updateSeasonTabs === 'function') {
            console.log('🎬 Initializing season tabs for year:', year);
            updateSeasonTabs(year, false);
        }
        
        // Ensure modal is hidden on page load
        const modal = document.getElementById('fullListModal');
        if (modal) {
            modal.classList.add('hidden');
            console.log('Ensured modal is hidden on page load');
        }
        
        // Initialize as viewer mode
        console.log('🚀 INITIALIZATION: About to call showAnimeViewer()');
        showAnimeViewer();
        console.log('🚀 INITIALIZATION: showAnimeViewer() completed');

        // Defensive cleanup: remove any leftover overlays or temporary styles that may block the main UI
        try {
            // Remove mass update overlay if left behind
            const leftoverOverlay = document.getElementById('mass-update-overlay');
            if (leftoverOverlay) {
                leftoverOverlay.remove();
                console.log('🧹 Removed leftover mass-update-overlay');
            }

            // Remove any temporary style node that was added to hide #animeList early
            document.querySelectorAll('style').forEach(s => {
                try {
                    if (s.textContent && s.textContent.includes('#animeList') && s.textContent.includes('display: none')) {
                        s.remove();
                        console.log('🧹 Removed temporary style hiding #animeList');
                    }
                } catch (e) {}
            });

            // Ensure animeViewer is visible and not covered
            const animeViewer = document.getElementById('animeViewer');
            if (animeViewer) {
                animeViewer.classList.remove('hidden');
                animeViewer.style.display = animeViewer.style.display || '';
                animeViewer.style.visibility = 'visible';
                // Put the viewer above most overlays that might have been left behind
                try {
                    animeViewer.style.position = animeViewer.style.position || 'relative';
                    animeViewer.style.zIndex = '100002';
                    animeViewer.style.pointerEvents = 'auto';
                } catch (e) {}
                console.log('🧹 Forced animeViewer visible (defensive)');
            }

            // Ensure mass-update container is visible/interactive if present
            const massDebug = document.getElementById('mass-update-container');
            if (massDebug) {
                massDebug.style.pointerEvents = massDebug.style.pointerEvents || 'auto';
                massDebug.style.opacity = massDebug.style.opacity || '1';
            }

            // EXTRA: remove any lingering loading overlays or very-high z-index elements
            try {
                // Remove generic loading overlays
                document.querySelectorAll('.loading-overlay').forEach(el => {
                    el.remove();
                    console.log('🧹 Removed lingering .loading-overlay');
                });

                // Hide any visible modal overlays that might block interaction (but keep hidden ones)
                document.querySelectorAll('.modal').forEach(m => {
                    if (!m.classList.contains('hidden')) {
                        m.classList.add('hidden');
                        console.log('🧹 Hid visible .modal element to restore viewer');
                    }
                });

                // Log and (conservatively) disable pointer events for elements with very high z-index
                document.querySelectorAll('body *').forEach(el => {
                    try {
                        const zi = window.getComputedStyle(el).zIndex;
                        if (zi && !isNaN(parseInt(zi)) && parseInt(zi) >= 10000) {
                            // Don't remove the animeViewer itself
                            if (el.id !== 'animeViewer' && !el.closest('#animeViewer')) {
                                el.style.pointerEvents = 'none';
                                // If it's opaque and fullscreen-like, hide it
                                const rect = el.getBoundingClientRect();
                                if (rect.width >= window.innerWidth - 10 && rect.height >= window.innerHeight - 10) {
                                    el.style.display = 'none';
                                }
                                console.log('🧹 Neutralized high z-index element:', el.id || el.className || el.tagName, 'zIndex=', zi);
                            }
                        }
                    } catch (e) {}
                });
            } catch (e) {
                console.warn('⚠️ Extra overlay cleanup failed:', e);
            }
        } catch (cleanupErr) {
            console.warn('⚠️ Post-init cleanup failed:', cleanupErr);
        }
        
        // Verify the viewer is actually visible after initialization
        setTimeout(() => {
            const animeViewer = document.getElementById("animeViewer");
            console.log('🔍 POST-INIT CHECK: animeViewer visible?', animeViewer ? !animeViewer.classList.contains('hidden') : 'not found');
        }, 100);
        
        // Initialize batch data fetching system
        console.log('🚀 Initializing batch data fetching system...');
        setTimeout(async () => {
            try {
                // Initialize batch fetcher if not already created
                if (!window.batchFetcher) {
                    window.batchFetcher = new BatchDataFetcher();
                }
                // Try to load existing cache first
                console.log('🧭 Attempting to load batch cache from storage...');
                const cacheLoaded = window.batchFetcher.loadCacheFromStorage();
                console.log('🧭 loadCacheFromStorage() returned:', cacheLoaded);
                
                if (!cacheLoaded) {
                    console.log('🔄 No valid cache found, starting batch fetch...');
                    // Only fetch in background if no cache exists
                    try {
                        console.log('🧭 Starting initializeBatchData() (background)');
                        const result = await window.batchFetcher.initializeBatchData();
                        console.log('✅ Background batch fetch completed:', result);
                    } catch (error) {
                        console.error('❌ Background batch fetch failed:', error);
                    }
                } else {
                    console.log('✅ Using existing batch cache');
                    console.log('📊 Current batch cache sizes:', { staff: window.batchFetcher.staffCache.size, studios: window.batchFetcher.studioCache.size });
                }
            } catch (error) {
                console.error('❌ Error initializing batch data fetching:', error);
            }
        }, 2000); // Wait 2 seconds after page load to start batch fetching
        
    } catch (error) {
        console.error('Error during initialization:', error);
    }
    // Signal that high-level initialization has completed (used by bootstrap fallbacks)
    try {
        window.appReady = true;
        console.log('✅ APPLICATION READY: window.appReady = true');
    } catch (e) {}
});

// Debug function to check current UI state
window.debugUIState = function() {
    console.log('🔍 UI State Debug:');
    
    const animeViewer = document.getElementById('animeViewer');
    const studioView = document.getElementById('studioView');
    const staffView = document.getElementById('staffView');
    const titleEl = document.getElementById('viewerTitle');
    const trailerEl = document.getElementById('viewerTrailer');
    const anilistEl = document.getElementById('anilistInfo');
    const studioEl = document.getElementById('studioInfo');
    
    console.log('🔍 Elements visibility:', {
        animeViewer: animeViewer ? !animeViewer.classList.contains('hidden') : 'not found',
        studioView: studioView ? !studioView.classList.contains('hidden') : 'not found',
        staffView: staffView ? !staffView.classList.contains('hidden') : 'not found'
    });
    
    console.log('🔍 Content elements:', {
        titleEl: titleEl ? titleEl.textContent : 'not found',
        trailerEl: trailerEl ? trailerEl.src : 'not found',
        anilistEl: anilistEl ? anilistEl.innerHTML.length + ' chars' : 'not found',
        studioEl: studioEl ? studioEl.innerHTML.length + ' chars' : 'not found'
    });
    
    console.log('🔍 Current state:', {
        currentSeason,
        currentIndex,
        animeDataAvailable: !!animeData
    });
    
    if (currentSeason) {
        const [seasonName, year] = currentSeason.split(' ');
        const raw = animeData[year]?.[seasonName] || [];
        const list = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
        console.log('🔍 Current anime list:', list.length, 'items');
        if (list[currentIndex]) {
            console.log('🔍 Current anime:', list[currentIndex]);
        }
    }
};

// Force show anime viewer for debugging
window.forceShowViewer = function() {
    console.log('🚀 Force showing anime viewer...');
    
    const animeViewer = document.getElementById("animeViewer");
    const studioView = document.getElementById("studioView");
    const staffView = document.getElementById("staffView");
    
    if (animeViewer) {
        animeViewer.classList.remove("hidden");
        console.log('✅ Removed hidden from animeViewer');
    }
    
    if (studioView) {
        studioView.classList.add("hidden");
        console.log('✅ Added hidden to studioView');
    }
    
    if (staffView) {
        staffView.classList.add("hidden");
        console.log('✅ Added hidden to staffView');
    }
    
    // Also update the content
    updateViewer();
    
    console.log('🚀 Force show complete');
};

// Debug function to test button functionality
window.testButtonFunctionality = function() {
    console.log('🧪 Testing button functionality...');
    
    const prevBtn = document.getElementById('prevAnime');
    const nextBtn = document.getElementById('nextAnime');
    const yearSelect = document.getElementById('yearSelect');
    
    console.log('🔍 Button elements:', {
        prevBtn: !!prevBtn,
        nextBtn: !!nextBtn,
        yearSelect: !!yearSelect
    });
    
    if (prevBtn) {
        console.log('📍 Previous button listeners:', getEventListeners ? getEventListeners(prevBtn) : 'DevTools required');
    }
    
    if (nextBtn) {
        console.log('📍 Next button listeners:', getEventListeners ? getEventListeners(nextBtn) : 'DevTools required');
    }
    
    // Test if currentIndex updates
    console.log('📊 Current state:', {
        currentIndex,
        currentSeason,
        animeDataAvailable: !!animeData
    });
    
    if (currentSeason) {
        const [seasonName, year] = currentSeason.split(' ');
        const raw = animeData[year]?.[seasonName] || [];
        const list = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
        console.log('📋 Current list length:', list.length);
        
        if (list.length > 0) {
            console.log('📝 Current anime:', list[currentIndex]?.title || 'Unknown');
        }
    }
};

// Force manual test navigation
window.forceNavigation = function(direction) {
    console.log('🚀 Force navigation:', direction);
    const [seasonName, year] = currentSeason.split(' ');
    const raw = animeData[year]?.[seasonName] || [];
    const list = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
    
    if (list.length > 0) {
        console.log('Before navigation - currentIndex:', currentIndex);
        
        if (direction === 'next') {
            // Use the filtered visible list for wraparound
            const [seasonName, year] = currentSeason.split(' ');
            const raw = animeData[year]?.[seasonName] || [];
            const listVisible = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
            currentIndex = (currentIndex + 1) % listVisible.length;
        } else if (direction === 'prev') {
            // Use the filtered visible list for wraparound
            const [seasonName, year] = currentSeason.split(' ');
            const raw = animeData[year]?.[seasonName] || [];
            const listVisible = (raw || []).filter(a => { try { return String(a.mainHidden || '').toUpperCase() !== 'T'; } catch (e) { return true; } });
            currentIndex = (currentIndex - 1 + listVisible.length) % listVisible.length;
        }
        
        console.log('After navigation - currentIndex:', currentIndex);
        updateViewer();
        updateShowCounter();
        saveAnimeIndexForReturn();
        console.log('Navigation complete');
    } else {
        console.log('No list data available');
    }
};

// =====================
// STUDIO AND STAFF FETCHING FUNCTIONS (LEGACY COPIES - RENAMED)
// =====================

// Legacy copy: Renamed to avoid duplicate declarations. The primary implementation appears later.
async function fetchStudioAnimeLegacy(studioName) {
    console.log(`🏢 Fetching anime for studio: ${studioName}`);
    
    // Try offline data first (if offline mode enabled)
    if (window.massUpdater && window.massUpdater.isOfflineMode()) {
        console.log(`📦 Offline mode enabled, searching for studio: ${studioName}`);
        const offlineKeys = Object.keys(window.massUpdater.offlineData);
        console.log(`📦 Available offlineData keys:`, offlineKeys.slice(0, 20), offlineKeys.length > 20 ? `(+${offlineKeys.length - 20} more)` : '');
        // Scan all anime_* entries and collect those with a matching studio
        const normalizeStudioName = (name) => {
            return name.toLowerCase()
                .replace(/(studio|animation|film|films|inc\.|inc|ltd\.|ltd|co\.|co)/g, '')
                .replace(/[^a-z0-9]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        };
        const normalizedStudio = normalizeStudioName(studioName);
        const animeList = [];
        let checkedCount = 0, matchCount = 0;
        for (const [key, value] of Object.entries(window.massUpdater.offlineData)) {
            if (key.startsWith('anime_') && value.data && value.data.studios && value.data.studios.edges) {
                for (const studioEdge of value.data.studios.edges) {
                    if (studioEdge.node) {
                        const entryNorm = normalizeStudioName(studioEdge.node.name);
                        checkedCount++;
                        // Debug log for every studio name checked
                        console.log(`[STUDIO_OFFLINE_SCAN] Comparing: raw='${studioEdge.node.name}', norm='${entryNorm}' vs search='${normalizedStudio}'`);
                        // Allow exact, substring, or reverse substring match
                        if (
                            entryNorm === normalizedStudio ||
                            entryNorm.includes(normalizedStudio) ||
                            normalizedStudio.includes(entryNorm)
                        ) {
                            matchCount++;
                            console.log(`[STUDIO_OFFLINE_SCAN] MATCH: '${studioEdge.node.name}' (norm: '${entryNorm}')`);
                            animeList.push({
                                id: value.data.id,
                                title: value.data.title.romaji || value.data.title.english || value.data.title.native,
                                coverImage: value.data.coverImage?.medium || value.data.coverImage?.large || '/placeholder.jpg',
                                isMainStudio: studioEdge.isMain || false,
                                format: value.data.format,
                                status: value.data.status,
                                year: value.data.seasonYear
                            });
                            break; // Only add once per anime
                        }
                    }
                }
            }
        }
        console.log(`[STUDIO_OFFLINE_SCAN] Checked ${checkedCount} studios, found ${matchCount} matches for '${studioName}' (normalized: '${normalizedStudio}')`);
        if (animeList.length === 0) {
            // User-friendly message for no results in offline mode
            const container = document.getElementById("studioAnimeList");
            if (container) {
                container.innerHTML = `<div class="no-results"><h3>No anime found for <b>${studioName}</b> in offline data.</h3><p>Try syncing data online or check your offline-data.json.</p></div>`;
            }
        }
        return animeList;
    }
    
    ensureAniListClient();
    
    try {
        // First try the enhanced search with fallbacks instead of simple variations
    console.log(`🏢 Using enhanced search with fallbacks for: ${studioName}`);
        
    let studio = await searchStudioWithFallbacksLegacy(studioName);
        
        if (!studio) {
            console.log(`❌ Studio not found with enhanced search: ${studioName}`);
            return [];
        }
        
    console.log(`✅ Found studio:`, studio);
    return await fetchStudioAnimeByIdLegacy(studio.id, studioName);
        
    } catch (error) {
        console.error(`🏢 Error fetching studio anime:`, error);
        return [];
    }
}

// Search for studio by name using AniList API (legacy)
async function searchStudioByNameLegacy(studioName) {
    console.log('🔍 Searching for studio by name:', studioName);
    ensureAniListClient();
    
    const query = `
        query ($search: String) {
            Studio(search: $search) {
                id
                name
                isAnimationStudio
            }
        }
    `;
    
    const variables = { search: studioName };
    
    try {
        const data = await window._anilistQuery(query, variables);
        if (data?.Studio) {
            console.log('✅ Studio found by search:', data.Studio);
            return data.Studio;
        }
        console.log('❌ No studio found for:', studioName);
        return null;
    } catch (error) {
        console.error('Error searching for studio:', error);
        window._aniFailState.fails++; if (window._aniFailState.fails >= window._aniFailState.threshold) window._tryAniListFailover();
        return null;
    }
}

// Enhanced studio search with multiple fallback strategies from backup script (legacy)
async function searchStudioWithFallbacksLegacy(studioName) {
    console.log('🔍 Enhanced search for studio with fallbacks:', studioName);
    
    // Try exact search first
    let result = await searchStudioByName(studioName);
    if (result) return result;
    
    // Try normalized name (remove common studio words and variations)
    const normalizeStudioName = (name) => {
        return name.toLowerCase()
            .replace(/studio/g, '')
            .replace(/animation/g, '')
            .replace(/inc\.|inc/g, '')
            .replace(/ltd\.|ltd/g, '')
            .replace(/co\.|co/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };
    
    const normalized = normalizeStudioName(studioName);
    if (normalized !== studioName.toLowerCase()) {
        console.log('🔄 Trying normalized name:', normalized);
        result = await searchStudioByName(normalized);
        if (result) return result;
    }
    
    // Try with "Studio" prefix/suffix variations
    const variants = [
        `${studioName} Studio`,
        `Studio ${studioName}`,
        studioName.replace('Studio ', ''),
        studioName.replace(' Studio', ''),
        studioName.replace(/\s+/g, ' ').trim()
    ];
    
    console.log('🔄 Trying studio name variants:', variants);
    
    for (const variant of variants) {
        if (variant !== studioName && variant !== normalized) {
            console.log('🔍 Trying variant:', variant);
            result = await searchStudioByName(variant);
            if (result) {
                console.log('✅ Found studio with variant:', variant);
                return result;
            }
            
            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    
    console.log('❌ All enhanced search strategies failed for:', studioName);
    return null;
}

// Fetch studio anime by ID with thumbnails (legacy copy)
async function fetchStudioAnimeByIdLegacy(studioId, studioName) {
    console.log(`� Fetching anime for studio ID: ${studioId} (${studioName})`);
    ensureAniListClient();
    
    const query = `
        query ($studioId: Int, $page: Int, $perPage: Int) {
            Studio(id: $studioId) {
                name
                media(sort: [START_DATE_DESC], page: $page, perPage: $perPage) {
                    nodes {
                        id
                        type
                        set(value) {
                            const oldValue = _currentIndex;
                            // Enhanced protection: block inappropriate resets
                            if (studioNavigationPending && !isStudioView && !isStaffView) {
                                // Only block if not in studio/staff view, but navigation is pending
                                if (currentViewMode === 'viewer') {
                                    // Allow in viewer mode (including full list modal)
                                    // No blocking, just log
                                    console.warn('🚨 CRITICAL: currentIndex being reset from', oldValue, 'to', value, 'in viewer mode (allowed). Stack trace:');
                                    console.trace();
                                } else {
                                    console.warn('🚨 CRITICAL: currentIndex being reset from', oldValue, 'to', value, '! Stack trace:');
                                    console.trace();
                                    console.warn('🚨 BLOCKING inappropriate reset during studio/staff navigation!');
                                    console.warn('🚨 Context:', {studioNavigationPending, isStudioView, isStaffView, currentViewMode});
                                    return;
                                }
                            }
                            _currentIndex = value;
                            if (DEBUG_MODE) {
                                console.log('🔄 currentIndex set to', value, '(was', oldValue, ')');
                            }
                        },
                    pageInfo {
                        hasNextPage
                        currentPage
                        total
                    }
                }
            }
        }
    `;
    
    try {
        const cacheKey = `studio_media_${studioId}`;
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
            try {
                const parsed = JSON.parse(cachedRaw);
                if (Date.now() - parsed.timestamp < 12*60*60*1000) { // 12h TTL
                    console.log('💾 Using cached studio media for', studioName, 'count:', parsed.data.length);
                    return parsed.data;
                }
            } catch {}
        }

        let allAnime = [];
        let currentPage = 1;
        let hasNextPage = true;
        while (hasNextPage && currentPage <= 5) {
            const variables = { studioId: parseInt(studioId), page: currentPage, perPage: 50 };
            console.log(`🔄 Fetching page ${currentPage} for ${studioName} via queued client...`);
            const data = await window._anilistQuery(query, variables);
            const studioData = data?.Studio;
            if (!studioData?.media?.nodes) {
                console.warn('⚠️ Missing media nodes for page', currentPage);
                window._aniFailState.fails++; if (window._aniFailState.fails >= window._aniFailState.threshold) window._tryAniListFailover();
                break;
            }
            const animeList = studioData.media.nodes;
            const processedAnime = animeList
                .filter(a => !a.isAdult && a.type === 'ANIME') // Filter for anime only and no adult content
                .map(anime => {
                // Determine year - map cancelled anime to 'Cancelled' for proper sorting
                let year = anime.startDate?.year || 'Unknown';
                if (anime.status === 'CANCELLED') {
                    year = 'Cancelled';
                }
                
                return {
                    id: anime.id,
                    title: anime.title.english || anime.title.romaji || 'Unknown Title',
                    year: year,
                    type: anime.format || anime.type || 'Unknown',
                    status: anime.status,
                    score: anime.averageScore,
                    averageScore: anime.averageScore,
                    meanScore: anime.meanScore,
                    popularity: anime.popularity,
                    image: anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium || null,
                    anilistId: anime.id
                };
            });
            allAnime = allAnime.concat(processedAnime);
            hasNextPage = studioData.media.pageInfo.hasNextPage;
            currentPage++;
            console.log(`✅ Page ${currentPage - 1}: ${processedAnime.length} anime (total so far ${allAnime.length})`);
        }
        console.log(`✅ Total anime fetched for ${studioName}: ${allAnime.length}`);
        setStudioCache(studioName, allAnime);
        try { localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: allAnime })); } catch {}
        return allAnime;
    } catch (error) {
        console.error('Error fetching studio anime by ID (queued):', error);
        return [];
    }
}

// Debug helper to clear studio media cache
window.clearStudioMediaCache = function(studioId=null){
    let count=0; for (const k in localStorage){ if (k.startsWith('studio_media_')) { if (!studioId || k===`studio_media_${studioId}`){ localStorage.removeItem(k); count++; } } }
    console.log('🧹 Cleared studio media cache entries:', count, studioId? '(filtered)':'');
};

// Basic staff anime fetching function (to be enhanced later)
async function fetchStaffAnime(staffName) {
    console.log(`🎬 Fetching anime for staff: ${staffName}`);
    
    try {
        // This would use AniList staff API in the full implementation
        // For now, return placeholder data
        return [
            {
                title: `Work by ${staffName} #1`,
                year: 2025,
                type: 'TV',
                image: 'https://via.placeholder.com/200x300/f23d3d/ffffff?text=Work+1',
                anilistId: 54321
            }
        ];
    } catch (error) {
        console.error(`🎬 Error fetching staff anime:`, error);
        return [];
    }
}

// Studio cache functions
const studioCache = new Map();

function getStudioCache(studioName) {
    return studioCache.get(studioName);
}

function setStudioCache(studioName, data) {
    studioCache.set(studioName, data);
}

// Global showStudio function for external calls
window.showStudio = function(studioName) {
    console.log('🏢 showStudio called for:', studioName);
    showStudioView(studioName);
};

// Global showStaff function for external calls  
window.showStaff = function(staffName) {
    console.log('🎬 showStaff called for:', staffName);
    showStaffView(staffName);
};

// Enhanced function to extract studio name from staff link using AniList API
async function extractStudioName(staffLink) {
    console.log('🏢 Extracting studio name from staff link:', staffLink);
    
    if (!staffLink) {
        console.log('🏢 No staff link provided');
        return 'Studio';
    }
    
    // Extract AniList anime ID from the staff link
    const linkMatch = staffLink.match(/\/anime\/(\d+)\//);
    if (!linkMatch) {
        console.log('🏢 Could not extract anime ID from staff link');
        return 'Studio';
    }
    
    const anilistId = linkMatch[1];
    console.log('🏢 Extracted AniList anime ID:', anilistId);
    
    try {
        // Check cache first
        const cacheKey = `anime_studios_${anilistId}`;
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
            try {
                const parsed = JSON.parse(cachedRaw);
                if (Date.now() - parsed.timestamp < 24*60*60*1000) { // 24h TTL
                    console.log('🏢 Using cached studio data:', parsed.data);
                    return parsed.data;
                }
            } catch (e) {
                console.log('🏢 Failed to parse cached studio data');
            }
        }
        
        // Fetch studio information from AniList
        const query = `
            query ($id: Int) {
                Media(id: $id) {
                    studios(isMain: true) {
                        edges {
                            isMain
                            node {
                                id
                                name
                            }
                        }
                    }
                }
            }
        `;
        
        const variables = { id: parseInt(anilistId) };
        console.log('🏢 Fetching studio data from AniList...');
        
        const data = await simpleAniListQuery(query, variables);
        
        if (data && data.Media && data.Media.studios && data.Media.studios.edges) {
            const studioEdges = data.Media.studios.edges;
            const mainStudios = studioEdges.filter(edge => edge.isMain);
            
            if (mainStudios.length > 0) {
                const studioNames = mainStudios.map(edge => edge.node.name);
                console.log('🏢 Found main studios:', studioNames);
                
                // Cache the result
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: studioNames.length === 1 ? studioNames[0] : studioNames
                    }));
                } catch (e) {
                    console.log('🏢 Failed to cache studio data');
                }
                
                return studioNames.length === 1 ? studioNames[0] : studioNames;
            } else {
                console.log('🏢 No main studios found, checking all studios');
                const allStudios = studioEdges.map(edge => edge.node.name);
                if (allStudios.length > 0) {
                    console.log('🏢 Found studios (not main):', allStudios);
                    const result = allStudios.length === 1 ? allStudios[0] : allStudios;
                    
                    // Cache the result
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify({
                            timestamp: Date.now(),
                            data: result
                        }));
                    } catch (e) {
                        console.log('🏢 Failed to cache studio data');
                    }
                    
                    return result;
                }
            }
        }
        
        console.log('🏢 No studio data found from AniList, using fallback patterns');
        
        // Fallback to hardcoded patterns only if AniList fails
        return extractStudioNameFallback(staffLink);
        
    } catch (error) {
        console.error('🏢 Error fetching studio from AniList:', error);
        console.log('🏢 Using fallback patterns due to error');
        return extractStudioNameFallback(staffLink);
    }
}

// Fallback function with hardcoded patterns (only used when AniList fails)
function extractStudioNameFallback(staffLink) {
    console.log('🏢 Using fallback pattern matching for:', staffLink);
    
    if (staffLink.includes('153800')) return 'Madhouse'; // One Punch Man
    if (staffLink.includes('177937')) return ['WIT Studio', 'CloverWorks']; // SPY×FAMILY (multiple studios)
    if (staffLink.includes('182896')) return 'Bones'; // My Hero Academia
    if (staffLink.includes('129195')) return 'Studio Signpost'; // Tomodachi no Imouto
    if (staffLink.includes('170577')) return 'MAPPA'; // Campfire Cooking
    if (staffLink.includes('181447')) return 'Sunrise'; // May I Ask for One Final Thing
    if (staffLink.includes('185731')) return 'MAPPA'; // Ranma1/2 Season 2
    
    // Default fallback - try to extract from the URL structure
    const match = staffLink.match(/\/anime\/\d+\/([^\/]+)/);
    if (match) {
        // Convert URL slug to studio name (this is a rough approximation)
        return match[1].split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ') + ' Studio';
    }
    
    return 'Studio';
}

// Function to extract all studios for an anime (now async)
async function getAnimeStudios(anime) {
    console.log('🏢 getAnimeStudios called for:', anime.title);
    console.log('🏢 Staff link:', anime.staffLink);
    
    const studioNames = await extractStudioName(anime.staffLink);
    console.log('🏢 Extracted studio names:', studioNames);
    
    // Handle both single studio and multiple studios
    let result;
    if (Array.isArray(studioNames)) {
        result = studioNames.map(name => ({ name, id: name.toLowerCase().replace(/\s+/g, '-') }));
    } else {
        result = [{ name: studioNames, id: studioNames.toLowerCase().replace(/\s+/g, '-') }];
    }
    
    console.log('🏢 Returning studios:', result.map(s => s.name));
    return result;
}

// Synchronous fallback version for backwards compatibility
function getAnimeStudiosSync(anime) {
    console.log('🏢 getAnimeStudiosSync (fallback) called for:', anime.title);
    const studioNames = extractStudioNameFallback(anime.staffLink);
    
    let result;
    if (Array.isArray(studioNames)) {
        result = studioNames.map(name => ({ name, id: name.toLowerCase().replace(/\s+/g, '-') }));
    } else {
        result = [{ name: studioNames, id: studioNames.toLowerCase().replace(/\s+/g, '-') }];
    }
    
    return result;
}

// Function to clear staff cache (useful for debugging)
window.clearStaffCache = function(animeTitle = null) {
    if (animeTitle) {
        const cacheKey = `anime_staff_${animeTitle.replace(/\s+/g, '_')}`;
        localStorage.removeItem(cacheKey);
        console.log('🧹 Cleared staff cache for:', animeTitle);
    } else {
        // Clear all staff cache
        const keys = Object.keys(localStorage);
        const staffKeys = keys.filter(key => key.startsWith('anime_staff_'));
        staffKeys.forEach(key => localStorage.removeItem(key));
        console.log('🧹 Cleared all staff cache:', staffKeys.length, 'entries');
    }
};

// Debug function to check current staff cache
window.checkStaffCache = function() {
    const keys = Object.keys(localStorage);
    const staffKeys = keys.filter(key => key.startsWith('anime_staff_'));
    console.log('📋 Current staff cache entries:', staffKeys.length);
    staffKeys.forEach(key => {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            const age = Math.round((Date.now() - data.timestamp) / 1000 / 60);
            console.log(`  ${key}: ${data.data?.length || 0} staff members, ${age} minutes old`);
        } catch (e) {
            console.log(`  ${key}: Invalid cache data`);
        }
    });

    // Schedule modal wiring: Populate from animeData (looks for releaseDate field) or fallback to LiveChart
    try {
        const scheduleBtn = document.getElementById('viewScheduleBtn');
        const scheduleModal = document.getElementById('fullScheduleModal');
        const scheduleBody = document.getElementById('scheduleModalBody');
        const closeSchedule = document.getElementById('closeScheduleModal');

        function openScheduleModal() {
            try {
                if (!scheduleModal || !scheduleBody) return;
                scheduleModal.classList.remove('hidden');
                // Populate
                populateScheduleModal(scheduleBody);
            } catch (e) { console.warn('Open schedule modal failed', e); }
        }

        function closeScheduleModal() {
            try { if (scheduleModal) scheduleModal.classList.add('hidden'); } catch (e) {}
        }

        if (scheduleBtn) scheduleBtn.addEventListener('click', openScheduleModal);
        if (closeSchedule) closeSchedule.addEventListener('click', closeScheduleModal);
        if (scheduleModal) scheduleModal.addEventListener('click', (e) => { if (e.target && e.target.id === 'fullScheduleModal') closeScheduleModal(); });

        function populateScheduleModal(container) {
            try {
                        container.innerHTML = '';
                        // Runtime normalizer: ensure each anime has a `scheduleinfo` field
                        try {
                            if (typeof animeData === 'object') {
                                Object.keys(animeData).forEach(y => {
                                    Object.keys(animeData[y] || {}).forEach(s => {
                                        (animeData[y][s] || []).forEach(a => {
                                            if (typeof a.scheduleinfo === 'undefined') a.scheduleinfo = a.scheduleInfo || a.schedule_note || a.meta || a.subtitle || '';
                                        });
                                    });
                                });
                            }
                        } catch (e) { /* ignore */ }

                const parseReleaseDate = (s) => {
                    if (!s) return null;
                    // Trim
                    s = String(s).trim();
                    // Prefer explicit DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY first (avoid US MM/DD ambiguity)
                    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ T](.*))?$/);
                    if (m) {
                        const day = parseInt(m[1], 10);
                        const month = parseInt(m[2], 10) - 1;
                        const year = parseInt(m[3], 10);
                        // Create local date at midnight
                        const d = new Date(year, month, day);
                        if (!isNaN(d.getTime())) return d;
                    }

                    // If string looks ISO-like (YYYY-MM-DD) or contains month names / time designator, allow Date.parse
                    const looksIsoLike = /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(s) || /[A-Za-z]/.test(s) || s.indexOf('T') !== -1;
                    if (looksIsoLike) {
                        const iso = Date.parse(s);
                        if (!isNaN(iso)) return new Date(iso);
                    }

                    // Last resort: try Date.parse of replaced separators
                    const alt = Date.parse(s.replace(/\//g, '-'));
                    if (!isNaN(alt)) return new Date(alt);
                    return null;
                };

                const groups = new Map(); // key: yyyy-mm-dd -> {date:Date, items:[]}
                for (const year of Object.keys(animeData || {})) {
                    for (const season of Object.keys(animeData[year] || {})) {
                        for (const anime of (animeData[year][season] || [])) {
                            const raw = anime.releaseDate || anime.release_date || anime.release || null;
                            const parsed = parseReleaseDate(raw);
                            if (parsed) {
                                // Normalize key
                                const key = parsed.toISOString().slice(0,10);
                                if (!groups.has(key)) groups.set(key, { date: parsed, items: [] });
                                // capture the original anime object and derive a per-anime schedule message
                                const scheduleMessage = anime.scheduleinfo || anime.scheduleInfo || anime.schedule_note || anime.meta || anime.subtitle || '';
                                groups.get(key).items.push({ title: anime.title || anime.name || 'Untitled', season, year, link: anime.staffLink || anime.link || '', scheduleMessage, _source: anime });
                            }
                        }
                    }
                }

                if (groups.size === 0) {
                    container.innerHTML = `
                        <div class="no-results">
                            <h3>No local release dates available</h3>
                            <p>Open the full schedule on LiveChart:</p>
                            <p><a href="https://www.livechart.me/schedule" target="_blank" rel="noopener">https://www.livechart.me/schedule</a></p>
                        </div>`;
                    return;
                }

                // Sort keys
                const keys = Array.from(groups.keys()).sort((a,b) => new Date(a) - new Date(b));

                const grid = document.createElement('div');
                grid.className = 'schedule-grid';

                keys.forEach(k => {
                    const g = groups.get(k);
                    const col = document.createElement('div');
                    col.className = 'schedule-column';
                    const header = document.createElement('div');
                    header.className = 'schedule-date-header';
                    header.textContent = g.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                    col.appendChild(header);

                    const list = document.createElement('div');
                    list.className = 'schedule-items';
                    g.items.forEach(it => {
                        const item = document.createElement('div');
                        item.className = 'schedule-item';
                        const title = document.createElement('div');
                        title.className = 'schedule-item-title';
                        if (it.link) {
                            const a = document.createElement('a');
                            a.href = it.link;
                            a.target = '_blank';
                            a.rel = 'noopener';
                            a.textContent = it.title;
                            title.appendChild(a);
                        } else {
                            title.textContent = it.title;
                        }
                        const meta = document.createElement('div');
                        meta.className = 'schedule-item-meta';
                        meta.textContent = (it.scheduleMessage && String(it.scheduleMessage).trim()) ? String(it.scheduleMessage) : (typeof scheduleinfo !== 'undefined' ? scheduleinfo : `${it.season} ${it.year}`);
                        item.appendChild(title);
                        item.appendChild(meta);
                        list.appendChild(item);
                    });
                    col.appendChild(list);
                    grid.appendChild(col);
                });

                container.appendChild(grid);
            } catch (e) {
                container.innerHTML = '<div class="no-results"><h3>Failed to build schedule</h3></div>';
            }
        }
    } catch (e) { console.warn('Schedule modal wiring failed', e); }
};

// Global staff loading state management to prevent race conditions
window.staffLoadingState = {
    currentAnimeTitle: null,
    currentIndex: null,
    loadingId: 0,
    isLoading: false,
    currentRequest: null // Add request tracking for cancellation
};

// --- Schedule modal global initializer (ensures wiring even if other code paths didn't run) ---
function parseReleaseDateFlexible(s) {
    if (!s) return null;
    s = String(s).trim();
    // Prefer explicit DD/MM/YYYY first (avoid US MM/DD ambiguity)
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ T](.*))?$/);
    if (m) {
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10) - 1;
        const year = parseInt(m[3], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
    }
    const iso = Date.parse(s);
    if (!isNaN(iso)) return new Date(iso);
    const alt = Date.parse(s.replace(/\//g, '-'));
    if (!isNaN(alt)) return new Date(alt);
    return null;
}

function populateScheduleModalGlobal(container) {
    try {
        container.innerHTML = '';
        // Debug: report when populateScheduleModalGlobal is invoked
        try { console.log('populateScheduleModalGlobal invoked', { hasWindowAnimeData: !!(typeof window !== 'undefined' && window.animeData), hasGlobalAnimeData: (typeof animeData !== 'undefined') }); } catch(e){}
        const groups = new Map();
        const tba = { date: null, items: [] };
        // prefer window.animeData (attached in index.html), fall back to any global animeData
        const data = (typeof window !== 'undefined' && window.animeData) ? window.animeData : (typeof animeData !== 'undefined' ? animeData : {});

        // Determine the current season to restrict the schedule to (e.g. 'Fall 2025')
        const currentSeasonStr = (typeof window !== 'undefined' && window.currentSeason) ? window.currentSeason : (typeof currentSeason !== 'undefined' ? currentSeason : null);
        let filterYear = null, filterSeason = null;
        if (currentSeasonStr && typeof currentSeasonStr === 'string') {
            const parts = currentSeasonStr.split(' ');
            if (parts.length >= 2) {
                filterSeason = parts[0];
                filterYear = parts[1];
            }
        }

        // If the filtered season/year isn't present, we'll still allow retries in case data hasn't loaded yet
        const hasData = data && Object.keys(data).length > 0;
        if (!hasData) {
            container._schedPopulateAttempts = (container._schedPopulateAttempts || 0) + 1;
            if (container._schedPopulateAttempts <= 5) {
                // show a transient loading message
                container.innerHTML = '<div class="loading">Waiting for schedule data...</div>';
                setTimeout(() => {
                    try { populateScheduleModalGlobal(container); } catch (e) { console.warn('retry populateScheduleModalGlobal failed', e); }
                }, 150);
                return;
            }
            // fall through to render what we can (likely none)
        }

        let scanned = 0;
        // Only iterate the selected season if available
        if (filterYear && filterSeason) {
            const list = (data[filterYear] && data[filterYear][filterSeason]) ? data[filterYear][filterSeason] : [];
            for (const anime of list) {
                scanned++;
                const raw = anime.releaseDate || anime.release_date || anime.release || null;
                const parsed = parseReleaseDateFlexible(raw);
                if (parsed) {
                    const key = parsed.toISOString().slice(0,10);
                    if (!groups.has(key)) groups.set(key, { date: parsed, items: [] });
                    const scheduleMessage = anime.scheduleinfo || anime.scheduleInfo || anime.schedule_note || anime.meta || anime.subtitle || '';
                    groups.get(key).items.push({ title: anime.title || anime.name || 'Untitled', season: filterSeason, year: filterYear, link: anime.staffLink || anime.link || '', scheduleMessage, _source: anime });
                } else {
                    tba.items.push({ title: anime.title || anime.name || 'Untitled', season: filterSeason, year: filterYear, link: anime.staffLink || anime.link || '' });
                }
            }
        } else {
            // Fallback: scan everything (legacy) if no currentSeason available
            for (const year of Object.keys(data || {})) {
                for (const season of Object.keys(data[year] || {})) {
                    for (const anime of (data[year][season] || [])) {
                        scanned++;
                        const raw = anime.releaseDate || anime.release_date || anime.release || null;
                        const parsed = parseReleaseDateFlexible(raw);
                        if (parsed) {
                            const key = parsed.toISOString().slice(0,10);
                            if (!groups.has(key)) groups.set(key, { date: parsed, items: [] });
                            const scheduleMessage = anime.scheduleinfo || anime.scheduleInfo || anime.schedule_note || anime.meta || anime.subtitle || '';
                            groups.get(key).items.push({ title: anime.title || anime.name || 'Untitled', season, year, link: anime.staffLink || anime.link || '', scheduleMessage, _source: anime });
                        } else {
                            tba.items.push({ title: anime.title || anime.name || 'Untitled', season, year, link: anime.staffLink || anime.link || '' });
                        }
                    }
                }
            }
        }
        
        // Always show the schedule modal. If there are no dated groups, we'll still show TBA (if any) or a friendly message.
        const keys = Array.from(groups.keys()).sort((a,b) => new Date(a) - new Date(b));
        const grid = document.createElement('div');
        grid.className = 'schedule-grid';
        // render dated columns
        keys.forEach(k => {
            const g = groups.get(k);
            const col = document.createElement('div');
            col.className = 'schedule-column';
            const header = document.createElement('div');
            header.className = 'schedule-date-header';
            // Format as 'Mon Sep 28' (3-letter weekday, 3-letter month, day number)
            try {
                const weekday = g.date.toLocaleDateString(undefined, { weekday: 'short' });
                const month = g.date.toLocaleDateString(undefined, { month: 'short' });
                const dayNum = g.date.getDate();
                header.textContent = `${weekday} ${month} ${dayNum}`;
            } catch (e) {
                header.textContent = g.date.toDateString();
            }
            col.appendChild(header);
            const list = document.createElement('div');
            list.className = 'schedule-items';
            g.items.forEach(it => {
                const item = document.createElement('div');
                item.className = 'schedule-item';
                const title = document.createElement('div');
                title.className = 'schedule-item-title';
                if (it.link) {
                    const a = document.createElement('a'); a.href = it.link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = it.title; title.appendChild(a);
                } else { title.textContent = it.title; }
                const meta = document.createElement('div'); meta.className = 'schedule-item-meta'; meta.textContent = (it.scheduleMessage && String(it.scheduleMessage).trim()) ? String(it.scheduleMessage) : (typeof scheduleinfo !== 'undefined' ? scheduleinfo : `${it.season} ${it.year}`);
                item.appendChild(title); item.appendChild(meta); list.appendChild(item);
            });
            col.appendChild(list); grid.appendChild(col);
        });
        // Sort TBA items for predictable ordering (by year desc, then season, then title)
        if (tba.items.length > 0) {
            tba.items.sort((a,b) => {
                // compare year (numeric) descending
                const ya = Number(a.year) || 0; const yb = Number(b.year) || 0;
                if (ya !== yb) return yb - ya;
                // compare season name (lexicographic)
                if (a.season && b.season) {
                    if (a.season !== b.season) return a.season.localeCompare(b.season);
                }
                // fallback to title
                return String(a.title || '').localeCompare(String(b.title || ''));
            });
        }
        // render TBA column at the end
        if (tba.items.length > 0) {
            const col = document.createElement('div');
            col.className = 'schedule-column tba-column';
            const header = document.createElement('div');
            header.className = 'schedule-date-header';
            header.textContent = 'TBA';
            col.appendChild(header);
            const list = document.createElement('div');
            list.className = 'schedule-items';
            tba.items.forEach(it => {
                const item = document.createElement('div');
                item.className = 'schedule-item';
                const title = document.createElement('div');
                title.className = 'schedule-item-title';
                if (it.link) {
                    const a = document.createElement('a'); a.href = it.link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = it.title; title.appendChild(a);
                } else { title.textContent = it.title; }
                const meta = document.createElement('div'); meta.className = 'schedule-item-meta'; meta.textContent = (it.scheduleMessage && String(it.scheduleMessage).trim()) ? String(it.scheduleMessage) : (typeof scheduleinfo !== 'undefined' ? scheduleinfo : `${it.season} ${it.year}`);
                item.appendChild(title); item.appendChild(meta); list.appendChild(item);
            });
            col.appendChild(list); grid.appendChild(col);
        }
        // Debug: report counts
        try { console.log('populateScheduleModalGlobal: scanned', scanned, 'datedGroups', keys.length, 'tbaCount', tba.items.length); } catch(e){}
        if (scanned > 0) {
            // log first few TBA titles for debugging
            try { console.log('populateScheduleModalGlobal samples', { datedKeys: keys.slice(0,5), tbaSample: tba.items.slice(0,6).map(x=>x.title) }); } catch(e){}
        }

        // If there were no dated groups and no TBA items, show friendly message
        if (keys.length === 0 && tba.items.length === 0) {
            container.innerHTML = `<div class="no-results"><h3>No shows available</h3><p>There is no data to populate the schedule.</p></div>`;
            return;
        }
        container.appendChild(grid);
    } catch (e) {
        container.innerHTML = '<div class="no-results"><h3>Failed to build schedule</h3></div>';
    }
}

// Expose the function on window in case other code (or inline shims) calls it via window.populateScheduleModalGlobal
try {
    if (typeof window !== 'undefined' && typeof window.populateScheduleModalGlobal !== 'function') {
        window.populateScheduleModalGlobal = populateScheduleModalGlobal;
        try { console.log('Bootstrap: exposed populateScheduleModalGlobal on window'); } catch(e){}
    }
} catch(e) { /* ignore */ }
// If the shim queued a container before this function existed, flush it now
try {
    if (typeof window !== 'undefined' && window.__queuedPopulate) {
        try {
            const c = window.__queuedPopulateContainer;
            if (c) {
                try { console.log('Flushing queued populate container from shim'); } catch(e){}
                try { populateScheduleModalGlobal(c); } catch(e) { console.warn('flushing queued populate failed', e); }
            }
        } catch(e) { console.warn('queued-populate flush failed', e); }
        try { window.__queuedPopulate = false; window.__queuedPopulateContainer = null; } catch(e){}
    }
} catch(e) {}

function initScheduleModal() {
    try {
        const scheduleBtn = document.getElementById('viewScheduleBtn');
        const scheduleModal = document.getElementById('fullScheduleModal');
        const scheduleBody = document.getElementById('scheduleModalBody');
        const closeSchedule = document.getElementById('closeScheduleModal');
        if (!scheduleBtn || !scheduleModal || !scheduleBody) return;
        scheduleBtn.addEventListener('click', () => {
            try {
                scheduleModal.classList.remove('hidden');
                populateScheduleModalGlobal(scheduleBody);
            } catch (e) { console.warn('Open schedule modal failed', e); }
        });
        if (closeSchedule) closeSchedule.addEventListener('click', () => scheduleModal.classList.add('hidden'));
        scheduleModal.addEventListener('click', (e) => { if (e.target && e.target.id === 'fullScheduleModal') scheduleModal.classList.add('hidden'); });
            // expose a global opener for legacy onclicks and debugging
            window.openScheduleModalGlobal = function() {
                try { scheduleModal.classList.remove('hidden'); populateScheduleModalGlobal(scheduleBody); console.log('openScheduleModalGlobal invoked'); } catch (e) { console.warn('openScheduleModalGlobal failed', e); }
            };
        // If the modal was opened early by the shim, populate it now
        try {
            if (window.__scheduleOpenedEarly) {
                console.log('initScheduleModal: detected early-open shim, populating schedule now');
                try { populateScheduleModalGlobal(scheduleBody); } catch(e) { console.warn('populateScheduleModalGlobal failed after early open', e); }
                // clear the flag so we don't re-run unnecessarily
                try { delete window.__scheduleOpenedEarly; } catch(e) { window.__scheduleOpenedEarly = false; }
            }
        } catch(e) {}
    } catch (e) { console.warn('initScheduleModal failed', e); }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initScheduleModal); else initScheduleModal();

// Debug helper: log a sample of schedule items and their computed scheduleMessage
try {
    window.logScheduleSample = function(limit = 10) {
        try {
            const data = (typeof window !== 'undefined' && window.animeData) ? window.animeData : (typeof animeData !== 'undefined' ? animeData : {});
            const out = [];
            for (const y of Object.keys(data)) {
                for (const s of Object.keys(data[y]||{})) {
                    for (const a of (data[y][s]||[])) {
                        const msg = a.scheduleinfo || a.scheduleInfo || a.schedule_note || a.meta || a.subtitle || '';
                        out.push({ title: a.title||a.name||'Untitled', season: s, year: y, scheduleMessage: msg });
                        if (out.length >= limit) break;
                    }
                    if (out.length >= limit) break;
                }
                if (out.length >= limit) break;
            }
            console.table(out);
            return out;
        } catch (e) { console.warn('logScheduleSample failed', e); return []; }
    };
} catch (e) {}

// Robust global opener: works even if initScheduleModal didn't run or returned early.
window.openScheduleModalGlobal = window.openScheduleModalGlobal || function() {
    try {
        // Try to find existing modal elements
        const scheduleModal = document.getElementById('fullScheduleModal');
        const scheduleBody = document.getElementById('scheduleModalBody');
        if (scheduleModal && scheduleBody) {
            scheduleModal.classList.remove('hidden');
            try { populateScheduleModalGlobal(scheduleBody); } catch (e) { console.warn('populateScheduleModalGlobal failed in global opener', e); }
            console.log('openScheduleModalGlobal invoked (robust)');
            return;
        }

        // If DOM not ready, queue until ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function onReady() {
                try {
                    const m = document.getElementById('fullScheduleModal');
                    const b = document.getElementById('scheduleModalBody');
                    if (m && b) {
                        m.classList.remove('hidden');
                        try { populateScheduleModalGlobal(b); } catch (e) { console.warn('populateScheduleModalGlobal failed after DOM ready', e); }
                        console.log('openScheduleModalGlobal invoked after DOMContentLoaded');
                    } else {
                        console.warn('openScheduleModalGlobal: modal elements missing after DOM ready');
                    }
                } catch (e) { console.warn('openScheduleModalGlobal queued handler failed', e); }
                document.removeEventListener('DOMContentLoaded', onReady);
            });
            console.log('openScheduleModalGlobal queued until DOMContentLoaded');
            return;
        }

        console.warn('openScheduleModalGlobal: modal elements not available and DOM not loading');
    } catch (e) { console.warn('openScheduleModalGlobal error', e); }
};

// Function to start a new staff loading operation
function startStaffLoading(animeTitle, index) {
    // Cancel any ongoing request first
    if (window.staffLoadingState.currentRequest) {
        console.log('🚫 Cancelling previous staff request for new anime');
        try {
            window.staffLoadingState.currentRequest.abort();
        } catch (e) {
            console.log('🚫 Previous request already completed or aborted');
        }
        window.staffLoadingState.currentRequest = null;
    }
    
    window.staffLoadingState.currentAnimeTitle = animeTitle;
    window.staffLoadingState.currentIndex = index;
    window.staffLoadingState.loadingId++;
    window.staffLoadingState.isLoading = true;
    const loadingId = window.staffLoadingState.loadingId;
    console.log(`🎭 Started staff loading #${loadingId} for:`, animeTitle, 'at index:', index);
    return loadingId;
}

// Function to check if a staff loading operation is still valid
function isStaffLoadingValid(loadingId, animeTitle, index) {
    const state = window.staffLoadingState;
    const isValid = state.loadingId === loadingId && 
                   state.currentAnimeTitle === animeTitle && 
                   state.currentIndex === index;
    
    if (!isValid) {
        console.log(`🚫 Staff loading #${loadingId} invalidated:`, {
            expected: { id: state.loadingId, title: state.currentAnimeTitle, index: state.currentIndex },
            actual: { id: loadingId, title: animeTitle, index: index }
        });
    }
    
    return isValid;
}

// Function to complete staff loading
function completeStaffLoading(loadingId) {
    if (window.staffLoadingState.loadingId === loadingId) {
        window.staffLoadingState.isLoading = false;
        window.staffLoadingState.currentRequest = null;
        console.log(`✅ Completed staff loading #${loadingId}`);
    }
}

// Debug function to show current staff loading state
window.showStaffLoadingState = function() {
    const state = window.staffLoadingState;
    console.log('🎭 Current Staff Loading State:', {
        currentAnimeTitle: state.currentAnimeTitle,
        currentIndex: state.currentIndex,
        loadingId: state.loadingId,
        isLoading: state.isLoading
    });
};

// Enhanced function to fix stuck staff loading (from backup script)
window.fixStuckStaff = function() {
    console.log('🔧 Fixing stuck staff loading...');
    
    // Reset staff loading state
    window.staffLoadingState = {
        currentAnimeTitle: null,
        currentIndex: null,
        loadingId: 0,
        isLoading: false,
        currentRequest: null
    };
    
    // Clear any stuck loading indicators
    const staffContainer = document.getElementById("staffAnimeList");
    if (staffContainer && staffContainer.innerHTML.includes('Loading')) {
        staffContainer.innerHTML = '<div class="no-results">Loading was stuck - please try again</div>';
    }
    
    // Clear protection flags
    sessionStorage.removeItem('viewTransition');
    sessionStorage.removeItem('studioNavigationIndex');
    sessionStorage.removeItem('staffEntryTime');
    
    console.log('✅ Staff loading state reset');
    console.log('💡 You can now try loading staff again');
};

// Function to get staff information for an anime using AniList API
async function getAnimeStaff(anime) {
    console.log('🎭 getAnimeStaff called for:', anime.title);
    console.log('🎭 Staff link:', anime.staffLink);
    
    // Check if offline mode is enabled
    if (localStorage.getItem('offlineMode')) {
        console.log('📱 Offline mode enabled - using cached data only');
        // Try to get cached data from the staff link
        if (anime.staffLink) {
            const linkMatch = anime.staffLink.match(/\/anime\/(\d+)\//);
            if (linkMatch) {
                const anilistId = linkMatch[1];
                const cached = window.getLastGoodAniListStaff && window.getLastGoodAniListStaff(anilistId);
                if (cached) {
                    console.log('📦 Using cached staff data in offline mode:', cached.length);
                    return cached;
                } else {
                    console.log('⚠️ No cached staff data available in offline mode');
                    return [];
                }
            }
        }
        console.log('⚠️ No staff link available for offline mode');
        return [];
    }
    
    // Create AbortController for this request and store it
    const abortController = new AbortController();
    window.staffLoadingState.currentRequest = abortController;
    
    const annId = anime.annId && anime.annId.trim() ? anime.annId.trim() : null;
    if (annId) console.log('📰 ANN ID detected:', annId);
    
    try {
        // Try to get staff info from AniList using the staff link
        if (anime.staffLink) {
            // Extract anime ID from AniList staff link
            const linkMatch = anime.staffLink.match(/\/anime\/(\d+)\//);
            if (linkMatch) {
                const anilistId = linkMatch[1];
                console.log('🎭 Attempting to fetch from AniList API with ID:', anilistId);
                try {
                    const aniListStaff = await fetchAnimeStaff(anilistId) || [];
                    
                    // Check if request was aborted
                    if (abortController.signal.aborted) {
                        console.log('🚫 AniList staff request was aborted for:', anime.title);
                        return [];
                    }
                    
                    console.log('✅ AniList staff count:', aniListStaff.length);
                    let annStaff = [];
                    
                    // Dynamically skip ANN fetching if AniList already has too many staff members
                    const shouldSkipANN = aniListStaff.length > 15; // If AniList has more than 15, skip ANN
                    
                    if (annId && !shouldSkipANN) {
                        annStaff = await fetchANNStaff(annId);
                        console.log('✅ ANN staff count:', annStaff.length);
                    } else if (shouldSkipANN) {
                        console.log('⏭️ Skipping ANN fetch - AniList already has sufficient staff members');
                    }
                    
                    // Final abort check before returning
                    if (abortController.signal.aborted) {
                        console.log('🚫 Staff merge request was aborted for:', anime.title);
                        return [];
                    }
                    
                    const merged = mergeStaffCredits(aniListStaff, annStaff);
                    console.log('🤝 Merged staff count:', merged.length);
                    return merged;
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log('🚫 Staff fetch aborted for:', anime.title);
                        return [];
                    }
                    console.error('🎭 API fetch failed for', anime.title, ':', error);
                    return [];
                }
            } else {
                console.log('🎭 Could not extract AniList ID from:', anime.staffLink);
                return [];
            }
        } else {
            console.log('🎭 No staff link provided for:', anime.title);
            return [];
        }
    } finally {
        // Clear the request reference when done
        if (window.staffLoadingState.currentRequest === abortController) {
            window.staffLoadingState.currentRequest = null;
        }
    }
}

// Fetch staff information from AniList API
function ensureAniListClient(){
    // Check offline mode first
    if (window.massUpdater && window.massUpdater.isOfflineMode()) {
        console.log('📦 Offline mode enabled - skipping AniList client setup');
        return;
    }
    
    // Ensure fail state
    if (!window._aniFailState) {
        window._aniFailState = { fails: 0, threshold: 3, switched: false };
    }
    if (window._anilistQuery) return; // already set up
    const ANI_ENDPOINT = 'https://graphql.anilist.co';
    const queue = [];
    let active = 0;
    let lastWindowStart = Date.now();
    let windowCount = 0;
    const WINDOW_MS = 60000;
    const MAX_PER_WINDOW = 30; // match the conservative proxy setting
    let backoffMs = 0;
    const MAX_BACKOFF = 30000; // increased to match proxy
    const LAST_GOOD_PREFIX = 'anilist_staff_cache_';

    function currentProxy(){ return localStorage.getItem('anilistProxy') || ''; }
    function forcedProxy(){ return localStorage.getItem('forceAnilistProxy') === '1'; }
    const endpoint = () => {
        const p = currentProxy();
        return (p || forcedProxy()) ? (p || 'http://localhost:4000/graphql') : ANI_ENDPOINT;
    };

    function getLastGood(id){
        try { const raw=localStorage.getItem(LAST_GOOD_PREFIX+id); if(!raw) return null; const p=JSON.parse(raw); return p.data||null;}catch{return null;}
    }
    function setLastGood(id,data){
        try { localStorage.setItem(LAST_GOOD_PREFIX+id, JSON.stringify({timestamp:Date.now(),data})); } catch {}
    }

    async function rawRequest(body) {
        const ep = endpoint();
        let resp;
        try {
            resp = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        } catch(fetchErr) {
            console.warn('⚠️ Network / CORS fetch error to', ep, fetchErr.message);
            window._aniFailState.fails++;
            if (window._aniFailState.fails >= window._aniFailState.threshold) window._tryAniListFailover();
            throw new Error('NET');
        }
        if (resp.status === 429) {
            backoffMs = backoffMs ? Math.min(backoffMs * 3, MAX_BACKOFF) : 2000; // more aggressive backoff to match proxy
            console.warn('⚠️ Rate limited (429). Backoff =', backoffMs);
            throw new Error('RATE_LIMIT');
        }
        if (!resp.ok) { console.warn('⚠️ AniList HTTP error', resp.status); throw new Error('HTTP_'+resp.status); }
        let json; try { json = await resp.json(); } catch(e){ throw new Error('PARSE'); }
        if (json.errors) throw new Error('GRAPHQL');
        backoffMs = 0;
        window._aniFailState.fails = 0; // reset on good response
        return json.data;
    }

    async function schedule(query, variables) {
        return new Promise(resolve => { queue.push({query,variables,resolve}); pump(); });
    }

    async function pump(){
        if (active) return; active = 1;
        while(queue.length){
            const now = Date.now();
            if (now - lastWindowStart > WINDOW_MS){ lastWindowStart = now; windowCount = 0; }
            if (windowCount >= MAX_PER_WINDOW){
                const waitMs = WINDOW_MS - (now - lastWindowStart) + 50;
                console.log(`⏳ Throttle window reached. Waiting ${waitMs}ms`);
                await new Promise(r=>setTimeout(r, waitMs));
                continue;
            }
            const {query,variables,resolve} = queue.shift();
            const body = 'query=' + encodeURIComponent(query) + '&variables=' + encodeURIComponent(JSON.stringify(variables||{}));
            if (backoffMs){ console.log('⏳ Backoff', backoffMs); await new Promise(r=>setTimeout(r, backoffMs)); }
            try { windowCount++; const data = await rawRequest(body); resolve(data); }
            catch(err){
                if (err.message==='RATE_LIMIT'){
                    queue.unshift({query,variables,resolve});
                } else {
                    console.warn('⚠️ AniList request failed:', err.message);
                    window._aniFailState.fails++;
                    if (window._aniFailState.fails >= window._aniFailState.threshold) window._tryAniListFailover();
                    resolve(null);
                }
            }
        }
        active = 0;
    }

    window._anilistQuery = (q,v)=>schedule(q,v);
    window.getLastGoodAniListStaff = getLastGood;
    window.setLastGoodAniListStaff = setLastGood;
    window.showAniListQueue = () => ({ queued: queue.length, windowCount, backoffMs });
    window._tryAniListFailover = async function(force=false){
        if (window._aniFailState.switched && !force) return;
        try {
            const resp = await fetch('http://localhost:4000/health');
            if (resp.ok){
                localStorage.setItem('anilistProxy','http://localhost:4000/graphql');
                window._aniFailState.switched = true;
                console.warn('🔁 AniList failover engaged: http://localhost:4000/graphql');
            } else {
                console.warn('🔁 Failover probe reachable but not OK');
            }
        } catch(e){ console.warn('🔁 Failover probe error:', e.message); }
    };
    window.getAniListEndpoint = endpoint;
    // Proactive probe: if user set force flag or proxy already present, test immediately
    if (forcedProxy() || currentProxy()) {
        console.log('🔧 Using proxy endpoint at init:', endpoint());
    } else {
        // background probe (do not await)
        window._tryAniListFailover();
        console.log('ℹ️ If you want to run a local proxy for AniList (dev), run: node anilist-proxy.js in the project root, or set localStorage.setItem("anilistProxy","http://localhost:4000/graphql")');
    }
}

// Simple, direct AniList client (no proxy dependency)
let lastAniListRequest = 0;
const ANILIST_DELAY = 1000; // Simple rate limiting for direct requests

// Cancel all active staff and ANN requests (useful for cleanup)
function cancelAllStaffRequests() {
    console.log(`🚫 Cancelling all ${activeStaffRequests.size} active staff requests and ${activeAnnRequests.size} ANN requests`);
    
    // Cancel staff requests
    for (const [id, controller] of activeStaffRequests.entries()) {
        controller.abort();
        activeStaffRequests.delete(id);
    }
    
    // Cancel ANN requests
    for (const [id, controller] of activeAnnRequests.entries()) {
        controller.abort();
        activeAnnRequests.delete(id);
    }
    
    // Reset current anime update tracking
    currentAnimeUpdateId = null;
}

// Request cancellation tracking for rapid navigation
let activeStaffRequests = new Map();
let activeAnnRequests = new Map();
let requestIdCounter = 0;
let currentAnimeUpdateId = null; // Track the current anime being updated
let lastAnimeId = null; // Track the last anime ID to avoid unnecessary fetches

// Simple, direct AniList query function (no proxy dependency)
async function simpleAniListQuery(query, variables = {}, requestId = null) {
    // Check offline mode first
    if (window.massUpdater && window.massUpdater.isOfflineMode()) {
        console.log('📦 Offline mode enabled - skipping direct AniList query');
        throw new Error('Offline mode enabled - no API calls allowed');
    }
    
    // Simple rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastAniListRequest;
    if (timeSinceLastRequest < ANILIST_DELAY) {
        await new Promise(resolve => setTimeout(resolve, ANILIST_DELAY - timeSinceLastRequest));
    }
    lastAniListRequest = Date.now();
    
    // Direct AniList endpoint (no proxy)
    const endpoint = 'https://graphql.anilist.co/';
    
    try {
        const body = JSON.stringify({ query, variables });
        console.log('🔍 Direct AniList request:', { query: query.substring(0, 100) + '...', variables });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // Track request for cancellation
        if (requestId) {
            activeStaffRequests.set(requestId, controller);
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Remove from tracking
        if (requestId) {
            activeStaffRequests.delete(requestId);
        }
        
        if (!response.ok) {
            console.error('❌ AniList response not OK:', response.status, response.statusText);
            
            if (response.status === 400) {
                const errorText = await response.text();
                console.error('❌ 400 Error details:', errorText);
            }
            
            if (response.status === 429) {
                console.log('⚠️ Rate limited, waiting 5 seconds...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                // Instead of throwing, return a special rate limit indicator
                return { rateLimited: true };
            }
            
            return null;
        }
        
        const data = await response.json();
        if (data.errors) {
            console.error('AniList GraphQL errors:', data.errors);
            return null;
        }
        
        return data.data;
        
    } catch (error) {
        // Remove from tracking on error
        if (requestId) {
            activeStaffRequests.delete(requestId);
        }
        
        if (error.name === 'AbortError') {
            console.log('🚫 Request cancelled:', requestId);
            return null;
        }
        
        console.error('AniList request failed:', error);
        
        // Add simple retry logic for network errors
        if (error.message.includes('Failed to fetch')) {
            console.log('🔄 Network error, retrying in 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Single retry attempt
            return await simpleAniListQuery(query, variables, requestId);
        }
        
        return null;
    }
}

// Simple cache system for staff data
const STAFF_CACHE_PREFIX = 'anilist_staff_cache_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getLastGoodAniListStaff(id) {
    try {
        const raw = localStorage.getItem(STAFF_CACHE_PREFIX + id);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - data.timestamp > CACHE_TTL) {
            localStorage.removeItem(STAFF_CACHE_PREFIX + id);
            return null;
        }
        return data.data;
    } catch {
        return null;
    }
}

function setLastGoodAniListStaff(id, data) {
    try {
        localStorage.setItem(STAFF_CACHE_PREFIX + id, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));
    } catch {}
}

async function fetchAnimeStaff(anilistId) {
    console.log(`🎬 Fetching staff for anime ID: ${anilistId}`);
    
    // Check if offline mode is enabled
    if (window.massUpdater && window.massUpdater.isOfflineMode()) {
        console.log('� Offline mode enabled - using cached data only');
        const cached = getLastGoodAniListStaff(anilistId);
        if (cached) {
            console.log('📦 Using cached AniList staff in offline mode:', cached.length);
            return cached;
        } else {
            console.log('⚠️ No cached staff data available in offline mode');
            return [];
        }
    }

    const query = `query($id:Int){ Media(id:$id){ id title{romaji english} staff(sort:[RELEVANCE,ID]){ edges{ role node{ id name{ full first last native } } } } } }`;

    try {
        const data = await simpleAniListQuery(query, { id: parseInt(anilistId) });
        if (!data || !data.Media?.staff?.edges) {
            console.log('AniList returned no staff edges');
            const cached = getLastGoodAniListStaff(anilistId);
            if (cached) {
                console.log('📦 Using last-good cached AniList staff:', cached.length);
                return cached;
            }
            return [];
        }
        
        const staffList = data.Media.staff.edges.map(edge => ({
            role: edge.role || 'Unknown Role',
            name: edge.node?.name?.full || edge.node?.name?.first || 'Unknown Name',
            id: edge.node?.id
        })).filter(s => {
            const r = s.role.toLowerCase();
            // Balanced filtering - key creative roles but not too restrictive
            return (r.includes('director') && !r.includes('assistant') && !r.includes('animation director') && !r.includes('episode director') && !r.includes('unit director')) || 
                   r.includes('original creator') || 
                   (r.includes('creator') && !r.includes('animation') && !r.includes('art')) ||
                   r.includes('character design') ||
                   r.includes('series composition') ||
                   r.includes('screenplay') ||
                   (r.includes('music') && !r.includes('assistant') && !r.includes('theme song'));
        }).slice(0, 8); // Reasonable limit of 8 key staff
        
        setLastGoodAniListStaff(anilistId, staffList);
        return staffList;
    } catch(err) {
        console.error('AniList staff fetch exception', err);
        const cached = getLastGoodAniListStaff(anilistId);
        if (cached) {
            console.log('📦 Using last-good cached AniList staff after exception:', cached.length);
            return cached;
        }
        return [];
    }
}

// ---------------- Enhanced ANN (Anime News Network) integration from backup script ----------------
// ANN Cache and request management
const annCache = new Map();
const annPendingRequests = new Map();
const ANN_BATCH_DELAY = 2000; // 2 seconds between batch requests (conservative for many requests)

// Enhanced ANN data fetching function from backup script - this is what makes staff fetching work reliably
async function fetchANNData(animeId, animeTitle = null) {
    try {
        // Check enhanced cache first
        const cachedData = CacheManager.get('ANN_DATA', animeId.toString());
        if (cachedData !== null) {
            console.log(`[CACHE] Using enhanced cached ANN data for ID ${animeId}`);
            return cachedData;
        }

        // Fallback to legacy cache
        if (annCache.has(animeId)) {
            const cached = annCache.get(animeId);
            console.log(`[LEGACY CACHE] Using legacy cached data for ANN ID ${animeId} - ${cached ? 'valid data' : 'cached null'}`);
            // Migrate to new cache system
            if (cached) {
                CacheManager.set('ANN_DATA', animeId.toString(), cached);
            }
            return cached;
        }

        // Check if there's already a pending request for this ID
        if (annPendingRequests.has(animeId)) {
            console.log(`[PENDING] Request already pending for ANN ID ${animeId}, waiting...`);
            return annPendingRequests.get(animeId);
        }

        // Create a new promise for this request
        const promise = new Promise(async (resolve, reject) => {
            try {
                // Try to use a CORS proxy if direct request fails
                let response;
                let usingProxy = false;
                
                console.log(`[FETCH] Attempting to fetch ANN data for ID: ${animeId} (Title: ${animeTitle || 'Unknown'})`);
                
                try {
                    console.log(`[DIRECT] Trying direct ANN API call...`);
                    response = await fetch(`https://cdn.animenewsnetwork.com/encyclopedia/api.xml?anime=${animeId}`);
                    console.log(`[DIRECT] Response status: ${response.status} ${response.statusText}`);
                } catch (e) {
                    console.log(`[PROXY] Direct call failed: ${e.message}, trying CORS proxy...`);
                    usingProxy = true;
                    try {
                        response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://cdn.animenewsnetwork.com/encyclopedia/api.xml?anime=${animeId}`)}`);
                        console.log(`[PROXY] Proxy response status: ${response.status} ${response.statusText}`);
                    } catch (proxyError) {
                        console.error(`[PROXY] Proxy call also failed: ${proxyError.message}`);
                        throw new Error(`Both direct and proxy requests failed for ANN ID ${animeId}`);
                    }
                }
                
                if (!response.ok) {
                    const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                    console.error(`[ERROR] ANN API error for ID ${animeId}:`, errorMsg);
                    
                    // If it's a 404, the anime doesn't exist
                    if (response.status === 404) {
                        console.log(`[404] ANN ID ${animeId} not found - caching null result`);
                        annCache.set(animeId, null);
                        resolve(null);
                        return;
                    }
                    
                    // If it's rate limiting, wait and don't cache
                    if (response.status === 429) {
                        console.log(`[RATE_LIMIT] Rate limited for ANN ID ${animeId} - waiting 5 seconds...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        reject(new Error(`Rate limited - retry needed for ANN ID ${animeId}`));
                        return;
                    }
                    
                    throw new Error(errorMsg);
                }
                
                const text = await response.text();
                console.log(`[SUCCESS] Received ${text.length} characters of XML data for ID ${animeId}${usingProxy ? ' (via proxy)' : ''}`);
                
                // Check if the response contains actual error messages
                if (text.includes('<error>') || text.includes('No anime found')) {
                    console.error(`[XML_ERROR] ANN returned error for ID ${animeId}:`, text.substring(0, 200));
                    annCache.set(animeId, null);
                    resolve(null);
                    return;
                }
                
                // Check for suspiciously short responses
                if (text.trim().length < 100) {
                    console.error(`[INVALID] Suspiciously short response for ANN ID ${animeId} (${text.length} chars):`, text);
                    annCache.set(animeId, null);
                    resolve(null);
                    return;
                }
                
                // Debug: Log the raw XML structure to understand the format
                console.log(`[XML] XML structure preview for ANN ID ${animeId}:`, text.substring(0, 300) + '...');
                
                // Use DOMParser to parse XML
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, "text/xml");
                
                // Check for XML parsing errors
                const parseError = xmlDoc.querySelector('parsererror');
                if (parseError) {
                    console.error(`[PARSE_ERROR] XML parsing error for ANN ID ${animeId}:`, parseError.textContent);
                    annCache.set(animeId, null);
                    resolve(null);
                    return;
                }
                
                // Check if the anime element exists
                const animeElement = xmlDoc.querySelector('anime');
                if (!animeElement) {
                    console.error(`[NO_ANIME] No anime element found for ANN ID ${animeId}`);
                    console.log(`[ELEMENTS] Available root elements:`, Array.from(xmlDoc.children).map(el => el.tagName));
                    annCache.set(animeId, null);
                    resolve(null);
                    return;
                }
                
                // Get anime title for verification
                const titleElement = animeElement.querySelector('info[type="Main title"]');
                const animeXmlTitle = titleElement ? titleElement.textContent.trim() : 'Unknown Title';
                console.log(`[TITLE] ANN ID ${animeId} title: "${animeXmlTitle}"`);
                
                // Extract staff information with multiple fallback methods
                const staffNodes = xmlDoc.querySelectorAll('staff');
                console.log(`[STAFF] Found ${staffNodes.length} staff nodes for ANN ID ${animeId} ("${animeXmlTitle}")`);
                
                if (staffNodes.length === 0) {
                    console.log(`[STAFF] No staff nodes found, checking for alternative structures...`);
                    const allNodes = xmlDoc.querySelectorAll('*');
                    console.log(`[DEBUG] All XML elements found:`, Array.from(allNodes).slice(0, 10).map(n => n.tagName));
                }
                
                const staff = Array.from(staffNodes).map(node => {
                    // Method 1: Look for task and person child elements
                    const taskNode = node.querySelector('task');
                    const personNode = node.querySelector('person');
                    
                    if (taskNode && personNode) {
                        return {
                            task: taskNode.textContent.trim(),
                            person: personNode.textContent.trim()
                        };
                    }
                    
                    // Method 2: Look for task attribute and text content
                    const task = node.getAttribute('task');
                    const person = node.textContent.trim();
                    if (task && person) {
                        return { task: task, person: person };
                    }
                    
                    // Method 3: Look for any child elements with useful info
                    const allChildren = node.children;
                    if (allChildren.length >= 2) {
                        return {
                            task: allChildren[0].textContent.trim(),
                            person: allChildren[1].textContent.trim()
                        };
                    }
                    
                    // Method 4: Last resort - return what we can
                    return { 
                        task: task || 'Staff', 
                        person: person || 'Unknown'
                    };
                }).filter(item => item.person && item.person !== 'Unknown' && item.person.length > 0);
                
                console.log(`[STAFF] Parsed ${staff.length} staff members for ANN ID ${animeId}:`, staff.slice(0, 3));

                // Extract studio information with multiple methods
                let studioNodes = xmlDoc.querySelectorAll('credit');
                console.log(`[STUDIO] Found ${studioNodes.length} credit nodes for ANN ID ${animeId}`);
                
                if (studioNodes.length === 0) {
                    console.log(`[STUDIO] No credit nodes found, checking for company nodes...`);
                    studioNodes = xmlDoc.querySelectorAll('company');
                    console.log(`[STUDIO] Found ${studioNodes.length} company nodes instead`);
                }
                
                const studios = [];
                
                // Method 1: Look for animation production credits
                Array.from(studioNodes).forEach(node => {
                    const task = node.getAttribute('task');
                    const content = node.textContent.trim();
                    
                    if (task && (task.toLowerCase().includes('animation') || task.toLowerCase().includes('studio') || task.toLowerCase().includes('production'))) {
                        studios.push({
                            name: content,
                            role: task
                        });
                    } else if (content.startsWith('Animation Production')) {
                        studios.push({
                            name: content.replace('Animation Production', '').trim(),
                            role: 'Animation Production'
                        });
                    }
                });
                
                // Method 2: Look for company tags as fallback
                if (studios.length === 0) {
                    const companyNodes = xmlDoc.querySelectorAll('company');
                    console.log(`[STUDIO] Found ${companyNodes.length} company nodes as fallback`);
                    Array.from(companyNodes).forEach(node => {
                        const content = node.textContent.trim();
                        if (content) {
                            studios.push({
                                name: content,
                                role: 'Production Company'
                            });
                        }
                    });
                }
                
                console.log(`[STUDIO] Parsed ${studios.length} studios for ANN ID ${animeId}:`, studios);

                const data = { staff, studios, title: animeXmlTitle };
                
                // Store co-production information if we have multiple studios
                if (animeTitle && studios.length > 1) {
                    // storeCoProduction(animeTitle, studios); // Uncomment if co-production function exists
                    console.log(`[CO_PROD] Would store co-production info for "${animeTitle}" with ${studios.length} studios`);
                }
                
                // Summary of what we found
                console.log(`[SUMMARY] ANN ID ${animeId} ("${animeXmlTitle}"): ${staff.length} staff, ${studios.length} studios`);
                
                // Cache in both systems for compatibility
                annCache.set(animeId, data);
                CacheManager.set('ANN_DATA', animeId.toString(), data);
                resolve(data);
            } catch (error) {
                console.error(`[EXCEPTION] Error processing ANN ID ${animeId}:`, {
                    message: error.message,
                    stack: error.stack?.split('\n').slice(0, 3)
                });
                annCache.set(animeId, null);
                CacheManager.set('ANN_DATA', animeId.toString(), null);
                resolve(null);
            } finally {
                annPendingRequests.delete(animeId);
            }
        });

        // Store the pending promise
        annPendingRequests.set(animeId, promise);
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, ANN_BATCH_DELAY));
        
        return promise;
    } catch (error) {
        console.error(`[FATAL] Fatal error fetching ANN data for ID ${animeId}:`, error);
        
        // Try to fallback to any cached data (even if expired) as last resort
        const expiredCache = CacheManager.get('ANN_DATA', animeId.toString(), Infinity);
        if (expiredCache !== null) {
            console.log(`[FALLBACK] Using expired cache for ANN ID ${animeId} due to fetch error`);
            return expiredCache;
        }
        
        // Also check legacy cache for fallback
        if (annCache.has(animeId)) {
            const legacyCache = annCache.get(animeId);
            console.log(`[FALLBACK] Using legacy cache for ANN ID ${animeId} due to fetch error`);
            return legacyCache;
        }
        
        annCache.set(animeId, null);
        CacheManager.set('ANN_DATA', animeId.toString(), null);
        return null;
    }
}

// Legacy compatibility functions
function getCachedANN(annId) {
    return annCache.get(annId) || null;
}

function setCachedANN(annId, data) {
    annCache.set(annId, data);
}

async function fetchANNStaff(annId) {
    console.log('📰 Fetching ANN staff for', annId);
    const data = await fetchANNData(annId);
    if (!data || !data.staff) return [];
    
    return data.staff.map(s => ({
        name: s.person,
        role: s.task,
        source: 'ANN'
    }));
}

function dedupeStaffList(list) {
    const seen = new Map();
    list.forEach(item => {
        const key = (item.name + '|' + item.role).toLowerCase();
        if (!seen.has(key)) seen.set(key, { name: item.name, role: item.role });
    });
    return Array.from(seen.values());
}

function mergeStaffCredits(aniListStaff, annStaff) {
    // Merge by name+role; combine roles for same name if different
    const byName = new Map();
    aniListStaff.forEach(s => {
        const key = s.name.toLowerCase();
        if (!byName.has(key)) byName.set(key, { name: s.name, roles: new Set([s.role]), id: s.id || null });
        else byName.get(key).roles.add(s.role);
    });
    annStaff.forEach(s => {
        const key = s.name.toLowerCase();
        if (!byName.has(key)) byName.set(key, { name: s.name, roles: new Set([s.role]), id: null });
        else byName.get(key).roles.add(s.role);
    });
    const merged = Array.from(byName.values()).map(entry => ({
        name: entry.name,
        role: Array.from(entry.roles).join(' / '),
        id: entry.id
    }));
    // Basic priority sort: Director > Original > Series > Character > Music > rest
    const priority = ['director','chief director','original','creator','series composition','character design','music'];
    merged.sort((a,b) => {
        const ar = a.role.toLowerCase();
        const br = b.role.toLowerCase();
        const ai = priority.findIndex(p => ar.includes(p));
        const bi = priority.findIndex(p => br.includes(p));
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.name.localeCompare(b.name);
    });
    return merged.slice(0, 20); // Cap to keep UI tidy
}

// Function to fetch staff roles for a specific staff member
// Enhanced name matching for cross-referencing ANN and AniList staff
function findBestStaffNameMatch(targetName, candidateNames) {
    if (!targetName || !candidateNames || candidateNames.length === 0) return null;
    
    const targetVariations = generateNameVariations(targetName);
    
    // Try exact matches first
    for (const candidate of candidateNames) {
        if (candidate === targetName) return candidate;
    }
    
    // Try variation matches
    for (const variation of targetVariations) {
        for (const candidate of candidateNames) {
            if (candidate === variation) return candidate;
            
            // Also check if candidate has variations that match
            const candidateVariations = generateNameVariations(candidate);
            if (candidateVariations.includes(variation)) return candidate;
        }
    }
    
    // Fuzzy matching as last resort
    const fuzzyMatches = candidateNames.filter(candidate => {
        const similarity = calculateNameSimilarity(targetName, candidate);
        return similarity > 0.8; // 80% similarity threshold
    });
    
    if (fuzzyMatches.length > 0) {
        return fuzzyMatches[0]; // Return best fuzzy match
    }
    
    return null; // No good match found
}

// Calculate similarity between two names (0-1 scale)
function calculateNameSimilarity(name1, name2) {
    const normalize = (str) => str.toLowerCase().replace(/[^a-z]/g, '');
    const norm1 = normalize(name1);
    const norm2 = normalize(name2);
    
    if (norm1 === norm2) return 1.0;
    
    // Levenshtein distance based similarity
    const matrix = [];
    const len1 = norm1.length;
    const len2 = norm2.length;
    
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,     // deletion
                matrix[i][j - 1] + 1,     // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    
    const maxLen = Math.max(len1, len2);
    if (maxLen === 0) return 1.0;
    
    return 1 - (matrix[len1][len2] / maxLen);
}

// Enhanced name variation generator for Japanese/English name matching
function generateNameVariations(name) {
    const variations = new Set(); // Use Set to avoid duplicates
    
    // Original name
    variations.add(name);
    
    // Basic transformations
    const trimmed = name.trim();
    if (trimmed !== name) variations.add(trimmed);
    
    // Handle macron and diacritic variations (Japanese romanization)
    const macronMap = {
        'ō': ['ou', 'oo', 'o'],
        'ū': ['uu', 'u'],
        'ā': ['aa', 'a'],
        'ē': ['ee', 'e'],
        'ī': ['ii', 'i'],
        'Ō': ['Ou', 'Oo', 'O'],
        'Ū': ['Uu', 'U'],
        'Ā': ['Aa', 'A'],
        'Ē': ['Ee', 'E'],
        'Ī': ['Ii', 'I']
    };
    
    // Specific name pattern mappings for common variations - REMOVED hardcoded names
    // Instead, we'll use general pattern-based rules below
    
    // Apply general macron transformations to entire name
    let currentName = name;
    for (const [macron, replacements] of Object.entries(macronMap)) {
        if (currentName.includes(macron)) {
            for (const replacement of replacements) {
                variations.add(currentName.replace(new RegExp(macron, 'g'), replacement));
                // Also try case variations
                variations.add(currentName.replace(new RegExp(macron, 'gi'), replacement));
            }
        }
        // Reverse: if input has regular chars, try macron version
        for (const replacement of replacements) {
            if (currentName.includes(replacement)) {
                variations.add(currentName.replace(new RegExp(replacement, 'g'), macron));
                variations.add(currentName.replace(new RegExp(replacement, 'gi'), macron));
            }
        }
    }
    
    // Additional pattern-based variations for any name structure
    // Word boundary and position-based transformations
    const positionPatterns = [
        // Start of name patterns
        { pattern: /^([bcdfghjklmnpqrstvwxyz])\1+/gi, transform: (match, p1) => p1 }, // Remove double consonants at start
        
        // End of name patterns  
        { pattern: /([aeiou])\1+$/gi, transform: (match, p1) => p1 }, // Single vowel endings
        
        // Middle patterns - n before consonants
        { pattern: /n([bcdfghjklmpqrstvwxyz])/gi, transform: (match, p1) => `m${p1}` },
        { pattern: /m([bcdfghjklmpqrstvwxyz])/gi, transform: (match, p1) => `n${p1}` }
    ];
    
    for (const { pattern, transform } of positionPatterns) {
        if (pattern.test(workingName)) {
            variations.add(workingName.replace(pattern, transform));
        }
    }
    
    // General pattern-based transformations (works for any name)
    let workingName = name;
    
    // Apply general long vowel patterns
    const longVowelPatterns = [
        // Long O patterns
        { pattern: /([oōû])\1+/gi, replacements: ['ou', 'oo', 'o'] },
        { pattern: /ou/gi, replacements: ['ō', 'oo', 'o'] },
        { pattern: /oo/gi, replacements: ['ō', 'ou', 'o'] },
        
        // Long U patterns  
        { pattern: /([uūû])\1+/gi, replacements: ['uu', 'u'] },
        { pattern: /uu/gi, replacements: ['ū', 'u'] },
        
        // Long I patterns
        { pattern: /([iīî])\1+/gi, replacements: ['ii', 'i'] },
        { pattern: /ii/gi, replacements: ['ī', 'i'] },
        
        // Long A patterns
        { pattern: /([aāâ])\1+/gi, replacements: ['aa', 'a'] },
        { pattern: /aa/gi, replacements: ['ā', 'a'] },
        
        // Long E patterns
        { pattern: /([eēê])\1+/gi, replacements: ['ee', 'e'] },
        { pattern: /ee/gi, replacements: ['ē', 'e'] }
    ];
    
    // Apply each pattern
    for (const { pattern, replacements } of longVowelPatterns) {
        if (pattern.test(workingName)) {
            for (const replacement of replacements) {
                variations.add(workingName.replace(pattern, replacement));
            }
        }
    }
    
    // General consonant sound transformations (works for any syllable)
    const consonantPatterns = [
        // Common romanization differences
        { from: /chi/gi, to: ['ti', 'chi'] },
        { from: /ti/gi, to: ['chi', 'ti'] },
        { from: /tsu/gi, to: ['tu', 'tsu'] },
        { from: /tu/gi, to: ['tsu', 'tu'] },
        { from: /shi/gi, to: ['si', 'shi'] },
        { from: /si/gi, to: ['shi', 'si'] },
        { from: /shu/gi, to: ['syu', 'shu'] },
        { from: /syu/gi, to: ['shu', 'syu'] },
        { from: /sha/gi, to: ['sya', 'sha'] },
        { from: /sya/gi, to: ['sha', 'sya'] },
        { from: /sho/gi, to: ['syo', 'sho'] },
        { from: /syo/gi, to: ['sho', 'syo'] },
        { from: /chu/gi, to: ['tyu', 'chu'] },
        { from: /tyu/gi, to: ['chu', 'tyu'] },
        { from: /cha/gi, to: ['tya', 'cha'] },
        { from: /tya/gi, to: ['cha', 'tya'] },
        { from: /cho/gi, to: ['tyo', 'cho'] },
        { from: /tyo/gi, to: ['cho', 'tyo'] },
        { from: /ji/gi, to: ['zi', 'ji'] },
        { from: /zi/gi, to: ['ji', 'zi'] },
        { from: /fu/gi, to: ['hu', 'fu'] },
        { from: /hu/gi, to: ['fu', 'hu'] }
    ];
    
    // Apply consonant transformations
    for (const { from, to } of consonantPatterns) {
        if (from.test(workingName)) {
            for (const replacement of to) {
                variations.add(workingName.replace(from, replacement));
            }
        }
    }
    
    // Additional systematic variations that work for any name
    // Generate comprehensive syllable-based variations
    const additionalTransforms = [
        // Ya/Yu/Yo combinations with any consonant
        { pattern: /([kgsztdhbpmr])ya/gi, transform: (match, p1) => `${p1}ia` },
        { pattern: /([kgsztdhbpmr])yu/gi, transform: (match, p1) => `${p1}iu` },
        { pattern: /([kgsztdhbpmr])yo/gi, transform: (match, p1) => `${p1}io` },
        { pattern: /([kgsztdhbpmr])ia/gi, transform: (match, p1) => `${p1}ya` },
        { pattern: /([kgsztdhbpmr])iu/gi, transform: (match, p1) => `${p1}yu` },
        { pattern: /([kgsztdhbpmr])io/gi, transform: (match, p1) => `${p1}yo` },
        
        // Double consonant reduction/addition  
        { pattern: /([bcdfghjklmnpqrstvwxyz])\1/gi, transform: (match, p1) => p1 },
        
        // Vowel length normalization
        { pattern: /([aeiou])\1+/gi, transform: (match, p1) => p1 },
        
        // Silent 'u' after 'o' sounds  
        { pattern: /ou(?![aeiou])/gi, transform: () => 'o' },
        { pattern: /o(?![aeiouū])/gi, transform: () => 'ou' }
    ];
    
    for (const { pattern, transform } of additionalTransforms) {
        if (pattern.test(workingName)) {
            const transformed = workingName.replace(pattern, transform);
            if (transformed !== workingName) {
                variations.add(transformed);
            }
        }
    }
    
    // Name order variations (First Last <-> Last First)
    const nameParts = name.split(/\s+/).filter(part => part.length > 0);
    if (nameParts.length === 2) {
        const [first, last] = nameParts;
        variations.add(`${last} ${first}`); // Reverse order
        variations.add(`${last}, ${first}`); // With comma
        variations.add(`${first}, ${last}`); // With comma (original order)
        
        // Japanese-style (no space)
        variations.add(`${first}${last}`);
        variations.add(`${last}${first}`);
    } else if (nameParts.length > 2) {
        // For names with more parts, try different combinations
        const first = nameParts[0];
        const last = nameParts[nameParts.length - 1];
        const middle = nameParts.slice(1, -1).join(' ');
        
        variations.add(`${last} ${first}`);
        variations.add(`${last}, ${first}`);
        variations.add(`${first} ${last}`);
        variations.add(`${last} ${first} ${middle}`);
        variations.add(`${first} ${middle} ${last}`);
    }
    
    // Single name variations (first or last name only)
    if (nameParts.length >= 2) {
        nameParts.forEach(part => {
            if (part.length > 2) { // Only add meaningful parts
                variations.add(part);
            }
        });
    }
    
    // Remove spacing variations
    variations.add(name.replace(/\s+/g, ''));
    variations.add(name.replace(/\s+/g, '_'));
    variations.add(name.replace(/\s+/g, '-'));
    
    // Capitalization variations
    variations.add(name.toLowerCase());
    variations.add(name.toUpperCase());
    variations.add(name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' '));
    
    // Special character handling
    variations.add(name.replace(/['""`''""]/g, ''));
    variations.add(name.replace(/[.-]/g, ' '));
    variations.add(name.replace(/[()]/g, ''));
    
    // Convert Set back to Array and filter out empty/invalid entries
    const result = Array.from(variations).filter(variation => 
        variation && 
        variation.length > 1 && 
        variation.trim() !== '' &&
        !/^\s*$/.test(variation)
    );
    
    // Sort by relevance (shorter variations and exact matches first)
    return result.sort((a, b) => {
        // Prefer exact match
        if (a === name) return -1;
        if (b === name) return 1;
        
        // Prefer shorter variations (likely more accurate)
        if (a.length !== b.length) return a.length - b.length;
        
        // Prefer variations with spaces (proper names)
        const aHasSpace = a.includes(' ');
        const bHasSpace = b.includes(' ');
        if (aHasSpace && !bHasSpace) return -1;
        if (!aHasSpace && bHasSpace) return 1;
        
        return 0;
    }).slice(0, 25); // Increased limit to 25 most relevant variations
}

// Simple string similarity function (Levenshtein distance based)
function calculateStringSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Quick exact match check
    if (s1 === s2) return 1.0;
    
    // Check if one string contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
        return Math.max(s2.length / s1.length, s1.length / s2.length) * 0.9;
    }
    
    // Simple Levenshtein-inspired similarity
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const editDistance = getEditDistance(longer, shorter);
    
    return (longer.length - editDistance) / longer.length;
}

function getEditDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

async function fetchStaffRoles(staffName, forceFresh = false, mediaType = 'ANIME', verifyAnimeTitle = null) {
    console.log(`🎭 fetchStaffRoles called for: "${staffName}", media type: ${mediaType}`, verifyAnimeTitle ? `with verification for: "${verifyAnimeTitle}"` : '');
    
    // Try offline data first (if offline mode enabled and not forcing fresh)
    if (!forceFresh && window.massUpdater && window.massUpdater.isOfflineMode()) {
        console.log(`📦 Offline mode enabled, searching for staff: ${staffName}`);
        const offlineKeys = Object.keys(window.massUpdater.offlineData);
        console.log(`📦 Available offlineData keys:`, offlineKeys.slice(0, 20), offlineKeys.length > 20 ? `(+${offlineKeys.length - 20} more)` : '');
        // First try direct name lookup
        const nameKey = `staff_name_${staffName.toLowerCase()}`;
        console.log(`📦 Searching for key: ${nameKey}`);
        if (window.massUpdater.offlineData[nameKey]) {
            const staffData = window.massUpdater.offlineData[nameKey].data;
            console.log(`📦 Found direct offline data for staff: ${staffName}`);
            // Extract roles from cached data
            const roles = [];
            if (staffData.staffMedia && staffData.staffMedia.edges) {
                console.log(`📦 staffMedia.edges for ${staffName}:`, staffData.staffMedia.edges);
                for (const edge of staffData.staffMedia.edges) {
                    console.log(`📦 edge.node for ${staffName}:`, edge.node);
                    if (edge.node) {
                        roles.push({
                            role: edge.staffRole || 'Unknown',
                            title: edge.node.title?.romaji || edge.node.title?.english || edge.node.title?.native || 'Untitled',
                            coverImage: edge.node.coverImage ? {
                                extraLarge: edge.node.coverImage.extraLarge || '',
                                large: edge.node.coverImage.large || '',
                                medium: edge.node.coverImage.medium || ''
                            } : '',
                            averageScore: edge.node.averageScore || null,
                            popularity: edge.node.popularity || null,
                            year: edge.node.seasonYear || edge.node.startDate?.year || null,
                            id: edge.node.id,
                            format: edge.node.format || '',
                            status: edge.node.status || ''
                        });
                    }
                }
            } else {
                console.log(`📦 No staffMedia.edges found for ${staffName}. staffMedia:`, staffData.staffMedia);
            }
            console.log(`📦 Returning ${roles.length} roles for ${staffName} from offline data`);
            return roles;
        } else {
            console.log(`📦 Direct lookup failed for: ${nameKey}`);
            // Try fallback search through all staff entries
            console.log(`📦 Trying fallback search for: ${staffName}`);
            for (const [key, value] of Object.entries(window.massUpdater.offlineData)) {
                if (key.startsWith('staff_') && value.data && value.data.name && 
                    value.data.name.full && value.data.name.full.toLowerCase() === staffName.toLowerCase()) {
                    console.log(`📦 Found via fallback search: ${staffName} at key ${key}`);
                    const staffData = value.data;
                    const roles = [];
                    if (staffData.staffMedia && staffData.staffMedia.edges) {
                        for (const edge of staffData.staffMedia.edges) {
                            if (edge.node && edge.node.type === mediaType) {
                                roles.push({
                                    role: edge.staffRole || 'Unknown',
                                    title: edge.node.title?.romaji || edge.node.title?.english || edge.node.title?.native || 'Untitled',
                                    coverImage: edge.node.coverImage ? {
                                        extraLarge: edge.node.coverImage.extraLarge || '',
                                        large: edge.node.coverImage.large || '',
                                        medium: edge.node.coverImage.medium || ''
                                    } : '',
                                    averageScore: edge.node.averageScore || null,
                                    popularity: edge.node.popularity || null,
                                    year: edge.node.seasonYear || edge.node.startDate?.year || null,
                                    id: edge.node.id,
                                    format: edge.node.format || '',
                                    status: edge.node.status || ''
                                });
                            }
                        }
                    }
                    console.log(`📦 Returning ${roles.length} roles for ${staffName} from fallback search`);
                    return roles;
                }
            }
            console.log(`📦 No offline data found for staff: ${staffName} - returning empty array`);
            // Show some available staff names for debugging
            const availableStaffNames = Object.keys(window.massUpdater.offlineData)
                .filter(k => k.startsWith('staff_name_'))
                .slice(0, 5)
                .map(k => k.replace('staff_name_', '').replace(/_/g, ' '));
            console.log(`📦 Sample available staff names:`, availableStaffNames);
            // User-friendly message for no results in offline mode
            const container = document.getElementById("staffAnimeList");
            if (container) {
                container.innerHTML = `<div class=\"no-results\"><h3>No roles found for <b>${staffName}</b> in offline data.</h3><p>Try syncing data online or check your offline-data.json.</p></div>`;
            }
            return [];
        }
    }
    
    // Try batch cache first (if not forcing fresh)
    if (!forceFresh && window.batchFetcher) {
        const cachedStaff = await window.batchFetcher.getStaff(staffName);
        if (cachedStaff && cachedStaff.staffMedia) {
            console.log(`🎯 Using batch cached data for: ${staffName}`);
            
            // Extract roles from cached data
            const roles = [];
            for (const edge of cachedStaff.staffMedia.edges) {
                if (edge.node.type === mediaType) {
                    roles.push({
                        role: edge.staffRole || 'Unknown',
                        anime: {
                            title: edge.node.title.romaji || edge.node.title.english || edge.node.title.native,
                            id: edge.node.id,
                            format: edge.node.format,
                            status: edge.node.status,
                            year: edge.node.startDate?.year
                        }
                    });
                }
            }
            
            // Apply verification filter if provided
            if (verifyAnimeTitle) {
                const matchingRoles = roles.filter(role => 
                    role.anime.title.toLowerCase().includes(verifyAnimeTitle.toLowerCase()) ||
                    verifyAnimeTitle.toLowerCase().includes(role.anime.title.toLowerCase())
                );
                
                if (matchingRoles.length > 0) {
                    console.log(`✅ Batch cache verification passed for "${verifyAnimeTitle}"`);
                    return matchingRoles;
                }
            } else {
                return roles;
            }
        }
    }
    
    // Generate unique request ID for cancellation tracking
    const requestId = `staff_${++requestIdCounter}_${Date.now()}`;
    console.log(`🆔 Staff request ID: ${requestId}`);
    
    // Cancel any existing requests for this staff member
    const existingRequestPattern = `staff_.*_${staffName.replace(/\s+/g, '_')}_${mediaType}`;
    for (const [id, controller] of activeStaffRequests.entries()) {
        if (id.includes(staffName.replace(/\s+/g, '_')) && id.includes(mediaType)) {
            console.log(`🚫 Cancelling existing request: ${id}`);
            controller.abort();
            activeStaffRequests.delete(id);
        }
    }
    
    // Check cache first (unless forced fresh)
    if (!forceFresh) {
        // Check enhanced cache first
        const cacheKey = `${staffName.replace(/\s+/g, '_')}_${mediaType}`;
        const cachedData = CacheManager.get('STAFF_ROLES', cacheKey);
        if (cachedData !== null) {
            console.log(`🎭 Using enhanced cached ${mediaType} roles for: ${staffName}`);
            
            // If verification is requested, check the cached data
            if (verifyAnimeTitle) {
                const staffIsInAnime = cachedData.some(role => 
                    role.animeName && role.animeName.toLowerCase().includes(verifyAnimeTitle.toLowerCase())
                );
                if (!staffIsInAnime) {
                    console.warn(`⚠️ Verification failed: ${staffName} not found in ${verifyAnimeTitle} (cached data)`);
                    return [];
                }
                console.log(`✅ Verification passed: ${staffName} found in ${verifyAnimeTitle} (cached data)`);
            }
            
            return cachedData;
        }
        
        // Fallback to legacy cache
        const legacyCacheKey = `staff_${staffName.replace(/\s+/g, '_')}_${mediaType}`;
        const cached = localStorage.getItem(legacyCacheKey);
        if (cached) {
            try {
                const parsedCache = JSON.parse(cached);
                const age = Date.now() - parsedCache.timestamp;
                if (age < 24 * 60 * 60 * 1000) { // 24 hours cache
                    console.log(`🎭 Using cached ${mediaType} roles for:`, staffName);
                    return parsedCache.data;
                }
            } catch (e) {
                console.log('🎭 Cache parse error, fetching fresh');
            }
        }
    }

    try {
        // First, let's try to find the staff member to verify they exist
        console.log(`🔍 Searching for staff member: "${staffName}"`);
        
        const searchQuery = `
            query ($name: String) {
                Staff(search: $name) {
                    id
                    name {
                        full
                        first
                        last
                        native
                    }
                    languageV2
                }
            }
        `;
        
        const searchData = await simpleAniListQuery(searchQuery, { name: staffName }, requestId);
        if (!searchData) {
            console.error(`❌ Search failed (null response) for "${staffName}"`);
            return null;
        }
        
        let actualStaffName = staffName;
        const staffNode = searchData?.Staff || searchData?.data?.Staff; // adapt to data shape (our helper returns .data only)
        if (!staffNode) {
            console.log(`❌ No staff found for search: "${staffName}"`);
            
            // Enhanced name matching with Japanese romanization handling
            const nameVariations = generateNameVariations(staffName);
            console.log(`🔄 Trying ${nameVariations.length} name variations:`, nameVariations);
            
            let foundAlternative = false;
            for (const altName of nameVariations) {
                if (altName === staffName) continue; // Skip if same as original
                
                try {
                    const altData = await simpleAniListQuery(searchQuery, { name: altName }, requestId);
                    const altStaff = altData?.Staff || altData?.data?.Staff;
                    if (altStaff) {
                        console.log(`✅ Found staff with alternative name: "${altName}" -> "${altStaff.name.full}"`);
                        actualStaffName = altStaff.name.full;
                        foundAlternative = true;
                        break;
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log(`🚫 Alternative search cancelled for: ${altName}`);
                        return null;
                    }
                    console.log(`⚠️ Error trying alternative name "${altName}":`, error.message);
                    // Continue with next variation
                }
                
                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            if (!foundAlternative) {
                console.log(`❌ No staff found with name variations. Attempting fuzzy search...`);
                
                // Try a broader search with just parts of the name
                const nameParts = staffName.split(/\s+/).filter(part => part.length > 2);
                let fuzzyFoundAlternative = false;
                
                for (const part of nameParts) {
                    if (fuzzyFoundAlternative) break;
                    
                    try {
                        console.log(`🔍 Fuzzy searching with part: "${part}"`);
                        const fuzzyData = await simpleAniListQuery(searchQuery, { name: part }, requestId);
                        const fuzzyStaff = fuzzyData?.Staff || fuzzyData?.data?.Staff;
                        
                        if (fuzzyStaff) {
                            // Check similarity with original name
                            const similarity = calculateStringSimilarity(staffName, fuzzyStaff.name.full);
                            console.log(`🔍 Fuzzy match candidate: "${fuzzyStaff.name.full}" (similarity: ${similarity.toFixed(2)})`);
                            
                            if (similarity > 0.6) { // 60% similarity threshold
                                console.log(`✅ Found staff with fuzzy search: "${part}" -> "${fuzzyStaff.name.full}" (similarity: ${similarity.toFixed(2)})`);
                                actualStaffName = fuzzyStaff.name.full;
                                fuzzyFoundAlternative = true;
                                break;
                            }
                        }
                    } catch (error) {
                        if (error.name === 'AbortError') {
                            console.log(`🚫 Fuzzy search cancelled for: ${part}`);
                            return null;
                        }
                        console.log(`⚠️ Error trying fuzzy search with "${part}":`, error.message);
                    }
                    
                    // Add delay between fuzzy searches
                    await new Promise(resolve => setTimeout(resolve, 150));
                }
                
                if (!fuzzyFoundAlternative) {
                    console.log(`❌ No staff found even with fuzzy search for: "${staffName}"`);
                    return null;
                }
            }
        } else {
            console.log(`✅ Found staff: "${staffNode.name.full}" (ID: ${staffNode.id})`);
            console.log(`📝 Full name details:`, staffNode.name);
            actualStaffName = staffNode.name.full;
        }

        // If verification anime is provided, check if this staff member is actually involved
        if (verifyAnimeTitle) {
            console.log(`🔍 Verifying staff "${actualStaffName}" is involved in "${verifyAnimeTitle}"`);
            
            const verificationQuery = `
                query ($name: String, $search: String) {
                    Staff(search: $name) {
                        id
                        name {
                            full
                        }
                        staffMedia(search: $search, perPage: 10) {
                            edges {
                                node {
                                    title {
                                        english
                                        romaji
                                    }
                                }
                                staffRole
                            }
                        }
                    }
                }
            `;
            
            try {
                const verifyData = await simpleAniListQuery(verificationQuery, { 
                    name: actualStaffName, 
                    search: verifyAnimeTitle 
                }, requestId);
                
                const verifyStaff = verifyData?.Staff || verifyData?.data?.Staff;
                if (!verifyStaff || !verifyStaff.staffMedia?.edges?.length) {
                    console.log(`❌ Staff "${actualStaffName}" is not involved in "${verifyAnimeTitle}" - potential name collision`);
                    return null;
                }
                
                // Check if any of the found anime titles match
                const foundAnime = verifyStaff.staffMedia.edges.some(edge => {
                    const title = edge.node.title.english || edge.node.title.romaji;
                    const similarity = calculateStringSimilarity(verifyAnimeTitle, title);
                    console.log(`🔍 Checking: "${title}" vs "${verifyAnimeTitle}" (similarity: ${similarity.toFixed(2)})`);
                    return similarity > 0.8; // 80% similarity threshold for verification
                });
                
                if (!foundAnime) {
                    console.log(`❌ No matching anime found for verification - name collision detected`);
                    return null;
                }
                
                console.log(`✅ Verified: "${actualStaffName}" is involved in "${verifyAnimeTitle}"`);
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log(`🚫 Verification cancelled for: ${actualStaffName}`);
                    return null;
                }
                console.log(`⚠️ Verification error, proceeding anyway:`, error.message);
                // Continue with role fetching even if verification fails
            }
        }

        // Now fetch the actual roles using the confirmed staff name
        let allRoles = [];
        let currentPage = 1;
        let hasNextPage = true;
        
        // First try with the staff name
        while (hasNextPage && currentPage <= 3) { // Reduced to 3 pages max to avoid rate limiting
            console.log(`🎭 Fetching page ${currentPage} for ${actualStaffName} (${mediaType})`);
            
            // Add delay between requests to prevent rate limiting
            if (currentPage > 1) {
                console.log(`⏳ Waiting 1 second before next request to prevent rate limiting...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const query = `
                query ($name: String, $type: MediaType, $page: Int) {
                    Staff(search: $name) {
                        id
                        name {
                            full
                            first
                            last
                        }
                        staffMedia(page: $page, perPage: 50, sort: [START_DATE_DESC, POPULARITY_DESC], type: $type) {
                            edges {
                                node {
                                    id
                                    title {
                                        romaji
                                        english
                                    }
                                    coverImage {
                                        extraLarge
                                        large
                                        medium
                                    }
                                    averageScore
                                    popularity
                                    startDate {
                                        year
                                    }
                                    type
                                }
                                staffRole
                            }
                            pageInfo {
                                hasNextPage
                                currentPage
                            }
                        }
                    }
                }
            `;
            
            const variables = { 
                name: actualStaffName,
                type: mediaType,
                page: currentPage
            };
            
            const data = await simpleAniListQuery(query, variables);
            
            // Handle rate limiting
            if (data?.rateLimited) {
                console.log(`⚠️ Rate limited on page ${currentPage}, stopping fetch for ${actualStaffName}`);
                break;
            }
            
            const staffData = data?.Staff || data?.data?.Staff;
            if (!staffData || !staffData.staffMedia) {
                console.error(`❌ No staff data or media for page ${currentPage}`);
                // Safe fail state handling
                if (window._aniFailState && typeof window._aniFailState.fails === 'number') {
                    window._aniFailState.fails++; 
                    if (window._aniFailState.fails >= window._aniFailState.threshold && typeof window._tryAniListFailover === 'function') {
                        window._tryAniListFailover();
                    }
                }
                break;
            }
            const pageRoles = staffData.staffMedia.edges.map(edge => ({
                id: edge.node.id,
                title: edge.node.title.english || edge.node.title.romaji,
                role: edge.staffRole || 'Unknown Role',
                coverImage: edge.node.coverImage.extraLarge || edge.node.coverImage.large || edge.node.coverImage.medium,
                averageScore: edge.node.averageScore,
                popularity: edge.node.popularity,
                year: edge.node.startDate?.year,
                type: edge.node.type
            }));
            
            allRoles.push(...pageRoles);
            hasNextPage = staffData.staffMedia.pageInfo.hasNextPage;
            currentPage++;
            
            console.log(`🎭 Page ${currentPage - 1}: Found ${pageRoles.length} roles, hasNextPage: ${hasNextPage}`);
        }
        
        // If we only found very few roles (like Atsushi Kanou's case), try searching by ID for a more complete list
        if (allRoles.length <= 2 && staffNode?.id) {
            console.log(`🔍 Limited roles found (${allRoles.length}), trying ID-based search for staff ID: ${staffNode.id}`);
            
            const idQuery = `
                query ($id: Int, $type: MediaType) {
                    Staff(id: $id) {
                        id
                        name {
                            full
                        }
                        staffMedia(perPage: 50, sort: [START_DATE_DESC, POPULARITY_DESC], type: $type) {
                            edges {
                                node {
                                    id
                                    title {
                                        romaji
                                        english
                                    }
                                    coverImage {
                                        extraLarge
                                        large
                                        medium
                                    }
                                    averageScore
                                    popularity
                                    startDate {
                                        year
                                    }
                                    type
                                }
                                staffRole
                            }
                        }
                    }
                }
            `;
            
            try {
        const idData = await simpleAniListQuery(idQuery, { id: staffNode.id, type: mediaType });
        const idStaff = idData?.Staff || idData?.data?.Staff;
        if (idStaff?.staffMedia?.edges) {
            const idRoles = idStaff.staffMedia.edges.map(edge => ({
                            id: edge.node.id,
                            title: edge.node.title.english || edge.node.title.romaji,
                            role: edge.staffRole || 'Unknown Role',
                            coverImage: edge.node.coverImage.extraLarge || edge.node.coverImage.large || edge.node.coverImage.medium,
                            averageScore: edge.node.averageScore,
                            popularity: edge.node.popularity,
                            year: edge.node.startDate?.year,
                            type: edge.node.type
                        }));
                        
            console.log(`🆔 ID-based search found ${idRoles.length} roles for staff ID ${staffNode.id}`);
                        
                        // Merge with existing roles, avoiding duplicates
                        idRoles.forEach(idRole => {
                            if (!allRoles.find(role => role.id === idRole.id)) {
                                allRoles.push(idRole);
                            }
                        });
                        
                        console.log(`🔄 After merging: ${allRoles.length} total roles`);
                }
            } catch (error) {
                console.log(`⚠️ ID-based search failed:`, error.message);
            }
        }
        
        // Combine multiple roles for the same anime and remove duplicates
        const rolesByAnime = {};
        allRoles.forEach(role => {
            if (rolesByAnime[role.id]) {
                // Combine roles for the same anime
                const existingRoles = rolesByAnime[role.id].role.split(' | ');
                if (!existingRoles.includes(role.role)) {
                    rolesByAnime[role.id].role += ' | ' + role.role;
                }
            } else {
                rolesByAnime[role.id] = { role: role.role };
            }
        });
        
        // Convert back to array and sort by year (most recent first)
        const uniqueRoles = Object.values(rolesByAnime).sort((a, b) => {
            // Sort by year first (most recent first), then by popularity
            if (a.year && b.year) return b.year - a.year;
            if (a.year && !b.year) return -1;
            if (!a.year && b.year) return 1;
            return (b.popularity || 0) - (a.popularity || 0);
        });
        
        // Cache the result with original staff name as key in both systems
        const cacheKey = `staff_${staffName.replace(/\s+/g, '_')}_${mediaType}`;
        const enhancedCacheKey = `${staffName.replace(/\s+/g, '_')}_${mediaType}`;
        
        // Legacy cache for compatibility
        localStorage.setItem(cacheKey, JSON.stringify({
            data: uniqueRoles,
            timestamp: Date.now()
        }));
        
        // Enhanced cache for better performance and management
        CacheManager.set('STAFF_ROLES', enhancedCacheKey, uniqueRoles);
        
        // Log completion and potential data completeness issues
        console.log(`🎭 Fetched and cached total of ${uniqueRoles.length} unique ${mediaType} roles for ${actualStaffName} across ${currentPage - 1} pages`);
        
        if (uniqueRoles.length <= 2) {
            console.log(`⚠️ Note: Only ${uniqueRoles.length} roles found. AniList database may be incomplete for this staff member.`);
            console.log(`💡 This staff member may have more works that aren't properly linked in AniList's database.`);
        }
        
        return uniqueRoles;
        
    } catch (error) {
        console.error(`❌ Error fetching ${mediaType} staff roles for "${staffName}":`, error);
        return null;
    }
}

// =====================
// DEBUG AND TESTING FUNCTIONS
// =====================

// Debug function to test back button functionality
window.testBackButton = function() {
    console.log('🧪 Testing back button functionality...');
    console.log('📍 Current state:');
    console.log('  - currentIndex:', currentIndex);
    console.log('  - currentAnime:', currentAnime ? currentAnime.title : 'null');
    console.log('  - Current view:', document.getElementById('animeViewer').style.display !== 'none' ? 'viewer' : 'other');
    
    // Save current state
    console.log('\n🔄 Calling saveAnimeIndexForReturn()...');
    if (typeof saveAnimeIndexForReturn === 'function') {
        saveAnimeIndexForReturn();
        console.log('✅ Index saved');
        
        // Check what was saved
        const saved = sessionStorage.getItem('animeIndexForReturn');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                console.log('💾 Saved state:', parsed);
            } catch (e) {
                console.log('❌ Failed to parse saved state');
            }
        }
    } else {
        console.log('❌ saveAnimeIndexForReturn function not found!');
    }
    
    console.log('\n🔍 Testing back navigation simulation...');
    console.log('   (This would normally be triggered by clicking "Back to Trailers")');
};

// Debug function to check saved index state
window.checkSavedIndex = function() {
    console.log('📋 Checking saved index state...');
    
    const saved = sessionStorage.getItem('animeIndexForReturn');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            console.log('✅ Found saved index data:', parsed);
            console.log('  - Index:', parsed.index);
            console.log('  - Season:', parsed.season);
            console.log('  - Year:', parsed.year);
            console.log('  - Timestamp:', new Date(parsed.timestamp).toLocaleString());
            
            // Check if the saved anime exists
            if (parsed.season && parsed.year && animeData && animeData[parsed.year] && animeData[parsed.year][parsed.season]) {
                const seasonAnime = animeData[parsed.year][parsed.season];
                if (parsed.index >= 0 && parsed.index < seasonAnime.length) {
                    console.log('  - Saved anime exists:', seasonAnime[parsed.index].title);
                } else {
                    console.log('  - ⚠️ Saved index out of bounds:', parsed.index, 'max:', seasonAnime.length - 1);
                }
            } else {
                console.log('  - ❌ Saved season/year not found in data');
            }
        } catch (e) {
            console.log('❌ Error parsing saved data:', e.message);
        }
    } else {
        console.log('❌ No saved index found');
    }
    
    console.log('\n📊 Current state:');
    console.log('  - currentIndex:', typeof currentIndex !== 'undefined' ? currentIndex : 'undefined');
    console.log('  - currentSeason:', typeof currentSeason !== 'undefined' ? currentSeason : 'undefined');
};

// Debug function to find cancelled anime in major studios
window.findCancelledAnime = async function() {
    console.log('🔍 Searching for cancelled anime in major studios...');
    
    const majorStudios = ['MAPPA', 'Madhouse', 'Bones', 'Studio Pierrot', 'Toei Animation', 'WIT Studio'];
    
    for (const studioName of majorStudios) {
        console.log(`\n🏢 Checking ${studioName}...`);
        try {
            const animeList = await fetchStudioAnime(studioName);
            if (animeList && animeList.length > 0) {
                const cancelled = animeList.filter(anime => 
                    anime.status === 'CANCELLED' || 
                    anime.year === 'Cancelled' ||
                    (typeof anime.status === 'string' && anime.status.toLowerCase().includes('cancel'))
                );
                
                if (cancelled.length > 0) {
                    console.log(`❌ Found ${cancelled.length} cancelled anime:`);
                    cancelled.forEach(anime => {
                        console.log(`  - ${anime.title} (${anime.year}) [${anime.status}]`);
                    });
                } else {
                    console.log(`✅ No cancelled anime found (checked ${animeList.length} total)`);
                }
            } else {
                console.log(`⚠️ No anime data returned for ${studioName}`);
            }
        } catch (error) {
            console.log(`❌ Error checking ${studioName}:`, error.message);
        }
    }
    
    console.log('\n🔍 Cancelled anime search complete');
};

// Debug function to clear session storage
window.clearSessionStorage = function() {
    const keys = Object.keys(sessionStorage);
    const removed = [];
    
    keys.forEach(key => {
        if (key.includes('anime') || key.includes('studio') || key.includes('staff') || key.includes('refresh')) {
            sessionStorage.removeItem(key);
            removed.push(key);
        }
    });
    
    console.log('🧹 Cleared session storage keys:', removed.length);
    if (removed.length > 0) {
        console.log('  Removed:', removed);
    }
};

// Debug function to test viewer manually
window.testViewer = function(index = null) {
    console.log('🧪 Testing viewer functionality...');
    
    if (index !== null) {
        console.log(`📍 Testing with specific index: ${index}`);
        showAnime(index);
    } else {
        console.log('📍 Testing with current index:', currentIndex);
        if (typeof updateViewer === 'function') {
            updateViewer();
        } else {
            console.log('❌ updateViewer function not found');
        }
    }
};

// Debug function to check current AniList endpoint and queue status
window.debugAniList = function() {
    console.log('🔧 AniList Debug Info:');
    console.log('  Endpoint:', window.getAniListEndpoint ? window.getAniListEndpoint() : 'not available');
    console.log('  Queue status:', window.showAniListQueue ? window.showAniListQueue() : 'not available');
    console.log('  Fail state:', window._aniFailState || 'not initialized');
    console.log('  Proxy setting:', localStorage.getItem('anilistProxy') || 'none');
    console.log('  Force proxy:', localStorage.getItem('forceAnilistProxy') || 'false');
};

// Loading state monitoring debug functions
window.showLoadingMonitors = function() {
    console.log('🔍 === ACTIVE LOADING MONITORS ===');
    const activeMonitors = loadingStateMonitor.getActiveMonitors();
    if (activeMonitors.length === 0) {
        console.log('  No active monitors');
    } else {
        activeMonitors.forEach(key => {
            console.log(`  ${key}`);
        });
    }
    console.log(`Total: ${activeMonitors.length} active monitors`);
};

window.clearAllLoadingMonitors = function() {
    console.log('🧹 Clearing all loading monitors...');
    loadingStateMonitor.clearAllMonitoring();
    console.log('✅ All loading monitors cleared');
};

window.forceRecoverLoading = function() {
    const anime = getCurrentAnime();
    if (!anime) {
        console.error('❌ No current anime found');
        return;
    }
    
    console.log('🔧 Force recovering loading states for:', anime.title);
    
    const staffContainer = document.getElementById('anilistInfo');
    const studioContainer = document.getElementById('studioInfo');
    
    // Extract AniList ID for recovery
    const anilistIdMatch = anime.staffLink ? anime.staffLink.match(/\/anime\/(\d+)/) : null;
    const anilistId = anilistIdMatch ? anilistIdMatch[1] : anime.title;
    
    if (staffContainer && staffContainer.innerHTML.includes('Loading…')) {
        console.log('🔧 Recovering stuck staff loading...');
        loadingStateMonitor.recoverStuckLoading('anilistInfo', anilistId, 'staff');
    }
    
    if (studioContainer && studioContainer.innerHTML.includes('Loading…')) {
        console.log('🔧 Recovering stuck studio loading...');
        loadingStateMonitor.recoverStuckLoading('studioInfo', anilistId, 'studio');
    }
};

// Retry function for manual retry buttons
window.retryLoad = function(containerId, animeId, type) {
    console.log(`🔄 Manual retry for ${type} in ${containerId} (anime: ${animeId})`);
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }
    
    // Reset loading state
    container.innerHTML = `<h4>${type === 'staff' ? 'Staff' : 'Studios'}</h4><p>Loading…</p>`;
    
    // Restart monitoring
    loadingStateMonitor.startMonitoring(containerId, animeId, type);
    
    // Force a fresh update
    const currentAnime = getCurrentAnime();
    if (currentAnime) {
        updateViewer(currentIndex);
    }
};

// Comprehensive system status debug function
window.systemStatus = function() {
    console.log('📊 === ANIME VIEWER SYSTEM STATUS ===');
    
    // Basic state
    console.log('\n🎯 Current State:');
    console.log('  Current Index:', typeof currentIndex !== 'undefined' ? currentIndex : 'undefined');
    console.log('  Current Season:', typeof currentSeason !== 'undefined' ? currentSeason : 'undefined');
    console.log('  Current Anime:', typeof currentAnime !== 'undefined' ? (currentAnime ? currentAnime.title : 'none') : 'undefined');
    
    // Loading monitors
    console.log('\n🔍 Loading Monitors:');
    const activeMonitors = loadingStateMonitor.getActiveMonitors();
    if (activeMonitors.length === 0) {
        console.log('  No active monitors');
    } else {
        console.log(`  Active monitors (${activeMonitors.length}):`);
        activeMonitors.forEach(key => console.log(`    ${key}`));
    }
    
    // View state
    const animeViewer = document.getElementById('animeViewer');
    const studioView = document.getElementById('studioView');
    const staffView = document.getElementById('staffView');
    console.log('\n👁️ View State:');
    console.log('  Anime Viewer:', animeViewer ? (animeViewer.style.display !== 'none' ? 'visible' : 'hidden') : 'missing');
    console.log('  Studio View:', studioView ? (studioView.style.display !== 'none' ? 'visible' : 'hidden') : 'missing');
    console.log('  Staff View:', staffView ? (staffView.style.display !== 'none' ? 'visible' : 'hidden') : 'missing');
    
    // Data state
    console.log('\n📚 Data State:');
    debugLog('  AnimeData loaded:', !!animeData);
    if (animeData) {
        console.log('  Available years:', Object.keys(animeData));
        Object.keys(animeData).forEach(year => {
            console.log(`    ${year}:`, Object.keys(animeData[year]));
        });
    }
    
    // Cache state
    console.log('\n💾 Cache State:');
    const staffCacheCount = Object.keys(localStorage).filter(k => k.startsWith('anime_staff_')).length;
    const studioMediaCacheCount = Object.keys(localStorage).filter(k => k.startsWith('studio_media_')).length;
    const annCacheCount = Object.keys(localStorage).filter(k => k.startsWith('ann_staff_')).length;
    const anilistCacheCount = Object.keys(localStorage).filter(k => k.startsWith('anilist_staff_cache_')).length;
    console.log('  Staff Cache Entries:', staffCacheCount);
    console.log('  Studio Media Cache:', studioMediaCacheCount);
    console.log('  ANN Cache Entries:', annCacheCount);
    console.log('  AniList Cache Entries:', anilistCacheCount);
    
    // Session state
    console.log('\n🔄 Session State:');
    const sessionKeys = Object.keys(sessionStorage).filter(k => 
        k.includes('anime') || k.includes('studio') || k.includes('staff') || k.includes('refresh'));
    console.log('  Session Storage Keys:', sessionKeys.length);
    sessionKeys.forEach(key => console.log(`    ${key}`));
    
    // AniList client state
    console.log('\n🌐 AniList Client:');
    if (window.debugAniList) {
        window.debugAniList();
    } else {
        console.log('  Debug function not available');
    }
    
    // Check for stuck loading states
    console.log('\n⏳ Loading State Check:');
    const loadingStaffEls = document.querySelectorAll('.loading-staff');
    console.log('  Stuck "Loading staff..." elements:', loadingStaffEls.length);
    
    // Available debug functions
    console.log('\n🛠️ Available Debug Functions:');
    const debugFunctions = [
        'testBackButton', 'checkSavedIndex', 'findCancelledAnime', 
        'clearSessionStorage', 'testViewer', 'debugAniList', 
        'clearStaffCache', 'checkStaffCache', 'clearStudioMediaCache',
        'systemStatus', 'fixStuckStaff', 'resetRateLimit'
    ];
    debugFunctions.forEach(func => {
        console.log(`  ${func}():`, typeof window[func] === 'function' ? '✅' : '❌');
    });
    
    console.log('\n📊 === STATUS COMPLETE ===');
};

// Debug function to fix stuck staff loading
window.fixStuckStaff = function() {
    console.log('🔧 Fixing stuck staff loading states...');
    
    const loadingEls = document.querySelectorAll('.loading-staff');
    console.log('Found', loadingEls.length, 'stuck loading elements');
    
    loadingEls.forEach((el, index) => {
        el.innerHTML = `
            <p>Staff loading was stuck - manually cleared</p>
            <button onclick="(window.safeReload?window.safeReload(): (function(){ try{ location.reload(); } catch(e){ try{ document.location.reload(); } catch(e2){} } })())" class="retry-btn">🔄 Reload Page</button>
        `;
        console.log(`Fixed loading element ${index + 1}`);
    });
    
    // Also force refresh the current anime staff if we're in viewer
    const animeViewer = document.getElementById('animeViewer');
    if (animeViewer && animeViewer.style.display !== 'none') {
        console.log('Triggering updateViewer to refresh staff...');
        if (typeof updateViewer === 'function') {
            updateViewer();
        }
    }
};

// Debug function to reset rate limiting and force direct AniList
window.resetRateLimit = function() {
    console.log('🔄 Resetting to direct AniList calls...');
    
    // Clear any proxy settings
    localStorage.removeItem('anilistProxy');
    localStorage.removeItem('forceAnilistProxy');
    
    // Reset request timing
    lastAniListRequest = 0;
    
    console.log('✅ Reset complete - using direct AniList with simple rate limiting');
};

// Debug function to enable offline/cache-only mode
window.enableOfflineMode = function() {
    console.log('🔧 Enabling offline/cache-only mode...');
    localStorage.setItem('offlineMode', '1');
    console.log('✅ Offline mode enabled - will only use cached data');
    console.log('💡 Use disableOfflineMode() to re-enable API calls');
    (window.safeReload || function(){ try{ location.reload(); } catch(e) { try { document.location.reload(); } catch(e2){} } })();
};

window.disableOfflineMode = function() {
    localStorage.removeItem('offlineMode');
    console.log('✅ Offline mode disabled - API calls re-enabled');
    (window.safeReload || function(){ try{ location.reload(); } catch(e) { try { document.location.reload(); } catch(e2){} } })();
};

// Function to show current system status
window.systemStatus = function() {
    console.log('🔍 Current System Status:');
    console.log('📱 Offline Mode:', localStorage.getItem('offlineMode') ? 'ENABLED (cache-only)' : 'DISABLED (API calls active)');
    console.log('🌐 AniList Mode: Direct calls with simple rate limiting');
    console.log('⏱️ Last Request:', lastAniListRequest ? new Date(lastAniListRequest).toLocaleTimeString() : 'Never');
    
    // Show staff loading state
    const staffState = window.staffLoadingState;
    if (staffState) {
        console.log('🎭 Staff Loading State:', {
            isLoading: staffState.isLoading,
            currentAnime: staffState.currentAnimeTitle,
            currentIndex: staffState.currentIndex,
            loadingId: staffState.loadingId
        });
    }
    
    // Show cache statistics
    const keys = Object.keys(localStorage);
    const staffKeys = keys.filter(key => key.startsWith('anime_staff_') || key.startsWith('anilist_staff_cache_'));
    console.log('📦 Cached Staff Data:', staffKeys.length, 'entries');
    
    if (localStorage.getItem('offlineMode')) {
        console.log('💡 Commands: disableOfflineMode() to re-enable API calls');
    } else {
        console.log('💡 Commands: enableOfflineMode() for cache-only');
    }
    console.log('🔧 Debug Commands: showStaffLoadingState(), fixStuckStaff(), testStudioFetch(), testNameVariations(), cancelAllStaffRequests()');
}

// Global function to cancel all active requests
window.cancelAllStaffRequests = cancelAllStaffRequests;

// Test name variations for debugging
window.testNameVariations = function(name) {
    console.log(`🔤 Name Variations for "${name}":`);
    const variations = generateNameVariations(name);
    variations.forEach((variation, index) => {
        console.log(`${index + 1}. "${variation}"`);
    });
    console.log(`\n📊 Total variations: ${variations.length}`);
    return variations;
}

// Test staff name matching
window.testStaffMatching = function(annName, anilistNames) {
    console.log(`🎭 Testing staff name matching:`);
    console.log(`ANN Name: "${annName}"`);
    console.log(`AniList candidates:`, anilistNames);
    
    const match = findBestStaffNameMatch(annName, anilistNames);
    console.log(`Best match: ${match ? `"${match}"` : 'None found'}`);
    
    if (match) {
        const similarity = calculateNameSimilarity(annName, match);
        console.log(`Similarity score: ${(similarity * 100).toFixed(1)}%`);
    }
    
    return match;
};

// =====================
// STUDIO FETCHING FUNCTIONS - Restored from backup
// =====================

// Studio ID mapping for faster lookups
const studioIdMapping = {
    'studio pierrot': 1,
    'pierrot': 1,
    'toei animation': 18,
    'toei': 18,
    'madhouse': 11,
    'bones': 4,
    'studio bones': 4,
    'mappa': 569,
    'studio mappa': 569,
    'wit studio': 858,
    'wit': 858,
    'production i.g': 10,
    'i.g': 10,
    'cloverworks': 1835,
    'studio cloverworks': 1835,
    'a-1 pictures': 56,
    'a1 pictures': 56,
    'trigger': 803,
    'studio trigger': 803,
    'kyoto animation': 2,
    'kyoani': 2,
    'ufotable': 43,
    'studio ufotable': 43,
    'shaft': 44,
    'studio shaft': 44,
    'gainax': 6,
    'studio gainax': 6,
    'sunrise': 14,
    'studio sunrise': 14,
    'bandai namco pictures': 1258,
    'j.c.staff': 7,
    'j.c. staff': 7,
    'jc staff': 7,
    'studio j.c.staff': 7,
    'gonzo': 3,
    'studio gonzo': 3,
    'deen': 37,
    'studio deen': 37,
    'white fox': 314,
    'studio white fox': 314,
    'silver link': 300,
    'silver link.': 300,
    'studio silver link': 300,
    'tms entertainment': 73,
    'tms': 73,
    'gekkou': 7284,
    'gekkō': 7284,
    'studio gekkou': 7284,
    'lerche': 456,
    'studio lerche': 456,
    'olm': 28,
    'st signpost': 6109,
    'studio signpost': 6109,
    // Additional major studios
    'studio gallop': 32,
    'gallop': 32,
    'studio 3hz': 1127,
    '3hz': 1127,
    'brain\'s base': 112,
    'brains base': 112,
    'studio brain\'s base': 112,
    'satelight': 41,
    'studio satelight': 41,
    'xebec': 27,
    'studio xebec': 27,
    'feel.': 91,
    'feel': 91,
    'studio feel': 91,
    'dogakobo': 95,
    'doga kobo': 95,
    'studio dogakobo': 95,
    'kinema citrus': 291,
    'studio kinema citrus': 291,
    'pa works': 132,
    'p.a. works': 132,
    'studio pa works': 132,
    'orange': 1109,
    'studio orange': 1109,
    'david production': 287,
    'studio david production': 287,
    '8bit': 441,
    'studio 8bit': 441,
    'passione': 1284,
    'studio passione': 1284,
    'manglobe': 32,
    'studio manglobe': 32,
    'artland': 17,
    'studio artland': 17,
    'bee train': 5,
    'bee-train': 5,
    'studio bee train': 5,
    'group tac': 51,
    'studio group tac': 51,
    'studio fantasia': 1835,
    'fantasia': 1835,
    'actas': 333,
    'studio actas': 333,
    'studio bind': 1993,
    'bind': 1993,
    'cyclone graphics': 6109,
    'studio cyclone graphics': 6109,
    'tatsunoko production': 103,
    'tatsunoko': 103,
    'studio tatsunoko': 103
};

async function fetchStudioAnime(studioName) {
    console.log(`[STUDIO_FETCH] Starting fetch for studio: ${studioName}`);
    
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Studio fetch timeout after 30 seconds')), 30000);
    });
    
    const fetchPromise = (async () => {
        // Check cache first
        const cached = getStudioCache(studioName);
        if (cached) {
            console.log(`[STUDIO_FETCH] Using cached data for: ${studioName}`);
            return cached;
        }

        try {
            // Try AniList first for better image quality and data
            const aniListResults = await fetchStudioAnimeFromAniList(studioName);
            
            if (aniListResults.length > 0) {
                console.log(`[STUDIO_FETCH] Successfully fetched ${aniListResults.length} anime from AniList for ${studioName}`);
                setStudioCache(studioName, aniListResults);
                return aniListResults;
            }
            
            console.log(`[STUDIO_FETCH] No anime found for studio: ${studioName}`);
            return [];
            
        } catch (error) {
            console.error(`[STUDIO_FETCH] Error in fetchStudioAnime for ${studioName}:`, error);
            return [];
        }
    })();
    
    try {
        const result = await Promise.race([fetchPromise, timeoutPromise]);
        console.log(`[STUDIO_FETCH] Successfully completed fetch for ${studioName}:`, result?.length || 0, 'anime');
        return result;
    } catch (error) {
        console.error(`[STUDIO_FETCH] Error or timeout for ${studioName}:`, error.message);
        return [];
    }
}

async function fetchStudioAnimeFromAniList(studioName) {
    console.log('🔍 Fetching studio anime from AniList for:', studioName);
    
    // Try exact mapping first
    let studioId = studioIdMapping[studioName.toLowerCase()];
    
    if (studioId) {
        console.log('✅ Found studio ID in mapping:', studioId, 'for:', studioName);
        return await fetchStudioAnimeById(studioId, studioName);
    }
    
    // Fallback: Search AniList by studio name
    console.log('🔍 Studio not in mapping, searching AniList by name:', studioName);
    try {
        const searchResult = await searchStudioByName(studioName);
        if (searchResult && searchResult.id) {
            console.log('✅ Found studio via search:', searchResult.id, searchResult.name);
            return await fetchStudioAnimeById(searchResult.id, studioName);
        }
    } catch (error) {
        console.error('❌ Error searching studio by name:', error);
    }
    
    console.log('❌ Studio not found via mapping or search:', studioName);
    return [];
}

async function searchStudioByName(studioName) {
    const query = `
        query ($search: String) {
            Studio(search: $search) {
                id
                name
            }
        }
    `;
    
    try {
        const variables = { search: studioName };
        const data = await simpleAniListQuery(query, variables);
        return data?.Studio || null;
    } catch (error) {
        console.error('Error searching studio by name:', error);
        return null;
    }
}

async function fetchStudioAnimeById(studioId, studioName) {
    console.log(`[ANILIST_FETCH] Fetching anime for studio ID: ${studioId} (${studioName})`);
    
    // Optimized query with essential fields only
    const query = `
        query ($studioId: Int, $page: Int, $perPage: Int) {
            Studio(id: $studioId) {
                name
                media(sort: [START_DATE_DESC], page: $page, perPage: $perPage) {
                    nodes {
                        id
                        type
                        title {
                            romaji
                            english
                        }
                        startDate {
                            year
                        }
                        format
                        status
                        averageScore
                        meanScore
                        popularity
                        coverImage {
                            large
                            medium
                        }
                        season
                        seasonYear
                        isAdult
                    }
                    pageInfo {
                        hasNextPage
                        currentPage
                        total
                    }
                }
            }
        }
    `;
    
    try {
        let allAnime = [];
        let currentPage = 1;
        let hasNextPage = true;
        let requestCount = 0;
        const maxRequests = 5; // Conservative limit
        const maxPages = 5; // Conservative limit
        
        while (hasNextPage && currentPage <= maxPages && requestCount < maxRequests) {
            requestCount++;
            
            const variables = {
                studioId: parseInt(studioId),
                page: currentPage,
                perPage: 50
            };
            
            console.log(`[ANILIST_FETCH] Fetching page ${currentPage} for ${studioName}... (Request #${requestCount})`);
            
            const data = await simpleAniListQuery(query, variables);
            
            if (!data || !data.Studio || !data.Studio.media) {
                console.log(`[ANILIST_FETCH] No more data for ${studioName}`);
                break;
            }
            
            const mediaData = data.Studio.media;
            const animeNodes = mediaData.nodes || [];
            
            console.log(`[ANILIST_FETCH] Page ${currentPage}: Found ${animeNodes.length} anime`);
            
            // Filter out adult content and manga, only keep anime
            const filteredAnime = animeNodes.filter(anime => !anime.isAdult && anime.type === 'ANIME');
            allAnime.push(...filteredAnime);
            
            hasNextPage = mediaData.pageInfo.hasNextPage;
            currentPage++;
            
            // Add delay between requests to avoid rate limiting
            if (hasNextPage && currentPage <= maxPages) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
            }
        }
        
        console.log(`[ANILIST_FETCH] Completed fetching for ${studioName}: ${allAnime.length} total anime`);
        
        // Deduplicate by ID first (important for preventing duplicate cards)
        const uniqueAnime = allAnime.reduce((acc, anime) => {
            if (!acc.find(existing => existing.id === anime.id)) {
                acc.push(anime);
            }
            return acc;
        }, []);
        
        console.log(`[ANILIST_FETCH] After deduplication: ${uniqueAnime.length} unique anime`);
        
        // Process and format the results
        const processedAnime = uniqueAnime.map(anime => {
            const title = anime.title.english || anime.title.romaji || 'Unknown Title';
            const format = anime.format || 'Unknown';
            const status = anime.status || 'Unknown';
            
            // Improved year categorization logic
            let year;
            if (status === 'CANCELLED') {
                year = 'Cancelled';
            } else if (!anime.startDate?.year) {
                // No start date - check if it's upcoming or truly unknown
                if (status === 'NOT_YET_RELEASED' || status === 'RELEASING') {
                    year = 'TBA';
                } else {
                    year = 'Unknown';
                }
            } else {
                year = anime.startDate.year;
            }
            
            return {
                id: anime.id,
                title: title, // Use consistent field name
                name: title,  // Keep for backwards compatibility
                year: year,
                score: anime.averageScore || 0,
                averageScore: anime.averageScore,
                meanScore: anime.meanScore,
                popularity: anime.popularity,
                format: format,
                status: status,
                season: anime.season,
                seasonYear: anime.seasonYear,
                picture: anime.coverImage?.large || anime.coverImage?.medium || null,
                image: anime.coverImage?.large || anime.coverImage?.medium || null, // Consistent field
                type: format,
                vintage: `${year}`, // For compatibility with existing display code
                anilistId: anime.id
            };
        });
        
        // Sort by year (newest first)
        processedAnime.sort((a, b) => {
            const yearA = parseInt(a.year) || 0;
            const yearB = parseInt(b.year) || 0;
            return yearB - yearA;
        });
        
        return processedAnime;
        
    } catch (error) {
        console.error(`[ANILIST_FETCH] Error fetching studio anime for ${studioName}:`, error);
        return [];
    }
}

// Studio cache functions
function getStudioCache(studioName) {
    try {
        const cached = localStorage.getItem(`studio_cache_${studioName}`);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age > maxAge) {
            localStorage.removeItem(`studio_cache_${studioName}`);
            return null;
        }
        
        return data.anime;
    } catch (error) {
        console.error('Error reading studio cache:', error);
        return null;
    }
}

function setStudioCache(studioName, anime) {
    try {
        const data = {
            timestamp: Date.now(),
            anime: anime
        };
        localStorage.setItem(`studio_cache_${studioName}`, JSON.stringify(data));
    } catch (error) {
        console.error('Error setting studio cache:', error);
    }
}

// Debug function to test studio fetching
window.testStudioFetch = async function(studioName = 'mappa') {
    console.log('🧪 Testing studio fetch for:', studioName);
    try {
        const result = await fetchStudioAnime(studioName);
        console.log('✅ Studio fetch result:', result.length, 'anime found');
        if (result.length > 0) {
            console.log('📋 Sample titles:', result.slice(0, 5).map(a => `${a.name} (${a.year})`));
        }
        return result;
    } catch (error) {
        console.error('❌ Studio fetch test failed:', error);
        return [];
    }
};

// Test simple AniList query
window.testSimpleQuery = async function() {
    console.log('🧪 Testing simple AniList query...');
    const query = `query { Media(id: 1) { title { romaji } } }`;
    try {
        const result = await simpleAniListQuery(query);
        console.log('✅ Simple query result:', result);
        return result;
    } catch (error) {
        console.error('❌ Simple query failed:', error);
        return null;
    }
};

// Test studio query specifically  
window.testStudioQuery = async function() {
    console.log('🧪 Testing studio query...');
    const query = `
        query ($studioId: Int) {
            Studio(id: $studioId) {
                name
                media(sort: [START_DATE_DESC], page: 1, perPage: 5) {
                    nodes {
                        id
                        title {
                            romaji
                            english
                        }
                        startDate {
                            year
                        }
                        type
                        format
                    }
                }
            }
        }
    `;
    try {
        const result = await simpleAniListQuery(query, { studioId: 569 }); // MAPPA
        console.log('✅ Studio query result:', result);
        return result;
    } catch (error) {
        console.error('❌ Studio query failed:', error);
        return null;
    }
};

// Test the new studio extraction function
window.testStudioExtraction = async function(staffLink = 'https://anilist.co/anime/170577/Campfire-Cooking-in-Another-World-with-My-Absurd-Skill/') {
    console.log('🧪 Testing studio extraction for:', staffLink);
    try {
        const result = await extractStudioName(staffLink);
        console.log('✅ Studio extraction result:', result);
        return result;
    } catch (error) {
        console.error('❌ Studio extraction test failed:', error);
        return null;
    }
};

// Test the enhanced studio search with fallbacks
window.testEnhancedStudioSearch = async function(studioName = 'MAPPA') {
    console.log('🧪 Testing enhanced studio search for:', studioName);
    try {
        const result = await searchStudioWithFallbacks(studioName);
        console.log('✅ Enhanced studio search result:', result);
        return result;
    } catch (error) {
        console.error('❌ Enhanced studio search test failed:', error);
        return null;
    }
};

// Test studio fetching with the enhanced system
window.testEnhancedStudioFetch = async function(studioName = 'MAPPA') {
    console.log('🧪 Testing enhanced studio anime fetching for:', studioName);
    try {
        const result = await fetchStudioAnime(studioName);
        console.log('✅ Enhanced studio fetch result:', result.length, 'anime found');
        console.log('First few results:', result.slice(0, 3));
        return result;
    } catch (error) {
        console.error('❌ Enhanced studio fetch test failed:', error);
        return [];
    }
};

// Test clearing studio cache
window.clearStudioCache = function() {
    const keys = Object.keys(localStorage);
    const studioKeys = keys.filter(key => key.startsWith('anime_studios_') || key.startsWith('studio_cache_'));
    studioKeys.forEach(key => localStorage.removeItem(key));
    console.log('🧹 Cleared studio cache:', studioKeys.length, 'entries');
    console.log('  Cleared keys:', studioKeys);
};

// Reset rate limiting
window.resetRateLimit = function() {
    consecutiveFailures = 0;
    lastAniListRequest = 0;
    console.log('🔄 Rate limiting reset - consecutive failures cleared, ready for new requests');
};

// Test proxy connection
window.testProxy = async function() {
    console.log('🧪 Testing proxy connection...');
    try {
        const response = await fetch('http://localhost:4000/health');
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Proxy is running:', data);
            return true;
        } else {
            console.log('❌ Proxy responded but not OK:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Proxy connection failed:', error.message);
        return false;
    }
};

// Force enable proxy
window.enableProxy = function() {
    useProxy = true;
    localStorage.setItem('anilistProxy', 'http://localhost:4000/graphql');
    consecutiveFailures = 0;
    console.log('🔄 Proxy force-enabled, consecutive failures reset');
};

// Periodic check for stuck loading states - MORE AGGRESSIVE
setInterval(() => {
    if (typeof checkAndFixStuckLoading === 'function') {
        checkAndFixStuckLoading();
    }
}, 3000); // Check every 3 seconds for faster recovery

// Additional check specifically after navigation
window.addEventListener('popstate', () => {
    setTimeout(() => {
        if (typeof checkAndFixStuckLoading === 'function') {
            checkAndFixStuckLoading();
        }
    }, 2000); // Check 2 seconds after navigation
});

console.log('🚀 Script initialization complete - auto-checking for stuck loading states every 3 seconds');

// Debug function to test name variations
window.testNameVariations = function(name) {
    console.log(`🧪 Testing name variations for: "${name}"`);
    const variations = generateNameVariations(name);
    console.log(`📝 Generated ${variations.length} variations:`);
    variations.forEach((variation, index) => {
        console.log(`  ${index + 1}. "${variation}"`);
    });
    
    // Test specific examples
    console.log('\n🎯 Testing specific problematic names:');
    const testNames = [
        'Tatsuya Endō',
        'Yoshitoki Ōima', 
        'Yūsuke Isōchi',
        'Endou Tatsuya',
        'Ooima Yoshitoki',
        'Yuusuke'
    ];
    
    testNames.forEach(testName => {
        console.log(`\n📝 Variations for "${testName}":`);
        const testVariations = generateNameVariations(testName);
        testVariations.slice(0, 10).forEach((variation, index) => {
            console.log(`  ${index + 1}. "${variation}"`);
        });
    });
    
    return variations;
};

// Debug function to test staff search with variations
window.testStaffSearch = async function(staffName) {
    console.log(`🧪 Testing staff search for: "${staffName}"`);
    try {
        const result = await fetchStaffRoles(staffName, true);
        if (result) {
            console.log(`✅ Found ${result.length} roles for "${staffName}"`);
            return result;
        } else {
            console.log(`❌ No results found for "${staffName}"`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error testing staff search:`, error);
        return null;
    }
};

// Quick test function for the problematic names
window.testProblematicNames = async function() {
    console.log('🧪 Testing known problematic staff names...');
    
    const problematicNames = [
        'Tatsuya Endō',      // Should find as 'Endou'  
        'Yoshitoki Ōima',    // Should find as 'Ooima'
        'Yūsuke Isōchi',     // Should find as 'Yuusuke'
        'Endou Tatsuya',     // Reverse order test
        'Ooima Yoshitoki'    // Reverse order test
    ];
    
    for (const name of problematicNames) {
        console.log(`\n🔍 Testing: "${name}"`);
        console.log('Variations:', generateNameVariations(name).slice(0, 5));
        console.log('Normalized display:', normalizeStaffNameForDisplay(name));
    }
};

// Test similarity calculation
window.testSimilarity = function(name1, name2) {
    const similarity = calculateStringSimilarity(name1, name2);
    console.log(`🧪 Similarity between "${name1}" and "${name2}": ${similarity.toFixed(2)} (${(similarity * 100).toFixed(1)}%)`);
    return similarity;
};

// Function to normalize displayed staff names (for consistent display)
function normalizeStaffNameForDisplay(staffName) {
    if (!staffName) return '';
    
    let correctedName = staffName;
    
    // General pattern-based corrections (works for any name)
    const generalCorrections = [
        // Convert double vowels to macrons
        { pattern: /ou/g, replacement: 'ō' },
        { pattern: /oo/g, replacement: 'ō' },
        { pattern: /uu/g, replacement: 'ū' },
        { pattern: /ii/g, replacement: 'ī' },
        { pattern: /aa/g, replacement: 'ā' },
        { pattern: /ee/g, replacement: 'ē' }
    ];
    
    // Apply vowel corrections first
    for (const { pattern, replacement } of generalCorrections) {
        correctedName = correctedName.replace(pattern, replacement);
    }
    
    // Then handle capitalization properly (only at start of words, not after macrons)
    correctedName = correctedName.replace(/(?:^|\s)([a-z])/g, (match, p1) => match.replace(p1, p1.toUpperCase()));
    
    return correctedName;
}

// ================================
// CACHE MANAGEMENT TOOLS
// ================================

// Global cache management functions for console debugging
window.CacheDebug = {
    // Show cache statistics
    stats() {
        console.log('📊 Cache Statistics:');
        const stats = CacheManager.getStats();
        let totalEntries = 0;
        let totalSize = 0;
        
        Object.entries(stats).forEach(([type, info]) => {
            const sizeMB = (info.totalSize / 1024 / 1024).toFixed(2);
            console.log(`  ${type}: ${info.count} entries, ${sizeMB}MB`);
            totalEntries += info.count;
            totalSize += info.totalSize;
        });
        
        const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
        console.log(`  TOTAL: ${totalEntries} entries, ${totalSizeMB}MB`);
        
        // Show localStorage usage
        const used = JSON.stringify(localStorage).length;
        const usedMB = (used / 1024 / 1024).toFixed(2);
        console.log(`  LocalStorage Total: ${usedMB}MB used`);
        
        return stats;
    },
    
    // Clear specific cache type
    clear(type) {
        if (type && CacheManager.CACHE_TYPES[type]) {
            CacheManager.clearType(type);
            console.log(`🧹 Cleared ${type} cache`);
        } else {
            console.log('Available cache types:', Object.keys(CacheManager.CACHE_TYPES));
        }
    },
    
    // Clear all enhanced caches
    clearAll() {
        Object.keys(CacheManager.CACHE_TYPES).forEach(type => {
            CacheManager.clearType(type);
        });
        console.log('🧹 Cleared all enhanced caches');
    },
    
    // Export cache data for backup
    export() {
        const data = {};
        Object.keys(CacheManager.CACHE_TYPES).forEach(type => {
            const config = CacheManager.CACHE_TYPES[type];
            const entries = {};
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(config.prefix)) {
                    try {
                        entries[key] = JSON.parse(localStorage.getItem(key));
                    } catch (e) {
                        entries[key] = localStorage.getItem(key);
                    }
                }
            }
            
            if (Object.keys(entries).length > 0) {
                data[type] = entries;
            }
        });
        
        console.log('📦 Cache export data:', data);
        return data;
    },
    
    // Import cache data from backup
    import(data) {
        let imported = 0;
        
        Object.entries(data).forEach(([type, entries]) => {
            if (CacheManager.CACHE_TYPES[type]) {
                Object.entries(entries).forEach(([key, value]) => {
                    try {
                        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                        imported++;
                    } catch (e) {
                        console.warn(`Failed to import ${key}:`, e);
                    }
                });
            }
        });
        
        console.log(`📥 Imported ${imported} cache entries`);
        return imported;
    },
    
    // Show cache for specific item
    inspect(type, identifier) {
        const data = CacheManager.get(type, identifier);
        if (data !== null) {
            console.log(`🔍 Cache data for ${type}:${identifier}:`, data);
            return data;
        } else {
            console.log(`❌ No cache found for ${type}:${identifier}`);
            return null;
        }
    },
    
    // Cleanup expired entries manually
    cleanup() {
        const cleaned = CacheManager.cleanup();
        console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
        return cleaned;

    }
};

// Quick access functions

// Enhanced debug functions for testing
window.testOfflineDisplay = function() {
    console.log('🧪 Testing offline display...');
    const currentAnime = getCurrentAnime();
    if (!currentAnime) {
        console.log('❌ No current anime found');
        return;
    }
    
    console.log('📊 Current anime:', currentAnime.title);
    
    if (currentAnime.staffLink) {
        const anilistIdMatch = currentAnime.staffLink.match(/\/anime\/(\d+)/);
        if (anilistIdMatch) {
            const anilistId = anilistIdMatch[1];
            const animeKey = `anime_${anilistId}`;
            console.log('🔍 Looking for key:', animeKey);
            
            const offlineAnimeEntry = window.massUpdater?.offlineData?.[animeKey];
            if (offlineAnimeEntry) {
                console.log('✅ Found offline data:', offlineAnimeEntry);
                const animeData = offlineAnimeEntry.data;
                if (animeData) {
                    console.log('📋 Staff count:', animeData.staff?.edges?.length || 0);
                    console.log('🏢 Studio count:', animeData.studios?.edges?.length || 0);
                }
            } else {
                console.log('❌ No offline data found');
            }
        }
    }
};

window.checkLoadingStatus = function() {
    console.log('🔍 Checking loading status...');
    const staffContainer = document.getElementById('anilistInfo');
    const studioContainer = document.getElementById('studioInfo');
    
    console.log('📦 Offline mode:', window.massUpdater?.isOfflineMode() || false);
    console.log('👥 Staff container loading:', staffContainer?.innerHTML?.includes('Loading…') || false);
    console.log('🏢 Studio container loading:', studioContainer?.innerHTML?.includes('Loading…') || false);
    
    // Check loading start times
    console.log('⏱️ Staff loading start time:', window.staffLoadingStartTime || 'Not set');
    console.log('⏱️ Studio loading start time:', window.studioLoadingStartTime || 'Not set');
    
    // Check last stuck check time
    console.log('🔧 Last stuck check:', window.lastStuckCheck || 'Never');
    console.log('🔧 Time since last check:', window.lastStuckCheck ? Date.now() - window.lastStuckCheck : 'N/A', 'ms');
};

window.checkOfflineMode = function() {
    console.log('🔍 Checking offline mode status...');
    console.log('📦 Offline mode enabled:', window.massUpdater?.isOfflineMode() || false);
    console.log('💾 Offline data loaded:', !!window.massUpdater?.offlineData);
    console.log('📊 Offline data entries:', Object.keys(window.massUpdater?.offlineData || {}).length);
    
    if (window.massUpdater?.offlineData) {
        console.log('🔑 Sample keys:', Object.keys(window.massUpdater.offlineData).slice(0, 5));
    }
};

window.checkLastUpdate = function() {
    console.log('🔍 Checking last update results...');
    const entries = Object.keys(window.massUpdater?.offlineData || {});
    console.log('📊 Total entries:', entries.length);
    
    if (entries.length > 0) {
        // Check timestamps to see what was recently added
        const now = Date.now();
        const recent = [];
        const older = [];
        
        entries.forEach(key => {
            const entry = window.massUpdater.offlineData[key];
            if (entry && entry.timestamp) {
                const age = now - entry.timestamp;
                const hours = Math.floor(age / (1000 * 60 * 60));
                const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
                
                if (age < 1000 * 60 * 30) { // Less than 30 minutes
                    recent.push({key, age: `${minutes}m ago`});
                } else if (age < 1000 * 60 * 60 * 24) { // Less than 24 hours
                    older.push({key, age: `${hours}h ${minutes}m ago`});
                } else {
                    older.push({key, age: `${Math.floor(hours/24)}d ago`});
                }
            }
        });
        
        console.log(`🆕 Recent entries (last 30 min): ${recent.length}`);
        recent.slice(0, 10).forEach(item => console.log(`   ${item.key} - ${item.age}`));
        
        console.log(`📅 Older entries: ${older.length}`);
        older.slice(0, 5).forEach(item => console.log(`   ${item.key} - ${item.age}`));
        
        // Check if any Fall 2025 anime were processed
        const fall2025 = entries.filter(key => {
            const entry = window.massUpdater.offlineData[key];
            return entry && entry.data && (
                key.includes('153800') || // One Punch Man
                key.includes('177937') || // SPY×FAMILY
                key.includes('182896') || // My Hero Academia
                key.includes('162669') || 
                key.includes('129195')
            );
        });
        
        console.log(`🎬 Fall 2025 sample anime found: ${fall2025.length}`);
        fall2025.forEach(key => {
            const entry = window.massUpdater.offlineData[key];
            const title = entry.data?.title || entry.data?.Media?.title?.english || entry.data?.Media?.title?.romaji || 'No title';
            console.log(`   ${key} - ${title} - ${new Date(entry.timestamp).toLocaleTimeString()}`);
        });
    }
};

window.debugCurrentSeasonUpdate = function() {
    console.log('🔍 Debugging Current Season Update...');
    
    // Check localStorage
    const localData = localStorage.getItem('anilist-offline-data');
    if (localData) {
        try {
            const parsed = JSON.parse(localData);
            console.log('💾 LocalStorage data found:');
            console.log(`   Timestamp: ${new Date(parsed.timestamp).toLocaleString()}`);
            console.log(`   Entries: ${Object.keys(parsed.data || {}).length}`);
            console.log(`   Size: ${Math.round(localData.length / 1024)}KB`);
        } catch (e) {
            console.log('❌ LocalStorage data corrupted');
        }
    } else {
        console.log('❌ No localStorage data found');
    }
    
    // Check in-memory data
    if (window.massUpdater?.offlineData) {
        console.log('💾 In-memory data:');
        console.log(`   Entries: ${Object.keys(window.massUpdater.offlineData).length}`);
        
        // Check Fall 2025 anime specifically
        const fall2025Ids = [153800, 177937, 182896, 162669, 129195];
        const foundAnime = fall2025Ids.map(id => {
            const key = `anime_${id}`;
            const entry = window.massUpdater.offlineData[key];
            return {
                id,
                found: !!entry,
                title: entry?.data?.title || entry?.data?.Media?.title?.english || entry?.data?.Media?.title?.romaji || 'N/A',
                timestamp: entry ? new Date(entry.timestamp).toLocaleTimeString() : 'N/A',
                hasStaff: entry?.data?.staff?.edges?.length || 0,
                hasStudios: entry?.data?.studios?.edges?.length || 0
            };
        });
        
        console.log('🎬 Fall 2025 sample anime status:');
        foundAnime.forEach(anime => {
            console.log(`   ${anime.id}: ${anime.found ? '✅' : '❌'} ${anime.title} (Staff: ${anime.hasStaff}, Studios: ${anime.hasStudios}) - ${anime.timestamp}`);
        });
    } else {
        console.log('❌ No in-memory data found');
    }
    
    // Check if saveOfflineData was called recently
    console.log('🔍 Recent console activity (check for save messages)');
};

window.fetchMissingFall2025 = async function() {
    console.log('🔍 Fetching missing Fall 2025 anime...');
    
    if (!window.massUpdater) {
        console.log('❌ Mass updater not available');
        return;
    }
    
    // Check which Fall 2025 anime are missing
    const fall2025Ids = [153800, 177937, 182896, 162669, 129195];
    const missing = fall2025Ids.filter(id => {
        const key = `anime_${id}`;
        return !window.massUpdater.offlineData[key];
    });
    
    if (missing.length === 0) {
        console.log('✅ All Fall 2025 sample anime are already cached');
        return;
    }
    
    console.log(`🎯 Found ${missing.length} missing anime:`, missing);
    
    const initialCount = Object.keys(window.massUpdater.offlineData).length;
    
    for (let i = 0; i < missing.length; i++) {
        const animeId = missing[i];
        console.log(`📥 Fetching anime ${animeId} (${i + 1}/${missing.length})...`);
        
        try {
            await window.massUpdater.fetchAndStoreAnimeData(animeId);
            console.log(`✅ Successfully fetched anime ${animeId}`);
            
            // Wait between requests
            if (i < missing.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error(`❌ Failed to fetch anime ${animeId}:`, error);
        }
    }
    
    // Save the new data
    window.massUpdater.saveOfflineData();
    
    const finalCount = Object.keys(window.massUpdater.offlineData).length;
    console.log(`🎉 Fetch complete! ${initialCount} → ${finalCount} (+${finalCount - initialCount} new entries)`);
    
    // Check results
    window.debugCurrentSeasonUpdate();
};

window.debugOnePunchMan = function() {
    console.log('🥊 Debugging One Punch Man Season 3...');
    
    // Check if it exists in current season data
    const [seasonName, year] = currentSeason.split(' ');
    const seasonData = animeData[year]?.[seasonName] || [];
    
    console.log(`📋 Current season: ${currentSeason}`);
    console.log(`📊 Season has ${seasonData.length} anime`);
    
    // Find One Punch Man in season data
    const opmIndex = seasonData.findIndex(anime => 
        anime.title.includes('One-Punch Man') || 
        anime.title.includes('One Punch Man') ||
        anime.anilistId === 153800 ||
        (anime.staffLink && anime.staffLink.includes('153800'))
    );
    
    if (opmIndex !== -1) {
        const opmAnime = seasonData[opmIndex];
        console.log(`✅ Found One Punch Man at index ${opmIndex}:`);
        console.log(`   Title: ${opmAnime.title}`);
        console.log(`   AniList ID: ${opmAnime.anilistId || 'N/A'}`);
        console.log(`   Staff Link: ${opmAnime.staffLink || 'N/A'}`);
        console.log(`   Full data:`, opmAnime);
        
        console.log(`🎯 Current index: ${currentIndex}`);
        console.log(`🎯 OPM index: ${opmIndex}`);
        
        if (currentIndex === opmIndex) {
            console.log('✅ Currently viewing One Punch Man');
        } else {
            console.log('ℹ️ Currently viewing different anime');
        }
    } else {
        console.log('❌ One Punch Man not found in current season data');
        console.log('📋 Available titles:');
        seasonData.slice(0, 5).forEach((anime, i) => {
            console.log(`   ${i}: ${anime.title}`);
        });
    }
    
    // Check offline data
    // Correct lookup for offline data structure
    const offlineData = window.massUpdater?.offlineData?.data?.anime?.['153800'];
    console.log(`💾 Offline data for 153800: ${!!offlineData ? 'EXISTS' : 'MISSING'}`);
    if (offlineData) {
        console.log(`   Timestamp: ${new Date(offlineData.timestamp).toLocaleString()}`);
        // If staff and studios are present, print their lengths
        if (offlineData.staff) {
            console.log(`   Has staff: ${offlineData.staff.length}`);
        }
        if (offlineData.studios) {
            console.log(`   Has studios: ${offlineData.studios.length}`);
        }
    }
}

window.debugAnimeList = function() {
    console.log('📋 Debugging anime list...');
    
    const modal = document.getElementById('fullListModal');
    const grid = document.querySelector('#fullListModal .anime-grid');
    
    if (!modal) {
        console.log('❌ Full list modal not found in DOM');
        return;
    }
    
    if (!grid) {
        console.log('❌ Anime grid not found in modal');
        return;
    }
    
    const items = grid.querySelectorAll('.anime-item');
    console.log(`📊 Found ${items.length} anime items in list`);
    
    // Check if One Punch Man is in the list
    let opmItem = null;
    items.forEach((item, index) => {
        const title = item.querySelector('h3')?.textContent || '';
        if (title.includes('One-Punch Man') || title.includes('One Punch Man')) {
            opmItem = {element: item, index, title};
        }
    });
    
    if (opmItem) {
        console.log(`✅ Found One Punch Man in list at position ${opmItem.index}: "${opmItem.title}"`);
        console.log(`🖱️ Click handler attached: ${!!opmItem.element.onclick || opmItem.element.listeners}`);
        
        // Test click programmatically
        console.log('🧪 Testing click handler...');
        try {
            opmItem.element.click();
            console.log('✅ Click event fired successfully');
        } catch (error) {
            console.error('❌ Click event failed:', error);
        }
    } else {
        console.log('❌ One Punch Man not found in anime list');
        console.log('📋 Available titles:');
        Array.from(items).slice(0, 5).forEach((item, i) => {
            const title = item.querySelector('h3')?.textContent || 'No title';
            console.log(`   ${i}: ${title}`);
        });
    }
}

// Quick diagnostic functions
window.checkLoading = () => window.DiagnosticTools.checkLoadingState();
window.forceReload = () => window.DiagnosticTools.forceReload();
window.testAPIs = () => window.DiagnosticTools.testConnectivity();
window.findStuck = () => window.DiagnosticTools.findStuckLoading();

console.log('💾 Enhanced caching system loaded!');
console.log('📖 Use cacheStats() to see cache usage');
console.log('🧹 Use clearCache("TYPE") to clear specific cache');
console.log('📊 Use window.CacheDebug for full management tools');
console.log('🔧 Use checkLoading() to diagnose loading issues');
console.log('🔄 Use forceReload() to reload current anime data');
console.log('🌐 Use testAPIs() to check connectivity');

}
// End of script.new.js
