/**
 * Role: Zergling - Melee Attacker
 */

var Utils = require('utils');

var RoleZergling = {
    run: function(creep) {
        var hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        hostiles = hostiles.filter(function(c) {
            return !Utils.isAlly(c.owner.username);
        });
        
        if (hostiles.length > 0) {
            var target = this.selectTarget(creep, hostiles);
            if (target) {
                if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, target);
                }
                return;
            }
        }
        
        var structure = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
            filter: function(s) { return s.structureType !== STRUCTURE_CONTROLLER; }
        });
        
        if (structure) {
            if (creep.attack(structure) === ERR_NOT_IN_RANGE) {
                Utils.smartMove(creep, structure);
            }
            return;
        }
        
        this.rally(creep);
    },
    
    selectTarget: function(creep, hostiles) {
        hostiles.sort(function(a, b) {
            var getPriority = function(c) {
                if (c.getActiveBodyparts(HEAL) > 0) return 0;
                if (c.getActiveBodyparts(RANGED_ATTACK) > 0) return 1;
                if (c.getActiveBodyparts(ATTACK) > 0) return 2;
                return 3;
            };
            return getPriority(a) - getPriority(b);
        });
        
        var topTargets = hostiles.slice(0, 5);
        return creep.pos.findClosestByPath(topTargets);
    },
    
    rally: function(creep) {
        var spawns = creep.room.find(FIND_MY_SPAWNS);
        if (spawns.length > 0) {
            Utils.smartMove(creep, spawns[0], 5);
        }
    }
};

module.exports = RoleZergling;