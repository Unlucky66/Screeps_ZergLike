// manager.construction
//
// Automatic expansion base layouts + defenses:
// - Auto-chooses a good base anchor in each owned room (once, stored in memory).
// - Uses a "stamp" layout around the anchor:
//   * Core: spawns, storage, terminal, factory, power spawn in tight block.
//   * 6 towers around the core.
//   * Labs in a small ring.
//   * Extensions in diagonal rings (leave cross for roads).
// - Defenses:
//   * Ramparts on important core structures near the anchor.
//   * A perimeter wall ring (with gaps on main axes as "gates").
// - Also:
//   * Containers at sources and controller.
//   * Roads between base, sources, and controller.

const MAX_SITES_PER_TICK = 5;

// Fallback placement ranges (for any structure not fully covered by the stamp)
const RANGE_BY_TYPE = {};
RANGE_BY_TYPE[STRUCTURE_SPAWN] = { min: 1, max: 4 };
RANGE_BY_TYPE[STRUCTURE_EXTENSION] = { min: 2, max: 10 };
RANGE_BY_TYPE[STRUCTURE_TOWER] = { min: 2, max: 6 };
RANGE_BY_TYPE[STRUCTURE_STORAGE] = { min: 1, max: 4 };
RANGE_BY_TYPE[STRUCTURE_TERMINAL] = { min: 1, max: 5 };
RANGE_BY_TYPE[STRUCTURE_LINK] = { min: 2, max: 8 };
RANGE_BY_TYPE[STRUCTURE_FACTORY] = { min: 2, max: 6 };
RANGE_BY_TYPE[STRUCTURE_LAB] = { min: 3, max: 8 };
RANGE_BY_TYPE[STRUCTURE_POWER_SPAWN] = { min: 3, max: 7 };
RANGE_BY_TYPE[STRUCTURE_NUKER] = { min: 4, max: 10 };
RANGE_BY_TYPE[STRUCTURE_OBSERVER] = { min: 4, max: 10 };

function getRangeForType(structureType) {
    var info = RANGE_BY_TYPE[structureType];
    if (info) return info;
    return { min: 2, max: 8 };
}

// === STAMP LAYOUT ===

var BASE_STAMP = {};

// Spawns around anchor
BASE_STAMP[STRUCTURE_SPAWN] = [
    { dx: 0, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 }
];

// Core economy
BASE_STAMP[STRUCTURE_STORAGE] = [{ dx: 0, dy: 1 }];
BASE_STAMP[STRUCTURE_TERMINAL] = [{ dx: 0, dy: -1 }];
BASE_STAMP[STRUCTURE_FACTORY] = [{ dx: 1, dy: 1 }];
BASE_STAMP[STRUCTURE_POWER_SPAWN] = [{ dx: -1, dy: 1 }];

// 6 towers around core
BASE_STAMP[STRUCTURE_TOWER] = [
    { dx: 2, dy: 0 },
    { dx: -2, dy: 0 },
    { dx: 0, dy: 2 },
    { dx: 0, dy: -2 },
    { dx: 2, dy: 2 },
    { dx: -2, dy: -2 }
];

// Labs ring
BASE_STAMP[STRUCTURE_LAB] = [
    { dx: 2, dy: 1 },
    { dx: 2, dy: -1 },
    { dx: -2, dy: 1 },
    { dx: -2, dy: -1 },
    { dx: 1, dy: 2 },
    { dx: 1, dy: -2 },
    { dx: -1, dy: 2 },
    { dx: -1, dy: -2 }
];

// Link near core; which becomes storage/controller link is decided by manager.links
BASE_STAMP[STRUCTURE_LINK] = [
    { dx: 1, dy: 2 },
    { dx: -1, dy: 2 }
];

// Extensions in diagonal rings around base (skip main axes for roads)
(function generateExtensionStamp() {
    var extOffsets = [];
    for (var r = 2; r <= 7; r++) {
        for (var dx = -r; dx <= r; dx++) {
            for (var dy = -r; dy <= r; dy++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                if (dx === 0 || dy === 0) continue; // keep cross clear
                if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue; // avoid core
                extOffsets.push({ dx: dx, dy: dy });
            }
        }
    }
    BASE_STAMP[STRUCTURE_EXTENSION] = extOffsets;
})();

