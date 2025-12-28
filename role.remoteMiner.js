// role.remoteMiner

const basicHarvester = require('role.harvester');

module.exports = {
    run(creep) {
        if (!creep.memory.home) creep.memory.home = creep.room.name;

        if (!creep.memory.remoteRoom) {
            const assigned = this.assignRemote(creep);
            if (!assigned) {
                basicHarvester.run(creep);
                return;
            }
        }

        const remoteRoomName = creep.memory.remoteRoom;
        const homeRoomName = creep.memory.home;

        if (creep.room.name !== remoteRoomName) {
            const pos = new RoomPosition(25, 25, remoteRoomName);
            creep.moveTo(pos, {
                reusePath: 20,
                maxRooms: 4,
                visualizePathStyle: { stroke: '#ffaa00' }
            });
            this.maybeBuildRoad(creep);
            return;
        }

        const homeRoom = Game.rooms[homeRoomName];
        const remoteInfo =
            homeRoom &&
            homeRoom.memory &&
            homeRoom.memory.remotes &&
            homeRoom.memory.remotes[remoteRoomName];

        let sourcePosData = null;
        if (remoteInfo && Array.isArray(remoteInfo.sources)) {
            const idx = creep.memory.sourceIndex || 0;
            sourcePosData =
                remoteInfo.sources[idx % remoteInfo.sources.length];
        }

        let source = null;
        if (sourcePosData) {
            const sources = creep.room.find(FIND_SOURCES);
            source =
                _.find(
                    sources,
                    s =>
                        s.pos.x === sourcePosData.x &&
                        s.pos.y === sourcePosData.y
                ) || sources[0];
        } else {
            source =
                creep.pos.findClosestByPath(FIND_SOURCES) ||
                creep.pos.findClosestByRange(FIND_SOURCES);
        }
        if (!source) return;

        let container = null;
        let containerSites = [];

        container = source.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];

        if (!container) {
            containerSites = source.pos.findInRange(
                FIND_CONSTRUCTION_SITES,
                1,
                {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                }
            );
            if (containerSites.length) container = containerSites[0];
        }

        if (!container && !creep.memory.triedContainerAt) {
            const terrain = creep.room.getTerrain();
            let bestPos = null;

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const x = source.pos.x + dx;
                    const y = source.pos.y + dy;
                    if (x <= 0 || x >= 49 || y <= 0 || y >= 49) continue;
                    if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

                    const pos = new RoomPosition(x, y, creep.room.name);
                    const structs = pos.lookFor(LOOK_STRUCTURES);
                    const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
                    if (structs.length || sites.length) continue;

                    bestPos = pos;
                    break;
                }
                if (bestPos) break;
            }

            if (bestPos) {
                const res = creep.room.createConstructionSite(
                    bestPos,
                    STRUCTURE_CONTAINER
                );
                if (res === OK) {
                    creep.memory.triedContainerAt = {
                        x: bestPos.x,
                        y: bestPos.y,
                        t: Game.time
                    };
                }
            } else {
                creep.memory.triedContainerAt = {
                    x: source.pos.x,
                    y: source.pos.y,
                    t: Game.time
                };
            }
        }

        if (container && !creep.pos.isEqualTo(container.pos)) {
            creep.moveTo(container.pos, {
                reusePath: 10,
                visualizePathStyle: { stroke: '#ffaa00' }
            });
            this.maybeBuildRoad(creep);
            return;
        }

        const harvestResult = creep.harvest(source);
        if (
            harvestResult === OK &&
            containerSites.length &&
            creep.store[RESOURCE_ENERGY] > 0
        ) {
            creep.build(containerSites[0]);
        } else if (harvestResult === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {
                reusePath: 10,
                visualizePathStyle: { stroke: '#ffaa00' }
            });
            this.maybeBuildRoad(creep);
        } else if (
            creep.store.getFreeCapacity() === 0 &&
            !container
        ) {
            creep.drop(RESOURCE_ENERGY);
        }
    },

    assignRemote(creep) {
        const homeRoom = Game.rooms[creep.memory.home];
        if (!homeRoom || !homeRoom.memory || !homeRoom.memory.remotes)
            return false;

        const jobs = [];
        for (const remoteName in homeRoom.memory.remotes) {
            const conf = homeRoom.memory.remotes[remoteName];
            if (!conf.enabled) continue;
            const sources = conf.sources || [];
            for (let i = 0; i < sources.length; i++) {
                jobs.push({ remoteName, sourceIndex: i });
            }
        }
        if (!jobs.length) return false;

        let bestJob = null;
        let bestCount = Infinity;
        for (const job of jobs) {
            const count = _.sum(
                Game.creeps,
                c =>
                    c.memory.role === 'remoteMiner' &&
                    c.memory.home === creep.memory.home &&
                    c.memory.remoteRoom === job.remoteName &&
                    c.memory.sourceIndex === job.sourceIndex
            );
            if (count < bestCount) {
                bestCount = count;
                bestJob = job;
            }
        }
        if (!bestJob) return false;
        creep.memory.remoteRoom = bestJob.remoteName;
        creep.memory.sourceIndex = bestJob.sourceIndex;
        return true;
    },

    maybeBuildRoad(creep) {
        if (
            !creep.memory.lastRoadCheck ||
            Game.time - creep.memory.lastRoadCheck > 15
        ) {
            creep.memory.lastRoadCheck = Game.time;
            const pos = creep.pos;
            const terrain = creep.room.getTerrain();
            if (terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL) {
                const hasRoad =
                    pos
                        .lookFor(LOOK_STRUCTURES)
                        .some(s => s.structureType === STRUCTURE_ROAD) ||
                    pos
                        .lookFor(LOOK_CONSTRUCTION_SITES)
                        .some(s => s.structureType === STRUCTURE_ROAD);
                if (!hasRoad) {
                    creep.room.createConstructionSite(
                        pos,
                        STRUCTURE_ROAD
                    );
                }
            }
        }
    }
};