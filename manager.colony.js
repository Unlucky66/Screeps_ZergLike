/**
 * Enhanced Memory Manager
 * - Deep cleaning of stale data
 * - Memory compression
 * - Automatic garbage collection
 * - Memory statistics
 * - Corruption detection & repair
 */

var CacheManager = require('cache');
var Utils = require('utils');

var MemoryManager = {
    
    // Memory version for migration
    MEMORY_VERSION: 2,
    
    // Cleanup intervals (in ticks)
    INTERVALS: {
        CREEP_CLEANUP: 1,           // Every tick
        ROOM_CLEANUP: 100,          // Every 100 ticks
        SCOUT_CLEANUP: 500,         // Every 500 ticks
        THREAT_CLEANUP: 50,         // Every 50 ticks
        REMOTE_CLEANUP: 200,        // Every 200 ticks
        STATS_CLEANUP: 1000,        // Every 1000 ticks
        DEEP_CLEAN: 5000,           // Every 5000 ticks
        PATH_CACHE_CLEANUP: 100,    // Every 100 ticks
        FLAG_CLEANUP: 500,          // Every 500 ticks
        CONSTRUCTION_CLEANUP: 200   // Every 200 ticks
    },
    
    // Data expiration times (in ticks)
    EXPIRATION: {
        SCOUT_DATA: 15000,          // 15000 ticks
        THREAT_DATA: 100,           // 100 ticks
        REMOTE_INACTIVE: 10000,     // 10000 ticks
        PATH_CACHE: 500,            // 500 ticks
        CREEP_MOVE_DATA: 50,        // 50 ticks for stuck detection
        HOSTILE_DATA: 200           // 200 ticks
    },
    
    /**
     * Main initialization
     */
    initialize: function() {
        // Initialize core memory structure
        this.initializeCoreMemory();
        
        // Check memory version and migrate if needed
        this.checkVersion();
        
        // Run cleanups based on intervals
        this.runScheduledCleanups();
        
        // Clear cache
        CacheManager.clear();
        
        // Update memory stats
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
            Utils.log('Initialized new hive memory', 'SUCCESS');
        }
        
        // Ensure all required sub-objects exist
        var defaults = this.getDefaultHiveMemory();
        for (var key in defaults) {
            if (Memory.hive[key] === undefined) {
                Memory.hive[key] = defaults[key];
            }
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
     * Check memory version and migrate if needed
     */
    checkVersion: function() {
        if (!Memory.hive.version || Memory.hive.version < this.MEMORY_VERSION) {
            this.migrateMemory(Memory.hive.version || 1);
            Memory.hive.version = this.MEMORY_VERSION;
            Utils.log('Memory migrated to version ' + this.MEMORY_VERSION, 'SUCCESS');
        }
    },
    
    /**
     * Migrate memory from old version
     */
    migrateMemory: function(fromVersion) {
        Utils.log('Migrating memory from version ' + fromVersion, 'INFO');
        
        // Version 1 to 2 migration
        if (fromVersion < 2) {
            // Add new fields
            if (!Memory.hive.allies) Memory.hive.allies = [];
            if (!Memory.hive.enemies) Memory.hive.enemies = [];
            if (!Memory.hive.cache) Memory.hive.cache = { lastClean: {}, memorySize: 0 };
            
            // Clean up old format data
            this.deepClean();
        }
        
        // Add more migrations as needed for future versions
    },
    
    /**
     * Run scheduled cleanups based on intervals
     */
    runScheduledCleanups: function() {
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
                // Log death if it was one of ours
                if (Memory.creeps[name].role) {
                    Memory.hive.stats.creepsLost++;
                    
                    if (Memory.hive.settings.debugMode) {
                        Utils.log('Creep died: ' + name + ' (' + Memory.creeps[name].role + ')', 'DEBUG');
                    }
                }
                
                delete Memory.creeps[name];
                cleaned++;
            } else {
                // Clean stale movement data from living creeps
                this.cleanCreepMoveData(Game.creeps[name]);
            }
        }
        
        if (cleaned > 0 && Memory.hive.settings.debugMode) {
            Utils.log('Cleaned ' + cleaned + ' dead creep memories', 'DEBUG');
        }
        
        return cleaned;
    },
    
    /**
     * Clean stale movement data from creep
     */
    cleanCreepMoveData: function(creep) {
        if (!creep.memory._move) return;
        
        var moveData = creep.memory._move;
        
        // Remove if data is too old
        if (moveData.time && Game.time - moveData.time > this.EXPIRATION.CREEP_MOVE_DATA) {
            delete creep.memory._move;
            return;
        }
        
        // Clean up path if creep reached destination
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
        var cleaned = 0;
        
        // Clean colony data for rooms we no longer own
        for (var roomName in Memory.hive.colonies) {
            var room = Game.rooms[roomName];
            
            // If we can see the room and don't own it, remove colony data
            if (room && (!room.controller || !room.controller.my)) {
                delete Memory.hive.colonies[roomName];
                cleaned++;
                Utils.log('Removed colony data for lost room: ' + roomName, 'WARN');
            }
            
            // Clean stale source data
            if (Memory.hive.colonies[roomName]) {
                this.cleanColonyData(roomName);
            }
        }
        
        // Clean rooms memory (if exists)
        if (Memory.rooms) {
            for (var rName in Memory.rooms) {
                // Remove memory for rooms we haven't seen in a while
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
        var colony = Memory.hive.colonies[roomName];
        if (!colony) return;
        
        // Validate source IDs
        if (colony.sources) {
            colony.sources = colony.sources.filter(function(sourceData) {
                var source = Game.getObjectById(sourceData.id);
                return source !== null;
            });
        }
        
        // Validate container IDs
        if (colony.sources) {
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
        
        // Validate mineral ID
        if (colony.mineral) {
            var mineral = Game.getObjectById(colony.mineral);
            if (!mineral) {
                colony.mineral = null;
            }
        }
        
        // Remove obsolete fields
        var validFields = ['established', 'state', 'lastUpdate', 'sources', 'mineral', 'layout', 'defcon'];
        for (var field in colony) {
            if (validFields.indexOf(field) === -1) {
                delete colony[field];
            }
        }
    },
    
    /**
     * Clean scout data
     */
    cleanScoutData: function() {
        var cleaned = 0;
        var time = Game.time;
        
        for (var roomName in Memory.hive.scoutData) {
            var data = Memory.hive.scoutData[roomName];
            
            // Remove expired data
            if (!data.time || time - data.time > this.EXPIRATION.SCOUT_DATA) {
                delete Memory.hive.scoutData[roomName];
                cleaned++;
                continue;
            }
            
            // Validate and clean data structure
            var validFields = ['time', 'sources', 'mineral', 'controller', 'hostiles', 'structures', 'sourceKeeper', 'invaderCore'];
            for (var field in data) {
                if (validFields.indexOf(field) === -1) {
                    delete data[field];
                }
            }
        }
        
        if (cleaned > 0 && Memory.hive.settings.debugMode) {
            Utils.log('Cleaned ' + cleaned + ' stale scout entries', 'DEBUG');
        }
        
        return cleaned;
    },
    
    /**
     * Clean threat data
     */
    cleanThreatData: function() {
        var cleaned = 0;
        var time = Game.time;
        
        for (var roomName in Memory.hive.threats) {
            var data = Memory.hive.threats[roomName];
            
            // Remove expired threat data
            if (!data.time || time - data.time > this.EXPIRATION.THREAT_DATA) {
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
        var cleaned = 0;
        var time = Game.time;
        
        for (var roomName in Memory.hive.remotes) {
            var remote = Memory.hive.remotes[roomName];
            
            // Check if home room still exists and is ours
            var homeRoom = Game.rooms[remote.homeRoom];
            if (!homeRoom || !homeRoom.controller || !homeRoom.controller.my) {
                delete Memory.hive.remotes[roomName];
                cleaned++;
                Utils.log('Removed remote ' + roomName + ' - home room lost', 'WARN');
                continue;
            }
            
            // Check if remote has been inactive too long
            if (!remote.active && remote.deactivatedAt) {
                if (time - remote.deactivatedAt > this.EXPIRATION.REMOTE_INACTIVE) {
                    delete Memory.hive.remotes[roomName];
                    cleaned++;
                    continue;
                }
            }
            
            // Update deactivation time
            if (!remote.active && !remote.deactivatedAt) {
                remote.deactivatedAt = time;
            } else if (remote.active && remote.deactivatedAt) {
                delete remote.deactivatedAt;
            }
            
            // Validate structure
            var validFields = ['homeRoom', 'sources', 'active', 'needsReserver', 'established', 'deactivatedAt', 'containerIds', 'dangerLevel'];
            for (var field in remote) {
                if (validFields.indexOf(field) === -1) {
                    delete remote[field];
                }
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
        
        // Clean global cache paths
        if (global.Cache && global.Cache.paths) {
            for (var key in global.Cache.paths) {
                var pathData = global.Cache.paths[key];
                if (!pathData.time || time - pathData.time > this.EXPIRATION.PATH_CACHE) {
                    delete global.Cache.paths[key];
                    cleaned++;
                }
            }
        }
        
        // Clean serialized paths in creep memory
        for (var name in Game.creeps) {
            var creep = Game.creeps[name];
            if (creep.memory._move && creep.memory._move.path) {
                // Path is old or creep is stuck
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
        var cleaned = 0;
        
        // Clean construction site references in colony data
        for (var roomName in Memory.hive.colonies) {
            var colony = Memory.hive.colonies[roomName];
            
            if (colony.constructionSites) {
                colony.constructionSites = colony.constructionSites.filter(function(siteId) {
                    return Game.getObjectById(siteId) !== null;
                });
                
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
        // Reset stats periodically to prevent overflow
        var stats = Memory.hive.stats;
        var resetInterval = 100000; // Reset every 100k ticks
        
        if (!stats.lastReset || Game.time - stats.lastReset > resetInterval) {
            // Archive old stats if needed (could save to segment)
            var oldStats = JSON.parse(JSON.stringify(stats));
            
            // Reset counters
            stats.energyHarvested = 0;
            stats.energySpent = 0;
            stats.creepsSpawned = 0;
            stats.creepsLost = 0;
            stats.enemiesKilled = 0;
            stats.lastReset = Game.time;
            
            Utils.log('Stats reset after ' + resetInterval + ' ticks', 'INFO');
        }
    },
    
    /**
     * Deep clean - thorough memory cleanup
     */
    deepClean: function() {
        Utils.log('Starting deep memory clean...', 'INFO');
        var startCpu = Game.cpu.getUsed();
        var cleaned = 0;
        
        // Run all cleanups
        cleaned += this.cleanCreepMemory();
        cleaned += this.cleanRoomMemory();
        cleaned += this.cleanScoutData();
        cleaned += this.cleanThreatData();
        cleaned += this.cleanRemoteData();
        cleaned += this.cleanPathCache();
        cleaned += this.cleanFlagMemory();
        cleaned += this.cleanConstructionMemory();
        
        // Clean expansion targets
        cleaned += this.cleanExpansionTargets();
        
        // Clean war targets
        cleaned += this.cleanWarTargets();
        
        // Remove undefined/null values recursively
        cleaned += this.removeNullValues(Memory.hive);
        
        // Remove empty objects
        cleaned += this.removeEmptyObjects(Memory.hive);
        
        // Validate memory structure
        this.validateMemoryStructure();
        
        var cpuUsed = Game.cpu.getUsed() - startCpu;
        Utils.log('Deep clean complete. Cleaned ' + cleaned + ' entries. CPU: ' + cpuUsed.toFixed(2), 'SUCCESS');
        
        return cleaned;
    },
    
    /**
     * Clean expansion targets
     */
    cleanExpansionTargets: function() {
        var cleaned = 0;
        
        if (!Memory.hive.expansionTargets) {
            Memory.hive.expansionTargets = [];
            return 0;
        }
        
        Memory.hive.expansionTargets = Memory.hive.expansionTargets.filter(function(roomName) {
            // Check if room is already owned
            var room = Game.rooms[roomName];
            if (room && room.controller && room.controller.my) {
                cleaned++;
                return false;
            }
            
            // Check if room is in scout data and owned by someone else
            var scoutData = Memory.hive.scoutData[roomName];
            if (scoutData && scoutData.controller && scoutData.controller.owner) {
                cleaned++;
                return false;
            }
            
            return true;
        });
        
        return cleaned;
    },
    
    /**
     * Clean war targets
     */
    cleanWarTargets: function() {
        var cleaned = 0;
        
        if (!Memory.hive.warTargets) {
            Memory.hive.warTargets = [];
            return 0;
        }
        
        Memory.hive.warTargets = Memory.hive.warTargets.filter(function(target) {
            // Remove if target is now owned by us
            var room = Game.rooms[target.roomName || target];
            if (room && room.controller && room.controller.my) {
                cleaned++;
                return false;
            }
            
            return true;
        });
        
        return cleaned;
    },
    
    /**
     * Remove null/undefined values recursively
     */
    removeNullValues: function(obj, depth) {
        depth = depth || 0;
        if (depth > 10) return 0; // Prevent infinite recursion
        
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
        depth = depth || 0;
        if (depth > 10) return 0; // Prevent infinite recursion
        
        var cleaned = 0;
        
        for (var key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                // Recursively clean nested objects first
                cleaned += this.removeEmptyObjects(obj[key], depth + 1);
                
                // Then check if object is empty
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
        var defaults = this.getDefaultHiveMemory();
        var errors = [];
        
        // Check for required fields
        for (var key in defaults) {
            if (Memory.hive[key] === undefined) {
                Memory.hive[key] = defaults[key];
                errors.push('Missing field restored: ' + key);
            }
        }
        
        // Validate arrays
        var arrayFields = ['expansionTargets', 'warTargets', 'allies', 'enemies'];
        for (var i = 0; i < arrayFields.length; i++) {
            var field = arrayFields[i];
            if (!Array.isArray(Memory.hive[field])) {
                Memory.hive[field] = [];
                errors.push('Invalid array fixed: ' + field);
            }
        }
        
        // Validate objects
        var objectFields = ['colonies', 'remotes', 'threats', 'scoutData', 'stats', 'settings', 'cache'];
        for (var j = 0; j < objectFields.length; j++) {
            var oField = objectFields[j];
            if (typeof Memory.hive[oField] !== 'object' || Memory.hive[oField] === null) {
                Memory.hive[oField] = defaults[oField];
                errors.push('Invalid object fixed: ' + oField);
            }
        }
        
        if (errors.length > 0) {
            Utils.log('Memory validation fixed ' + errors.length + ' issues', 'WARN');
            for (var k = 0; k < errors.length; k++) {
                Utils.log('  - ' + errors[k], 'DEBUG');
            }
        }
    },
    
    /**
     * Update memory stats
     */
    updateMemoryStats: function() {
        try {
            var memoryString = JSON.stringify(Memory);
            var memorySize = memoryString.length;
            var memoryLimit = 2097152; // 2MB limit
            var usagePercent = ((memorySize / memoryLimit) * 100).toFixed(2);
            
            Memory.hive.cache.memorySize = memorySize;
            Memory.hive.cache.memoryPercent = usagePercent;
            Memory.hive.cache.lastSizeCheck = Game.time;
            
            // Warn if memory is getting full
            if (memorySize > memoryLimit * 0.8) {
                Utils.log('WARNING: Memory usage at ' + usagePercent + '% (' + (memorySize / 1024).toFixed(0) + ' KB)', 'WARN');
                
                // Force deep clean if critical
                if (memorySize > memoryLimit * 0.9) {
                    Utils.log('CRITICAL: Memory nearly full! Forcing deep clean...', 'ERROR');
                    this.deepClean();
                    this.aggressiveClean();
                }
            } else if (Memory.hive.settings.debugMode) {
                Utils.log('Memory usage: ' + usagePercent + '% (' + (memorySize / 1024).toFixed(0) + ' KB)', 'DEBUG');
            }
        } catch (e) {
            Utils.log('Error calculating memory size: ' + e, 'ERROR');
        }
    },
    
    /**
     * Aggressive clean - emergency cleanup when memory is critical
     */
    aggressiveClean: function() {
        Utils.log('Starting aggressive memory cleanup...', 'WARN');
        var cleaned = 0;
        
        // Clear all scout data older than 5000 ticks
        for (var roomName in Memory.hive.scoutData) {
            if (Game.time - Memory.hive.scoutData[roomName].time > 5000) {
                delete Memory.hive.scoutData[roomName];
                cleaned++;
            }
        }
        
        // Clear all path caches
        if (global.Cache) {
            global.Cache.paths = {};
            global.Cache.rooms = {};
        }
        
        // Clear creep path data
        for (var name in Game.creeps) {
            var creep = Game.creeps[name];
            if (creep.memory._move) {
                delete creep.memory._move;
                cleaned++;
            }
        }
        
        // Clear inactive remotes
        for (var remote in Memory.hive.remotes) {
            if (!Memory.hive.remotes[remote].active) {
                delete Memory.hive.remotes[remote];
                cleaned++;
            }
        }
        
        // Clear old threat data
        Memory.hive.threats = {};
        
        // Clear war targets
        Memory.hive.warTargets = [];
        
        // Clear expansion targets beyond first one
        if (Memory.hive.expansionTargets.length > 1) {
            Memory.hive.expansionTargets = Memory.hive.expansionTargets.slice(0, 1);
        }
        
        Utils.log('Aggressive clean removed ' + cleaned + ' entries', 'WARN');
        
        return cleaned;
    },
    
    /**
     * Get memory report
     */
    getMemoryReport: function() {
        var report = {
            totalSize: Memory.hive.cache.memorySize || 0,
            usagePercent: Memory.hive.cache.memoryPercent || 0,
            creeps: Object.keys(Memory.creeps || {}).length,
            colonies: Object.keys(Memory.hive.colonies || {}).length,
            remotes: Object.keys(Memory.hive.remotes || {}).length,
            scoutData: Object.keys(Memory.hive.scoutData || {}).length,
            threats: Object.keys(Memory.hive.threats || {}).length,
            flags: Object.keys(Memory.flags || {}).length,
            rooms: Object.keys(Memory.rooms || {}).length
        };
        
        return report;
    },
    
    /**
     * Print memory report to console
     */
    printMemoryReport: function() {
        var report = this.getMemoryReport();
        
        console.log('════════════════════════════════════════════');
        console.log('           📊 MEMORY REPORT');
        console.log('════════════════════════════════════════════');
        console.log('Total Size: ' + (report.totalSize / 1024).toFixed(2) + ' KB (' + report.usagePercent + '%)');
        console.log('Creeps: ' + report.creeps);
        console.log('Colonies: ' + report.colonies);
        console.log('Remotes: ' + report.remotes);
        console.log('Scout Data: ' + report.scoutData);
        console.log('Threats: ' + report.threats);
        console.log('Flags: ' + report.flags);
        console.log('Rooms: ' + report.rooms);
        console.log('════════════════════════════════════════════');
        
        return report;
    },
    
    /**
     * Force cleanup (manual trigger)
     */
    forceCleanup: function() {
        Utils.log('Forcing full memory cleanup...', 'INFO');
        
        // Reset all cleanup timestamps
        Memory.hive.cache.lastClean = {};
        
        // Run deep clean
        this.deepClean();
        
        // Update stats
        this.updateMemoryStats();
        
        // Print report
        this.printMemoryReport();
    }
};

module.exports = MemoryManager;
