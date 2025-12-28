// manager.empire
//
// Empire-wide logic:
// - cache my username
// - auto-select new claimTarget based on scouting intel when GCL allows another room

module.exports = {
    run() {
        this.cacheMyUsername();
        this.planExpansion();
    },

    cacheMyUsername() {
        if (!Memory.myUsername) {
            const spawn = _.first(Object.values(Game.spawns));
            if (spawn && spawn.owner) {
                Memory.myUsername = spawn.owner.username;
            }
        }
    },

    planExpansion() {
        if (Memory.disableAutoExpand) return;

        const myRooms = Object.values(Game.rooms).filter(
            r => r.controller && r.controller.my
        );
        if (!myRooms.length) return;

        const ownedCount = myRooms.length;
        const maxRooms = Game.gcl.level || 1;
        if (ownedCount >= maxRooms) return;

        if (
            Memory.claimTarget &&
            (!Game.rooms[Memory.claimTarget] ||
                !Game.rooms[Memory.claimTarget].controller ||
                !Game.rooms[Memory.claimTarget].controller.my)
        ) {
            return;
        }

        const myName =
            Memory.myUsername ||
            (_.first(Object.values(Game.spawns)) &&
                _.first(Object.values(Game.spawns)).owner.username);

        let best = null;

        for (const home of myRooms) {
            if (home.controller.level < 4) continue;

            const exits = Game.map.describeExits(home.name);
            if (!exits) continue;

            for (const dir in exits) {
                const roomName = exits[dir];
                const mem = Memory.rooms[roomName];
                const intel = mem && mem.intel;
                if (!intel) continue;

                if (intel.sourceKeeper) continue;
                if (intel.hostileOwner) continue;
                if (intel.owner && intel.owner !== myName) continue;
                if (!intel.hasController) continue;

                const sources = intel.sources ? intel.sources.length : 0;
                if (!sources) continue;

                const score = sources * 100;
                if (!best || score > best.score) {
                    best = { roomName, from: home.name, score };
                }
            }
        }

        if (best) {
            Memory.claimTarget = best.roomName;
            Memory.claimFrom = best.from;
            console.log(
                `[EMPIRE] Auto-expansion: claimTarget=${best.roomName} from=${best.from}`
            );
        }
    }
};