/**
 * Role: SwarmHost - Claimer
 */

var Utils = require('utils');

var RoleSwarmHost = {
    run: function(creep) {
        var targetRoom = creep.memory.targetRoom;
        
        if (!targetRoom) {
            return;
        }
        
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
        
        if (controller.owner && !controller.my) {
            // Attack controller to downgrade
            if (creep.attackController(controller) === ERR_NOT_IN_RANGE) {
                Utils.smartMove(creep, controller);
            }
        } else if (!controller.owner) {
            // Claim controller
            var result = creep.claimController(controller);
            if (result === ERR_NOT_IN_RANGE) {
                Utils.smartMove(creep, controller);
            } else if (result === OK) {
                Utils.log('Room ' + targetRoom + ' has been claimed!', 'SUCCESS');
                Memory.hive.stats.roomsClaimed++;
                
                // Remove from expansion targets
                var idx = Memory.hive.expansionTargets.indexOf(targetRoom);
                if (idx > -1) {
                    Memory.hive.expansionTargets.splice(idx, 1);
                }
            }
        }
    }
};

module.exports = RoleSwarmHost;