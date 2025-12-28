// role.claimer

module.exports = {
    run(creep) {
        const targetRoomName =
            creep.memory.targetRoom || Memory.claimTarget;
        if (!targetRoomName) {
            creep.say('No tgt');
            return;
        }

        if (creep.room.name !== targetRoomName) {
            const pos = new RoomPosition(25, 25, targetRoomName);
            creep.moveTo(pos, {
                visualizePathStyle: { stroke: '#ffffff' },
                reusePath: 20,
                maxRooms: 4
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
                    visualizePathStyle: { stroke: '#ffffff' }
                });
            }
        } else {
            const result = creep.claimController(controller);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, {
                    visualizePathStyle: { stroke: '#ffffff' }
                });
            } else if (result === OK) {
                Memory.claimTarget = null;
                Memory.claimFrom = null;
            }
        }
    }
};