// role.remoteHauler

const basicHarvester = require('role.harvester');

module.exports = {
    run(creep) {
        if (!creep.memory.home) creep.memory.home = creep.room.name;

        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }

        if (creep.memory.working) {
            this.deliver(creep);
        } else {
            this.collect(creep);
        }
    },

    getHomeRoom(creep) {
        return Game.rooms[creep.memory.home];
    },

    collect(creep) {
        const homeRoom = this.getHomeRoom(creep);
        if (!homeRoom || !homeRoom.memory || !homeRoom.memory.remotes) {
            basicHarvester.run(creep);
            return;
        }

        if (
            creep.room.name !== creep.memory.home &&
            homeRoom.memory.remotes[creep.room.name]
        ) {
            let target = creep.pos.findClosestByPath(
                FIND_STRUCTURES,
                {
                    filter: s =>
                        s.structureType === STRUCTURE_CONTAINER &&
                        s.store[RESOURCE_ENERGY] > 0
                }
            );
            let dropped = null;
            if (!target) {
                dropped = creep.pos.findClosestByPath(
                    FIND_DROPPED_RESOURCES,
                    {
                        filter: r =>
                            r.resourceType === RESOURCE_ENERGY &&
                            r.amount > 50
                    }
                );
            }

            if (target) {
                if (
                    creep.withdraw(target, RESOURCE_ENERGY) ===
                    ERR_NOT_IN_RANGE
                ) {
                    creep.moveTo(target, {
                        reusePath: 10,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                    this.maybeBuildRoad(creep);
                }
                return;
            }

            if (dropped) {
                if (
                    creep.pickup(dropped) === ERR_NOT_IN_RANGE
                ) {
                    creep.moveTo(dropped, {
                        reusePath: 10,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                    this.maybeBuildRoad(creep);
                }
                return;
            }
        }

        const remoteNames = Object.keys(homeRoom.memory.remotes);
        if (!remoteNames.length) {
            basicHarvester.run(creep);
            return;
        }

        let bestRoom = null;
        let bestEnergy = 0;
        for (const rName of remoteNames) {
            const r = Game.rooms[rName];
            if (!r) continue;
            const energyInContainers = _.sum(
                r.find(FIND_STRUCTURES, {
                    filter: s =>
                        s.structureType === STRUCTURE_CONTAINER
                }),
                s => s.store[RESOURCE_ENERGY]
            );
            const dropped = _.sum(
                r.find(FIND_DROPPED_RESOURCES, {
                    filter: r =>
                        r.resourceType === RESOURCE_ENERGY
                }),
                r => r.amount
            );
            const total = energyInContainers + dropped;
            if (total > bestEnergy) {
                bestEnergy = total;
                bestRoom = rName;
            }
        }

        const targetRoom = bestRoom || remoteNames[0];

        if (creep.room.name !== targetRoom) {
            const pos = new RoomPosition(25, 25, targetRoom);
            creep.moveTo(pos, {
                reusePath: 15,
                maxRooms: 4,
                visualizePathStyle: { stroke: '#ffaa00' }
            });
            this.maybeBuildRoad(creep);
        }
    },

    deliver(creep) {
        const homeRoom = this.getHomeRoom(creep);
        if (!homeRoom) {
            basicHarvester.run(creep);
            return;
        }

        if (creep.room.name !== homeRoom.name) {
            const pos = new RoomPosition(25, 25, homeRoom.name);
            creep.moveTo(pos, {
                reusePath: 15,
                maxRooms: 4,
                visualizePathStyle: { stroke: '#ffffff' }
            });
            this.maybeBuildRoad(creep);
            return;
        }

        let target = creep.pos.findClosestByPath(
            FIND_MY_STRUCTURES,
            {
                filter: s =>
                    (s.structureType === STRUCTURE_SPAWN ||
                        s.structureType === STRUCTURE_EXTENSION ||
                        s.structureType === STRUCTURE_TOWER) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            }
        );

        if (!target) {
            target = creep.pos.findClosestByPath(
                FIND_STRUCTURES,
                {
                    filter: s =>
                        (s.structureType === STRUCTURE_STORAGE ||
                            s.structureType === STRUCTURE_CONTAINER) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                }
            );
        }

        if (target) {
            if (
                creep.transfer(target, RESOURCE_ENERGY) ===
                ERR_NOT_IN_RANGE
            ) {
                creep.moveTo(target, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#ffffff' }
                });
                this.maybeBuildRoad(creep);
            }
        } else {
            const idle =
                homeRoom.storage ||
                homeRoom.find(FIND_MY_SPAWNS)[0] ||
                creep;
            creep.moveTo(idle, {
                reusePath: 20,
                visualizePathStyle: { stroke: '#ffffff' }
            });
        }
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