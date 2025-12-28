/**
 * Construction Manager
 */

var CONFIG = require('config');

var ConstructionManager = {
    run: function(room) {
        if (Game.time % 50 !== 0) return;
        
        var rcl = room.controller.level;
        var sites = room.find(FIND_CONSTRUCTION_SITES).length;
        
        if (sites >= CONFIG.BUILD.MAX_CONSTRUCTION_SITES) return;
        
        if (rcl >= 1) this.buildExtensions(room, rcl, sites);
        if (rcl >= 2) this.buildContainers(room, sites);
        if (rcl >= 3) this.buildTowers(room, rcl, sites);
        if (rcl >= 3) this.buildRoads(room, sites);
        if (rcl >= 4) this.buildStorage(room);
        if (rcl >= 5) this.buildLinks(room, rcl, sites);
        if (rcl >= 6) this.buildExtractor(room);
        if (rcl >= 6) this.buildTerminal(room);
        if (rcl >= 3) this.buildRamparts(room);
    },
    
    buildExtensions: function(room, rcl, currentSites) {
        var maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl] || 0;
        var current = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_EXTENSION; }
        }).length;
        var planned = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_EXTENSION; }
        }).length;
        
        if (current + planned >= maxExtensions) return;
        if (currentSites + planned >= CONFIG.BUILD.MAX_CONSTRUCTION_SITES) return;
        
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;
        var spawn = spawns[0];
        
        var positions = this.getBuildPositions(room, spawn.pos, 15);
        
        for (var i = 0; i < positions.length; i++) {
            if (current + planned >= maxExtensions) break;
            var pos = positions[i];
            if (this.canBuildAt(room, pos.x, pos.y)) {
                var result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_EXTENSION);
                if (result === OK) return;
            }
        }
    },
    
    buildContainers: function(room, currentSites) {
        if (currentSites >= CONFIG.BUILD.MAX_CONSTRUCTION_SITES) return;
        
        var sources = room.find(FIND_SOURCES);
        
        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];
            
            var containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
            });
            
            if (containers.length > 0) continue;
            
            var sites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
            });
            
            if (sites.length > 0) continue;
            
            var positions = this.getAdjacentPositions(source.pos);
            for (var j = 0; j < positions.length; j++) {
                var pos = positions[j];
                if (this.canBuildAt(room, pos.x, pos.y)) {
                    room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER);
                    break;
                }
            }
        }
    },
    
    buildTowers: function(room, rcl, currentSites) {
        var maxTowers = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][rcl] || 0;
        var current = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_TOWER; }
        }).length;
        var planned = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_TOWER; }
        }).length;
        
        if (current + planned >= maxTowers) return;
        if (currentSites >= CONFIG.BUILD.MAX_CONSTRUCTION_SITES) return;
        
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;
        var spawn = spawns[0];
        
        var positions = this.getBuildPositions(room, spawn.pos, 6);
        
        for (var i = 0; i < positions.length; i++) {
            if (current + planned >= maxTowers) break;
            var pos = positions[i];
            if (this.canBuildAt(room, pos.x, pos.y)) {
                var result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_TOWER);
                if (result === OK) return;
            }
        }
    },
    
    buildRoads: function(room, currentSites) {
        if (currentSites >= CONFIG.BUILD.MAX_CONSTRUCTION_SITES - 2) return;
        
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;
        var spawn = spawns[0];
        
        var sources = room.find(FIND_SOURCES);
        var controller = room.controller;
        
        for (var i = 0; i < sources.length; i++) {
            this.buildRoadPath(room, spawn.pos, sources[i].pos);
        }
        
        this.buildRoadPath(room, spawn.pos, controller.pos);
        
        if (room.storage) {
            this.buildRoadPath(room, spawn.pos, room.storage.pos);
        }
    },
    
    buildRoadPath: function(room, from, to) {
        var path = room.findPath(from, to, {
            ignoreCreeps: true,
            swampCost: CONFIG.BUILD.ROAD_SWAMP_COST,
            plainCost: CONFIG.BUILD.ROAD_PLAIN_COST
        });
        
        var built = 0;
        var maxBuild = 3;
        
        for (var i = 0; i < path.length; i++) {
            if (built >= maxBuild) break;
            
            var step = path[i];
            var structures = room.lookForAt(LOOK_STRUCTURES, step.x, step.y);
            var hasRoad = false;
            
            for (var j = 0; j < structures.length; j++) {
                if (structures[j].structureType === STRUCTURE_ROAD) {
                    hasRoad = true;
                    break;
                }
            }
            
            if (!hasRoad) {
                var lookSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, step.x, step.y);
                if (lookSites.length === 0) {
                    var result = room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
                    if (result === OK) built++;
                }
            }
        }
    },
    
    buildStorage: function(room) {
        if (room.storage) return;
        
        var existing = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_STORAGE; }
        });
        
        if (existing.length > 0) return;
        
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;
        var spawn = spawns[0];
        
        var positions = this.getBuildPositions(room, spawn.pos, 5);
        
        for (var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            if (this.canBuildAt(room, pos.x, pos.y)) {
                room.createConstructionSite(pos.x, pos.y, STRUCTURE_STORAGE);
                return;
            }
        }
    },
    
    buildLinks: function(room, rcl, currentSites) {
        var maxLinks = CONTROLLER_STRUCTURES[STRUCTURE_LINK][rcl] || 0;
        var current = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_LINK; }
        });
        var planned = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_LINK; }
        }).length;
        
        if (current.length + planned >= maxLinks) return;
        if (currentSites >= CONFIG.BUILD.MAX_CONSTRUCTION_SITES) return;
        
        var sources = room.find(FIND_SOURCES);
        
        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];
            var hasLink = source.pos.findInRange(FIND_MY_STRUCTURES, 2, {
                filter: function(s) { return s.structureType === STRUCTURE_LINK; }
            }).length > 0;
            
            if (!hasLink) {
                var positions = this.getAdjacentPositions(source.pos, 2);
                for (var j = 0; j < positions.length; j++) {
                    var pos = positions[j];
                    if (this.canBuildAt(room, pos.x, pos.y)) {
                        room.createConstructionSite(pos.x, pos.y, STRUCTURE_LINK);
                        return;
                    }
                }
            }
        }
        
        var hasControllerLink = room.controller.pos.findInRange(FIND_MY_STRUCTURES, 4, {
            filter: function(s) { return s.structureType === STRUCTURE_LINK; }
        }).length > 0;
        
        if (!hasControllerLink) {
            var controllerPositions = this.getBuildPositions(room, room.controller.pos, 4);
            for (var k = 0; k < controllerPositions.length; k++) {
                var cPos = controllerPositions[k];
                if (this.canBuildAt(room, cPos.x, cPos.y)) {
                    room.createConstructionSite(cPos.x, cPos.y, STRUCTURE_LINK);
                    return;
                }
            }
        }
    },
    
    buildExtractor: function(room) {
        var minerals = room.find(FIND_MINERALS);
        if (minerals.length === 0) return;
        var mineral = minerals[0];
        
        var extractors = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_EXTRACTOR; }
        });
        
        if (extractors.length > 0) return;
        
        var sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_EXTRACTOR; }
        });
        
        if (sites.length > 0) return;
        
        room.createConstructionSite(mineral.pos, STRUCTURE_EXTRACTOR);
    },
    
    buildTerminal: function(room) {
        if (room.terminal) return;
        
        var existing = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_TERMINAL; }
        });
        
        if (existing.length > 0) return;
        
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;
        var spawn = spawns[0];
        
        var positions = this.getBuildPositions(room, spawn.pos, 6);
        
        for (var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            if (this.canBuildAt(room, pos.x, pos.y)) {
                room.createConstructionSite(pos.x, pos.y, STRUCTURE_TERMINAL);
                return;
            }
        }
    },
    
    buildRamparts: function(room) {
        var importantStructures = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) {
                return s.structureType === STRUCTURE_SPAWN ||
                       s.structureType === STRUCTURE_STORAGE ||
                       s.structureType === STRUCTURE_TERMINAL ||
                       s.structureType === STRUCTURE_TOWER;
            }
        });
        
        for (var i = 0; i < importantStructures.length; i++) {
            var structure = importantStructures[i];
            var lookStructures = structure.pos.lookFor(LOOK_STRUCTURES);
            var hasRampart = false;
            
            for (var j = 0; j < lookStructures.length; j++) {
                if (lookStructures[j].structureType === STRUCTURE_RAMPART) {
                    hasRampart = true;
                    break;
                }
            }
            
            if (!hasRampart) {
                var lookSites = structure.pos.lookFor(LOOK_CONSTRUCTION_SITES);
                var hasSite = false;
                
                for (var k = 0; k < lookSites.length; k++) {
                    if (lookSites[k].structureType === STRUCTURE_RAMPART) {
                        hasSite = true;
                        break;
                    }
                }
                
                if (!hasSite) {
                    room.createConstructionSite(structure.pos, STRUCTURE_RAMPART);
                }
            }
        }
    },
    
    getBuildPositions: function(room, center, maxRange) {
        var positions = [];
        var terrain = room.getTerrain();
        
        for (var r = 2; r <= maxRange; r++) {
            for (var dx = -r; dx <= r; dx++) {
                for (var dy = -r; dy <= r; dy++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                    
                    var x = center.x + dx;
                    var y = center.y + dy;
                    
                    if (x < 3 || x > 46 || y < 3 || y > 46) continue;
                    if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;
                    
                    if ((x + y) % 2 === 0) {
                        positions.push({ x: x, y: y });
                    }
                }
            }
        }
        
        return positions;
    },
    
    getAdjacentPositions: function(pos, range) {
        range = range || 1;
        var positions = [];
        
        for (var dx = -range; dx <= range; dx++) {
            for (var dy = -range; dy <= range; dy++) {
                if (dx === 0 && dy === 0) continue;
                
                var x = pos.x + dx;
                var y = pos.y + dy;
                
                if (x >= 1 && x <= 48 && y >= 1 && y <= 48) {
                    positions.push({ x: x, y: y });
                }
            }
        }
        
        return positions;
    },
    
    canBuildAt: function(room, x, y) {
        if (x < 2 || x > 47 || y < 2 || y > 47) return false;
        
        var terrain = room.getTerrain();
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) return false;
        
        var structures = room.lookForAt(LOOK_STRUCTURES, x, y);
        for (var i = 0; i < structures.length; i++) {
            if (OBSTACLE_OBJECT_TYPES.indexOf(structures[i].structureType) !== -1) {
                return false;
            }
        }
        
        var sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
        if (sites.length > 0) return false;
        
        var lookSources = room.lookForAt(LOOK_SOURCES, x, y);
        if (lookSources.length > 0) return false;
        
        var lookMinerals = room.lookForAt(LOOK_MINERALS, x, y);
        if (lookMinerals.length > 0) return false;
        
        return true;
    }
};

module.exports = ConstructionManager;