// === ANCHOR SELECTION ===

// Find a good base anchor once and store it in room.memory.baseAnchor
function findBestAnchor(room) {
    var controller = room.controller;
    var sources = room.find(FIND_SOURCES);
    var points = [];

    if (controller) points.push(controller.pos);
    for (var i = 0; i < sources.length; i++) {
        points.push(sources[i].pos);
    }

    if (!points.length) {
        var sp = room.find(FIND_MY_SPAWNS)[0];
        if (sp) return sp.pos;
        if (controller) return controller.pos;
        return null;
    }

    // Rough "center of mass"
    var sumX = 0;
    var sumY = 0;
    for (var j = 0; j < points.length; j++) {
        sumX += points[j].x;
        sumY += points[j].y;
    }
    var cx = Math.round(sumX / points.length);
    var cy = Math.round(sumY / points.length);

    var terrain = room.getTerrain();
    var bestPos = null;
    var bestScore = Infinity;

    // Search area around center (11x11 square)
    for (var dx = -5; dx <= 5; dx++) {
        for (var dy = -5; dy <= 5; dy++) {
            var x = cx + dx;
            var y = cy + dy;
            if (x < 5 || x > 44 || y < 5 || y > 44) continue;

            if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

            var pos = new RoomPosition(x, y, room.name);

            if (pos.lookFor(LOOK_SOURCES).length) continue;
            if (controller && pos.isEqualTo(controller.pos)) continue;
            if (pos.lookFor(LOOK_STRUCTURES).length) continue;
            if (pos.lookFor(LOOK_CONSTRUCTION_SITES).length) continue;

            // Check local openness: count walls in radius 3
            var walls = 0;
            for (var ox = -3; ox <= 3; ox++) {
                for (var oy = -3; oy <= 3; oy++) {
                    var xx = x + ox;
                    var yy = y + oy;
                    if (xx <= 1 || xx >= 48 || yy <= 1 || yy >= 48) {
                        walls++;
                        continue;
                    }
                    if (terrain.get(xx, yy) === TERRAIN_MASK_WALL) {
                        walls++;
                    }
                }
            }
            if (walls > 20) continue;

            // Score: closeness to controller and sources, distance from edges
            var score = 0;

            if (controller) {
                var dc = pos.getRangeTo(controller.pos);
                score += Math.abs(dc - 4) * 5;
            }

            for (var s = 0; s < sources.length; s++) {
                var ds = pos.getRangeTo(sources[s].pos);
                score += ds;
            }

            var edgeDist = Math.min(x, 49 - x, y, 49 - y);
            if (edgeDist < 5) {
                score += (5 - edgeDist) * 10;
            }

            if (score < bestScore) {
                bestScore = score;
                bestPos = pos;
            }
        }
    }

    if (bestPos) return bestPos;

    // Fallbacks
    var spawn = room.find(FIND_MY_SPAWNS)[0];
    if (spawn) return spawn.pos;
    if (controller) return controller.pos;
    return null;
}

function getAnchor(room) {
    if (!room.controller || !room.controller.my) return null;

    if (!room.memory.baseAnchor) {
        var best = findBestAnchor(room);
        if (best) {
            room.memory.baseAnchor = { x: best.x, y: best.y };
            console.log(
                '[LAYOUT] Anchor chosen for ' +
                    room.name +
                    ' at (' +
                    best.x +
                    ',' +
                    best.y +
                    ')'
            );
        } else {
            return null;
        }
    }

    var anchorData = room.memory.baseAnchor;
    return new RoomPosition(anchorData.x, anchorData.y, room.name);
}

// === COMMON HELPERS ===

function getExistingAndPlanned(room, structureType) {
    var existing = room.find(FIND_MY_STRUCTURES, {
        filter: function (s) { return s.structureType === structureType; }
    }).length;

    var planned = room.find(FIND_MY_CONSTRUCTION_SITES, {
        filter: function (c) { return c.structureType === structureType; }
    }).length;

    return existing + planned;
}

function canBuildAt(room, pos) {
    var terrain = room.getTerrain();
    if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) return false;
    if (pos.x <= 1 || pos.x >= 48 || pos.y <= 1 || pos.y >= 48) return false;

    if (pos.lookFor(LOOK_STRUCTURES).length) return false;
    if (pos.lookFor(LOOK_CONSTRUCTION_SITES).length) return false;

    if (pos.lookFor(LOOK_SOURCES).length > 0) return false;
    var controller = room.controller;
    if (controller && pos.isEqualTo(controller.pos)) return false;

    return true;
}

