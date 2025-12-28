// role.carrier

const labsManager = require('manager.labs');

module.exports = {
    run(creep) {
        if (!creep.memory.home) creep.memory.home = creep.room.name;

        // state: working = delivering, !working = collecting
        if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
            creep.memory.working = false;
            delete creep.memory.labTarget;
            delete creep.memory.labResource;
        }
        if (
            !creep.memory.working &&
            creep.store.getFreeCapacity() === 0
        ) {
            creep.memory.working = true;
        }

        const homeRoom = Game.rooms[creep.memory.home];

        // Always stay in home room
        if (homeRoom && creep.room.name !== homeRoom.name) {
            var targetPos = null;

            if (homeRoom.storage) {
                targetPos = homeRoom.storage.pos;
            } else if (homeRoom.controller) {
                targetPos = homeRoom.controller.pos;
            } else {
                var spawns = homeRoom.find(FIND_MY_SPAWNS);
                if (spawns.length) {
                    targetPos = spawns[0].pos;
                }
            }

            if (targetPos) {
                creep.moveTo(targetPos, {
                    reusePath: 20,
                    visualizePathStyle: { stroke: '#ffffff' }
                });
            }
            return;
        }

        if (creep.memory.working) {
            this.deliver(creep);
        } else {
            this.collect(creep);
        }
    },

    collect(creep) {
        const room = creep.room;
        const storage = room.storage;

        // 1) Lab reagent job: pull U/H from storage into input labs
        if (
            storage &&
            creep.store.getUsedCapacity() === 0 &&
            !creep.memory.labTarget
        ) {
            const req = labsManager.getReagentRequest(room);
            if (req) {
                const result = creep.withdraw(
                    storage,
                    req.resourceType
                );
                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, {
                        reusePath: 10,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                } else if (result === OK) {
                    creep.memory.labTarget = req.labId;
                    creep.memory.labResource = req.resourceType;
                }
                return;
            }
        }

        // 2) Normal energy collection
        let target = null;

        if (room.storage && room.storage.store[RESOURCE_ENERGY] > 0) {
            target = room.storage;
        } else if (
            room.terminal &&
            room.terminal.store[RESOURCE_ENERGY] > 0
        ) {
            target = room.terminal;
        } else {
            const containers = room.find(FIND_STRUCTURES, {
                filter: function (s) {
                    return s.structureType === STRUCTURE_CONTAINER &&
                        s.store[RESOURCE_ENERGY] > 50;
                }
            });
            if (containers.length) {
                containers.sort(function (a, b) {
                    return b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY];
                });
                target = containers[0];
            }
        }

        if (target) {
            const result = creep.withdraw(target, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#ffaa00' }
                });
            }
            return;
        }

        // 3) Move minerals from containers to storage if idle
        if (storage && creep.store.getUsedCapacity() === 0) {
            const containersWithMinerals = room.find(FIND_STRUCTURES, {
                filter: function (s) {
                    if (s.structureType !== STRUCTURE_CONTAINER) return false;
                    for (var r in s.store) {
                        if (r !== RESOURCE_ENERGY && s.store[r] > 0) return true;
                    }
                    return false;
                }
            });

            if (containersWithMinerals.length) {
                const cont = containersWithMinerals[0];
                let resType = null;
                for (var r in cont.store) {
                    if (r !== RESOURCE_ENERGY && cont.store[r] > 0) {
                        resType = r;
                        break;
                    }
                }
                if (resType) {
                    const res = creep.withdraw(cont, resType);
                    if (res === ERR_NOT_IN_RANGE) {
                        creep.moveTo(cont, {
                            reusePath: 10,
                            visualizePathStyle: { stroke: '#ffaa00' }
                        });
                    }
                    return;
                }
            }
        }

        // 4) Dropped energy
        const dropped = creep.pos.findClosestByPath(
            FIND_DROPPED_RESOURCES,
            {
                filter: function (r) {
                    return r.resourceType === RESOURCE_ENERGY &&
                        r.amount > 50;
                }
            }
        );
        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#ffaa00' }
                });
            }
            return;
        }

        // Idle near storage/controller/spawn
        let idle =
            room.storage ||
            room.controller ||
            room.find(FIND_MY_SPAWNS)[0] ||
            creep;
        creep.moveTo(idle, {
            reusePath: 20,
            visualizePathStyle: { stroke: '#ffffff' }
        });
    },

    deliver(creep) {
        const room = creep.room;

        // 1) If carrying minerals for a lab
        if (
            creep.memory.labTarget &&
            creep.store.getUsedCapacity() > 0 &&
            (creep.store[RESOURCE_ENERGY] || 0) === 0
        ) {
            const lab = Game.getObjectById(creep.memory.labTarget);
            const resType = creep.memory.labResource;
            if (!lab || !resType) {
                delete creep.memory.labTarget;
                delete creep.memory.labResource;
            } else {
                const res = creep.transfer(lab, resType);
                if (res === ERR_NOT_IN_RANGE) {
                    creep.moveTo(lab, {
                        reusePath: 10,
                        visualizePathStyle: { stroke: '#ffffff' }
                    });
                } else {
                    delete creep.memory.labTarget;
                    delete creep.memory.labResource;
                }
                return;
            }
        }

        // 2) If carrying any non-energy, send to storage
        var nonEnergy = null;
        for (var r in creep.store) {
            if (r !== RESOURCE_ENERGY && creep.store[r] > 0) {
                nonEnergy = r;
                break;
            }
        }
        if (nonEnergy && room.storage) {
            const res = creep.transfer(room.storage, nonEnergy);
            if (res === ERR_NOT_IN_RANGE) {
                creep.moveTo(room.storage, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#ffffff' }
                });
            }
            return;
        }

        // 3) Normal energy delivery
        let target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
            filter: function (s) {
                return (
                    (s.structureType === STRUCTURE_SPAWN ||
                        s.structureType === STRUCTURE_EXTENSION) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                );
            }
        });

        if (!target) {
            target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: function (s) {
                    return (
                        s.structureType === STRUCTURE_TOWER &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) >
                            s.store.getCapacity(RESOURCE_ENERGY) * 0.2
                    );
                }
            });
        }

        if (!target) {
            if (room.storage) {
                target = room.storage;
            } else {
                const controller = room.controller;
                if (controller) {
                    target = controller.pos.findClosestByRange(
                        FIND_STRUCTURES,
                        {
                            filter: function (s) {
                                return (
                                    s.structureType ===
                                        STRUCTURE_CONTAINER &&
                                    s.store.getFreeCapacity(
                                        RESOURCE_ENERGY
                                    ) > 0
                                );
                            }
                        }
                    );
                }
            }
        }

        if (target) {
            const result = creep.transfer(target, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#ffffff' }
                });
            }
        } else {
            let idle =
                room.storage ||
                room.controller ||
                room.find(FIND_MY_SPAWNS)[0] ||
                creep;
            creep.moveTo(idle, {
                reusePath: 20,
                visualizePathStyle: { stroke: '#ffffff' }
            });
        }
    }
};