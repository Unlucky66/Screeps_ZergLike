// manager.remote
//
// Automatic remote mining:
// - Chooses good adjacent rooms as remotes (using scout intel in Memory.rooms)
// - Stores chosen remotes in room.memory.remotes
// - Computes desired counts of remoteMiner / remoteHauler / reserver per room

const MAX_REMOTES_PER_ROOM = 2;
const HAULERS_PER_SOURCE = 2;

module.exports = {
    run(room) {
        if (!room.controller || !room.controller.my) return;

        if (room.controller.level < 3) {
            room.memory.remotes = room.memory.remotes || {};
            room.memory.remoteDesiredCounts = {
                remoteMiner: 0,
                remoteHauler: 0,
                reserver: 0
            };
            return;
        }

        if (Memory.disableAutoRemotes) {
            room.memory.remoteDesiredCounts = {
                remoteMiner: 0,
                remoteHauler: 0,
                reserver: 0
            };
            return;
        }

        if (!room.memory.remotes || Game.time % 200 === 0) {
            this.planRemotes(room);
        }

        const remotes = room.memory.remotes || {};
        const desired = {
            remoteMiner: 0,
            remoteHauler: 0,
            reserver: 0
        };

        for (const remoteName in remotes) {
            const conf = remotes[remoteName];
            if (!conf || conf.enabled === false) continue;

            const sources = Array.isArray(conf.sources) ? conf.sources : [];
            const sourceCount = sources.length;
            if (!sourceCount) continue;

            desired.remoteMiner += sourceCount;
            desired.remoteHauler += sourceCount * HAULERS_PER_SOURCE;

            if (room.controller.level >= 4) {
                desired.reserver += 1;
            }
        }

        room.memory.remoteDesiredCounts = desired;
    },

    planRemotes(room) {
        const exits = Game.map.describeExits(room.name);
        if (!exits) return;

        const myName =
            Memory.myUsername ||
            (_.first(Object.values(Game.spawns)) &&
                _.first(Object.values(Game.spawns)).owner.username);

        const candidates = [];

        for (const dir in exits) {
            const remoteName = exits[dir];
            const mem = Memory.rooms[remoteName];
            const intel = mem && mem.intel;
            if (!intel) continue;

            const sources = intel.sources || [];
            if (!sources.length) continue;
            if (intel.sourceKeeper) continue;
            if (intel.hostileOwner) continue;
            if (intel.owner && intel.owner !== myName) continue;

            const score = sources.length * 100;
            candidates.push({
                roomName: remoteName,
                score,
                sources
            });
        }

        candidates.sort((a, b) => b.score - a.score);

        const remotes = {};
        for (let i = 0; i < candidates.length && i < MAX_REMOTES_PER_ROOM; i++) {
            const cand = candidates[i];
            remotes[cand.roomName] = {
                enabled: true,
                sources: cand.sources
            };
        }

        room.memory.remotes = remotes;
    }
};