// Spiral/ring positions around anchor, from minRange to maxRange
function getSpiralPositions(room, anchor, minRange, maxRange) {
    var result = [];
    var terrain = room.getTerrain();

    for (var r = minRange; r <= maxRange; r++) {
        for (var dx = -r; dx <= r; dx++) {
            for (var dy = -r; dy <= r; dy++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;

                var x = anchor.x + dx;
                var y = anchor.y + dy;
                if (x <= 1 || x >= 48 || y <= 1 || y >= 48) continue;
                if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

                result.push(new RoomPosition(x, y, room.name));
            }
        }
    }
    return result;
}

// === BASE STRUCTURES USING STAMP FIRST, THEN SPIRAL FALLBACK ===

function planBaseStructures(room, anchor, maxSites) {
    var controller = room.controller;
    if (!controller) return 0;
    var rcl = controller.level;
    if (!rcl) return 0;

    var placed = 0;

    var priority = [
        STRUCTURE_SPAWN,
        STRUCTURE_STORAGE,
        STRUCTURE_TERMINAL,
        STRUCTURE_FACTORY,
        STRUCTURE_POWER_SPAWN,
        STRUCTURE_TOWER,
        STRUCTURE_LAB,
        STRUCTURE_LINK,
        STRUCTURE_EXTENSION,
        STRUCTURE_OBSERVER,
        STRUCTURE_NUKER
    ];

    for (var pi = 0; pi < priority.length && placed < maxSites; pi++) {
        var type = priority[pi];

        var limit = CONTROLLER_STRUCTURES[type]
            ? CONTROLLER_STRUCTURES[type][rcl] || 0
            : 0;
        if (!limit) continue;

        var have = getExistingAndPlanned(room, type);
        var need = limit - have;
        if (need <= 0) continue;

        // 1) Try stamp positions
        var stamp = BASE_STAMP[type] || [];
        for (var si = 0; si < stamp.length && need > 0 && placed < maxSites; si++) {
            var off = stamp[si];
            var sx = anchor.x + off.dx;
            var sy = anchor.y + off.dy;
            if (sx <= 1 || sx >= 48 || sy <= 1 || sy >= 48) continue;

            var spos = new RoomPosition(sx, sy, room.name);
            var terrain = room.getTerrain();
            if (terrain.get(sx, sy) === TERRAIN_MASK_WALL) continue;

            var structs = spos.lookFor(LOOK_STRUCTURES);
            var sites = spos.lookFor(LOOK_CONSTRUCTION_SITES);

            var occupiedBySame = false;
            var blocked = false;

            for (var s = 0; s < structs.length; s++) {
                if (structs[s].structureType === type) {
                    occupiedBySame = true;
                } else if (structs[s].structureType !== STRUCTURE_ROAD) {
                    blocked = true;
                }
            }
            for (var cs = 0; cs < sites.length; cs++) {
                if (sites[cs].structureType === type) {
                    occupiedBySame = true;
                } else {
                    blocked = true;
                }
            }

            if (occupiedBySame) continue;
            if (blocked) continue;

            var res = room.createConstructionSite(spos, type);
            if (res === OK) {
                placed++;
                need--;
            }
        }

        // 2) Fallback to spiral if we still need more of this structure
        if (need > 0 && placed < maxSites) {
            var rangeInfo = getRangeForType(type);
            var positions = getSpiralPositions(
                room,
                anchor,
                rangeInfo.min,
                rangeInfo.max
            );

            for (var p = 0; p < positions.length && need > 0 && placed < maxSites; p++) {
                var pos2 = positions[p];
                if (!canBuildAt(room, pos2)) continue;

                var res2 = room.createConstructionSite(pos2, type);
                if (res2 === OK) {
                    placed++;
                    need--;
                }
            }
        }
    }

    return placed;
}

// === SOURCE / CONTROLLER CONTAINERS & ROADS ===

