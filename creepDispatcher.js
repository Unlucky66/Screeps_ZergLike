/**
 * Creep Dispatcher - Routes creeps to their role handlers
 */

var RoleLarva = require('role.larva');
var RoleDrone = require('role.drone');
var RoleOverlord = require('role.overlord');
var RoleQueen = require('role.queen');
var RoleRoach = require('role.roach');
var RoleZergling = require('role.zergling');
var RoleHydralisk = require('role.hydralisk');
var RoleInfestor = require('role.infestor');
var RoleMutalisk = require('role.mutalisk');
var RoleSwarmHost = require('role.swarmHost');
var RoleRavager = require('role.ravager');
var RoleDefender = require('role.defender');
var RoleRemoteHarvester = require('role.remoteHarvester');
var RoleRemoteHauler = require('role.remoteHauler');
var RoleReserver = require('role.reserver');

var Roles = {
    larva: RoleLarva,
    drone: RoleDrone,
    overlord: RoleOverlord,
    queen: RoleQueen,
    roach: RoleRoach,
    zergling: RoleZergling,
    hydralisk: RoleHydralisk,
    infestor: RoleInfestor,
    mutalisk: RoleMutalisk,
    swarmHost: RoleSwarmHost,
    ravager: RoleRavager,
    defender: RoleDefender,
    remoteHarvester: RoleRemoteHarvester,
    remoteHauler: RoleRemoteHauler,
    reserver: RoleReserver
};

var CreepDispatcher = {
    run: function(creep) {
        var role = Roles[creep.memory.role];
        
        if (role) {
            try {
                role.run(creep);
            } catch (e) {
                console.log('Error in ' + creep.name + ' (' + creep.memory.role + '): ' + e);
            }
        } else {
            // Unknown role, convert to larva
            creep.memory.role = 'larva';
        }
    }
};

module.exports = CreepDispatcher;