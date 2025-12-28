// role.defender

const labsManager = require('manager.labs');
const ATTACK_BOOST = RESOURCE_UTRIUM_HYDRIDE;

module.exports = {
    run(creep) {
        if (!creep.memory.home) creep.memory.home = creep.room.name;

        // Try one-time boost in home room
        if (!creep.memory.boosted) {
            if (this.tryBoost(creep)) return;
        }

        const homeRoomName = creep.memory.home;

        if (creep.room.name !== homeRoomName) {
            const pos = new RoomPosition(25, 25, homeRoomName);
            creep.moveTo(pos, {
                reusePath: 20,
                visualizePathStyle: { stroke: '#00ff00' }
            });
            return;
        }

        const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);

        if (hostiles.length) {
            const target =
                creep.pos.findClosestByPath(hostiles) || hostiles[0];
            if (!target) return;

            if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#ff0000' }
                });
            }

            if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
                creep.rangedAttack(target);
            }
        } else {
            const room = creep.room;
            let posTarget = null;
            const spawns = room.find(FIND_MY_SPAWNS);
            if (spawns.length) {
                posTarget = spawns[0].pos;
            } else if (room.controller) {
                posTarget = room.controller.pos;
            }

            if (posTarget) {
                creep.moveTo(posTarget, {
                    reusePath: 20,
                    visualizePathStyle: { stroke: '#00ff00' }
                });
            }
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
    }
};