function planSourceContainers(room, anchor, maxSites) {
    var placed = 0;
    var sources = room.find(FIND_SOURCES);

    for (var i = 0; i < sources.length && placed < maxSites; i++) {
        var source = sources[i];

        var hasContainer =
            source.pos.findInRange(FIND_STRUCTURES, 2, {
                filter: function (s) {
                    return s.structureType === STRUCTURE_CONTAINER;
                }
            }).length > 0 ||
            source.pos.findInRange(FIND_CONSTRUCTION_SITES, 2, {
                filter: function (s) {
                    return s.structureType === STRUCTURE_CONTAINER;
                }
            }).length > 0;

        if (hasContainer) continue;

        var bestPos = null;
        var bestRange = Infinity;
        var terrain = room.getTerrain();

        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                var x = source.pos.x + dx;
                var y = source.pos.y + dy;
                if (x <= 0 || x >= 49 || y <= 0 || y >= 49) continue;
                if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

                var pos = new RoomPosition(x, y, room.name);
                if (pos.lookFor(LOOK_STRUCTURES).length) continue;
                if (pos.lookFor(LOOK_CONSTRUCTION_SITES).length) continue;

                var range = anchor.getRangeTo(pos);
                if (range < bestRange) {
                    bestRange = range;
                    bestPos = pos;
                }
            }
        }

        if (bestPos) {
            var result = room.createConstructionSite(
                bestPos,
                STRUCTURE_CONTAINER
            );
            if (result === OK) {
                placed++;
            }
        }
    }

    return placed;
}

function planControllerContainer(room, anchor, maxSites) {
    if (!room.controller) return 0;
    if (maxSites <= 0) return 0;

    var controller = room.controller;

    var existing =
        controller.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: function (s) {
                return s.structureType === STRUCTURE_CONTAINER;
            }
        }).length > 0 ||
        controller.pos.findInRange(FIND_CONSTRUCTION_SITES, 3, {
            filter: function (s) {
                return s.structureType === STRUCTURE_CONTAINER;
            }
        }).length > 0;

    if (existing) return 0;

    var bestPos = null;
    var bestRange = Infinity;
    var terrain = room.getTerrain();

    for (var dx = -2; dx <= 2; dx++) {
        for (var dy = -2; dy <= 2; dy++) {
            var x = controller.pos.x + dx;
            var y = controller.pos.y + dy;
            if (x <= 0 || x >= 49 || y <= 0 || y >= 49) continue;
            if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

            var pos = new RoomPosition(x, y, room.name);
            if (pos.lookFor(LOOK_STRUCTURES).length) continue;
            if (pos.lookFor(LOOK_CONSTRUCTION_SITES).length) continue;

            var range = anchor.getRangeTo(pos);
            if (range < bestRange) {
                bestRange = range;
                bestPos = pos;
            }
        }
    }

    if (bestPos) {
        var result = room.createConstructionSite(
            bestPos,
            STRUCTURE_CONTAINER
        );
        if (result === OK) return 1;
    }

    return 0;
}

function planRoads(room, anchor, maxSites) {
    if (maxSites <= 0) return 0;
    var placed = 0;

    var importantTargets = [];
    var sources = room.find(FIND_SOURCES);
    for (var i = 0; i < sources.length; i++) {
        importantTargets.push(sources[i].pos);
    }
    if (room.controller) importantTargets.push(room.controller.pos);

    var existingRoads = room.find(FIND_STRUCTURES, {
        filter: function (s) {
            return s.structureType === STRUCTURE_ROAD;
        }
    });
    var roadSites = room.find(FIND_CONSTRUCTION_SITES, {
        filter: function (s) {
            return s.structureType === STRUCTURE_ROAD;
        }
    });

    var roadSet = {};
    for (var r = 0; r < existingRoads.length; r++) {
        var key1 = existingRoads[r].pos.x + ',' + existingRoads[r].pos.y;
        roadSet[key1] = true;
    }
    for (var rs = 0; rs < roadSites.length; rs++) {
        var key2 = roadSites[rs].pos.x + ',' + roadSites[rs].pos.y;
        roadSet[key2] = true;
    }

    var terrain = room.getTerrain();

    for (var t = 0; t < importantTargets.length && placed < maxSites; t++) {
        var target = importantTargets[t];
        var path = room.findPath(anchor, target, {
            ignoreCreeps: true,
            ignoreRoads: true,
            swampCost: 1
        });

        for (var p = 0; p < path.length && placed < maxSites; p++) {
            var step = path[p];
            var key = step.x + ',' + step.y;
            if (roadSet[key]) continue;
            if (terrain.get(step.x, step.y) === TERRAIN_MASK_WALL) continue;

            var pos = new RoomPosition(step.x, step.y, room.name);
            var structs = pos.lookFor(LOOK_STRUCTURES);
            if (
                structs.length &&
                structs.some(function (s) { return s.structureType !== STRUCTURE_ROAD; })
            ) {
                continue;
            }

            var res = room.createConstructionSite(
                step.x,
                step.y,
                STRUCTURE_ROAD
            );
            if (res === OK) {
                roadSet[key] = true;
                placed++;
            }
        }
    }

    return placed;
}

