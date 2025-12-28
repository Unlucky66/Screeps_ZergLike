// role.scout

module.exports = {
    run(creep) {
        this.recordIntel(creep.room);

        const scoutFlag = Game.flags['Scout'];
        if (scoutFlag) {
            creep.moveTo(scoutFlag, {
                reusePath: 20,
                visualizePathStyle: { stroke: '#00ffff' }
            });
            return;
        }

        if (
            !creep.memory.targetRoom ||
            creep.memory.targetRoom === creep.room.name ||
            (creep.memory.nextSwitch && Game.time >= creep.memory.nextSwitch)
        ) {
            const next = this.pickNextRoom(creep.room.name);
            if (next) {
                creep.memory.targetRoom = next;
                creep.memory.nextSwitch = Game.time + 100;
            } else {
                creep.memory.targetRoom = null;
            }
        }

        const targetRoom = creep.memory.targetRoom;

        if (targetRoom && targetRoom !== creep.room.name) {
            const pos = new RoomPosition(25, 25, targetRoom);
            creep.moveTo(pos, {
                reusePath: 20,
                maxRooms: 4,
                visualizePathStyle: { stroke: '#00ffff' }
            });
        } else {
            const exits = creep.room.find(FIND_EXIT);
            if (exits.length) {
                creep.moveTo(exits[0], {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#00ffff' }
                });
            }
        }
    },

    pickNextRoom(currentName) {
        const exits = Game.map.describeExits(currentName);
        if (!exits) return null;

        let best = null;
        let bestVisited = Infinity;

        for (const dir in exits) {
            const roomName = exits[dir];
            const mem = Memory.rooms[roomName] || {};
            const lastVisited = mem.lastVisited || 0;
            if (lastVisited < bestVisited) {
                bestVisited = lastVisited;
                best = roomName;
            }
        }
        return best;
    },

    recordIntel(room) {
        if (!room) return;

        if (!Memory.rooms[room.name]) Memory.rooms[room.name] = {};
        const mem = Memory.rooms[room.name];

        const last = mem.intel && mem.intel.lastScan;
        if (last && Game.time - last < 100) {
            mem.lastVisited = Game.time;
            return;
        }

        const sources = room.find(FIND_SOURCES).map(s => ({
            id: s.id,
            x: s.pos.x,
            y: s.pos.y
        }));

        const controller = room.controller;
        const lairs = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_KEEPER_LAIR
        });

        const mySpawn = _.first(Object.values(Game.spawns));
        const myName = Memory.myUsername || (mySpawn && mySpawn.owner.username);

        let owner = null;
        let reservedBy = null;
        let hostileOwner = false;

        if (controller) {
            if (controller.owner) {
                owner = controller.owner.username;
                hostileOwner = owner !== myName;
            }
            if (controller.reservation) {
                reservedBy = controller.reservation.username;
                if (!owner && reservedBy && reservedBy !== myName) {
                    hostileOwner = true;
                }
            }
        }

        mem.intel = {
            lastScan: Game.time,
            sources,
            hasController: !!controller,
            controllerLevel: controller ? controller.level : 0,
            owner,
            reservedBy,
            hostileOwner,
            sourceKeeper: lairs.length > 0
        };
        mem.lastVisited = Game.time;
    }
};