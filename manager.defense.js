/**
 * Defense Manager
 */

var CONFIG = require('config');
var Utils = require('utils');

var DefenseManager = {
    run: function(room) {
        var threats = Utils.getThreatLevel(room);
        var hostiles = room.find(FIND_HOSTILE_CREEPS);
        hostiles = hostiles.filter(function(c) {
            return !Utils.isAlly(c.owner.username);
        });
        
        if (hostiles.length > 0) {
            Memory.hive.threats[room.name] = {
                time: Game.time,
                level: threats,
                count: hostiles.length
            };
        }
        
        var defcon = this.calculateDefcon(room, threats, hostiles);
        Memory.hive.colonies[room.name].defcon = defcon;
        
        this.handleDefcon(room, defcon, hostiles);
        this.handleNukes(room);
        this.visualize(room, defcon, hostiles);
    },
    
    calculateDefcon: function(room, threats, hostiles) {
        if (threats === 0) return 0;
        if (threats < 500) return 1;
        if (threats < 2000) return 2;
        if (threats < 5000) return 3;
        if (threats < 10000) return 4;
        return 5;
    },
    
    handleDefcon: function(room, defcon, hostiles) {
        var controller = room.controller;
        
        if (defcon === 5) {
            if (controller.safeModeAvailable > 0 && !controller.safeMode) {
                var spawns = room.find(FIND_MY_SPAWNS);
                var damagedSpawns = spawns.filter(function(s) {
                    return s.hits < s.hitsMax * 0.3;
                });
                
                var storageDamaged = room.storage && room.storage.hits < room.storage.hitsMax * 0.3;
                
                if (damagedSpawns.length > 0 || storageDamaged) {
                    controller.activateSafeMode();
                    Utils.log('SAFE MODE ACTIVATED in ' + room.name + '!', 'COMBAT');
                }
            }
        }
    },
    
    handleNukes: function(room) {
        var nukes = room.find(FIND_NUKES);
        
        if (nukes.length === 0) return;
        
        for (var i = 0; i < nukes.length; i++) {
            var nuke = nukes[i];
            if (nuke.timeToLand < CONFIG.COMBAT.NUKE_RESPONSE_TICKS) {
                var structures = nuke.pos.findInRange(FIND_MY_STRUCTURES, 2, {
                    filter: function(s) {
                        return s.structureType !== STRUCTURE_RAMPART &&
                               s.structureType !== STRUCTURE_ROAD;
                    }
                });
                
                for (var j = 0; j < structures.length; j++) {
                    var structure = structures[j];
                    var lookStructures = structure.pos.lookFor(LOOK_STRUCTURES);
                    var hasRampart = false;
                    
                    for (var k = 0; k < lookStructures.length; k++) {
                        if (lookStructures[k].structureType === STRUCTURE_RAMPART) {
                            hasRampart = true;
                            break;
                        }
                    }
                    
                    if (!hasRampart) {
                        room.createConstructionSite(structure.pos, STRUCTURE_RAMPART);
                    }
                }
                
                Utils.log('NUKE INCOMING in ' + room.name + '! Impact in ' + nuke.timeToLand + ' ticks', 'ERROR');
            }
        }
    },
    
    visualize: function(room, defcon, hostiles) {
        if (defcon === 0) return;
        
        var colors = ['#00ff00', '#ffff00', '#ffaa00', '#ff5500', '#ff0000', '#ff00ff'];
        
        room.visual.text(
            '🚨 DEFCON ' + defcon + ' - ' + hostiles.length + ' hostiles',
            25, 2,
            { color: colors[defcon], font: 0.8 }
        );
        
        for (var i = 0; i < hostiles.length; i++) {
            room.visual.circle(hostiles[i].pos, {
                radius: 0.5,
                fill: colors[defcon],
                opacity: 0.5
            });
        }
    }
};

module.exports = DefenseManager;