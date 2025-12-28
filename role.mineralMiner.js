// role.mineralMiner

module.exports = {
    run(creep) {
        if (!creep.memory.home) creep.memory.home = creep.room.name;
        const homeRoom = Game.rooms[creep.memory.home];
        if (!homeRoom) return;

        const mineralInfo = homeRoom.memory.mineral;
        if (!mineralInfo || !mineralInfo.id) {
            creep.say('no min');
            return;
        }

        const mineral = Game.getObjectById(mineralInfo.id);
        if (!mineral) return;

        if (creep.room.name !== homeRoom.name) {
            const pos = new RoomPosition(
                mineral.pos.x,
                mineral.pos.y,
                homeRoom.name
            );
            creep.moveTo(pos, {
                reusePath: 20,
                visualizePathStyle: { stroke: '#ffaa00' }
            });
            return;
        }

        let container = null;
        if (mineralInfo.containerId) {
            container = Game.getObjectById(mineralInfo.containerId);
        }
        if (!container) {
            if (!creep.pos.inRangeTo(mineral.pos, 1)) {
                creep.moveTo(mineral, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#ffaa00' }
                });
            } else {
                creep.harvest(mineral);
            }
            return;
        }

        if (!creep.pos.isEqualTo(container.pos)) {
            creep.moveTo(container.pos, {
                reusePath: 10,
                visualizePathStyle: { stroke: '#ffaa00' }
            });
            return;
        }

        const res = creep.harvest(mineral);
        if (res === ERR_NOT_ENOUGH_RESOURCES) {
            const idle =
                homeRoom.storage ||
                homeRoom.controller ||
                homeRoom.find(FIND_MY_SPAWNS)[0] ||
                creep;
            creep.moveTo(idle, {
                reusePath: 50,
                visualizePathStyle: { stroke: '#ffffff' }
            });
        }
    }
};