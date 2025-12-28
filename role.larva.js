/**
 * Role: Larva - Emergency Harvester
 */

var Utils = require('utils');
var EnergyManager = require('manager.energy');

var RoleLarva = {
    run: function(creep) {
        this.toggleWorking(creep);
        
        if (creep.memory.working) {
            var target = EnergyManager.getBestEnergyTarget(creep);
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, target);
                }
            } else if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                Utils.smartMove(creep, creep.room.controller, 3);
            }
        } else {
            var source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, source);
                }
            }
        }
    },
    
    toggleWorking: function(creep) {
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }
    }
};

module.exports = RoleLarva;