/**
 * Population Manager
 */

var CONFIG = require('config');
var Utils = require('utils');

var PopulationManager = {
    getRequiredCreeps: function(room) {
        var colony = Memory.hive.colonies[room.name];
        var state = colony ? colony.state : 'startup';
        var rcl = room.controller.level;
        var sources = room.find(FIND_SOURCES).length;
        var storage = room.storage;
        var storedEnergy = storage ? (storage.store[RESOURCE_ENERGY] || 0) : 0;
        var constructionSites = room.find(FIND_CONSTRUCTION_SITES).length;
        var threats = Utils.getThreatLevel(room);
        
        var remotes = [];
        for (var remoteName in Memory.hive.remotes) {
            var remote = Memory.hive.remotes[remoteName];
            if (remote.homeRoom === room.name && remote.active) {
                remotes.push(remoteName);
            }
        }
        
        var requirements = {
            larva: 0,
            drone: 0,
            overlord: 0,
            queen: 0,
            roach: 0,
            zergling: 0,
            hydralisk: 0,
            infestor: 0,
            mutalisk: 0,
            swarmHost: 0,
            ravager: 0,
            remoteHarvester: 0,
            remoteHauler: 0,
            reserver: 0,
            defender: 0
        };
        
        switch (state) {
            case 'emergency':
                requirements.larva = 2;
                break;
                
            case 'startup':
                requirements.larva = Math.max(2 - this.getCount(room, 'drone'), 0);
                requirements.drone = sources;
                requirements.overlord = sources;
                requirements.queen = 1;
                requirements.roach = constructionSites > 0 ? 2 : 1;
                break;
                
            case 'developing':
                requirements.drone = sources * 2;
                requirements.overlord = sources * 2;
                requirements.queen = 2;
                requirements.roach = Math.min(constructionSites, 3);
                break;
                
            case 'stable':
            case 'recovering':
                requirements.drone = sources * 2;
                requirements.overlord = Math.ceil(sources * 1.5) + remotes.length;
                requirements.queen = Math.min(rcl, 4);
                requirements.roach = Math.min(constructionSites, 2);
                break;
                
            case 'thriving':
                requirements.drone = sources * 2;
                requirements.overlord = sources * 2 + remotes.length;
                requirements.queen = Math.min(rcl, 6);
                requirements.roach = Math.min(constructionSites, 4);
                break;
                
            case 'defense':
                requirements.drone = sources * 2;
                requirements.overlord = sources;
                requirements.queen = 1;
                requirements.zergling = Math.ceil(threats / 200);
                requirements.hydralisk = Math.ceil(threats / 400);
                requirements.infestor = Math.ceil((requirements.zergling + requirements.hydralisk) / 4);
                break;
                
            case 'critical':
                requirements.zergling = Math.ceil(threats / 150);
                requirements.hydralisk = Math.ceil(threats / 300);
                requirements.infestor = Math.ceil((requirements.zergling + requirements.hydralisk) / 3);
                requirements.defender = 2;
                break;
        }
        
        // Remote mining
        if (rcl >= 4 && Memory.hive.settings.autoRemote) {
            for (var i = 0; i < remotes.length; i++) {
                var remoteData = Memory.hive.remotes[remotes[i]];
                if (remoteData && remoteData.active) {
                    requirements.remoteHarvester += remoteData.sources || 1;
                    requirements.remoteHauler += Math.ceil((remoteData.sources || 1) * 1.5);
                    
                    if (remoteData.needsReserver) {
                        requirements.reserver = (requirements.reserver || 0) + 1;
                    }
                }
            }
        }
        
        // Scout
        if (rcl >= 3 && Game.time % 100 < 5) {
            requirements.mutalisk = 1;
        }
        
        // Expansion claimer
        var expansionTarget = Memory.hive.expansionTargets && Memory.hive.expansionTargets[0];
        if (expansionTarget && rcl >= CONFIG.EXPANSION.MIN_RCL_TO_EXPAND) {
            requirements.swarmHost = 1;
        }
        
        // Minimums
        requirements.drone = Math.max(requirements.drone, sources);
        requirements.overlord = Math.max(requirements.overlord, 1);
        requirements.queen = Math.max(requirements.queen, 1);
        
        return requirements;
    },
    
    getCount: function(room, role) {
        return _.filter(Game.creeps, function(c) {
            return c.memory.role === role && c.memory.homeRoom === room.name;
        }).length;
    },
    
    getSpawnPriority: function(room) {
        var requirements = this.getRequiredCreeps(room);
        var priorities = [];
        var self = this;
        
        for (var role in requirements) {
            var needed = requirements[role];
            var current = self.getCount(room, role);
            var deficit = needed - current;
            
            if (deficit > 0) {
                var roleConfig = CONFIG.ROLES[role] || { priority: 99 };
                priorities.push({
                    role: role,
                    deficit: deficit,
                    priority: roleConfig.priority,
                    urgent: role === 'larva' || role === 'defender'
                });
            }
        }
        
        priorities.sort(function(a, b) {
            if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
            return a.priority - b.priority;
        });
        
        return priorities;
    }
};

module.exports = PopulationManager;