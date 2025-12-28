/**
 * Role: Defender - Room Defender
 */

var Utils = require('utils');
var RoleZergling = require('role.zergling');

var RoleDefender = {
    run: function(creep) {
        var hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        hostiles = hostiles.filter(function(c) {
            return !Utils.isAlly(c.owner.username);
        });
        
        if (hostiles.length > 0) {
            var target = RoleZergling.selectTarget(creep, hostiles);
            if (target) {
                if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, target);
                }
                return;
            }
        }
        
        // Patrol near controller
        var controller = creep.room.controller;
        if (controller && creep.pos.getRangeTo(controller) > 5) {
            Utils.smartMove(creep, controller, 3);
        }
    }
};

module.exports = RoleDefender;