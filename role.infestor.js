/**
 * Role: Infestor - Healer
 */

var Utils = require('utils');
var RoleZergling = require('role.zergling');

var RoleInfestor = {
    run: function(creep) {
        var injured = creep.room.find(FIND_MY_CREEPS, {
            filter: function(c) { return c.hits < c.hitsMax; }
        });
        
        if (injured.length > 0) {
            injured.sort(function(a, b) {
                var priority = { zergling: 0, hydralisk: 1, defender: 2, infestor: 3 };
                var aPri = priority[a.memory.role] || 4;
                var bPri = priority[b.memory.role] || 4;
                if (aPri !== bPri) return aPri - bPri;
                return (a.hits / a.hitsMax) - (b.hits / b.hitsMax);
            });
            
            var target = injured[0];
            
            if (creep.pos.isNearTo(target)) {
                creep.heal(target);
            } else {
                creep.rangedHeal(target);
                Utils.smartMove(creep, target);
            }
            return;
        }
        
        // Follow combat creeps
        var fighter = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
            filter: function(c) {
                return c.memory.role === 'zergling' || 
                       c.memory.role === 'hydralisk' || 
                       c.memory.role === 'defender';
            }
        });
        
        if (fighter) {
            Utils.smartMove(creep, fighter, 2);
        } else {
            RoleZergling.rally(creep);
        }
        
        // Self-heal
        if (creep.hits < creep.hitsMax) {
            creep.heal(creep);
        }
    }
};

module.exports = RoleInfestor;