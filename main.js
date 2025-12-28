// main

const hivemind = require('hivemind');
const empire = require('manager.empire');
const market = require('manager.market');
const ui = require('ui.visuals');

function cleanCreepMemory() {
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }
}

module.exports.loop = function () {
    try {
        cleanCreepMemory();

        // CPU flags (global so other modules can read them)
        global.lowCpuMode = Game.cpu.bucket < 3000;
        global.veryLowCpuMode = Game.cpu.bucket < 1000;

        // Empire-wide logic (skip if CPU very low)
        if (!global.veryLowCpuMode) {
            empire.run();
        }

        // Market: only when CPU is comfortable
        if (!global.lowCpuMode && Game.cpu.bucket > 3000) {
            market.run();
        }

        // Per-room logic (only my owned rooms)
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (!room.controller || !room.controller.my) continue;
            hivemind.runRoom(room);
        }

        // Per-creep logic
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            hivemind.runCreep(creep);
        }

        // UI (skip if CPU is low)
        if (!global.lowCpuMode) {
            ui.render();
        }
    } catch (err) {
        console.log('Main loop error:', err.stack || err);
    }
};