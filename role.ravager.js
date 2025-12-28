/**
 * Role: Ravager - Structure Destroyer
 */

var Utils = require('utils');
var RoleZergling = require('role.zergling');

var RoleRavager = {
    run: function(creep) {
        var hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        hostiles = hostiles.filter(function(c) {
            return !Utils.isAlly(c.owner.username);
        });
        
        if (hostiles.length > 0) {
            var target = creep.pos.findClosestByPath(hostiles);
            if (target) {
                if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, target);
                }
                return;
            }
        }
        
        // Dismantle structures
        var structure = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
            filter: function(s) { return s.structureType !== STRUCTURE_CONTROLLER; }
        });
        
        if (structure) {
            if (creep.dismantle(structure) === ERR_NOT_IN_RANGE) {
                Utils.smartMove(creep, structure);
            }
            return;
        }
        
        RoleZergling.rally(creep);
    }
};

module.exports = RoleRavager;