// ui.visuals
//
// Renders a compact dashboard in each owned room:
//  - Room name, RCL and progress bar
//  - Energy, storage, mineral info
//  - Key creep role counts
//  - Remote mining + defense state
//  - Optional base layout visuals (anchor, perimeter wall ring, core ramparts)
// Also renders a CPU/bucket panel in one room.
//
// Toggle layout visuals globally via console:
//   Memory.uiShowLayout = true;   // show layout (default)
//   Memory.uiShowLayout = false;  // hide layout

module.exports = {
    render: function () {
        if (global.lowCpuMode) return;

        var ownedRooms = [];
        for (var name in Game.rooms) {
            var room = Game.rooms[name];
            if (!room.controller || !room.controller.my) continue;
            ownedRooms.push(room);
        }
        if (!ownedRooms.length) return;

        var layoutEnabled = this.isLayoutEnabled();

        for (var i = 0; i < ownedRooms.length; i++) {
            var r = ownedRooms[i];
            this.renderRoomPanel(r, layoutEnabled);
            if (layoutEnabled) {
                this.renderDefenseLayout(r);
            }
        }

        // Render CPU panel in the "main" room (highest RCL)
        var mainRoom = ownedRooms[0];
        for (var j = 1; j < ownedRooms.length; j++) {
            if (
                ownedRooms[j].controller &&
                ownedRooms[j].controller.level >
                    mainRoom.controller.level
            ) {
                mainRoom = ownedRooms[j];
            }
        }
        this.renderCpuPanel(mainRoom);
    },

    isLayoutEnabled: function () {
        // default ON if not set
        if (Memory.uiShowLayout === false) return false;
        return true;
    },

    renderRoomPanel: function (room, layoutEnabled) {
        var vis = new RoomVisual(room.name);

        var x = 0.5;
        var y = 0.5;
        var w = 14;
        var h = 7;

        // Background box
        vis.rect(x, y, w, h, {
            fill: '#000000',
            opacity: 0.35,
            stroke: '#555555'
        });

        // Header: room name + RCL
        var ctrl = room.controller;
        var rcl = ctrl ? ctrl.level : 0;
        var progress = 0;
        if (ctrl && ctrl.level < 8 && ctrl.progressTotal > 0) {
            progress = ctrl.progress / ctrl.progressTotal;
        } else if (ctrl && ctrl.level === 8) {
            progress = 1;
        }

        var pct = Math.floor(progress * 100);
        var headerText =
            room.name +
            '  RCL ' +
            rcl +
            ' (' +
            pct +
            '%)';

        vis.text(headerText, x + 0.4, y + 0.9, {
            align: 'left',
            color: '#ffffff',
            font: 0.8
        });

        // Layout toggle indicator (top-right of panel)
        var layoutText = 'Layout: ' + (layoutEnabled ? 'ON' : 'OFF');
        vis.text(layoutText, x + w - 0.4, y + 0.9, {
            align: 'right',
            color: layoutEnabled ? '#88ff88' : '#ff8888',
            font: 0.6
        });

        // RCL progress bar
        var barX = x + 0.4;
        var barY = y + 1.1;
        var barW = w - 0.8;
        var barH = 0.35;

        vis.rect(barX, barY, barW, barH, {
            fill: '#333333',
            opacity: 0.8,
            stroke: '#000000'
        });
        vis.rect(barX, barY, barW * progress, barH, {
            fill: '#00cc00',
            opacity: 0.9,
            stroke: '#00aa00'
        });

        // Energy
        var energyNow = room.energyAvailable;
        var energyCap = room.energyCapacityAvailable;
        vis.text(
            'Energy: ' + energyNow + '/' + energyCap,
            x + 0.4,
            y + 2.0,
            {
                align: 'left',
                color: '#ffffaa',
                font: 0.7
            }
        );

        // Storage + minerals
        var storageEnergy = 0;
        var mineralSummary = '';
        if (room.storage) {
            storageEnergy = room.storage.store[RESOURCE_ENERGY] || 0;

            var mineralCounts = {};
            for (var res in room.storage.store) {
                if (res === RESOURCE_ENERGY) continue;
                if (!room.storage.store[res]) continue;
                mineralCounts[res] = room.storage.store[res];
            }

            var mineralKeys = Object.keys(mineralCounts);
            if (mineralKeys.length) {
                mineralKeys.sort(function (a, b) {
                    return mineralCounts[b] - mineralCounts[a];
                });
                var parts = [];
                for (var m = 0; m < mineralKeys.length && m < 3; m++) {
                    var r = mineralKeys[m];
                    parts.push(r + ':' + mineralCounts[r]);
                }
                mineralSummary = parts.join(' ');
            }
        }

        vis.text(
            'Storage: ' + storageEnergy,
            x + 0.4,
            y + 2.8,
            {
                align: 'left',
                color: '#aaffff',
                font: 0.7
            }
        );
        if (mineralSummary) {
            vis.text(
                mineralSummary,
                x + 0.4,
                y + 3.5,
                {
                    align: 'left',
                    color: '#ddddff',
                    font: 0.6
                }
            );
        }

        // Creep role summary
        var creeps = room.find(FIND_MY_CREEPS);
        var byRole = _.countBy(creeps, function (c) {
            return c.memory.role || 'none';
        });

        function count(roleName) {
            return byRole[roleName] || 0;
        }

        var line1 =
            'H:' + count('harvester') +
            ' C:' + count('carrier') +
            ' U:' + count('upgrader') +
            ' B:' + count('builder');

        var line2 =
            'D:' + count('defender') +
            ' A:' + count('attacker') +
            ' Rm:' + count('remoteMiner') +
            ' Rh:' + count('remoteHauler');

        vis.text(line1, x + 0.4, y + 4.5, {
            align: 'left',
            color: '#ffffff',
            font: 0.6
        });
        vis.text(line2, x + 0.4, y + 5.2, {
            align: 'left',
            color: '#ffffff',
            font: 0.6
        });

        // Remote + defense state
        var remotes = room.memory.remotes || {};
        var remoteCount = 0;
        for (var rName in remotes) {
            if (remotes[rName] && remotes[rName].enabled !== false) {
                remoteCount++;
            }
        }

        var statusText = 'Remotes: ' + remoteCount;
        var statusColor = '#aaaaaa';
        if (room.memory.underAttack) {
            statusText += '  UNDER ATTACK';
            statusColor = '#ff5555';
        } else if (room.controller && room.controller.safeMode) {
            statusText += '  SAFE MODE';
            statusColor = '#ffff55';
        }

        vis.text(
            statusText,
            x + 0.4,
            y + 6.2,
            {
                align: 'left',
                color: statusColor,
                font: 0.6
            }
        );
    },

    renderDefenseLayout: function (room) {
        if (!room.memory.baseAnchor) return;

        var vis = new RoomVisual(room.name);
        var anchorData = room.memory.baseAnchor;
        var anchor = new RoomPosition(anchorData.x, anchorData.y, room.name);

        // Anchor marker
        vis.circle(anchor.x, anchor.y, {
            radius: 0.6,
            fill: 'transparent',
            stroke: '#ffff00',
            strokeWidth: 0.15
        });
        vis.text('A', anchor.x, anchor.y + 0.1, {
            color: '#ffff00',
            font: 0.5,
            align: 'center',
            opacity: 0.9
        });

        // Core rampart area: highlight structures near anchor that should be under ramparts
        if (room.controller && room.controller.level >= 3) {
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

            var coreStructs = room.find(FIND_MY_STRUCTURES, {
                filter: function (s) {
                    if (!important[s.structureType]) return false;
                    return s.pos.getRangeTo(anchor) <= 4;
                }
            });

            for (var i = 0; i < coreStructs.length; i++) {
                var sPos = coreStructs[i].pos;
                vis.circle(sPos.x, sPos.y, {
                    radius: 0.45,
                    fill: 'transparent',
                    stroke: '#00ff88',
                    strokeWidth: 0.12,
                    opacity: 0.8
                });
            }
        }

        // Perimeter wall ring at radius 6 (visual only; build logic is in manager.construction)
        if (room.controller && room.controller.level >= 4) {
            var radius = 6;
            var terrain = room.getTerrain();

            for (var dx = -radius; dx <= radius; dx++) {
                for (var dy = -radius; dy <= radius; dy++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;

                    // Leave 4 “gates” on main axes (where dx==0 or dy==0)
                    if (dx === 0 || dy === 0) continue;

                    var x = anchor.x + dx;
                    var y = anchor.y + dy;
                    if (x <= 1 || x >= 48 || y <= 1 || y >= 48) continue;
                    if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

                    vis.circle(x, y, {
                        radius: 0.3,
                        fill: 'transparent',
                        stroke: '#4444ff',
                        strokeWidth: 0.08,
                        opacity: 0.5
                    });
                }
            }
        }
    },

    renderCpuPanel: function (room) {
        if (!room) return;

        var vis = new RoomVisual(room.name);

        var x = 30;
        var y = 0.5;
        var w = 18;
        var h = 2.8;

        vis.rect(x, y, w, h, {
            fill: '#000000',
            opacity: 0.4,
            stroke: '#666666'
        });

        var used = Game.cpu.getUsed().toFixed(1);
        var limit = Game.cpu.limit;
        var bucket = Game.cpu.bucket;

        vis.text(
            'CPU: ' + used + ' / ' + limit,
            x + 0.4,
            y + 1.0,
            {
                align: 'left',
                color: '#ffffff',
                font: 0.8
            }
        );

        var bucketColor = '#aaffaa';
        if (bucket < 5000) bucketColor = '#ffff88';
        if (bucket < 2000) bucketColor = '#ff8888';

        vis.text(
            'Bucket: ' + bucket,
            x + 0.4,
            y + 1.8,
            {
                align: 'left',
                color: bucketColor,
                font: 0.8
            }
        );
    }
};