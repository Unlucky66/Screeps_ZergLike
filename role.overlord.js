/**
 * Role: Overlord - Hauler
 */

var Utils = require('utils');
var EnergyManager = require('manager.energy');

var RoleOverlord = {
    run: function(creep) {
        this.toggleWorking(creep);
        
        if (creep.memory.working) {
            var target = EnergyManager.getBestEnergyTarget(creep);
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, target);
                }
            }
        } else {
            var source = EnergyManager.getBestEnergySource(creep);
            if (source) {
                if (source.action === 'pickup') {
                    if (creep.pickup(source.target) === ERR_NOT_IN_RANGE) {
                        Utils.smartMove(creep, source.target);
                    }
                } else if (source.action === 'withdraw') {
                    if (creep.withdraw(source.target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        Utils.smartMove(creep, source.target);
                    }
                } else if (source.action === 'harvest') {
                    if (creep.harvest(source.target) === ERR_NOT_IN_RANGE) {
                        Utils.smartMove(creep, source.target);
                    }
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

module.exports = RoleOverlord;