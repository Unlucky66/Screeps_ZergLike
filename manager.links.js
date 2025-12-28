// manager.links
//
// Auto-classifies links and uses them to move energy:
// - sourceLinks: near sources
// - storageLink: near storage
// - controllerLink: near controller

module.exports = {
    run(room) {
        if (!room.controller || !room.controller.my) return;

        const links = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_LINK
        });
        if (!links.length) return;

        if (!room.memory.links || Game.time % 500 === 0) {
            this.classifyLinks(room, links);
        }

        const mem = room.memory.links;
        if (!mem) return;

        const sourceLinks = (mem.sourceLinks || [])
            .map(id => Game.getObjectById(id))
            .filter(Boolean);
        const controllerLink =
            mem.controllerLink && Game.getObjectById(mem.controllerLink);
        const storageLink =
            mem.storageLink && Game.getObjectById(mem.storageLink);

        for (const link of sourceLinks) {
            if (!link) continue;
            if (link.cooldown > 0) continue;
            if (link.store[RESOURCE_ENERGY] < 400) continue;

            let target = null;
            if (
                storageLink &&
                storageLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            ) {
                target = storageLink;
            } else if (
                controllerLink &&
                controllerLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            ) {
                target = controllerLink;
            }

            if (target) {
                link.transferEnergy(target);
            }
        }

        if (
            storageLink &&
            controllerLink &&
            storageLink.cooldown === 0 &&
            storageLink.store[RESOURCE_ENERGY] > 600 &&
            controllerLink.store.getFreeCapacity(RESOURCE_ENERGY) >= 200
        ) {
            storageLink.transferEnergy(controllerLink);
        }
    },

    classifyLinks(room, links) {
        const mem = (room.memory.links = {
            sourceLinks: [],
            controllerLink: null,
            storageLink: null
        });

        const sources = room.find(FIND_SOURCES);
        const controller = room.controller;
        const storage = room.storage;

        for (const link of links) {
            if (sources.some(s => s.pos.inRangeTo(link.pos, 2))) {
                mem.sourceLinks.push(link.id);
                continue;
            }
            if (controller && controller.pos.inRangeTo(link.pos, 3)) {
                mem.controllerLink = link.id;
                continue;
            }
            if (storage && storage.pos.inRangeTo(link.pos, 2)) {
                mem.storageLink = link.id;
                continue;
            }
        }
    }
};