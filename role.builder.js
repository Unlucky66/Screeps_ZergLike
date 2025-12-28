// role.builder

module.exports = {
    run(creep) {
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }

        if (creep.memory.working) {
            if (!this.build(creep)) {
                if (!this.repair(creep)) {
                    this.upgradeFallback(creep);
                }
            }
        } else {
            this.harvest(creep);
        }
    },

    build(creep) {
        const target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (!target) return false;

        const result = creep.build(target);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        }
        return true;
    },

    repair(creep) {
        const targets = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                s.hits < s.hitsMax &&
                s.structureType !== STRUCTURE_WALL &&
                s.structureType !== STRUCTURE_RAMPART
        });

        if (!targets.length) return false;
        targets.sort((a, b) => a.hits - b.hits);

        const target = targets[0];
        const result = creep.repair(target);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        }
        return true;
    },

    upgradeFallback(creep) {
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