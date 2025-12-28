/**
 * Role: Roach - Builder/Repairer
 */

var CONFIG = require('config');
var Utils = require('utils');
var EnergyManager = require('manager.energy');

var RoleRoach = {
    run: function(creep) {
        this.toggleWorking(creep);
        
        if (creep.memory.working) {
            // Critical repairs
            var critical = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: function(s) {
                    return s.hits < s.hitsMax * 0.1 &&
                           s.structureType !== STRUCTURE_WALL &&
                           s.structureType !== STRUCTURE_RAMPART;
                }
            });
            
            if (critical) {
                if (creep.repair(critical) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, critical, 3);
                }
                return;
            }
            
            // Construction
            var site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
            if (site) {
                if (creep.build(site) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, site, 3);
                }
                return;
            }
            
            // Regular repairs
            var damaged = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: function(s) {
                    return s.hits < s.hitsMax * 0.8 &&
                           s.structureType !== STRUCTURE_WALL &&
                           s.structureType !== STRUCTURE_RAMPART;
                }
            });
            
            if (damaged) {
                if (creep.repair(damaged) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, damaged, 3);
                }
                return;
            }
            
            // Fortify walls/ramparts
            var rcl = creep.room.controller.level;
            var targetHits = rcl * CONFIG.THRESHOLDS.WALL_TARGET_MULTIPLIER;
            
            var fortify = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: function(s) {
                    return (s.structureType === STRUCTURE_WALL ||
                           s.structureType === STRUCTURE_RAMPART) &&
                           s.hits < targetHits;
                }
            });
            
            if (fortify) {
                if (creep.repair(fortify) === ERR_NOT_IN_RANGE) {
                    Utils.smartMove(creep, fortify, 3);
                }
                return;
            }
            
            // Upgrade controller as fallback
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                Utils.smartMove(creep, creep.room.controller, 3);
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

module.exports = RoleRoach;