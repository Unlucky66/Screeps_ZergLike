/**
 * Construction Manager - Auto-builds all structures
 * Enhanced roads and container placement
 */

var CONFIG = require('config');
var Utils = require('utils');

var ConstructionManager = {
    
    // Road building priorities
    ROAD_PRIORITIES: {
        SPAWN_TO_SOURCES: 1,
        SPAWN_TO_CONTROLLER: 2,
        SPAWN_TO_STORAGE: 3,
        SPAWN_TO_MINERAL: 4,
        SOURCES_TO_CONTROLLER: 5,
        STORAGE_TO_CONTROLLER: 6,
        INTER_ROOM_EXITS: 7
    },
    
    /**
     * Main run function
     */
    run: function(room) {
        // Run at different intervals for different structures
        var rcl = room.controller.level;
        var sites = room.find(FIND_CONSTRUCTION_SITES).length;
        
        if (sites >= CONFIG.BUILD.MAX_CONSTRUCTION_SITES) return;
        
        // Every 10 ticks - containers (high priority)
        if (Game.time % 10 === 0) {
            this.buildContainers(room, rcl);
        }
        
        // Every 20 ticks - roads
        if (Game.time % 20 === 0 && rcl >= CONFIG.BUILD.MIN_RCL_ROADS) {
            this.buildRoads(room, rcl);
        }
        
        // Every 50 ticks - other structures
        if (Game.time % 50 === 0) {
            if (rcl >= 1) this.buildExtensions(room, rcl, sites);
            if (rcl >= 3) this.buildTowers(room, rcl, sites);
            if (rcl >= 4) this.buildStorage(room);
            if (rcl >= 5) this.buildLinks(room, rcl, sites);
            if (rcl >= 6) this.buildExtractor(room);
            if (rcl >= 6) this.buildTerminal(room);
            if (rcl >= 6) this.buildLabs(room, rcl);
            if (rcl >= 7) this.buildFactory(room);
            if (rcl >= 8) this.buildObserver(room);
            if (rcl >= 8) this.buildPowerSpawn(room);
            if (rcl >= 8) this.buildNuker(room);
        }
        
        // Every 100 ticks - ramparts
        if (Game.time % 100 === 0 && rcl >= CONFIG.BUILD.MIN_RCL_RAMPARTS) {
            this.buildRamparts(room);
        }
    },
    
    // ========================================================================
    // CONTAINER BUILDING
    // ========================================================================
    
    /**
     * Build containers at strategic locations
     */
    buildContainers: function(room, rcl) {
        var maxContainers = 5; // Screeps limit
        var currentContainers = room.find(FIND_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
        }).length;
        
        var plannedContainers = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
        }).length;
        
        if (currentContainers + plannedContainers >= maxContainers) return;
        
        // Priority 1: Containers at sources
        this.buildSourceContainers(room);
        
        // Priority 2: Container near controller (for upgraders)
        if (rcl >= 2) {
            this.buildControllerContainer(room);
        }
        
        // Priority 3: Container at mineral (if extractor exists)
        if (rcl >= 6) {
            this.buildMineralContainer(room);
        }
    },
    
    /**
     * Build containers at sources
     */
    buildSourceContainers: function(room) {
        var sources = room.find(FIND_SOURCES);
        
        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];
            
            // Check if container already exists
            var existingContainer = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
            });
            
            if (existingContainer.length > 0) {
                // Update colony memory with container ID
                this.updateSourceContainer(room, source.id, existingContainer[0].id);
                continue;
            }
            
            // Check for construction site
            var existingSite = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
            });
            
            if (existingSite.length > 0) continue;
            
            // Find best position for container
            var containerPos = this.findBestContainerPosition(room, source.pos);
            
            if (containerPos) {
                var result = room.createConstructionSite(containerPos.x, containerPos.y, STRUCTURE_CONTAINER);
                if (result === OK) {
                    Utils.log('Placing source container at ' + containerPos.x + ',' + containerPos.y, 'INFO');
                    return; // Only place one per tick
                }
            }
        }
    },
    
    /**
     * Build container near controller
     */
    buildControllerContainer: function(room) {
        var controller = room.controller;
        
        // Check if container exists within range 3
        var existingContainer = controller.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
        });
        
        if (existingContainer.length > 0) return;
        
        // Check for construction site
        var existingSite = controller.pos.findInRange(FIND_CONSTRUCTION_SITES, 3, {
            filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
        });
        
        if (existingSite.length > 0) return;
        
        // Find best position (close to controller but not blocking)
        var containerPos = this.findBestContainerPosition(room, controller.pos, 2, 3);
        
        if (containerPos) {
            var result = room.createConstructionSite(containerPos.x, containerPos.y, STRUCTURE_CONTAINER);
            if (result === OK) {
                Utils.log('Placing controller container at ' + containerPos.x + ',' + containerPos.y, 'INFO');
            }
        }
    },
    
    /**
     * Build container at mineral
     */
    buildMineralContainer: function(room) {
        var minerals = room.find(FIND_MINERALS);
        if (minerals.length === 0) return;
        
        var mineral = minerals[0];
        
        // Check if extractor exists
        var extractor = mineral.pos.lookFor(LOOK_STRUCTURES).find(function(s) {
            return s.structureType === STRUCTURE_EXTRACTOR;
        });
        
        if (!extractor) return;
        
        // Check if container exists
        var existingContainer = mineral.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
        });
        
        if (existingContainer.length > 0) return;
        
        // Check for construction site
        var existingSite = mineral.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
            filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
        });
        
        if (existingSite.length > 0) return;
        
        // Find position
        var containerPos = this.findBestContainerPosition(room, mineral.pos);
        
        if (containerPos) {
            var result = room.createConstructionSite(containerPos.x, containerPos.y, STRUCTURE_CONTAINER);
            if (result === OK) {
                Utils.log('Placing mineral container at ' + containerPos.x + ',' + containerPos.y, 'INFO');
            }
        }
    },
    
    /**
     * Find best container position near a target
     */
    findBestContainerPosition: function(room, targetPos, minRange, maxRange) {
        minRange = minRange || 1;
        maxRange = maxRange || 1;
        
        var terrain = room.getTerrain();
        var bestPos = null;
        var bestScore = -Infinity;
        
        for (var dx = -maxRange; dx <= maxRange; dx++) {
            for (var dy = -maxRange; dy <= maxRange; dy++) {
                var range = Math.max(Math.abs(dx), Math.abs(dy));
                if (range < minRange || range > maxRange) continue;
                
                var x = targetPos.x + dx;
                var y = targetPos.y + dy;
                
                if (!this.canBuildAt(room, x, y)) continue;
                if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;
                
                var score = 0;
                
                // Prefer positions closer to spawn
                var spawns = room.find(FIND_MY_SPAWNS);
                if (spawns.length > 0) {
                    var distToSpawn = Math.abs(x - spawns[0].pos.x) + Math.abs(y - spawns[0].pos.y);
                    score -= distToSpawn * 0.5;
                }
                
                // Prefer plain terrain over swamp
                if (terrain.get(x, y) === TERRAIN_MASK_SWAMP) {
                    score -= 5;
                }
                
                // Prefer positions with more open adjacent tiles
                var openTiles = 0;
                for (var ax = -1; ax <= 1; ax++) {
                    for (var ay = -1; ay <= 1; ay++) {
                        if (ax === 0 && ay === 0) continue;
                        if (terrain.get(x + ax, y + ay) !== TERRAIN_MASK_WALL) {
                            openTiles++;
                        }
                    }
                }
                score += openTiles;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestPos = { x: x, y: y };
                }
            }
        }
        
        return bestPos;
    },
    
    /**
     * Update colony memory with source container
     */
    updateSourceContainer: function(room, sourceId, containerId) {
        if (!Memory.hive.colonies[room.name]) return;
        if (!Memory.hive.colonies[room.name].sources) return;
        
        var sources = Memory.hive.colonies[room.name].sources;
        for (var i = 0; i < sources.length; i++) {
            if (sources[i].id === sourceId) {
                sources[i].containerId = containerId;
                break;
            }
        }
    },
    
    // ========================================================================
    // ROAD BUILDING
    // ========================================================================
    
    /**
     * Build roads
     */
    buildRoads: function(room, rcl) {
        var sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_ROAD; }
        }).length;
        
        // Limit road construction sites
        if (sites >= 5) return;
        
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;
        
        var spawn = spawns[0];
        var sources = room.find(FIND_SOURCES);
        var controller = room.controller;
        
        // Priority 1: Spawn to sources
        for (var i = 0; i < sources.length; i++) {
            if (this.buildRoadBetween(room, spawn.pos, sources[i].pos, 1)) {
                return; // One road path per tick
            }
        }
        
        // Priority 2: Spawn to controller
        if (this.buildRoadBetween(room, spawn.pos, controller.pos, 1)) {
            return;
        }
        
        // Priority 3: Spawn to storage
        if (room.storage) {
            if (this.buildRoadBetween(room, spawn.pos, room.storage.pos, 1)) {
                return;
            }
        }
        
        // Priority 4: Sources to controller (for remote upgrading)
        if (rcl >= 4) {
            for (var j = 0; j < sources.length; j++) {
                if (this.buildRoadBetween(room, sources[j].pos, controller.pos, 1)) {
                    return;
                }
            }
        }
        
        // Priority 5: Spawn to mineral
        if (rcl >= 6) {
            var minerals = room.find(FIND_MINERALS);
            if (minerals.length > 0) {
                if (this.buildRoadBetween(room, spawn.pos, minerals[0].pos, 1)) {
                    return;
                }
            }
        }
        
        // Priority 6: Storage to controller
        if (room.storage && rcl >= 5) {
            if (this.buildRoadBetween(room, room.storage.pos, controller.pos, 1)) {
                return;
            }
        }
        
        // Priority 7: Roads around spawn (high traffic area)
        if (rcl >= 4) {
            this.buildSpawnAreaRoads(room, spawn.pos);
        }
        
        // Priority 8: Roads to exits (for remote mining)
        if (rcl >= 5) {
            this.buildExitRoads(room, spawn.pos);
        }
    },
    
    /**
     * Build road between two positions
     */
    buildRoadBetween: function(room, fromPos, toPos, maxBuildPerTick) {
        maxBuildPerTick = maxBuildPerTick || 3;
        
        var path = room.findPath(fromPos, toPos, {
            ignoreCreeps: true,
            ignoreRoads: false,
            swampCost: CONFIG.BUILD.ROAD_SWAMP_COST,
            plainCost: CONFIG.BUILD.ROAD_PLAIN_COST,
            range: 1
        });
        
        var built = 0;
        
        for (var i = 0; i < path.length; i++) {
            if (built >= maxBuildPerTick) break;
            
            var step = path[i];
            
            // Check if road exists
            var structures = room.lookForAt(LOOK_STRUCTURES, step.x, step.y);
            var hasRoad = false;
            
            for (var j = 0; j < structures.length; j++) {
                if (structures[j].structureType === STRUCTURE_ROAD) {
                    hasRoad = true;
                    break;
                }
            }
            
            if (hasRoad) continue;
            
            // Check if construction site exists
            var sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, step.x, step.y);
            if (sites.length > 0) continue;
            
            // Check if we can build here
            if (!this.canBuildRoadAt(room, step.x, step.y)) continue;
            
            var result = room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
            if (result === OK) {
                built++;
            }
        }
        
        return built > 0;
    },
    
    /**
     * Build roads around spawn area
     */
    buildSpawnAreaRoads: function(room, spawnPos) {
        var radius = 3;
        var built = 0;
        var maxBuild = 2;
        
        // Build roads in a pattern around spawn
        for (var dx = -radius; dx <= radius; dx++) {
            for (var dy = -radius; dy <= radius; dy++) {
                if (built >= maxBuild) return;
                
                var x = spawnPos.x + dx;
                var y = spawnPos.y + dy;
                
                // Skip spawn position
                if (dx === 0 && dy === 0) continue;
                
                // Build roads on cardinal directions and diagonals
                var isCardinal = dx === 0 || dy === 0;
                var isDiagonal = Math.abs(dx) === Math.abs(dy);
                
                if (!isCardinal && !isDiagonal) continue;
                
                if (this.canBuildRoadAt(room, x, y)) {
                    var structures = room.lookForAt(LOOK_STRUCTURES, x, y);
                    var hasRoad = structures.some(function(s) {
                        return s.structureType === STRUCTURE_ROAD;
                    });
                    
                    if (!hasRoad) {
                        var sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
                        if (sites.length === 0) {
                            var result = room.createConstructionSite(x, y, STRUCTURE_ROAD);
                            if (result === OK) built++;
                        }
                    }
                }
            }
        }
    },
    
    /**
     * Build roads to exits
     */
    buildExitRoads: function(room, spawnPos) {
        var exits = room.find(FIND_EXIT);
        if (exits.length === 0) return;
        
        // Find closest exit in each direction
        var exitsByDirection = {};
        
        for (var i = 0; i < exits.length; i++) {
            var exit = exits[i];
            var dir = '';
            
            if (exit.y === 0) dir = 'top';
            else if (exit.y === 49) dir = 'bottom';
            else if (exit.x === 0) dir = 'left';
            else if (exit.x === 49) dir = 'right';
            
            if (!exitsByDirection[dir]) {
                exitsByDirection[dir] = exit;
            } else {
                // Keep the one closest to spawn
                var currentDist = Math.abs(exitsByDirection[dir].x - spawnPos.x) + 
                                  Math.abs(exitsByDirection[dir].y - spawnPos.y);
                var newDist = Math.abs(exit.x - spawnPos.x) + Math.abs(exit.y - spawnPos.y);
                
                if (newDist < currentDist) {
                    exitsByDirection[dir] = exit;
                }
            }
        }
        
        // Build roads to exits
        for (var direction in exitsByDirection) {
            var exitPos = exitsByDirection[direction];
            this.buildRoadBetween(room, spawnPos, new RoomPosition(exitPos.x, exitPos.y, room.name), 2);
        }
    },
    
    /**
     * Check if we can build a road at position
     */
    canBuildRoadAt: function(room, x, y) {
        if (x < 1 || x > 48 || y < 1 || y > 48) return false;
        
        var terrain = room.getTerrain();
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) return false;
        
        // Can build roads on top of containers
        var structures = room.lookForAt(LOOK_STRUCTURES, x, y);
        for (var i = 0; i < structures.length; i++) {
            var s = structures[i];
            if (s.structureType !== STRUCTURE_CONTAINER &&
                s.structureType !== STRUCTURE_ROAD &&
                s.structureType !== STRUCTURE_RAMPART) {
                return false;
            }
        }
        
        return true;
    },
    
    // ========================================================================
    // OTHER STRUCTURES
    // ========================================================================
    
    /**
     * Build extensions
     */
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
    
    /**
     * Build towers
     */
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
        
        // Place towers more centrally for better coverage
        var positions = this.getBuildPositions(room, spawn.pos, 6);
        
        for (var i = 0; i < positions.length; i++) {
            if (current + planned >= maxTowers) break;
            var pos = positions[i];
            if (this.canBuildAt(room, pos.x, pos.y)) {
                var result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_TOWER);
                if (result === OK) {
                    Utils.log('Placing tower at ' + pos.x + ',' + pos.y, 'INFO');
                    return;
                }
            }
        }
    },
    
    /**
     * Build storage
     */
    buildStorage: function(room) {
        if (room.storage) return;
        
        var existing = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_STORAGE; }
        });
        
        if (existing.length > 0) return;
        
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;
        var spawn = spawns[0];
        
        // Place storage near spawn but not too close
        var positions = this.getBuildPositions(room, spawn.pos, 5);
        
        for (var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            var dist = Math.abs(pos.x - spawn.pos.x) + Math.abs(pos.y - spawn.pos.y);
            
            if (dist >= 2 && this.canBuildAt(room, pos.x, pos.y)) {
                var result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_STORAGE);
                if (result === OK) {
                    Utils.log('Placing storage at ' + pos.x + ',' + pos.y, 'INFO');
                    return;
                }
            }
        }
    },
    
    /**
     * Build links
     */
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
        
        // Build source links first
        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];
            var hasLink = source.pos.findInRange(FIND_MY_STRUCTURES, 2, {
                filter: function(s) { return s.structureType === STRUCTURE_LINK; }
            }).length > 0;
            
            var hasSite = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, {
                filter: function(s) { return s.structureType === STRUCTURE_LINK; }
            }).length > 0;
            
            if (!hasLink && !hasSite) {
                var positions = this.getAdjacentPositions(source.pos, 2);
                for (var j = 0; j < positions.length; j++) {
                    var pos = positions[j];
                    if (this.canBuildAt(room, pos.x, pos.y)) {
                        var result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_LINK);
                        if (result === OK) {
                            Utils.log('Placing source link at ' + pos.x + ',' + pos.y, 'INFO');
                            return;
                        }
                    }
                }
            }
        }
        
        // Build controller link
        var hasControllerLink = room.controller.pos.findInRange(FIND_MY_STRUCTURES, 4, {
            filter: function(s) { return s.structureType === STRUCTURE_LINK; }
        }).length > 0;
        
        var hasControllerSite = room.controller.pos.findInRange(FIND_CONSTRUCTION_SITES, 4, {
            filter: function(s) { return s.structureType === STRUCTURE_LINK; }
        }).length > 0;
        
        if (!hasControllerLink && !hasControllerSite) {
            var controllerPositions = this.getBuildPositions(room, room.controller.pos, 4);
            for (var k = 0; k < controllerPositions.length; k++) {
                var cPos = controllerPositions[k];
                if (this.canBuildAt(room, cPos.x, cPos.y)) {
                    var cResult = room.createConstructionSite(cPos.x, cPos.y, STRUCTURE_LINK);
                    if (cResult === OK) {
                        Utils.log('Placing controller link at ' + cPos.x + ',' + cPos.y, 'INFO');
                        return;
                    }
                }
            }
        }
        
        // Build storage link
        if (room.storage) {
            var hasStorageLink = room.storage.pos.findInRange(FIND_MY_STRUCTURES, 2, {
                filter: function(s) { return s.structureType === STRUCTURE_LINK; }
            }).length > 0;
            
            var hasStorageSite = room.storage.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, {
                filter: function(s) { return s.structureType === STRUCTURE_LINK; }
            }).length > 0;
            
            if (!hasStorageLink && !hasStorageSite) {
                var storagePositions = this.getAdjacentPositions(room.storage.pos, 2);
                for (var l = 0; l < storagePositions.length; l++) {
                    var sPos = storagePositions[l];
                    if (this.canBuildAt(room, sPos.x, sPos.y)) {
                        var sResult = room.createConstructionSite(sPos.x, sPos.y, STRUCTURE_LINK);
                        if (sResult === OK) {
                            Utils.log('Placing storage link at ' + sPos.x + ',' + sPos.y, 'INFO');
                            return;
                        }
                    }
                }
            }
        }
    },
    
    /**
     * Build extractor
     */
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
        Utils.log('Placing extractor at mineral', 'INFO');
    },
    
    /**
     * Build terminal
     */
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
                var result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_TERMINAL);
                if (result === OK) {
                    Utils.log('Placing terminal at ' + pos.x + ',' + pos.y, 'INFO');
                    return;
                }
            }
        }
    },
    
    /**
     * Build labs
     */
    buildLabs: function(room, rcl) {
        var maxLabs = CONTROLLER_STRUCTURES[STRUCTURE_LAB][rcl] || 0;
        var current = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_LAB; }
        }).length;
        var planned = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_LAB; }
        }).length;
        
        if (current + planned >= maxLabs) return;
        
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;
        var spawn = spawns[0];
        
        var positions = this.getBuildPositions(room, spawn.pos, 8);
        
        for (var i = 0; i < positions.length; i++) {
            if (current + planned >= maxLabs) break;
            var pos = positions[i];
            if (this.canBuildAt(room, pos.x, pos.y)) {
                var result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_LAB);
                if (result === OK) return;
            }
        }
    },
    
    /**
     * Build factory
     */
    buildFactory: function(room) {
        var factories = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_FACTORY; }
        });
        
        if (factories.length > 0) return;
        
        var sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_FACTORY; }
        });
        
        if (sites.length > 0) return;
        
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;
        var spawn = spawns[0];
        
        var positions = this.getBuildPositions(room, spawn.pos, 7);
        
        for (var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            if (this.canBuildAt(room, pos.x, pos.y)) {
                var result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_FACTORY);
                if (result === OK) {
                    Utils.log('Placing factory at ' + pos.x + ',' + pos.y, 'INFO');
                    return;
                }
            }
        }
    },
    
    /**
     * Build observer
     */
    buildObserver: function(room) {
        var observers = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_OBSERVER; }
        });
        
        if (observers.length > 0) return;
        
        var sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_OBSERVER; }
        });
        
        if (sites.length > 0) return;
        
        // Place observer at edge of room for best coverage
        var positions = [
            { x: 2, y: 2 },
            { x: 47, y: 2 },
            { x: 2, y: 47 },
            { x: 47, y: 47 }
        ];
        
        for (var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            if (this.canBuildAt(room, pos.x, pos.y)) {
                var result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_OBSERVER);
                if (result === OK) {
                    Utils.log('Placing observer at ' + pos.x + ',' + pos.y, 'INFO');
                    return;
                }
            }
        }
    },
    
    /**
     * Build power spawn
     */
    buildPowerSpawn: function(room) {
        var powerSpawns = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_POWER_SPAWN; }
        });
        
        if (powerSpawns.length > 0) return;
        
        var sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_POWER_SPAWN; }
        });
        
        if (sites.length > 0) return;
        
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;
        var spawn = spawns[0];
        
        var positions = this.getBuildPositions(room, spawn.pos, 5);
        
        for (var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            if (this.canBuildAt(room, pos.x, pos.y)) {
                var result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_POWER_SPAWN);
                if (result === OK) {
                    Utils.log('Placing power spawn at ' + pos.x + ',' + pos.y, 'INFO');
                    return;
                }
            }
        }
    },
    
    /**
     * Build nuker
     */
    buildNuker: function(room) {
        var nukers = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_NUKER; }
        });
        
        if (nukers.length > 0) return;
        
        var sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_NUKER; }
        });
        
        if (sites.length > 0) return;
        
        var spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;
        var spawn = spawns[0];
        
        var positions = this.getBuildPositions(room, spawn.pos, 10);
        
        for (var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            if (this.canBuildAt(room, pos.x, pos.y)) {
                var result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_NUKER);
                if (result === OK) {
                    Utils.log('Placing nuker at ' + pos.x + ',' + pos.y, 'INFO');
                    return;
                }
            }
        }
    },
    
    /**
     * Build ramparts over important structures
     */
    buildRamparts: function(room) {
        var importantStructures = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) {
                return s.structureType === STRUCTURE_SPAWN ||
                       s.structureType === STRUCTURE_STORAGE ||
                       s.structureType === STRUCTURE_TERMINAL ||
                       s.structureType === STRUCTURE_TOWER ||
                       s.structureType === STRUCTURE_NUKER ||
                       s.structureType === STRUCTURE_POWER_SPAWN ||
                       s.structureType === STRUCTURE_FACTORY;
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
    
    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    
    /**
     * Get build positions in a spiral pattern
     */
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
                    
                    // Checkerboard pattern for extensions
                    if ((x + y) % 2 === 0) {
                        positions.push({ x: x, y: y });
                    }
                }
            }
        }
        
        return positions;
    },
    
    /**
     * Get adjacent positions
     */
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
    
    /**
     * Check if we can build at position
     */
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
        
        var sources = room.lookForAt(LOOK_SOURCES, x, y);
        if (sources.length > 0) return false;
        
        var minerals = room.lookForAt(LOOK_MINERALS, x, y);
        if (minerals.length > 0) return false;
        
        return true;
    }
};

module.exports = ConstructionManager;