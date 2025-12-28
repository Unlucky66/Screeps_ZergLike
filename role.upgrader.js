// role.upgrader

module.exports = {
    run(creep) {
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }

        if (creep.memory.working) {
            this.upgrade(creep);
        } else {
            this.harvest(creep);
        }
    },

    upgrade(creep) {
        if (!creep.room.controller) return;
        const result = creep.upgradeController(creep.room.controller);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, {
                visualizePathStyle: { stroke: '#ffffff' }
            });
        }
    },

    harvest(creep) {
        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_CONTAINER ||
                    s.structureType === STRUCTURE_STORAGE) &&
                s.store[RESOURCE_ENERGY] > 0
        });

        if (container) {
            const result = creep.withdraw(container, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, {
                    visualizePathStyle: { stroke: '#ffaa00' }
                });
            }
            return;
        }

        let source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (!source) source = creep.pos.findClosestByRange(FIND_SOURCES);
        if (!source) return;

        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {
                visualizePathStyle: { stroke: '#ffaa00' }
            });
        }
    }
};