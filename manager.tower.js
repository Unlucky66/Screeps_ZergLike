/**
 * Tower Manager
 */

var CONFIG = require('config');
var Utils = require('utils');

var TowerManager = {
    run: function(room) {
        var towers = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) {
                return s.structureType === STRUCTURE_TOWER && 
                       s.store[RESOURCE_ENERGY] > 0;
            }
        });
        
        if (towers.length === 0) return;
        
        var hostiles = room.find(FIND_HOSTILE_CREEPS);
        hostiles = hostiles.filter(function(c) {
            return !Utils.isAlly(c.owner.username);
        });
        
        for (var i = 0; i < towers.length; i++) {
            this.runTower(towers[i], hostiles);
        }
    },
    
    runTower: function(tower, hostiles) {
        var room = tower.room;
        var energy = tower.store[RESOURCE_ENERGY];
        var capacity = tower.store.getCapacity(RESOURCE_ENERGY);
        
        // Attack hostiles
        if (hostiles.length > 0) {
            var target = this.selectTarget(tower, hostiles);
            if (target) {
                tower.attack(target);
                return;
            }
        }
        
        // Heal friendly creeps
        if (energy > capacity * 0.3) {
            var injured = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: function(c) { return c.hits < c.hitsMax; }
            });
            
            if (injured) {
                tower.heal(injured);
                return;
            }
        }
        
        // Repair critical structures
        if (energy > capacity * CONFIG.THRESHOLDS.TOWER_ENERGY_REPAIR) {
            var damaged = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: function(s) {
                    return s.hits < s.hitsMax * CONFIG.THRESHOLDS.CRITICAL_HITS &&
                           s.structureType !== STRUCTURE_WALL &&
                           s.structureType !== STRUCTURE_RAMPART;
                }
            });
            
            if (damaged) {
                tower.repair(damaged);
                return;
            }
        }
        
        // Maintain roads
        if (energy > capacity * 0.9) {
            var road = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: function(s) {
                    return s.structureType === STRUCTURE_ROAD &&
                           s.hits < s.hitsMax * 0.8;
                }
            });
            
            if (road) {
                tower.repair(road);
            }
        }
    },
    
    selectTarget: function(tower, hostiles) {
        var target = null;
        var bestScore = -Infinity;
        
        for (var i = 0; i < hostiles.length; i++) {
            var hostile = hostiles[i];
            var score = 0;
            
            var range = tower.pos.getRangeTo(hostile);
            score -= range * 10;
            
            score += hostile.getActiveBodyparts(HEAL) * 100;
            score += hostile.getActiveBodyparts(RANGED_ATTACK) * 50;
            score += hostile.getActiveBodyparts(ATTACK) * 40;
            score += hostile.getActiveBodyparts(WORK) * 30;
            
            if (hostile.hits < hostile.hitsMax * 0.3) {
                score += 200;
            }
            
            if (score > bestScore) {
                bestScore = score;
                target = hostile;
            }
        }
        
        return target;
    }
};

module.exports = TowerManager;