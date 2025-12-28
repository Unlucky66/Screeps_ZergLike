// role.harvester

module.exports = {
    run(creep) {
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }

        if (!creep.memory.working) {
            this.harvest(creep);
        } else {
            this.deliver(creep);
        }
    },

    harvest(creep) {
        let source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (!source) {
            source = creep.pos.findClosestByRange(FIND_SOURCES);
        }
        if (!source) return;

        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
    },

    deliver(creep) {
        const room = creep.room;

        let target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_SPAWN ||
                 s.structureType === STRUCTURE_EXTENSION ||
                 s.structureType === STRUCTURE_TOWER) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (!target) {
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_CONTAINER ||
                     s.structureType === STRUCTURE_STORAGE) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
        }

        if (!target && room.controller) {
            if (creep.upgradeController(room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
            }
            return;
        }

        if (target) {
            const result = creep.transfer(target, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
            }
        }
    }
};