/**
 * Role: Drone - Stationary Miner
 */

var Utils = require('utils');

var RoleDrone = {
    run: function(creep) {
        if (!creep.memory.sourceId) {
            this.assignSource(creep);
        }
        
        var source = Game.getObjectById(creep.memory.sourceId);
        if (!source) {
            this.assignSource(creep);
            return;
        }
        
        if (!creep.pos.isNearTo(source)) {
            Utils.smartMove(creep, source);
            return;
        }
        
        creep.harvest(source);
        
        if (creep.store.getFreeCapacity() === 0) {
            var structures = creep.pos.lookFor(LOOK_STRUCTURES);
            var container = null;
            
            for (var i = 0; i < structures.length; i++) {
                if (structures[i].structureType === STRUCTURE_CONTAINER) {
                    container = structures[i];
                    break;
                }
            }
            
            var links = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {
                filter: function(s) { return s.structureType === STRUCTURE_LINK; }
            });
            
            if (links.length > 0 && links[0].store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                creep.transfer(links[0], RESOURCE_ENERGY);
            } else if (container && container.store.getFreeCapacity() > 0) {
                creep.transfer(container, RESOURCE_ENERGY);
            } else {
                creep.drop(RESOURCE_ENERGY);
            }
        }
    },
    
    assignSource: function(creep) {
        var sources = creep.room.find(FIND_SOURCES);
        var drones = _.filter(Game.creeps, function(c) {
            return c.memory.role === 'drone' && c.memory.homeRoom === creep.room.name;
        });
        
        var bestSource = null;
        var minDrones = Infinity;
        
        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];
            var count = 0;
            for (var j = 0; j < drones.length; j++) {
                if (drones[j].memory.sourceId === source.id) count++;
            }
            if (count < minDrones) {
                minDrones = count;
                bestSource = source;
            }
        }
        
        if (bestSource) {
            creep.memory.sourceId = bestSource.id;
        }
    }
};

module.exports = RoleDrone;