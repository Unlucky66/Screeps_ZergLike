/**
 * Enhanced Memory Manager
 * - Deep cleaning of stale data
 * - Memory compression
 * - Automatic garbage collection
 * - Memory statistics
 * - Corruption detection & repair
 */

var CacheManager = require('cache');

var MemoryManager = {
    
    // Memory version for migration
    MEMORY_VERSION: 2,
    
    // Cleanup intervals (in ticks)
    INTERVALS: {
        CREEP_CLEANUP: 1,
        ROOM_CLEANUP: 100,
        SCOUT_CLEANUP: 500,
        THREAT_CLEANUP: 50,
        REMOTE_CLEANUP: 200,
        STATS_CLEANUP: 1000,
        DEEP_CLEAN: 5000,
        PATH_CACHE_CLEANUP: 100,
        FLAG_CLEANUP: 500,
        CONSTRUCTION_CLEANUP: 200
    },
    
    // Data expiration times (in ticks)
    EXPIRATION: {
        SCOUT_DATA: 15000,
        THREAT_DATA: 100,
        REMOTE_INACTIVE: 10000,
        PATH_CACHE: 500,
        CREEP_MOVE_DATA: 50,
        HOSTILE_DATA: 200
    },
    
    /**
     * Main initialization
     */
    initialize: function() {
        // Initialize core memory structure FIRST
        this.initializeCoreMemory();
        
        // Check memory version and migrate if needed
        this.checkVersion();
        
        // Clear cache
        CacheManager.clear();
        
        // Run cleanups based on intervals (AFTER memory is initialized)
        this.runScheduledCleanups();
        
        // Update memory stats periodically
        if (Game.time % 100 === 0) {
            this.updateMemoryStats();
        }
    },
    
    /**
     * Initialize core memory structure
     */
    initializeCoreMemory: function() {
        if (!Memory.hive) {
            Memory.hive = this.getDefaultHiveMemory();
            this.log('Initialized new hive memory', 'SUCCESS');
        }
        
        // Ensure all required sub-objects exist
        var defaults = this.getDefaultHiveMemory();
        for (var key in defaults) {
            if (Memory.hive[key] === undefined) {
                Memory.hive[key] = defaults[key];
            }
        }
        
        // Ensure cache exists
        if (!Memory.hive.cache) {
            Memory.hive.cache = { lastClean: {}, memorySize: 0 };
        }
        
        if (!Memory.hive.cache.lastClean) {
            Memory.hive.cache.lastClean = {};
        }
    },
    
    /**
     * Get default hive memory structure
     */
    getDefaultHiveMemory: function() {
        return {
            version: this.MEMORY_VERSION,
            colonies: {},
            remotes: {},
            threats: {},
            scoutData: {},
            expansionTargets: [],
            warTargets: [],
            allies: [],
            enemies: [],
            stats: {
                energyHarvested: 0,
                energySpent: 0,
                creepsSpawned: 0,
                creepsLost: 0,
                enemiesKilled: 0,
                roomsClaimed: 0,
                lastReset: Game.time
            },
            settings: {
                autoExpand: true,
                autoDefend: true,
                autoAttack: false,
                autoRemote: true,
                debugMode: false,
                cpuThrottle: 0.9
            },
            creepIndex: Game.time,
            cache: {
                lastClean: {},
                memorySize: 0
            }
        };
    },
    
    /**
     * Simple logging function
     */
    log: function(message, level) {
        level = level || 'INFO';
        var colors = {
            'DEBUG': '#888888',
            'INFO': '#ffffff',
            'WARN': '#ffaa00',
            'ERROR': '#ff0000',
            'SUCCESS': '#00ff00'
        };
        console.log('<span style="color:' + colors[level] + '">[' + Game.time + '] ' + message + '</span>');
    },
    
    /**
     * Check memory version and migrate if needed
     */
    checkVersion: function() {
        if (!Memory.hive.version || Memory.hive.version < this.MEMORY_VERSION) {
            this.migrateMemory(Memory.hive.version || 1);
            Memory.hive.version = this.MEMORY_VERSION;
            this.log('Memory migrated to version ' + this.MEMORY_VERSION, 'SUCCESS');
        }
    },
    
    /**
     * Migrate memory from old version
     */
    migrateMemory: function(fromVersion) {
        this.log('Migrating memory from version ' + fromVersion, 'INFO');
        
        if (fromVersion < 2) {
            if (!Memory.hive.allies) Memory.hive.allies = [];
            if (!Memory.hive.enemies) Memory.hive.enemies = [];
            if (!Memory.hive.cache) Memory.hive.cache = { lastClean: {}, memorySize: 0 };
        }
    },
    
    /**
     * Run scheduled cleanups based on intervals
     */
    runScheduledCleanups: function() {
        // Safety check - ensure memory is initialized
        if (!Memory.hive || !Memory.hive.cache || !Memory.hive.cache.lastClean) {
            return;
        }
        
        var lastClean = Memory.hive.cache.lastClean;
        var time = Game.time;
        
        // Creep cleanup - every tick
        this.cleanCreepMemory();
        
        // Room cleanup
        if (!lastClean.room || time - lastClean.room >= this.INTERVALS.ROOM_CLEANUP) {
            this.cleanRoomMemory();
            lastClean.room = time;
        }
        
        // Scout data cleanup
        if (!lastClean.scout || time - lastClean.scout >= this.INTERVALS.SCOUT_CLEANUP) {
            this.cleanScoutData();
            lastClean.scout = time;
        }
        
        // Threat cleanup
        if (!lastClean.threat || time - lastClean.threat >= this.INTERVALS.THREAT_CLEANUP) {
            this.cleanThreatData();
            lastClean.threat = time;
        }
        
        // Remote cleanup
        if (!lastClean.remote || time - lastClean.remote >= this.INTERVALS.REMOTE_CLEANUP) {
            this.cleanRemoteData();
            lastClean.remote = time;
        }
        
        // Path cache cleanup
        if (!lastClean.path || time - lastClean.path >= this.INTERVALS.PATH_CACHE_CLEANUP) {
            this.cleanPathCache();
            lastClean.path = time;
        }
        
        // Flag cleanup
        if (!lastClean.flag || time - lastClean.flag >= this.INTERVALS.FLAG_CLEANUP) {
            this.cleanFlagMemory();
            lastClean.flag = time;
        }
        
        // Construction cleanup
        if (!lastClean.construction || time - lastClean.construction >= this.INTERVALS.CONSTRUCTION_CLEANUP) {
            this.cleanConstructionMemory();
            lastClean.construction = time;
        }
        
        // Stats cleanup
        if (!lastClean.stats || time - lastClean.stats >= this.INTERVALS.STATS_CLEANUP) {
            this.cleanStatsData();
            lastClean.stats = time;
        }
        
        // Deep clean
        if (!lastClean.deep || time - lastClean.deep >= this.INTERVALS.DEEP_CLEAN) {
            this.deepClean();
            lastClean.deep = time;
        }
    },
    
    /**
     * Clean dead creep memory
     */
    cleanCreepMemory: function() {
        var cleaned = 0;
        
        for (var name in Memory.creeps) {
            if (!Game.creeps[name]) {
                if (Memory.creeps[name] && Memory.creeps[name].role) {
                    if (Memory.hive && Memory.hive.stats) {
                        Memory.hive.stats.creepsLost++;
                    }
                }
                delete Memory.creeps[name];
                cleaned++;
            } else {
                this.cleanCreepMoveData(Game.creeps[name]);
            }
        }
        
        return cleaned;
    },
    
    /**
     * Clean stale movement data from creep
     */
    cleanCreepMoveData: function(creep) {
        if (!creep || !creep.memory || !creep.memory._move) return;
        
        var moveData = creep.memory._move;
        
        if (moveData.time && Game.time - moveData.time > this.EXPIRATION.CREEP_MOVE_DATA) {
            delete creep.memory._move;
            return;
        }
        
        if (moveData.dest) {
            var dest = moveData.dest;
            if (creep.pos.x === dest.x && creep.pos.y === dest.y && creep.pos.roomName === dest.room) {
                delete creep.memory._move;
            }
        }
    },
    
    /**
     * Clean room memory
     */
    cleanRoomMemory: function() {
        if (!Memory.hive || !Memory.hive.colonies) return 0;
        
        var cleaned = 0;
        
        for (var roomName in Memory.hive.colonies) {
            var room = Game.rooms[roomName];
            
            if (room && (!room.controller || !room.controller.my)) {
                delete Memory.hive.colonies[roomName];
                cleaned++;
                this.log('Removed colony data for lost room: ' + roomName, 'WARN');
            }
            
            if (Memory.hive.colonies[roomName]) {
                this.cleanColonyData(roomName);
            }
        }
        
        if (Memory.rooms) {
            for (var rName in Memory.rooms) {
                var roomMem = Memory.rooms[rName];
                if (roomMem && roomMem.lastSeen && Game.time - roomMem.lastSeen > 10000) {
                    delete Memory.rooms[rName];
                    cleaned++;
                }
            }
        }
        
        return cleaned;
    },
    
    /**
     * Clean colony data
     */
    cleanColonyData: function(roomName) {
        if (!Memory.hive || !Memory.hive.colonies) return;
        
        var colony = Memory.hive.colonies[roomName];
        if (!colony) return;
        
        if (colony.sources && Array.isArray(colony.sources)) {
            colony.sources = colony.sources.filter(function(sourceData) {
                if (!sourceData || !sourceData.id) return false;
                var source = Game.getObjectById(sourceData.id);
                return source !== null;
            });
            
            for (var i = 0; i < colony.sources.length; i++) {
                var sourceData = colony.sources[i];
                if (sourceData.containerId) {
                    var container = Game.getObjectById(sourceData.containerId);
                    if (!container) {
                        sourceData.containerId = null;
                    }
                }
                if (sourceData.linkId) {
                    var link = Game.getObjectById(sourceData.linkId);
                    if (!link) {
                        sourceData.linkId = null;
                    }
                }
            }
        }
        
        if (colony.mineral) {
            var mineral = Game.getObjectById(colony.mineral);
            if (!mineral) {
                colony.mineral = null;
            }
        }
    },
    
    /**
     * Clean scout data
     */
    cleanScoutData: function() {
        if (!Memory.hive || !Memory.hive.scoutData) return 0;
        
        var cleaned = 0;
        var time = Game.time;
        
        for (var roomName in Memory.hive.scoutData) {
            var data = Memory.hive.scoutData[roomName];
            
            if (!data || !data.time || time - data.time > this.EXPIRATION.SCOUT_DATA) {
                delete Memory.hive.scoutData[roomName];
                cleaned++;
            }
        }
        
        return cleaned;
    },
    
    /**
     * Clean threat data
     */
    cleanThreatData: function() {
        if (!Memory.hive || !Memory.hive.threats) return 0;
        
        var cleaned = 0;
        var time = Game.time;
        
        for (var roomName in Memory.hive.threats) {
            var data = Memory.hive.threats[roomName];
            
            if (!data || !data.time || time - data.time > this.EXPIRATION.THREAT_DATA) {
                delete Memory.hive.threats[roomName];
                cleaned++;
            }
        }
        
        return cleaned;
    },
    
    /**
     * Clean remote mining data
     */
    cleanRemoteData: function() {
        if (!Memory.hive || !Memory.hive.remotes) return 0;
        
        var cleaned = 0;
        var time = Game.time;
        
        for (var roomName in Memory.hive.remotes) {
            var remote = Memory.hive.remotes[roomName];
            if (!remote) {
                delete Memory.hive.remotes[roomName];
                cleaned++;
                continue;
            }
            
            var homeRoom = Game.rooms[remote.homeRoom];
            if (!homeRoom || !homeRoom.controller || !homeRoom.controller.my) {
                delete Memory.hive.remotes[roomName];
                cleaned++;
                this.log('Removed remote ' + roomName + ' - home room lost', 'WARN');
                continue;
            }
            
            if (!remote.active && remote.deactivatedAt) {
                if (time - remote.deactivatedAt > this.EXPIRATION.REMOTE_INACTIVE) {
                    delete Memory.hive.remotes[roomName];
                    cleaned++;
                    continue;
                }
            }
            
            if (!remote.active && !remote.deactivatedAt) {
                remote.deactivatedAt = time;
            } else if (remote.active && remote.deactivatedAt) {
                delete remote.deactivatedAt;
            }
        }
        
        return cleaned;
    },
    
    /**
     * Clean path cache
     */
    cleanPathCache: function() {
        var cleaned = 0;
        var time = Game.time;
        
        if (global.Cache && global.Cache.paths) {
            for (var key in global.Cache.paths) {
                var pathData = global.Cache.paths[key];
                if (!pathData || !pathData.time || time - pathData.time > this.EXPIRATION.PATH_CACHE) {
                    delete global.Cache.paths[key];
                    cleaned++;
                }
            }
        }
        
        for (var name in Game.creeps) {
            var creep = Game.creeps[name];
            if (creep.memory && creep.memory._move && creep.memory._move.path) {
                if (creep.memory._move.stuck > 3) {
                    delete creep.memory._move.path;
                    cleaned++;
                }
            }
        }
        
        return cleaned;
    },
    
    /**
     * Clean flag memory
     */
    cleanFlagMemory: function() {
        var cleaned = 0;
        
        if (Memory.flags) {
            for (var flagName in Memory.flags) {
                if (!Game.flags[flagName]) {
                    delete Memory.flags[flagName];
                    cleaned++;
                }
            }
        }
        
        return cleaned;
    },
    
    /**
     * Clean construction memory
     */
    cleanConstructionMemory: function() {
        if (!Memory.hive || !Memory.hive.colonies) return 0;
        
        var cleaned = 0;
        
        for (var roomName in Memory.hive.colonies) {
            var colony = Memory.hive.colonies[roomName];
            
            if (colony && colony.constructionSites && Array.isArray(colony.constructionSites)) {
                var originalLength = colony.constructionSites.length;
                colony.constructionSites = colony.constructionSites.filter(function(siteId) {
                    return Game.getObjectById(siteId) !== null;
                });
                cleaned += originalLength - colony.constructionSites.length;
                
                if (colony.constructionSites.length === 0) {
                    delete colony.constructionSites;
                }
            }
        }
        
        return cleaned;
    },
    
    /**
     * Clean stats data
     */
    cleanStatsData: function() {
        if (!Memory.hive || !Memory.hive.stats) return;
        
        var stats = Memory.hive.stats;
        var resetInterval = 100000;
        
        if (!stats.lastReset || Game.time - stats.lastReset > resetInterval) {
            stats.energyHarvested = 0;
            stats.energySpent = 0;
            stats.creepsSpawned = 0;
            stats.creepsLost = 0;
            stats.enemiesKilled = 0;
            stats.lastReset = Game.time;
            
            this.log('Stats reset after ' + resetInterval + ' ticks', 'INFO');
        }
    },
    
    /**
     * Deep clean - thorough memory cleanup
     */
    deepClean: function() {
        this.log('Starting deep memory clean...', 'INFO');
        var startCpu = Game.cpu.getUsed();
        var cleaned = 0;
        
        cleaned += this.cleanCreepMemory();
        cleaned += this.cleanRoomMemory();
        cleaned += this.cleanScoutData();
        cleaned += this.cleanThreatData();
        cleaned += this.cleanRemoteData();
        cleaned += this.cleanPathCache();
        cleaned += this.cleanFlagMemory();
        cleaned += this.cleanConstructionMemory();
        cleaned += this.cleanExpansionTargets();
        cleaned += this.cleanWarTargets();
        cleaned += this.removeNullValues(Memory.hive, 0);
        cleaned += this.removeEmptyObjects(Memory.hive, 0);
        
        this.validateMemoryStructure();
        
        var cpuUsed = Game.cpu.getUsed() - startCpu;
        this.log('Deep clean complete. Cleaned ' + cleaned + ' entries. CPU: ' + cpuUsed.toFixed(2), 'SUCCESS');
        
        return cleaned;
    },
    
    /**
     * Clean expansion targets
     */
    cleanExpansionTargets: function() {
        if (!Memory.hive) return 0;
        
        if (!Memory.hive.expansionTargets || !Array.isArray(Memory.hive.expansionTargets)) {
            Memory.hive.expansionTargets = [];
            return 0;
        }
        
        var cleaned = 0;
        var originalLength = Memory.hive.expansionTargets.length;
        
        Memory.hive.expansionTargets = Memory.hive.expansionTargets.filter(function(roomName) {
            if (!roomName) return false;
            
            var room = Game.rooms[roomName];
            if (room && room.controller && room.controller.my) {
                return false;
            }
            
            var scoutData = Memory.hive.scoutData ? Memory.hive.scoutData[roomName] : null;
            if (scoutData && scoutData.controller && scoutData.controller.owner) {
                return false;
            }
            
            return true;
        });
        
        cleaned = originalLength - Memory.hive.expansionTargets.length;
        return cleaned;
    },
    
    /**
     * Clean war targets
     */
    cleanWarTargets: function() {
        if (!Memory.hive) return 0;
        
        if (!Memory.hive.warTargets || !Array.isArray(Memory.hive.warTargets)) {
            Memory.hive.warTargets = [];
            return 0;
        }
        
        var cleaned = 0;
        var originalLength = Memory.hive.warTargets.length;
        
        Memory.hive.warTargets = Memory.hive.warTargets.filter(function(target) {
            if (!target) return false;
            
            var roomName = target.roomName || target;
            var room = Game.rooms[roomName];
            if (room && room.controller && room.controller.my) {
                return false;
            }
            
            return true;
        });
        
        cleaned = originalLength - Memory.hive.warTargets.length;
        return cleaned;
    },
    
    /**
     * Remove null/undefined values recursively
     */
    removeNullValues: function(obj, depth) {
        if (!obj || typeof obj !== 'object') return 0;
        if (depth > 10) return 0;
        
        var cleaned = 0;
        
        for (var key in obj) {
            if (obj[key] === null || obj[key] === undefined) {
                delete obj[key];
                cleaned++;
            } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                cleaned += this.removeNullValues(obj[key], depth + 1);
            } else if (Array.isArray(obj[key])) {
                var originalLength = obj[key].length;
                obj[key] = obj[key].filter(function(item) {
                    return item !== null && item !== undefined;
                });
                cleaned += originalLength - obj[key].length;
            }
        }
        
        return cleaned;
    },
    
    /**
     * Remove empty objects recursively
     */
    removeEmptyObjects: function(obj, depth) {
        if (!obj || typeof obj !== 'object') return 0;
        if (depth > 10) return 0;
        
        var cleaned = 0;
        
        for (var key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                cleaned += this.removeEmptyObjects(obj[key], depth + 1);
                
                if (Object.keys(obj[key]).length === 0) {
                    delete obj[key];
                    cleaned++;
                }
            }
        }
        
        return cleaned;
    },
    
    /**
     * Validate memory structure
     */
    validateMemoryStructure: function() {
        if (!Memory.hive) {
            Memory.hive = this.getDefaultHiveMemory();
            return;
        }
        
        var defaults = this.getDefaultHiveMemory();
        
        for (var key in defaults) {
            if (Memory.hive[key] === undefined) {
                Memory.hive[key] = defaults[key];
            }
        }
        
        var arrayFields = ['expansionTargets', 'warTargets', 'allies', 'enemies'];
        for (var i = 0; i < arrayFields.length; i++) {
            var field = arrayFields[i];
            if (!Array.isArray(Memory.hive[field])) {
                Memory.hive[field] = [];
            }
        }
        
        var objectFields = ['colonies', 'remotes', 'threats', 'scoutData', 'stats', 'settings', 'cache'];
        for (var j = 0; j < objectFields.length; j++) {
            var oField = objectFields[j];
            if (typeof Memory.hive[oField] !== 'object' || Memory.hive[oField] === null) {
                Memory.hive[oField] = defaults[oField];
            }
        }
        
        if (!Memory.hive.cache.lastClean) {
            Memory.hive.cache.lastClean = {};
        }
    },
    
    /**
     * Update memory stats
     */
    updateMemoryStats: function() {
        if (!Memory.hive || !Memory.hive.cache) return;
        
        try {
            var memoryString = JSON.stringify(Memory);
            var memorySize = memoryString.length;
            var memoryLimit = 2097152;
            var usagePercent = ((memorySize / memoryLimit) * 100).toFixed(2);
            
            Memory.hive.cache.memorySize = memorySize;
            Memory.hive.cache.memoryPercent = usagePercent;
            Memory.hive.cache.lastSizeCheck = Game.time;
            
            if (memorySize > memoryLimit * 0.8) {
                this.log('WARNING: Memory usage at ' + usagePercent + '% (' + (memorySize / 1024).toFixed(0) + ' KB)', 'WARN');
                
                if (memorySize > memoryLimit * 0.9) {
                    this.log('CRITICAL: Memory nearly full! Forcing deep clean...', 'ERROR');
                    this.deepClean();
                    this.aggressiveClean();
                }
            }
        } catch (e) {
            this.log('Error calculating memory size: ' + e, 'ERROR');
        }
    },
    
    /**
     * Aggressive clean - emergency cleanup when memory is critical
     */
    aggressiveClean: function() {
        this.log('Starting aggressive memory cleanup...', 'WARN');
        var cleaned = 0;
        
        if (Memory.hive && Memory.hive.scoutData) {
            for (var roomName in Memory.hive.scoutData) {
                if (Game.time - Memory.hive.scoutData[roomName].time > 5000) {
                    delete Memory.hive.scoutData[roomName];
                    cleaned++;
                }
            }
        }
        
        if (global.Cache) {
            global.Cache.paths = {};
            global.Cache.rooms = {};
        }
        
        for (var name in Game.creeps) {
            var creep = Game.creeps[name];
            if (creep.memory && creep.memory._move) {
                delete creep.memory._move;
                cleaned++;
            }
        }
        
        if (Memory.hive && Memory.hive.remotes) {
            for (var remote in Memory.hive.remotes) {
                if (!Memory.hive.remotes[remote].active) {
                    delete Memory.hive.remotes[remote];
                    cleaned++;
                }
            }
        }
        
        if (Memory.hive) {
            Memory.hive.threats = {};
            Memory.hive.warTargets = [];
            
            if (Memory.hive.expansionTargets && Memory.hive.expansionTargets.length > 1) {
                Memory.hive.expansionTargets = Memory.hive.expansionTargets.slice(0, 1);
            }
        }
        
        this.log('Aggressive clean removed ' + cleaned + ' entries', 'WARN');
        
        return cleaned;
    },
    
    /**
     * Get memory report
     */
    getMemoryReport: function() {
        return {
            totalSize: Memory.hive && Memory.hive.cache ? Memory.hive.cache.memorySize || 0 : 0,
            usagePercent: Memory.hive && Memory.hive.cache ? Memory.hive.cache.memoryPercent || 0 : 0,
            creeps: Object.keys(Memory.creeps || {}).length,
            colonies: Memory.hive ? Object.keys(Memory.hive.colonies || {}).length : 0,
            remotes: Memory.hive ? Object.keys(Memory.hive.remotes || {}).length : 0,
            scoutData: Memory.hive ? Object.keys(Memory.hive.scoutData || {}).length : 0,
            threats: Memory.hive ? Object.keys(Memory.hive.threats || {}).length : 0,
            flags: Object.keys(Memory.flags || {}).length,
            rooms: Object.keys(Memory.rooms || {}).length
        };
    },
    
    /**
     * Print memory report to console
     */
    printMemoryReport: function() {
        var report = this.getMemoryReport();
        
        console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
        console.log('<span style="color:#9932CC">           📊 MEMORY REPORT</span>');
        console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
        console.log('<span style="color:#E6E6FA">Total Size: ' + (report.totalSize / 1024).toFixed(2) + ' KB (' + report.usagePercent + '%)</span>');
        console.log('<span style="color:#E6E6FA">Creeps: ' + report.creeps + '</span>');
        console.log('<span style="color:#E6E6FA">Colonies: ' + report.colonies + '</span>');
        console.log('<span style="color:#E6E6FA">Remotes: ' + report.remotes + '</span>');
        console.log('<span style="color:#E6E6FA">Scout Data: ' + report.scoutData + '</span>');
        console.log('<span style="color:#E6E6FA">Threats: ' + report.threats + '</span>');
        console.log('<span style="color:#E6E6FA">Flags: ' + report.flags + '</span>');
        console.log('<span style="color:#E6E6FA">Rooms: ' + report.rooms + '</span>');
        console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
        
        return report;
    },
    
    /**
     * Force cleanup (manual trigger)
     */
    forceCleanup: function() {
        this.log('Forcing full memory cleanup...', 'INFO');
        
        if (Memory.hive && Memory.hive.cache) {
            Memory.hive.cache.lastClean = {};
        }
        
        this.deepClean();
        this.updateMemoryStats();
        this.printMemoryReport();
    }
};

module.exports = MemoryManager;