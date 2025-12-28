/**
 * ██████████████████████████████████████████████████████████████████████████████
 * █  ZERG SWARM AI v2.0 - FULLY AUTOMATED HIVE MIND                            █
 * █  All systems are autonomous - No player intervention required              █
 * ██████████████████████████████████████████████████████████████████████████████
 */

'use strict';

// Managers
var CONFIG = require('config');
var MemoryManager = require('manager.memory');
var ColonyManager = require('manager.colony');
var SpawnManager = require('manager.spawn');
var EnergyManager = require('manager.energy');
var TowerManager = require('manager.tower');
var DefenseManager = require('manager.defense');
var ConstructionManager = require('manager.construction');
var ExpansionManager = require('manager.expansion');
var Statistics = require('manager.statistics');

// Creep Dispatcher
var CreepDispatcher = require('creepDispatcher');

// Utils
var Utils = require('utils');

module.exports.loop = function() {
    // Initialize memory
    MemoryManager.initialize();
    
    var cpuStart = Game.cpu.getUsed();
    
    // Process owned rooms
    for (var roomName in Game.rooms) {
        var room = Game.rooms[roomName];
        
        if (room.controller && room.controller.my) {
            // Colony management
            ColonyManager.run(room);
            
            // Spawning
            SpawnManager.run(room);
            
            // Defense
            DefenseManager.run(room);
            
            // Towers
            TowerManager.run(room);
            
            // Energy management
            EnergyManager.run(room);
            
            // Auto construction
            ConstructionManager.run(room);
        }
    }
    
    // Global expansion management
    ExpansionManager.run();
    
    // Process all creeps
    for (var name in Game.creeps) {
        CreepDispatcher.run(Game.creeps[name]);
    }
    
    // Statistics and visualization
    Statistics.run();
    
    // CPU warning
    var cpuUsed = Game.cpu.getUsed() - cpuStart;
    if (cpuUsed > Game.cpu.limit * 0.9) {
        Utils.log('High CPU usage: ' + cpuUsed.toFixed(2) + '/' + Game.cpu.limit, 'WARN');
    }
    
    // Generate pixels
    if (Game.cpu.bucket >= CONFIG.THRESHOLDS.BUCKET_PIXEL_THRESHOLD && Game.cpu.generatePixel) {
        Game.cpu.generatePixel();
    }
};