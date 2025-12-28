// manager.spawn

const config = require('config');

module.exports = {
    run(room) {
        const spawns = room.find(FIND_MY_SPAWNS, { filter: s => !s.spawning });
        if (!spawns.length) return;

        const spawn = spawns[0];
        const creeps = room.find(FIND_MY_CREEPS);
        const counts = _.countBy(creeps, c => c.memory.role);
        const desired = config.getDesiredCounts(room);

        const currentHarvesters = counts[config.roles.HARVESTER] || 0;

        if (currentHarvesters === 0) {
            const emergencyBody = [WORK, CARRY, MOVE];
            if (room.energyAvailable >= 200) {
                this.trySpawn(
                    spawn,
                    emergencyBody,
                    config.roles.HARVESTER,
                    room.name
                );
            }
            return;
        }

        const priorityOrder = [
            config.roles.HARVESTER,
            config.roles.CARRIER,
            config.roles.DEFENDER,
            config.roles.UPGRADER,
            config.roles.BUILDER,
            config.roles.MINERAL_MINER,
            config.roles.REMOTE_MINER,
            config.roles.REMOTE_HAULER,
            config.roles.RESERVER,
            config.roles.ATTACKER,
            config.roles.CLAIMER,
            config.roles.SCOUT
        ];

        for (const role of priorityOrder) {
            const need = desired[role] || 0;
            const have = counts[role] || 0;
            if (have >= need) continue;

            const body = config.getBody(role, room.energyCapacityAvailable);
            if (!body.length) continue;

            const result = this.trySpawn(spawn, body, role, room.name);
            if (result === OK) break;
        }
    },

    trySpawn(spawn, body, role, homeRoom, extraMemory = {}) {
        const name = `${role}-${homeRoom}-${Game.time}`;
        const memory = Object.assign(
            {
                role,
                home: homeRoom
            },
            extraMemory
        );

        const result = spawn.spawnCreep(body, name, { memory });

        if (result === OK) {
            console.log(
                `[SPAWN] ${spawn.room.name} spawning ${role} (${name}) body=[${body.join(
                    ','
                )}]`
            );
        } else if (result !== ERR_BUSY && result !== ERR_NOT_ENOUGH_ENERGY) {
            console.log(
                `[SPAWN] Failed to spawn ${role} in ${spawn.room.name}: ${result}`
            );
        }
        return result;
    }
};