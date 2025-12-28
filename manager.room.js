// manager.room

const constructionManager = require('manager.construction');
const linkManager = require('manager.links');
const mineralsManager = require('manager.minerals');
const labsManager = require('manager.labs');

module.exports = {
    run(room) {
        if (!room.memory) room.memory = {};

        this.runTowers(room);
        this.trackHostiles(room);

        linkManager.run(room);
        constructionManager.run(room);

        if (!global.lowCpuMode) {
            mineralsManager.run(room);
            labsManager.run(room);
        }
    },

    runTowers(room) {
        const towers = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });
        if (!towers.length) return;

        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        const injured = room.find(FIND_MY_CREEPS, {
            filter: c => c.hits < c.hitsMax
        });

        const defenseTarget = this.getDefenseTargetHits(room);

        for (const tower of towers) {
            if (hostiles.length) {
                tower.attack(hostiles[0]);
            } else if (injured.length) {
                tower.heal(injured[0]);
            } else if (
                tower.store[RESOURCE_ENERGY] >
                tower.store.getCapacity(RESOURCE_ENERGY) * 0.6
            ) {
                const targets = room.find(FIND_STRUCTURES, {
                    filter: s =>
                        s.hits < s.hitsMax &&
                        s.structureType !== STRUCTURE_WALL &&
                        s.structureType !== STRUCTURE_RAMPART
                });
                if (targets.length) {
                    targets.sort((a, b) => a.hits - b.hits);
                    tower.repair(targets[0]);
                } else if (defenseTarget > 0) {
                    const defenses = room.find(FIND_STRUCTURES, {
                        filter: s =>
                            (s.structureType === STRUCTURE_WALL ||
                                s.structureType === STRUCTURE_RAMPART) &&
                            s.hits < defenseTarget
                    });
                    if (defenses.length) {
                        defenses.sort((a, b) => a.hits - b.hits);
                        tower.repair(defenses[0]);
                    }
                }
            }
        }
    },

    getDefenseTargetHits(room) {
        if (!room.controller) return 0;
        const rcl = room.controller.level;
        if (!rcl) return 0;

        let target = 5000 + 70000 * rcl;
        if (target > 500000) target = 500000;
        return target;
    },

    trackHostiles(room) {
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length) {
            room.memory.underAttack = true;
            room.memory.lastAttack = Game.time;
            this.maybeActivateSafeMode(room, hostiles);
        } else if (room.memory.underAttack) {
            if (Game.time - (room.memory.lastAttack || 0) > 50) {
                room.memory.underAttack = false;
            }
        }
    },

    maybeActivateSafeMode(room, hostiles) {
        const controller = room.controller;
        if (!controller || !controller.my) return;
        if (controller.safeMode || controller.safeModeAvailable <= 0) return;

        const totalOffense = _.sum(hostiles, c =>
            c.getActiveBodyparts(ATTACK) +
            c.getActiveBodyparts(RANGED_ATTACK) +
            c.getActiveBodyparts(HEAL)
        );

        const towers = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });

        if (totalOffense >= 10 && towers.length < 2) {
            const res = controller.activateSafeMode();
            if (res === OK) {
                console.log(
                    `[DEFENSE] Safe mode in ${room.name} (offense=${totalOffense}, towers=${towers.length})`
                );
            }
        }
    }
};