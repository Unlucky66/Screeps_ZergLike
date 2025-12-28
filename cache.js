/**
 * Global Cache Manager
 */

var CONFIG = require('config');

if (!global.Cache) {
    global.Cache = {
        rooms: {},
        paths: {},
        tick: 0
    };
}

var CacheManager = {
    get: function(key, ttl) {
        ttl = ttl || CONFIG.PERFORMANCE.CACHE_TTL;
        var entry = global.Cache[key];
        if (entry && Game.time - entry.time < ttl) {
            return entry.data;
        }
        return null;
    },
    
    set: function(key, data) {
        global.Cache[key] = { data: data, time: Game.time };
        return data;
    },
    
    clear: function() {
        if (Game.time - global.Cache.tick > 100) {
            global.Cache.rooms = {};
            global.Cache.paths = {};
            global.Cache.tick = Game.time;
        }
    }
};

module.exports = CacheManager;