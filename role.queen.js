/**
 * Role: Queen - Upgrader
 */

var Utils = require('utils');
var EnergyManager = require('manager.energy');

var RoleQueen = {
    run: function(creep) {
        this.toggleWorking(creep);
        
        if (creep.memory.working) {
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                Utils.smartMove(creep, creep.room.controller, 3);
            }
            
            if (creep.pos.isNearTo(creep.room.controller)) {
                var sign = creep.room.controller.sign;
                if (!sign || sign.username !== creep.owner.username) {
                    creep.signController(creep.room.controller, '🐛 The Swarm Grows 🐛');
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

module.exports = RoleQueen;