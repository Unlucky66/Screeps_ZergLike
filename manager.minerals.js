// manager.minerals
//
// Local mineral mining:
// - At RCL >= 6, builds an extractor on the mineral
// - Builds a container near the mineral
// - Requests 1 mineralMiner while mineral has amount left

const MIN_RCL_MINING = 6;

module.exports = {
    run(room) {
        if (!room.controller || !room.controller.my) return;

        if (room.controller.level < MIN_RCL_MINING) {
            room.memory.mineralDesiredMiners = 0;
            return;
        }

        const mineral = room.find(FIND_MINERALS)[0];
        if (!mineral) {
            room.memory.mineralDesiredMiners = 0;
            return;
        }

        const mem = room.memory.mineral || {};
        mem.id = mineral.id;

        // Extractor
        const extractor = room.find(FIND_STRUCTURES, {
            filter: s =>
                s.structureType === STRUCTURE_EXTRACTOR &&
                s.pos.isEqualTo(mineral.pos)
        })[0];

        if (!extractor) {
            const site = room.find(FIND_CONSTRUCTION_SITES, {
                filter: s =>
                    s.structureType === STRUCTURE_EXTRACTOR &&
                    s.pos.isEqualTo(mineral.pos)
            })[0];
            if (!site) {
                room.createConstructionSite(
                    mineral.pos,
                    STRUCTURE_EXTRACTOR
                );
            }
            room.memory.mineralDesiredMiners = 0;
            room.memory.mineral = mem;
            return;
        }

        // Container near mineral
        let container = null;
        container = mineral.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];

        if (!container) {
            const site = mineral.pos.findInRange(
                FIND_CONSTRUCTION_SITES,
                1,
                {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                }
            )[0];

            if (!site) {
                const terrain = room.getTerrain();
                for (let dx = -1; dx <= 1 && !container; dx++) {
                    for (let dy = -1; dy <= 1 && !container; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const x = mineral.pos.x + dx;
                        const y = mineral.pos.y + dy;
                        if (x <= 0 || x >= 49 || y <= 0 || y >= 49) continue;
                        if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

                        const pos = new RoomPosition(x, y, room.name);
                        if (pos.lookFor(LOOK_STRUCTURES).length) continue;
                        if (pos.lookFor(LOOK_CONSTRUCTION_SITES).length)
                            continue;

                        room.createConstructionSite(
                            pos,
                            STRUCTURE_CONTAINER
                        );
                        break;
                    }
                }
            }
        } else {
            mem.containerId = container.id;
        }

        // Decide miners
        if (mineral.mineralAmount > 0) {
            room.memory.mineralDesiredMiners = 1;
        } else {
            room.memory.mineralDesiredMiners = 0;
        }

        room.memory.mineral = mem;
    }
};