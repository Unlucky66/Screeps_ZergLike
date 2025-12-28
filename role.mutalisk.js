/**
 * Role: Mutalisk - Scout
 */

var RoleMutalisk = {
    run: function(creep) {
        if (!creep.memory.targetRoom) {
            this.assignTarget(creep);
        }
        
        if (creep.room.name !== creep.memory.targetRoom) {
            var exitDir = creep.room.findExitTo(creep.memory.targetRoom);
            var exit = creep.pos.findClosestByPath(exitDir);
            if (exit) {
                creep.moveTo(exit, { reusePath: 20 });
            }
            return;
        }
        
        this.scoutRoom(creep);
        
        // Get new target periodically
        if (Game.time % 50 === 0) {
            delete creep.memory.targetRoom;
        }
    },
    
    assignTarget: function(creep) {
        var exits = Game.map.describeExits(creep.room.name);
        var rooms = [];
        for (var dir in exits) {
            if (exits[dir]) rooms.push(exits[dir]);
        }
        
        // Prefer unexplored rooms
        for (var i = 0; i < rooms.length; i++) {
            if (!Memory.hive.scoutData[rooms[i]]) {
                creep.memory.targetRoom = rooms[i];
                return;
            }
        }
        
        // Otherwise random
        creep.memory.targetRoom = rooms[Math.floor(Math.random() * rooms.length)];
    },
    
    scoutRoom: function(creep) {
        var room = creep.room;
        var sources = room.find(FIND_SOURCES);
        var minerals = room.find(FIND_MINERALS);
        var hostiles = room.find(FIND_HOSTILE_CREEPS);
        var structures = room.find(FIND_HOSTILE_STRUCTURES);
        
        var controllerData = null;
        if (room.controller) {
            controllerData = {
                level: room.controller.level,
                owner: room.controller.owner ? room.controller.owner.username : null,
                reservation: room.controller.reservation ? room.controller.reservation.username : null
            };
        }
        
        Memory.hive.scoutData[room.name] = {
            time: Game.time,
            sources: sources.length,
            mineral: minerals.length > 0 ? minerals[0].mineralType : null,
            controller: controllerData,
            hostiles: hostiles.length,
            structures: structures.length
        };
    }
};

module.exports = RoleMutalisk;