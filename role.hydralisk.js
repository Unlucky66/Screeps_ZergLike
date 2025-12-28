/**
 * Role: Hydralisk - Ranged Attacker
 */

var Utils = require('utils');
var RoleZergling = require('role.zergling');

var RoleHydralisk = {
    run: function(creep) {
        var hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        hostiles = hostiles.filter(function(c) {
            return !Utils.isAlly(c.owner.username);
        });
        
        if (hostiles.length > 0) {
            var target = creep.pos.findClosestByRange(hostiles);
            
            if (target) {
                var range = creep.pos.getRangeTo(target);
                
                if (range <= 3) {
                    creep.rangedAttack(target);
                    
                    // Kite if too close
                    if (range < 3) {
                        var fleePath = PathFinder.search(creep.pos, {
                            pos: target.pos,
                            range: 4
                        }, { flee: true });
                        
                        if (fleePath.path.length > 0) {
                            creep.move(creep.pos.getDirectionTo(fleePath.path[0]));
                        }
                    }
                } else {
                    Utils.smartMove(creep, target, 3);
                }
                return;
            }
        }
        
        // Mass attack if surrounded
        var nearby = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
        if (nearby.length > 1) {
            creep.rangedMassAttack();
        }
        
        RoleZergling.rally(creep);
    }
};

module.exports = RoleHydralisk;