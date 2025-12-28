// role.reserver

module.exports = {
    run(creep) {
        if (!creep.memory.home) creep.memory.home = creep.room.name;
        const homeRoomName = creep.memory.home;
        const homeRoom = Game.rooms[homeRoomName];

        let targetRoomName = creep.memory.remoteRoom;

        if (!targetRoomName) {
            if (!homeRoom || !homeRoom.memory || !homeRoom.memory.remotes)
                return;
            const remoteNames = Object.keys(homeRoom.memory.remotes);
            if (!remoteNames.length) return;

            let best = null;
            let bestCount = Infinity;
            for (const rName of remoteNames) {
                const count = _.sum(
                    Game.creeps,
                    c =>
                        c.memory.role === 'reserver' &&
                        c.memory.home === homeRoomName &&
                        c.memory.remoteRoom === rName
                );
                if (count < bestCount) {
                    bestCount = count;
                    best = rName;
                }
            }
            targetRoomName = best;
            creep.memory.remoteRoom = targetRoomName;
        }

        if (creep.room.name !== targetRoomName) {
            const pos = new RoomPosition(25, 25, targetRoomName);
            creep.moveTo(pos, {
                reusePath: 20,
                maxRooms: 4,
                visualizePathStyle: { stroke: '#ff00ff' }
            });
            return;
        }

        const controller = creep.room.controller;
        if (!controller) return;

        if (
            controller.owner &&
            !controller.my &&
            controller.owner.username !== creep.owner.username
        ) {
            const result = creep.attackController(controller);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#ff00ff' }
                });
            }
        } else {
            const result = creep.reserveController(controller);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#ff00ff' }
                });
            }
        }
    }
};