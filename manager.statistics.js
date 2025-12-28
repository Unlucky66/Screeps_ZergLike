/**
 * Statistics Manager
 */

var MemoryManager = require('manager.memory');

var Statistics = {
    run: function() {
        this.visualizeRooms();
        
        if (Game.time % 100 === 0) {
            this.logStats();
        }
        
        if (Game.time % 500 === 0) {
            MemoryManager.cleanRoomMemory();
        }
    },
    
    visualizeRooms: function() {
        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            if (!room.controller || !room.controller.my) continue;
            
            this.drawRoomStats(room);
        }
    },
    
    drawRoomStats: function(room) {
        var controller = room.controller;
        var rcl = controller.level;
        var progress = ((controller.progress / controller.progressTotal) * 100).toFixed(1);
        var energy = room.energyAvailable;
        var capacity = room.energyCapacityAvailable;
        
        var colony = Memory.hive.colonies[room.name];
        var state = colony ? colony.state : 'unknown';
        var defcon = colony ? colony.defcon : 0;
        
        var creeps = _.filter(Game.creeps, function(c) {
            return c.memory.homeRoom === room.name;
        }).length;
        
        var sites = room.find(FIND_CONSTRUCTION_SITES).length;
        var stored = room.storage ? room.storage.store[RESOURCE_ENERGY] : 0;
        
        room.visual.rect(0, 0, 13, 7.5, { fill: '#000', opacity: 0.6 });
        room.visual.text('🐛 ZERG HIVE MIND', 6.5, 0.7, { font: 'bold 0.7', color: '#00ff00' });
        room.visual.text('Room: ' + room.name + ' | State: ' + state.toUpperCase(), 0.5, 1.5, { align: 'left', font: 0.45 });
        room.visual.text('⚡ Energy: ' + energy + '/' + capacity, 0.5, 2.3, { align: 'left', font: 0.45 });
        room.visual.text('🎮 RCL: ' + rcl + ' (' + progress + '%)', 0.5, 3.1, { align: 'left', font: 0.45 });
        room.visual.text('👾 Creeps: ' + creeps, 0.5, 3.9, { align: 'left', font: 0.45 });
        room.visual.text('🏗️ Sites: ' + sites, 0.5, 4.7, { align: 'left', font: 0.45 });
        room.visual.text('💰 Stored: ' + stored, 0.5, 5.5, { align: 'left', font: 0.45 });
        room.visual.text('🛡️ DEFCON: ' + defcon, 0.5, 6.3, { align: 'left', font: 0.45 });
        room.visual.text('CPU: ' + Game.cpu.getUsed().toFixed(1) + '/' + Game.cpu.limit, 0.5, 7.1, { align: 'left', font: 0.45 });
    },
    
    logStats: function() {
        var creepCounts = {};
        for (var name in Game.creeps) {
            var role = Game.creeps[name].memory.role;
            creepCounts[role] = (creepCounts[role] || 0) + 1;
        }
        
        var myRooms = [];
        for (var roomName in Game.rooms) {
            if (Game.rooms[roomName].controller && Game.rooms[roomName].controller.my) {
                myRooms.push(roomName);
            }
        }
        
        var remoteCount = Object.keys(Memory.hive.remotes || {}).length;
        var expansionTargets = Memory.hive.expansionTargets || [];
        
        console.log('════════════════════════════════════════════');
        console.log('           🐛 ZERG HIVE STATUS 🐛');
        console.log('════════════════════════════════════════════');
        console.log('Tick: ' + Game.time + ' | CPU: ' + Game.cpu.getUsed().toFixed(2) + '/' + Game.cpu.limit + ' | Bucket: ' + Game.cpu.bucket);
        console.log('Rooms: ' + myRooms.length + ' | Remotes: ' + remoteCount);
        console.log('Creeps: ' + JSON.stringify(creepCounts));
        console.log('Stats: Spawned=' + Memory.hive.stats.creepsSpawned + ' Lost=' + Memory.hive.stats.creepsLost + ' Claimed=' + Memory.hive.stats.roomsClaimed);
        console.log('Expansion Targets: ' + (expansionTargets.join(', ') || 'None'));
        console.log('════════════════════════════════════════════');
    }
};

module.exports = Statistics;