/**
 * Memory Manager
 */

var CacheManager = require('cache');

var MemoryManager = {
    initialize: function() {
        if (!Memory.hive) {
            Memory.hive = {
                colonies: {},
                remotes: {},
                threats: {},
                scoutData: {},
                expansionTargets: [],
                warTargets: [],
                stats: {
                    energyHarvested: 0,
                    energySpent: 0,
                    creepsSpawned: 0,
                    creepsLost: 0,
                    enemiesKilled: 0,
                    roomsClaimed: 0
                },
                settings: {
                    autoExpand: true,
                    autoDefend: true,
                    autoAttack: false,
                    autoRemote: true
                },
                creepIndex: Game.time
            };
        }
        
        this.cleanCreepMemory();
        CacheManager.clear();
    },
    
    cleanCreepMemory: function() {
        for (var name in Memory.creeps) {
            if (!Game.creeps[name]) {
                if (Memory.creeps[name].role) {
                    Memory.hive.stats.creepsLost++;
                }
                delete Memory.creeps[name];
            }
        }
    },
    
    cleanRoomMemory: function() {
        for (var roomName in Memory.hive.scoutData) {
            if (Game.time - Memory.hive.scoutData[roomName].time > 10000) {
                delete Memory.hive.scoutData[roomName];
            }
        }
        
        for (var threatRoom in Memory.hive.threats) {
            if (Game.time - Memory.hive.threats[threatRoom].time > 100) {
                delete Memory.hive.threats[threatRoom];
            }
        }
    }
};

module.exports = MemoryManager;