// role.attacker

const labsManager = require('manager.labs');

const ATTACK_BOOST = RESOURCE_UTRIUM_HYDRIDE;

module.exports = {
    run(creep) {
        if (!creep.memory.home) creep.memory.home = creep.room.name;

        // Try to boost once in home room before leaving
        if (!creep.memory.boosted) {
            if (this.tryBoost(creep)) return;
        }

        const targetRoomName =
            creep.memory.targetRoom || Memory.attackTarget;
        if (!targetRoomName) {
            this.idle(creep);
            return;
        }

        if (creep.room.name !== targetRoomName) {
            const pos = new RoomPosition(25, 25, targetRoomName);
            creep.moveTo(pos, {
                reusePath: 20,
                maxRooms: 6,
                visualizePathStyle: { stroke: '#ff00ff' }
            });
            return;
        }

        const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        const towers = creep.room.find(FIND_HOSTILE_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });
        const spawns = creep.room.find(FIND_HOSTILE_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_SPAWN
        });
        const otherStructs = creep.room.find(FIND_HOSTILE_STRUCTURES, {
            filter: s =>
                s.structureType !== STRUCTURE_TOWER &&
                s.structureType !== STRUCTURE_SPAWN
        });

        let target = null;
        if (towers.length) {
            target = creep.pos.findClosestByPath(towers) || towers[0];
        } else if (hostiles.length) {
            target = creep.pos.findClosestByPath(hostiles) || hostiles[0];
        } else if (spawns.length) {
            target = creep.pos.findClosestByPath(spawns) || spawns[0];
        } else if (otherStructs.length) {
            target =
                creep.pos.findClosestByPath(otherStructs) ||
                otherStructs[0];
        }

        if (!target) {
            this.idle(creep);
            return;
        }

        if (creep.getActiveBodyparts(ATTACK) > 0) {
            if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#ff00ff' }
                });
            }
        } else if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
            if (creep.rangedAttack(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#ff00ff' }
                });
            }
        } else {
            creep.moveTo(target, {
                reusePath: 5,
                visualizePathStyle: { stroke: '#ff00ff' }
            });
        }
    },

    tryBoost(creep) {
        const room = creep.room;
        const homeRoom = Game.rooms[creep.memory.home];
        if (!homeRoom || room.name !== homeRoom.name) {
            creep.memory.boosted = true;
            return false;
        }

        const labs = labsManager.getBoostLabs(room, ATTACK_BOOST);
        if (!labs.length) {
            creep.memory.boosted = true;
            return false;
        }

        const lab = creep.pos.findClosestByRange(labs);
        if (!lab) {
            creep.memory.boosted = true;
            return false;
        }

        if (lab.pos.getRangeTo(creep) > 1) {
            creep.moveTo(lab, {
                reusePath: 10,
                visualizePathStyle: { stroke: '#00ffff' }
            });
            return true;
        }

        lab.boostCreep(creep);
        creep.memory.boosted = true;
        return false;
    },

    idle(creep) {
        const homeRoom = Game.rooms[creep.memory.home];
        if (!homeRoom) return;
        const idle =
            homeRoom.storage ||
            homeRoom.controller ||
            homeRoom.find(FIND_MY_SPAWNS)[0] ||
            creep;
        creep.moveTo(idle, {
            reusePath: 20,
            visualizePathStyle: { stroke: '#ffffff' }
        });
    }
};