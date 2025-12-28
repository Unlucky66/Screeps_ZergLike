// config

const roles = {
    HARVESTER: 'harvester',
    CARRIER: 'carrier',
    UPGRADER: 'upgrader',
    BUILDER: 'builder',
    DEFENDER: 'defender',
    ATTACKER: 'attacker',
    MINERAL_MINER: 'mineralMiner',
    CLAIMER: 'claimer',
    SCOUT: 'scout',
    REMOTE_MINER: 'remoteMiner',
    REMOTE_HAULER: 'remoteHauler',
    RESERVER: 'reserver'
};

function patternBody(pattern, energyAvailable, maxRepeats = 10) {
    const body = [];
    let repeats = 0;

    while (repeats < maxRepeats) {
        const patternCost = pattern.reduce(
            (sum, part) => sum + BODYPART_COST[part],
            0
        );
        const newCost =
            body.reduce((sum, part) => sum + BODYPART_COST[part], 0) +
            patternCost;
        if (newCost > energyAvailable || body.length + pattern.length > 50)
            break;
        body.push(...pattern);
        repeats++;
    }
    return body;
}

function getBody(role, energyAvailable) {
    if (energyAvailable < 200) {
        return [];
    }

    switch (role) {
        case roles.HARVESTER:
        case roles.UPGRADER:
        case roles.BUILDER:
            return patternBody([WORK, CARRY, MOVE], energyAvailable, 8);

        case roles.CARRIER:
            return patternBody([CARRY, CARRY, MOVE], energyAvailable, 12);

        case roles.DEFENDER:
            return patternBody(
                [TOUGH, TOUGH, MOVE, ATTACK, MOVE],
                energyAvailable,
                8
            );

        case roles.ATTACKER:
            // Heavy raid body up to ~50 parts
            return patternBody(
                [TOUGH, MOVE, ATTACK, MOVE],
                energyAvailable,
                15
            );

        case roles.MINERAL_MINER:
            return patternBody([WORK, WORK, MOVE], energyAvailable, 8);

        case roles.CLAIMER: {
            const cost = BODYPART_COST[CLAIM] + BODYPART_COST[MOVE];
            if (energyAvailable < cost) return [];
            return [CLAIM, MOVE];
        }

        case roles.SCOUT:
            return patternBody([MOVE], energyAvailable, 10);

        case roles.REMOTE_MINER:
            return patternBody([WORK, WORK, MOVE], energyAvailable, 8);

        case roles.REMOTE_HAULER:
            return patternBody([CARRY, CARRY, MOVE], energyAvailable, 10);

        case roles.RESERVER: {
            const cost =
                BODYPART_COST[CLAIM] * 2 + BODYPART_COST[MOVE] * 2;
            if (energyAvailable < cost) return [];
            return [CLAIM, CLAIM, MOVE, MOVE];
        }

        default:
            return [];
    }
}

function getDesiredCounts(room) {
    const hasConstruction = room.find(FIND_CONSTRUCTION_SITES).length > 0;
    const hostiles = room.find(FIND_HOSTILE_CREEPS).length > 0;
    const controllerLevel = room.controller ? room.controller.level : 0;
    const underAttack = room.memory.underAttack;

    const desired = {
        [roles.HARVESTER]: 3,
        [roles.CARRIER]: 0,
        [roles.UPGRADER]: 3,
        [roles.BUILDER]: hasConstruction ? 2 : 0,
        [roles.DEFENDER]: underAttack ? 4 : (hostiles ? 1 : 0),
        [roles.ATTACKER]: 0,
        [roles.MINERAL_MINER]: 0,
        [roles.CLAIMER]: 0,
        [roles.SCOUT]: 0,
        [roles.REMOTE_MINER]: 0,
        [roles.REMOTE_HAULER]: 0,
        [roles.RESERVER]: 0
    };

    // Core scaling
    if (controllerLevel <= 2) {
        desired[roles.HARVESTER] = 3;
        desired[roles.UPGRADER] = 2;
        desired[roles.BUILDER] = hasConstruction ? 1 : 0;
    } else if (controllerLevel >= 4) {
        desired[roles.HARVESTER] = 4;
        desired[roles.UPGRADER] = 4;
        desired[roles.BUILDER] = hasConstruction ? 3 : 0;
    }

    // Internal carriers once infrastructure exists
    const containers = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
    });
    const hasSourceContainer = containers.some(
        c => c.pos.findInRange(FIND_SOURCES, 2).length > 0
    );
    const hasStorage = !!room.storage;

    if (hasStorage || hasSourceContainer) {
        let carriers = 1;
        if (controllerLevel >= 4) carriers = 2;
        if (controllerLevel >= 6) carriers = 3;
        if (controllerLevel >= 8) carriers = 4;
        desired[roles.CARRIER] = carriers;
    }

    // Remote mining: from manager.remote
    const remoteDesired = room.memory.remoteDesiredCounts || {};
    desired[roles.REMOTE_MINER] = remoteDesired.remoteMiner || 0;
    desired[roles.REMOTE_HAULER] = remoteDesired.remoteHauler || 0;
    desired[roles.RESERVER] = remoteDesired.reserver || 0;

    // Mineral mining: from manager.minerals
    desired[roles.MINERAL_MINER] =
        (room.memory.mineralDesiredMiners || 0);

    // Auto expansion: claimer from manager.empire
    if (
        Memory.claimTarget &&
        (!Game.rooms[Memory.claimTarget] ||
            !Game.rooms[Memory.claimTarget].controller ||
            !Game.rooms[Memory.claimTarget].controller.my)
    ) {
        const from = Memory.claimFrom || room.name;
        if (room.name === from) {
            desired[roles.CLAIMER] = 1;
        }
    }

    // Attack waves scale by RCL
    if (
        Memory.attackTarget &&
        Memory.attackFrom === room.name &&
        controllerLevel >= 4
    ) {
        let waves = Memory.attackWaves || 3;
        if (controllerLevel >= 6) waves += 2;
        if (controllerLevel >= 8) waves += 3;
        desired[roles.ATTACKER] = waves;
    }

    // One global scout from best room
    const owned = _.filter(
        Game.rooms,
        r => r.controller && r.controller.my
    );
    if (owned.length) {
        const primary = _.max(
            owned,
            r => (r.controller && r.controller.level) || 0
        );
        if (primary && primary.name === room.name && controllerLevel >= 3) {
            desired[roles.SCOUT] = 1;
        }
    }

    return desired;
}

module.exports = {
    roles,
    getBody,
    getDesiredCounts
};