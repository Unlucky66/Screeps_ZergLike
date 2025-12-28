// hivemind

const config = require('config');
const roomManager = require('manager.room');
const spawnManager = require('manager.spawn');
const remoteManager = require('manager.remote');

const roleHarvester = require('role.harvester');
const roleCarrier = require('role.carrier');
const roleUpgrader = require('role.upgrader');
const roleBuilder = require('role.builder');
const roleDefender = require('role.defender');
const roleAttacker = require('role.attacker');
const roleMineralMiner = require('role.mineralMiner');
const roleClaimer = require('role.claimer');
const roleScout = require('role.scout');
const roleRemoteMiner = require('role.remoteMiner');
const roleRemoteHauler = require('role.remoteHauler');
const roleReserver = require('role.reserver');

const roleMap = {
    [config.roles.HARVESTER]: roleHarvester,
    [config.roles.CARRIER]: roleCarrier,
    [config.roles.UPGRADER]: roleUpgrader,
    [config.roles.BUILDER]: roleBuilder,
    [config.roles.DEFENDER]: roleDefender,
    [config.roles.ATTACKER]: roleAttacker,
    [config.roles.MINERAL_MINER]: roleMineralMiner,
    [config.roles.CLAIMER]: roleClaimer,
    [config.roles.SCOUT]: roleScout,
    [config.roles.REMOTE_MINER]: roleRemoteMiner,
    [config.roles.REMOTE_HAULER]: roleRemoteHauler,
    [config.roles.RESERVER]: roleReserver
};

module.exports = {
    runRoom(room) {
        roomManager.run(room);
        if (!global.lowCpuMode) {
            remoteManager.run(room);
        }
        spawnManager.run(room);
    },

    runCreep(creep) {
        const roleName = creep.memory.role;
        const roleImpl = roleMap[roleName];
        if (roleImpl && typeof roleImpl.run === 'function') {
            roleImpl.run(creep);
        } else {
            creep.say('???');
        }
    }
};