// === DEFENSIVE RAMPARTS & WALL RING ===

function hasRampartAt(pos) {
    var structs = pos.lookFor(LOOK_STRUCTURES);
    for (var i = 0; i < structs.length; i++) {
        if (structs[i].structureType === STRUCTURE_RAMPART) return true;
    }
    var sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
    for (var j = 0; j < sites.length; j++) {
        if (sites[j].structureType === STRUCTURE_RAMPART) return true;
    }
    return false;
}

function planCoreRamparts(room, anchor, maxSites) {
    if (maxSites <= 0) return 0;
    if (!room.controller || room.controller.level < 3) return 0;

    var important = {};
    important[STRUCTURE_SPAWN] = true;
    important[STRUCTURE_EXTENSION] = true;
    important[STRUCTURE_TOWER] = true;
    important[STRUCTURE_STORAGE] = true;
    important[STRUCTURE_TERMINAL] = true;
    important[STRUCTURE_FACTORY] = true;
    important[STRUCTURE_POWER_SPAWN] = true;
    important[STRUCTURE_LINK] = true;
    important[STRUCTURE_LAB] = true;

    var structs = room.find(FIND_MY_STRUCTURES, {
        filter: function (s) {
            return important[s.structureType] &&
                s.pos.getRangeTo(anchor) <= 4;
        }
    });

    var placed = 0;
    for (var i = 0; i < structs.length && placed < maxSites; i++) {
        var pos = structs[i].pos;
        if (hasRampartAt(pos)) continue;

        var res = room.createConstructionSite(pos, STRUCTURE_RAMPART);
        if (res === OK) placed++;
    }

    return placed;
}

function planPerimeterWalls(room, anchor, maxSites) {
    if (maxSites <= 0) return 0;
    if (!room.controller || room.controller.level < 4) return 0;

    var radius = 6;
    var positions = getSpiralPositions(room, anchor, radius, radius);
    var placed = 0;

    for (var i = 0; i < positions.length && placed < maxSites; i++) {
        var pos = positions[i];
        var dx = pos.x - anchor.x;
        var dy = pos.y - anchor.y;

        // Leave 4 gates on main axes (no wall) for traffic
        if (dx === 0 || dy === 0) continue;

        if (!canBuildAt(room, pos)) continue;

        var res = room.createConstructionSite(pos, STRUCTURE_WALL);
        if (res === OK) placed++;
    }

    return placed;
}

// === MAIN ENTRY POINT ===

module.exports = {
    run: function (room) {
        if (!room.controller || !room.controller.my) return;

        var totalSites = room.find(FIND_MY_CONSTRUCTION_SITES).length;
        if (totalSites > 80) return;

        var anchor = getAnchor(room);
        if (!anchor) return;

        var remaining = MAX_SITES_PER_TICK;

        // Core buildings
        remaining -= planBaseStructures(room, anchor, remaining);
        if (remaining <= 0) return;

        // Containers
        remaining -= planSourceContainers(room, anchor, remaining);
        if (remaining <= 0) return;

        remaining -= planControllerContainer(room, anchor, remaining);
        if (remaining <= 0) return;

        // Roads
        remaining -= planRoads(room, anchor, remaining);
        if (remaining <= 0) return;

        // Defensive ramparts on core structures
        remaining -= planCoreRamparts(room, anchor, remaining);
        if (remaining <= 0) return;

        // Perimeter walls ring with gates
        remaining -= planPerimeterWalls(room, anchor, remaining);
    }
};