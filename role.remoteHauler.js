/**
 * Role: RemoteHauler - Remote Energy Transport
 */

var Utils = require('utils');
var EnergyManager = require('manager.energy');

var RoleRemoteHauler = {
    run: function(creep) {
        var targetRoom = creep.memory.targetRoom;
        var homeRoom = creep.memory.homeRoom;
        
        if (!targetRoom || !homeRoom) return;
        
        // Toggle working state
        if (creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }
        if (creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }
        
        if (creep.memory.working) {
            // Return to home room
            if (creep.room.name !== homeRoom) {
                var exitDir = creep.room.findExitTo(homeRoom);
                var exit = creep.pos.findClosestByPath(exitDir);
                if (exit) {
                    creep.moveTo(exit, { reusePath: 20 });
                }
                return;
            }
            
            // Deliver energy
            var target = EnergyManager.getBestEnergyTarget(creep);
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, target);
                }
            }
        } else {
            // Go to remote room
            if (creep.room.name !== targetRoom) {
                var exitDir2 = creep.room.findExitTo(targetRoom);
                var exit2 = creep.pos.findClosestByPath(exitDir2);
                if (exit2) {
                    creep.moveTo(exit2, { reusePath: 20 });
                }
                return;
            }
            
            // Collect energy
            var dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: function(r) {
                    return r.resourceType === RESOURCE_ENERGY && r.amount >= 50;
                }
            });
            
            if (dropped) {
                if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, dropped);
                }
                return;
            }
            
            var container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: function(s) {
                    return s.structureType === STRUCTURE_CONTAINER &&
                           s.store[RESOURCE_ENERGY] > 50;
                }
            });
            
            if (container) {
                if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, container);
                }
            }
        }
    }
};

module.exports = RoleRemoteHauler;