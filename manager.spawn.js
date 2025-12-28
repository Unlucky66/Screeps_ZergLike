/**
 * Spawn Manager
 */

var Utils = require('utils');
var PopulationManager = require('manager.population');

var SpawnManager = {
    run: function(room) {
        var spawns = room.find(FIND_MY_SPAWNS, {
            filter: function(s) { return !s.spawning; }
        });
        if (spawns.length === 0) return;
        
        var priorities = PopulationManager.getSpawnPriority(room);
        if (priorities.length === 0) {
            this.handleRenewing(room, spawns[0]);
            return;
        }
        
        var energyAvailable = room.energyAvailable;
        var energyCapacity = room.energyCapacityAvailable;
        
        for (var s = 0; s < spawns.length; s++) {
            var spawn = spawns[s];
            if (spawn.spawning) continue;
            
            for (var p = 0; p < priorities.length; p++) {
                var success = this.spawnCreep(spawn, priorities[p].role, energyAvailable, energyCapacity);
                if (success) break;
            }
        }
        
        this.visualize(room);
    },
    
    spawnCreep: function(spawn, role, energyAvailable, energyCapacity) {
        var isEmergency = role === 'larva' || role === 'defender';
        var energy = isEmergency ? 
            Math.max(200, energyAvailable) : 
            Math.max(300, Math.min(energyAvailable, energyCapacity));
        
        var body = Utils.getBody(role, energy, spawn.room.controller.level);
        var cost = Utils.getBodyCost(body);
        
        if (cost > energyAvailable) {
            if (isEmergency && energyAvailable >= 200) {
                var minBody = [WORK, CARRY, MOVE];
                if (Utils.getBodyCost(minBody) <= energyAvailable) {
                    return this.doSpawn(spawn, minBody, role);
                }
            }
            return false;
        }
        
        return this.doSpawn(spawn, body, role);
    },
    
    doSpawn: function(spawn, body, role) {
        var name = role + '_' + Memory.hive.creepIndex++;
        
        var memory = {
            role: role,
            homeRoom: spawn.room.name,
            working: false,
            born: Game.time
        };
        
        // Assign remote room
        if (role === 'remoteHarvester' || role === 'remoteHauler' || role === 'reserver') {
            var remotes = [];
            for (var r in Memory.hive.remotes) {
                if (Memory.hive.remotes[r].homeRoom === spawn.room.name && 
                    Memory.hive.remotes[r].active) {
                    remotes.push(r);
                }
            }
            
            if (remotes.length > 0) {
                var bestRemote = remotes[0];
                var minWorkers = Infinity;
                
                for (var i = 0; i < remotes.length; i++) {
                    var workers = _.filter(Game.creeps, function(c) {
                        return c.memory.targetRoom === remotes[i];
                    }).length;
                    if (workers < minWorkers) {
                        minWorkers = workers;
                        bestRemote = remotes[i];
                    }
                }
                
                memory.targetRoom = bestRemote;
            }
        }
        
        // Assign expansion target
        if (role === 'swarmHost') {
            var target = Memory.hive.expansionTargets && Memory.hive.expansionTargets[0];
            if (target) {
                memory.targetRoom = target;
            }
        }
        
        var result = spawn.spawnCreep(body, name, { memory: memory });
        
        if (result === OK) {
            Memory.hive.stats.creepsSpawned++;
            Utils.log('Spawning ' + role + ': ' + name + ' (' + body.length + ' parts)', 'SUCCESS');
            return true;
        }
        
        return false;
    },
    
    handleRenewing: function(room, spawn) {
        var dyingCreeps = spawn.pos.findInRange(FIND_MY_CREEPS, 1, {
            filter: function(c) {
                return c.ticksToLive < 200 && 
                       Utils.getBodyCost(c.body.map(function(p) { return p.type; })) > 1000 &&
                       !c.memory.renewing;
            }
        });
        
        if (dyingCreeps.length > 0) {
            spawn.renewCreep(dyingCreeps[0]);
        }
    },
    
    visualize: function(room) {
        var spawns = room.find(FIND_MY_SPAWNS, {
            filter: function(s) { return s.spawning; }
        });
        
        for (var i = 0; i < spawns.length; i++) {
            var spawn = spawns[i];
            var progress = ((spawn.spawning.needTime - spawn.spawning.remainingTime) / 
                           spawn.spawning.needTime * 100).toFixed(0);
            
            room.visual.text(
                '🥚 ' + spawn.spawning.name.split('_')[0] + ' ' + progress + '%',
                spawn.pos.x,
                spawn.pos.y - 1,
                { align: 'center', font: 0.4 }
            );
        }
    }
};

module.exports = SpawnManager;