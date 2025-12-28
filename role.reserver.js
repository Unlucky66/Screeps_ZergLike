/**
 * Role: Reserver - Controller Reserver
 */

var Utils = require('utils');

var RoleReserver = {
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
        
        var controller = creep.room.controller;
        if (!controller) return;
        
        // Reserve controller
        if (creep.reserveController(controller) === ERR_NOT_IN_RANGE) {
            Utils.smartMove(creep, controller);
        }
        
        // Update remote data
        if (Memory.hive.remotes[targetRoom]) {
            var ticksLeft = controller.reservation ? controller.reservation.ticksToEnd : 0;
            Memory.hive.remotes[targetRoom].needsReserver = ticksLeft < 1000;
        }
    }
};

module.exports = RoleReserver;