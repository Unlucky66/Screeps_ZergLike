/**
 * Colony Manager
 */

var CONFIG = require('config');
var Utils = require('utils');

var ColonyManager = {
    run: function(room) {
        if (!room.controller || !room.controller.my) return;
        
        this.initColony(room);
        
        var state = this.getColonyState(room);
        
        Memory.hive.colonies[room.name].state = state;
        Memory.hive.colonies[room.name].lastUpdate = Game.time;
        
        return state;
    },
    
    initColony: function(room) {
        if (!Memory.hive.colonies[room.name]) {
            var sources = room.find(FIND_SOURCES);
            var minerals = room.find(FIND_MINERALS);
            var sourceData = [];
            
            for (var i = 0; i < sources.length; i++) {
                sourceData.push({
                    id: sources[i].id,
                    pos: { x: sources[i].pos.x, y: sources[i].pos.y },
                    containerId: null,
                    linkId: null
                });
            }
            
            Memory.hive.colonies[room.name] = {
                established: Game.time,
                state: 'startup',
                lastUpdate: Game.time,
                sources: sourceData,
                mineral: minerals.length > 0 ? minerals[0].id : null,
                layout: null,
                defcon: 0
            };
            
            Utils.log('New colony established: ' + room.name, 'SUCCESS');
        }
    },
    
    getColonyState: function(room) {
        var rcl = room.controller.level;
        var energy = room.energyAvailable;
        var capacity = room.energyCapacityAvailable;
        var storage = room.storage;
        var threats = Utils.getThreatLevel(room);
        
        if (threats > CONFIG.COMBAT.SAFE_MODE_THRESHOLD) {
            return 'critical';
        }
        if (threats > 0) {
            return 'defense';
        }
        
        var creeps = _.filter(Game.creeps, function(c) {
            return c.memory.homeRoom === room.name;
        });
        var harvesters = _.filter(creeps, function(c) {
            return c.memory.role === 'drone' || c.memory.role === 'larva';
        });
        
        if (harvesters.length === 0) {
            return 'emergency';
        }
        
        if (rcl < 2 || capacity < 550) {
            return 'startup';
        }
        
        if (!storage) {
            return 'developing';
        }
        
        var storedEnergy = storage.store[RESOURCE_ENERGY] || 0;
        
        if (storedEnergy < CONFIG.THRESHOLDS.STORAGE_CRITICAL) {
            return 'recovering';
        }
        
        if (storedEnergy > CONFIG.THRESHOLDS.RICH_ENERGY) {
            return 'thriving';
        }
        
        return 'stable';
    }
};

module.exports = ColonyManager;