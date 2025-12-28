// manager.labs
//
// Basic lab manager:
// - Chooses labs near storage as a cluster
// - Produces RESOURCE_UTRIUM_HYDRIDE (UH) for ATTACK boosts, if U & H in storage
// - Exposes:
//   - getReagentRequest(room): carriers call this to pull U/H into input labs
//   - getBoostLabs(room, resource): attackers/defenders call this to find boost labs

const BOOST_RESOURCE = RESOURCE_UTRIUM_HYDRIDE;
const REAGENT_A = RESOURCE_UTRIUM;
const REAGENT_B = RESOURCE_HYDROGEN;
const BOOST_TARGET_STOCK = 800;   // desired total UH in room (labs+store)
const INPUT_LAB_MIN = 100;        // reagent fill target per lab

module.exports = {
    run(room) {
        if (!room.controller || !room.controller.my) return;
        if (room.controller.level < 6) return;
        if (!room.storage) return;
        if (global.lowCpuMode) return;

        const labs = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_LAB
        });
        if (!labs.length) return;

        const mem = room.memory.labs || {};
        room.memory.labs = mem;

        if (!mem.cluster || Game.time % 500 === 0) {
            this.classifyCluster(room, labs);
        }

        if (!mem.cluster || !mem.cluster.length) return;

        this.runBoostProduction(room);
    },

    classifyCluster(room, labs) {
        const storage = room.storage;
        if (!storage) return;

        const cluster = labs.filter(l => l.pos.getRangeTo(storage) <= 3);
        if (!cluster.length) {
            room.memory.labs = { cluster: [] };
            return;
        }

        cluster.sort(
            (a, b) =>
                a.pos.getRangeTo(storage) - b.pos.getRangeTo(storage)
        );

        const inputLabs = cluster.slice(0, 2).map(l => l.id);
        const reactionLabs = cluster.slice(2).map(l => l.id);

        room.memory.labs = {
            cluster: cluster.map(l => l.id),
            inputLabs,
            reactionLabs,
            boostResource: BOOST_RESOURCE,
            reagents: [
                { labId: inputLabs[0], resourceType: REAGENT_A },
                { labId: inputLabs[1], resourceType: REAGENT_B }
            ]
        };
    },

    runBoostProduction(room) {
        const mem = room.memory.labs;
        if (!mem || !mem.cluster || !mem.cluster.length) return;

        const storage = room.storage;
        const terminal = room.terminal;

        const labs = mem.cluster
            .map(id => Game.getObjectById(id))
            .filter(Boolean);

        const labById = {};
        for (const l of labs) labById[l.id] = l;

        // Compute total UH stock in room
        let stock = 0;
        if (storage) stock += storage.store[BOOST_RESOURCE] || 0;
        if (terminal) stock += terminal.store[BOOST_RESOURCE] || 0;
        for (const l of labs) {
            stock += l.store[BOOST_RESOURCE] || 0;
        }
        mem.boostStock = stock;

        if (stock >= BOOST_TARGET_STOCK) {
            mem.needReagents = {};
            return;
        }

        // Need reagents in input labs
        const needReagents = {};
        const reagents = mem.reagents || [];
        for (const rConf of reagents) {
            const lab = labById[rConf.labId];
            if (!lab) continue;
            const current = lab.store[rConf.resourceType] || 0;
            const deficit = Math.max(0, INPUT_LAB_MIN - current);
            if (deficit > 0) {
                needReagents[lab.id] = {
                    resourceType: rConf.resourceType,
                    deficit
                };
            }
        }
        mem.needReagents = needReagents;

        if (!mem.inputLabs || !mem.inputLabs.length) return;
        const in1 = labById[mem.inputLabs[0]];
        const in2 = labById[mem.inputLabs[1]];
        if (!in1 || !in2) return;

        if (
            in1.store[reagents[0].resourceType] < 5 ||
            in2.store[reagents[1].resourceType] < 5
        ) {
            return;
        }

        const reactionLabs = (mem.reactionLabs || [])
            .map(id => labById[id])
            .filter(Boolean);

        for (const lab of reactionLabs) {
            if (lab.cooldown > 0) continue;
            if (lab.store.getFreeCapacity(BOOST_RESOURCE) < 10) continue;
            lab.runReaction(in1, in2);
        }
    },

    // Called by carriers
    getReagentRequest(room) {
        const mem = room.memory.labs;
        if (!mem || !mem.needReagents || !room.storage) return null;

        const store = room.storage.store;
        for (const labId in mem.needReagents) {
            const need = mem.needReagents[labId];
            if (!need) continue;
            const have = store[need.resourceType] || 0;
            if (have <= 0) continue;

            const amount = Math.min(need.deficit, have);
            if (amount <= 0) continue;

            return {
                labId,
                resourceType: need.resourceType,
                amount
            };
        }
        return null;
    },

    // Called by attackers/defenders
    getBoostLabs(room, resourceType) {
        const labs = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_LAB
        });
        if (!labs.length) return [];
        return labs.filter(
            l => (l.store[resourceType] || 0) >= 30
        );
    }
};