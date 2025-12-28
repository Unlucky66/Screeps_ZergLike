/**
 * Role: RemoteHarvester - Remote Room Miner
 */

var Utils = require('utils');

var RoleRemoteHarvester = {
    run: function(creep) {
        var targetRoom = creep.memory.targetRoom;
        
        if (!targetRoom) return;
        
        // Travel to target room
        if (creep.room.name !== targetRoom) {
            var exitDir = creep.room.findExitTo(targetRoom);
            var exit = creep.pos.findClosestByPath(exitDir);
            if (exit) {
                creep.moveTo(exit, { reusePath: 20 });
            }
            return;
        }
        
        // Assign source
        if (!creep.memory.sourceId) {
            var sources = creep.room.find(FIND_SOURCES);
            var harvesters = _.filter(Game.creeps, function(c) {
                return c.memory.role === 'remoteHarvester' && 
                       c.memory.targetRoom === targetRoom;
            });
            
            var bestSource = null;
            var minCount = Infinity;
            
            for (var i = 0; i < sources.length; i++) {
                var count = 0;
                for (var j = 0; j < harvesters.length; j++) {
                    if (harvesters[j].memory.sourceId === sources[i].id) count++;
                }
                if (count < minCount) {
                    minCount = count;
                    bestSource = sources[i];
                }
            }
            
            if (bestSource) {
                creep.memory.sourceId = bestSource.id;
            }
        }
        
        var source = Game.getObjectById(creep.memory.sourceId);
        if (!source) return;
        
        // Harvest
        if (creep.pos.isNearTo(source)) {
            creep.harvest(source);
            
            // Drop energy for haulers
            if (creep.store.getFreeCapacity() === 0) {
                var structures = creep.pos.lookFor(LOOK_STRUCTURES);
                var container = null;
                
                for (var k = 0; k < structures.length; k++) {
                    if (structures[k].structureType === STRUCTURE_CONTAINER) {
                        container = structures[k];
                        break;
                    }
                }
                
                if (container) {
                    creep.transfer(container, RESOURCE_ENERGY);
                } else {
                    creep.drop(RESOURCE_ENERGY);
                }
            }
        } else {
            Utils.smartMove(creep, source);
        }
    }
};

module.exports = RoleRemoteHarvester;