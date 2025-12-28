/**
 * ██████████████████████████████████████████████████████████████████████████████
 * █                                                                            █
 * █   ZERG SWARM AI v2.0 - FULLY AUTOMATED HIVE MIND                           █
 * █   "The Swarm hungers... The Swarm grows... The Swarm consumes all."        █
 * █                                                                            █
 * ██████████████████████████████████████████████████████████████████████████████
 */

'use strict';

// Managers
var CONFIG = require('config');
var MemoryManager = require('manager.memory');
var ColonyManager = require('manager.colony');
var SpawnManager = require('manager.spawn');
var EnergyManager = require('manager.energy');
var TowerManager = require('manager.tower');
var DefenseManager = require('manager.defense');
var ConstructionManager = require('manager.construction');
var ExpansionManager = require('manager.expansion');

// Creep Dispatcher
var CreepDispatcher = require('creepDispatcher');

// Utils
var Utils = require('utils');

// ============================================================================
// ZERG VISUAL MANAGER
// ============================================================================

var ZergVisuals = {
    
    // Zerg quotes and messages
    QUOTES: [
        "The Swarm hungers...",
        "We are the Swarm.",
        "Evolve or perish.",
        "The hive mind awakens.",
        "Consume. Evolve. Repeat.",
        "All shall serve the Swarm.",
        "Evolution is eternal.",
        "The creep spreads...",
        "Your essence will join us.",
        "Resistance is futile.",
        "The Overmind commands.",
        "For the Swarm!",
        "Strength in numbers.",
        "We grow stronger.",
        "The infestation begins.",
        "Assimilate or be destroyed.",
        "The hive expands.",
        "Your structures will fall.",
        "We are infinite.",
        "The Swarm remembers.",
        "Spawn more Overlords.",
        "Our enemies will fall.",
        "The essence calls to us.",
        "We adapt. We overcome.",
        "Nothing escapes the Swarm."
    ],
    
    // State-specific messages
    STATE_MESSAGES: {
        emergency: [
            "CRITICAL: Larvae depleted!",
            "Hive threatened!",
            "Emergency protocols active!",
            "Spawning pool compromised!"
        ],
        startup: [
            "New hive establishing...",
            "The infestation begins...",
            "Building the hive cluster...",
            "Growth phase initiated..."
        ],
        developing: [
            "Evolution in progress...",
            "Adapting to environment...",
            "Biomass increasing...",
            "Creep spreading..."
        ],
        stable: [
            "Hive operating normally.",
            "Balance achieved.",
            "Resources flowing.",
            "The Swarm is content."
        ],
        thriving: [
            "The Swarm prospers!",
            "Maximum efficiency!",
            "Evolution complete!",
            "Dominance assured!"
        ],
        recovering: [
            "Regenerating biomass...",
            "Healing in progress...",
            "Recovery protocols...",
            "Rebuilding reserves..."
        ],
        defense: [
            "Hostiles detected!",
            "Defending the hive!",
            "Engaging enemies!",
            "Destroy the intruders!"
        ],
        critical: [
            "HIVE UNDER ATTACK!",
            "CRITICAL THREAT!",
            "ALL UNITS DEFEND!",
            "SAFE MODE IMMINENT!"
        ]
    },
    
    // Colors for different states
    COLORS: {
        primary: '#8B00FF',
        secondary: '#4B0082',
        accent: '#9932CC',
        creep: '#551A8B',
        warning: '#FFD700',
        danger: '#FF0000',
        success: '#00FF00',
        energy: '#FFFF00',
        text: '#E6E6FA',
        dark: '#1A0033',
        glow: '#DA70D6',
        road: '#666666',
        container: '#AA8800'
    },
    
    /**
     * Get random quote
     */
    getRandomQuote: function() {
        return this.QUOTES[Math.floor(Math.random() * this.QUOTES.length)];
    },
    
    /**
     * Get state message
     */
    getStateMessage: function(state) {
        var messages = this.STATE_MESSAGES[state] || this.STATE_MESSAGES.stable;
        return messages[Math.floor(Math.random() * messages.length)];
    },
    
    /**
     * Get color for state
     */
    getStateColor: function(state) {
        switch (state) {
            case 'critical':
            case 'defense':
                return this.COLORS.danger;
            case 'emergency':
                return this.COLORS.warning;
            case 'thriving':
            case 'stable':
                return this.COLORS.success;
            default:
                return this.COLORS.text;
        }
    },
    
    /**
     * Format large numbers
     */
    formatNumber: function(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return String(num);
    },
    
    /**
     * Draw glowing panel background
     */
    drawPanel: function(visual, x, y, width, height, state) {
        var glowColor = this.COLORS.primary;
        
        switch (state) {
            case 'critical':
            case 'defense':
                glowColor = this.COLORS.danger;
                break;
            case 'emergency':
                glowColor = this.COLORS.warning;
                break;
            case 'thriving':
                glowColor = this.COLORS.success;
                break;
        }
        
        // Outer glow
        visual.rect(x - 0.1, y - 0.1, width + 0.2, height + 0.2, {
            fill: glowColor,
            opacity: 0.15,
            stroke: glowColor,
            strokeWidth: 0.08
        });
        
        // Main background
        visual.rect(x, y, width, height, {
            fill: this.COLORS.dark,
            opacity: 0.9,
            stroke: this.COLORS.primary,
            strokeWidth: 0.05
        });
    },
    
    /**
     * Draw main HUD
     */
    drawHUD: function(room) {
        var visual = room.visual;
        var colony = Memory.hive.colonies[room.name];
        var state = colony ? colony.state : 'startup';
        var defcon = colony ? colony.defcon : 0;
        
        // Get stats
        var controller = room.controller;
        var rcl = controller.level;
        var progress = ((controller.progress / controller.progressTotal) * 100).toFixed(1);
        var energy = room.energyAvailable;
        var capacity = room.energyCapacityAvailable;
        var stored = room.storage ? room.storage.store[RESOURCE_ENERGY] : 0;
        
        var creeps = _.filter(Game.creeps, function(c) {
            return c.memory.homeRoom === room.name;
        });
        var creepCount = creeps.length;
        var sites = room.find(FIND_CONSTRUCTION_SITES).length;
        
        // Count creeps by role
        var roleCounts = {};
        for (var i = 0; i < creeps.length; i++) {
            var role = creeps[i].memory.role;
            roleCounts[role] = (roleCounts[role] || 0) + 1;
        }
        
        // Count infrastructure
        var roads = room.find(FIND_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_ROAD; }
        }).length;
        var containers = room.find(FIND_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
        }).length;
        
        // Main panel position
        var panelX = 0.5;
        var panelY = 0.5;
        var panelWidth = 12;
        var panelHeight = 14;
        
        // Draw main panel
        this.drawPanel(visual, panelX, panelY, panelWidth, panelHeight, state);
        
        // Title
        visual.text('🐛 ZERG HIVE MIND 🐛', panelX + panelWidth / 2, panelY + 0.9, {
            color: this.COLORS.glow,
            font: 'bold 0.7 monospace',
            align: 'center',
            stroke: this.COLORS.primary,
            strokeWidth: 0.03
        });
        
        // State indicator
        var stateColor = this.getStateColor(state);
        visual.text('[ ' + state.toUpperCase() + ' ]', panelX + panelWidth / 2, panelY + 1.5, {
            color: stateColor,
            font: 'bold 0.4 monospace',
            align: 'center'
        });
        
        // Divider line
        visual.line(panelX + 0.5, panelY + 1.8, panelX + panelWidth - 0.5, panelY + 1.8, {
            color: this.COLORS.primary,
            width: 0.03,
            opacity: 0.6
        });
        
        // Stats section
        var statsY = panelY + 2.4;
        var lineHeight = 0.6;
        var labelX = panelX + 0.5;
        var valueX = panelX + 6.5;
        
        var stats = [
            { label: '🏠 Hive:', value: room.name, color: this.COLORS.text },
            { label: '🎮 RCL:', value: rcl + ' (' + progress + '%)', color: this.COLORS.energy },
            { label: '⚡ Energy:', value: energy + ' / ' + capacity, color: this.COLORS.energy },
            { label: '💰 Stored:', value: this.formatNumber(stored), color: this.COLORS.energy },
            { label: '👾 Units:', value: creepCount, color: this.COLORS.text },
            { label: '🏗️ Sites:', value: sites, color: this.COLORS.text },
            { label: '🛤️ Roads:', value: roads, color: this.COLORS.road },
            { label: '📦 Containers:', value: containers + ' / 5', color: this.COLORS.container },
            { label: '🛡️ DEFCON:', value: defcon, color: defcon > 0 ? this.COLORS.danger : this.COLORS.success }
        ];
        
        for (var j = 0; j < stats.length; j++) {
            var stat = stats[j];
            visual.text(stat.label, labelX, statsY + j * lineHeight, {
                color: this.COLORS.accent,
                font: '0.4 monospace',
                align: 'left'
            });
            visual.text(String(stat.value), valueX, statsY + j * lineHeight, {
                color: stat.color,
                font: 'bold 0.4 monospace',
                align: 'left'
            });
        }
        
        // CPU & Bucket
        var cpuY = statsY + stats.length * lineHeight + 0.2;
        var cpuUsed = Game.cpu.getUsed();
        var cpuLimit = Game.cpu.limit;
        var cpuPercent = ((cpuUsed / cpuLimit) * 100).toFixed(0);
        var cpuColor = cpuPercent > 80 ? this.COLORS.danger : (cpuPercent > 50 ? this.COLORS.warning : this.COLORS.success);
        
        visual.text('💻 CPU:', labelX, cpuY, {
            color: this.COLORS.accent,
            font: '0.4 monospace',
            align: 'left'
        });
        visual.text(cpuUsed.toFixed(1) + ' / ' + cpuLimit + ' (' + cpuPercent + '%)', valueX, cpuY, {
            color: cpuColor,
            font: 'bold 0.4 monospace',
            align: 'left'
        });
        
        var bucket = Game.cpu.bucket;
        var bucketColor = bucket > 9000 ? this.COLORS.success : (bucket > 5000 ? this.COLORS.warning : this.COLORS.danger);
        
        visual.text('🪣 Bucket:', labelX, cpuY + lineHeight, {
            color: this.COLORS.accent,
            font: '0.4 monospace',
            align: 'left'
        });
        visual.text(bucket + ' / 10000', valueX, cpuY + lineHeight, {
            color: bucketColor,
            font: 'bold 0.4 monospace',
            align: 'left'
        });
        
        // Divider
        var dividerY = cpuY + lineHeight * 2;
        visual.line(panelX + 0.5, dividerY, panelX + panelWidth - 0.5, dividerY, {
            color: this.COLORS.primary,
            width: 0.03,
            opacity: 0.6
        });
        
        // Creep counts
        var creepY = dividerY + 0.5;
        visual.text('👾 SWARM COMPOSITION', panelX + panelWidth / 2, creepY, {
            color: this.COLORS.glow,
            font: 'bold 0.4 monospace',
            align: 'center'
        });
        
        var roles = [
            { key: 'drone', icon: '🦟' },
            { key: 'overlord', icon: '🦑' },
            { key: 'queen', icon: '👑' },
            { key: 'roach', icon: '🪲' },
            { key: 'zergling', icon: '🐜' },
            { key: 'hydralisk', icon: '🐍' },
            { key: 'mutalisk', icon: '🦇' },
            { key: 'infestor', icon: '🦠' }
        ];
        
        var col1X = panelX + 0.8;
        var col2X = panelX + panelWidth / 2 + 0.5;
        var roleY = creepY + 0.5;
        var roleLineHeight = 0.45;
        
        for (var k = 0; k < roles.length; k++) {
            var roleData = roles[k];
            var count = roleCounts[roleData.key] || 0;
            var rx = k < 4 ? col1X : col2X;
            var ry = roleY + (k % 4) * roleLineHeight;
            var countColor = count > 0 ? this.COLORS.success : this.COLORS.text;
            
            visual.text(roleData.icon + ' ' + roleData.key + ':', rx, ry, {
                color: this.COLORS.accent,
                font: '0.33 monospace',
                align: 'left'
            });
            visual.text(String(count), rx + 3.8, ry, {
                color: countColor,
                font: 'bold 0.33 monospace',
                align: 'left'
            });
        }
        
        // Quote at bottom
        var quoteY = panelY + panelHeight - 0.5;
        var quoteIndex = Math.floor(Game.time / 150) % this.QUOTES.length;
        var quote = this.QUOTES[quoteIndex];
        
        if (state === 'defense' || state === 'critical' || state === 'emergency') {
            quote = this.getStateMessage(state);
        }
        
        visual.text('"' + quote + '"', panelX + panelWidth / 2, quoteY, {
            color: this.COLORS.glow,
            font: 'italic 0.33 monospace',
            align: 'center',
            opacity: 0.9
        });
    },
    
    /**
     * Draw DEFCON indicator
     */
    drawDefcon: function(visual, defcon) {
        if (defcon === 0) return;
        
        var x = 45;
        var y = 1.5;
        var colors = ['#00ff00', '#ffff00', '#ffaa00', '#ff5500', '#ff0000', '#ff00ff'];
        var color = colors[defcon] || colors[5];
        
        // Background
        visual.rect(x - 2.5, y - 1, 5, 2, {
            fill: this.COLORS.dark,
            opacity: 0.9,
            stroke: color,
            strokeWidth: 0.08
        });
        
        // Flashing effect for high defcon
        if (defcon >= 4) {
            var flash = Math.sin(Game.time * 0.5) > 0;
            if (flash) {
                visual.rect(x - 2.5, y - 1, 5, 2, {
                    fill: color,
                    opacity: 0.2
                });
            }
        }
        
        visual.text('⚠️ DEFCON', x, y - 0.3, {
            color: color,
            font: 'bold 0.4 monospace',
            align: 'center'
        });
        
        visual.text(String(defcon), x, y + 0.5, {
            color: color,
            font: 'bold 1 monospace',
            align: 'center'
        });
    },
    
    /**
     * Draw warning banner
     */
    drawWarningBanner: function(visual, state) {
        if (state !== 'critical' && state !== 'defense' && state !== 'emergency') return;
        
        var messages = {
            critical: '☠️ CRITICAL THREAT - ALL UNITS DEFEND ☠️',
            defense: '⚔️ HOSTILES DETECTED - ENGAGING ⚔️',
            emergency: '⚠️ EMERGENCY PROTOCOLS ACTIVE ⚠️'
        };
        
        var colors = {
            critical: this.COLORS.danger,
            defense: this.COLORS.warning,
            emergency: this.COLORS.warning
        };
        
        var message = messages[state];
        var color = colors[state];
        var y = 48;
        
        // Banner background
        visual.rect(0, y - 1, 50, 2, {
            fill: this.COLORS.dark,
            opacity: 0.95
        });
        
        // Flashing border
        var flash = Math.sin(Game.time * 0.4) > 0;
        if (flash) {
            visual.rect(0, y - 1, 50, 2, {
                fill: 'transparent',
                stroke: color,
                strokeWidth: 0.1
            });
        }
        
        visual.text(message, 25, y, {
            color: color,
            font: 'bold 0.7 monospace',
            align: 'center'
        });
    },
    
    /**
     * Draw border effects
     */
    drawBorderEffects: function(visual, state) {
        // State-based border effects
        if (state === 'critical') {
            var flash = Math.sin(Game.time * 0.5) > 0;
            if (flash) {
                visual.rect(0, 0, 50, 50, {
                    fill: 'transparent',
                    stroke: this.COLORS.danger,
                    strokeWidth: 0.15,
                    opacity: 0.9
                });
            }
        } else if (state === 'defense') {
            var pulse = (Math.sin(Game.time * 0.3) + 1) / 2;
            visual.rect(0, 0, 50, 50, {
                fill: 'transparent',
                stroke: this.COLORS.warning,
                strokeWidth: 0.1,
                opacity: pulse * 0.6
            });
        } else if (state === 'thriving') {
            visual.rect(0, 0, 50, 50, {
                fill: this.COLORS.success,
                opacity: 0.02
            });
        }
        
        // Corner decorations
        this.drawCorner(visual, 0, 0, 1, 1);
        this.drawCorner(visual, 50, 0, -1, 1);
        this.drawCorner(visual, 0, 50, 1, -1);
        this.drawCorner(visual, 50, 50, -1, -1);
    },
    
    /**
     * Draw corner decoration
     */
    drawCorner: function(visual, x, y, dirX, dirY) {
        var size = 2.5;
        visual.line(x, y, x + size * dirX, y, {
            color: this.COLORS.primary,
            width: 0.08,
            opacity: 0.7
        });
        visual.line(x, y, x, y + size * dirY, {
            color: this.COLORS.primary,
            width: 0.08,
            opacity: 0.7
        });
        visual.circle(x + 0.3 * dirX, y + 0.3 * dirY, {
            radius: 0.12,
            fill: this.COLORS.glow,
            opacity: 0.6
        });
    },
    
    /**
     * Draw spawn effects
     */
    drawSpawnEffects: function(visual, room) {
        var spawns = room.find(FIND_MY_SPAWNS);
        
        for (var i = 0; i < spawns.length; i++) {
            var spawn = spawns[i];
            var pos = spawn.pos;
            
            if (spawn.spawning) {
                var progress = (spawn.spawning.needTime - spawn.spawning.remainingTime) / spawn.spawning.needTime;
                var pulse = (Math.sin(Game.time * 0.3) + 1) / 2;
                
                // Glow effect
                visual.circle(pos.x, pos.y, {
                    radius: 1 + pulse * 0.3,
                    fill: this.COLORS.glow,
                    opacity: 0.25 + pulse * 0.15
                });
                
                // Progress ring
                visual.circle(pos.x, pos.y, {
                    radius: 1.3,
                    fill: 'transparent',
                    stroke: this.COLORS.success,
                    strokeWidth: 0.12 * progress,
                    opacity: 0.9
                });
                
                // Creep name
                var creepName = spawn.spawning.name.split('_')[0];
                visual.text('🥚 ' + creepName, pos.x, pos.y - 1.8, {
                    color: this.COLORS.glow,
                    font: '0.4 monospace',
                    align: 'center'
                });
                
                visual.text((progress * 100).toFixed(0) + '%', pos.x, pos.y + 1.8, {
                    color: this.COLORS.success,
                    font: 'bold 0.4 monospace',
                    align: 'center'
                });
            } else {
                // Idle spawn glow
                visual.circle(pos.x, pos.y, {
                    radius: 0.7,
                    fill: this.COLORS.primary,
                    opacity: 0.15
                });
            }
            
            // Creep spread around spawn
            for (var r = 3; r <= 6; r++) {
                visual.circle(pos.x, pos.y, {
                    radius: r,
                    fill: this.COLORS.creep,
                    opacity: 0.08 - (r * 0.01)
                });
            }
        }
    },
    
    /**
     * Draw source indicators
     */
    drawSources: function(visual, room) {
        var sources = room.find(FIND_SOURCES);
        
        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];
            var pos = source.pos;
            var percent = source.energy / source.energyCapacity;
            
            var color = percent > 0.5 ? this.COLORS.success : 
                       (percent > 0 ? this.COLORS.warning : this.COLORS.danger);
            
            visual.circle(pos.x, pos.y, {
                radius: 0.6,
                fill: 'transparent',
                stroke: color,
                strokeWidth: 0.1,
                opacity: 0.7
            });
            
            if (percent > 0) {
                visual.text((percent * 100).toFixed(0) + '%', pos.x, pos.y + 1.2, {
                    color: color,
                    font: '0.3 monospace',
                    align: 'center'
                });
            } else {
                visual.text('⏳', pos.x, pos.y + 1.2, {
                    font: '0.4',
                    align: 'center',
                    opacity: 0.7
                });
            }
        }
    },
    
    /**
     * Draw hostile markers
     */
    drawHostiles: function(visual, room) {
        var hostiles = room.find(FIND_HOSTILE_CREEPS);
        
        for (var i = 0; i < hostiles.length; i++) {
            var hostile = hostiles[i];
            var pos = hostile.pos;
            
            // Danger zone
            visual.circle(pos.x, pos.y, {
                radius: 1,
                fill: this.COLORS.danger,
                opacity: 0.25
            });
            
            // Pulsing ring
            var pulse = (Math.sin(Game.time * 0.4) + 1) / 2;
            visual.circle(pos.x, pos.y, {
                radius: 1.5 + pulse * 0.5,
                fill: 'transparent',
                stroke: this.COLORS.danger,
                strokeWidth: 0.08,
                opacity: 0.5 - pulse * 0.3
            });
            
            // Skull marker
            visual.text('☠️', pos.x, pos.y + 0.1, {
                font: '0.7',
                align: 'center'
            });
            
            // Owner name
            visual.text(hostile.owner.username, pos.x, pos.y - 1.5, {
                color: this.COLORS.danger,
                font: '0.3 monospace',
                align: 'center'
            });
        }
    },
    
    /**
     * Draw controller info
     */
    drawController: function(visual, room) {
        var controller = room.controller;
        if (!controller || !controller.my) return;
        
        var pos = controller.pos;
        var progress = controller.progress / controller.progressTotal;
        
        // Progress bar
        var barWidth = 3;
        var barHeight = 0.25;
        var barX = pos.x - barWidth / 2;
        var barY = pos.y - 2.2;
        
        // Background
        visual.rect(barX, barY, barWidth, barHeight, {
            fill: this.COLORS.dark,
            opacity: 0.8,
            stroke: this.COLORS.primary,
            strokeWidth: 0.03
        });
        
        // Fill
        visual.rect(barX, barY, barWidth * progress, barHeight, {
            fill: this.COLORS.success,
            opacity: 0.9
        });
        
        // RCL text
        visual.text('RCL ' + controller.level, pos.x, pos.y - 2.7, {
            color: this.COLORS.glow,
            font: 'bold 0.4 monospace',
            align: 'center'
        });
        
        // Downgrade timer if applicable
        if (controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[controller.level] * 0.5) {
            var urgency = controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[controller.level] * 0.1;
            visual.text('⚠️ ' + controller.ticksToDowngrade, pos.x, pos.y + 1.5, {
                color: urgency ? this.COLORS.danger : this.COLORS.warning,
                font: '0.35 monospace',
                align: 'center'
            });
        }
    },
    
    /**
     * Draw road network
     */
    drawRoads: function(visual, room) {
        var roads = room.find(FIND_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_ROAD; }
        });
        
        // Only highlight damaged roads
        for (var i = 0; i < roads.length; i++) {
            var road = roads[i];
            var hitsPercent = road.hits / road.hitsMax;
            
            if (hitsPercent < 0.5) {
                var color = hitsPercent < 0.25 ? this.COLORS.danger : this.COLORS.warning;
                visual.circle(road.pos.x, road.pos.y, {
                    radius: 0.25,
                    fill: color,
                    opacity: 0.5
                });
                
                // Critical damage marker
                if (hitsPercent < 0.1) {
                    visual.text('!', road.pos.x, road.pos.y + 0.1, {
                        color: this.COLORS.danger,
                        font: 'bold 0.3 monospace',
                        align: 'center'
                    });
                }
            }
        }
        
        // Draw road construction sites
        var roadSites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_ROAD; }
        });
        
        for (var j = 0; j < roadSites.length; j++) {
            var site = roadSites[j];
            var progress = site.progress / site.progressTotal;
            
            visual.circle(site.pos.x, site.pos.y, {
                radius: 0.25,
                fill: this.COLORS.creep,
                opacity: 0.3 + progress * 0.5
            });
            
            // Road icon
            visual.text('🛤️', site.pos.x, site.pos.y + 0.1, {
                font: '0.25',
                align: 'center',
                opacity: 0.7
            });
        }
    },
    
    /**
     * Draw containers
     */
    drawContainers: function(visual, room) {
        var containers = room.find(FIND_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
        });
        
        for (var i = 0; i < containers.length; i++) {
            var container = containers[i];
            var pos = container.pos;
            var energy = container.store[RESOURCE_ENERGY] || 0;
            var total = container.store.getUsedCapacity() || 0;
            var capacity = container.store.getCapacity();
            var fillPercent = total / capacity;
            var hitsPercent = container.hits / container.hitsMax;
            
            // Container outline
            visual.rect(pos.x - 0.35, pos.y - 0.35, 0.7, 0.7, {
                fill: this.COLORS.dark,
                opacity: 0.7,
                stroke: this.COLORS.container,
                strokeWidth: 0.05
            });
            
            // Fill level
            if (fillPercent > 0) {
                var fillHeight = 0.6 * fillPercent;
                var fillColor = energy > 0 ? this.COLORS.energy : this.COLORS.accent;
                visual.rect(pos.x - 0.3, pos.y + 0.3 - fillHeight, 0.6, fillHeight, {
                    fill: fillColor,
                    opacity: 0.7
                });
            }
            
            // Damage indicator
            if (hitsPercent < 0.5) {
                var damageColor = hitsPercent < 0.25 ? this.COLORS.danger : this.COLORS.warning;
                visual.circle(pos.x, pos.y, {
                    radius: 0.5,
                    fill: 'transparent',
                    stroke: damageColor,
                    strokeWidth: 0.08,
                    opacity: 0.9
                });
            }
            
            // Amount text
            if (total > 50) {
                visual.text(this.formatNumber(total), pos.x, pos.y + 0.85, {
                    color: this.COLORS.energy,
                    font: '0.25 monospace',
                    align: 'center',
                    opacity: 0.9
                });
            }
        }
        
        // Draw container construction sites
        var containerSites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
        });
        
        for (var j = 0; j < containerSites.length; j++) {
            var site = containerSites[j];
            var progress = site.progress / site.progressTotal;
            
            // Outline
            visual.rect(site.pos.x - 0.35, site.pos.y - 0.35, 0.7, 0.7, {
                fill: 'transparent',
                stroke: this.COLORS.glow,
                strokeWidth: 0.05,
                opacity: 0.6
            });
            
            // Building icon
            visual.text('📦', site.pos.x, site.pos.y + 0.1, {
                font: '0.35',
                align: 'center',
                opacity: 0.8
            });
            
            // Progress text
            visual.text((progress * 100).toFixed(0) + '%', site.pos.x, site.pos.y + 0.8, {
                color: this.COLORS.glow,
                font: '0.25 monospace',
                align: 'center'
            });
        }
    },
    
    /**
     * Draw all construction sites
     */
    drawConstructionSites: function(visual, room) {
        var sites = room.find(FIND_CONSTRUCTION_SITES);
        
        var icons = {};
        icons[STRUCTURE_EXTENSION] = '🔌';
        icons[STRUCTURE_TOWER] = '🗼';
        icons[STRUCTURE_STORAGE] = '🏦';
        icons[STRUCTURE_LINK] = '🔗';
        icons[STRUCTURE_TERMINAL] = '📡';
        icons[STRUCTURE_LAB] = '🧪';
        icons[STRUCTURE_FACTORY] = '🏭';
        icons[STRUCTURE_OBSERVER] = '👁️';
        icons[STRUCTURE_POWER_SPAWN] = '⚡';
        icons[STRUCTURE_NUKER] = '☢️';
        icons[STRUCTURE_EXTRACTOR] = '⛏️';
        icons[STRUCTURE_RAMPART] = '🛡️';
        icons[STRUCTURE_SPAWN] = '🥚';
        
        for (var i = 0; i < sites.length; i++) {
            var site = sites[i];
            
            // Skip roads and containers (handled separately)
            if (site.structureType === STRUCTURE_ROAD ||
                site.structureType === STRUCTURE_CONTAINER) {
                continue;
            }
            
            var progress = site.progress / site.progressTotal;
            var icon = icons[site.structureType] || '🏗️';
            
            // Progress circle
            visual.circle(site.pos.x, site.pos.y, {
                radius: 0.55,
                fill: this.COLORS.dark,
                opacity: 0.6
            });
            
            visual.circle(site.pos.x, site.pos.y, {
                radius: 0.55,
                fill: 'transparent',
                stroke: this.COLORS.glow,
                strokeWidth: 0.1 * progress + 0.02,
                opacity: 0.7
            });
            
            // Icon
            visual.text(icon, site.pos.x, site.pos.y + 0.12, {
                font: '0.45',
                align: 'center',
                opacity: 0.9
            });
            
            // Progress percentage
            visual.text((progress * 100).toFixed(0) + '%', site.pos.x, site.pos.y + 0.85, {
                color: this.COLORS.success,
                font: '0.22 monospace',
                align: 'center'
            });
        }
    },
    
    /**
     * Draw links
     */
    drawLinks: function(visual, room) {
        var links = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_LINK; }
        });
        
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            var pos = link.pos;
            var energy = link.store[RESOURCE_ENERGY] || 0;
            var capacity = link.store.getCapacity(RESOURCE_ENERGY);
            var fillPercent = energy / capacity;
            
            // Link indicator
            if (fillPercent > 0.1) {
                visual.circle(pos.x, pos.y, {
                    radius: 0.3,
                    fill: this.COLORS.energy,
                    opacity: 0.3 + fillPercent * 0.4
                });
            }
            
            // Energy amount
            if (energy > 100) {
                visual.text(this.formatNumber(energy), pos.x, pos.y + 0.8, {
                    color: this.COLORS.energy,
                    font: '0.22 monospace',
                    align: 'center',
                    opacity: 0.8
                });
            }
        }
    },
    
    /**
     * Draw storage
     */
    drawStorage: function(visual, room) {
        if (!room.storage) return;
        
        var storage = room.storage;
        var pos = storage.pos;
        var energy = storage.store[RESOURCE_ENERGY] || 0;
        var total = storage.store.getUsedCapacity() || 0;
        var capacity = storage.store.getCapacity();
        var fillPercent = total / capacity;
        
        // Glow based on fill level
        var glowIntensity = 0.1 + fillPercent * 0.3;
        visual.circle(pos.x, pos.y, {
            radius: 0.8,
            fill: this.COLORS.energy,
            opacity: glowIntensity
        });
        
        // Storage stats
        visual.text('💰 ' + this.formatNumber(energy), pos.x, pos.y + 1.3, {
            color: this.COLORS.energy,
            font: '0.3 monospace',
            align: 'center'
        });
    },
    
    /**
     * Main render function
     */
    render: function(room) {
        var visual = room.visual;
        var colony = Memory.hive.colonies[room.name];
        var state = colony ? colony.state : 'startup';
        var defcon = colony ? colony.defcon : 0;
        
        // Draw border effects first (background layer)
        this.drawBorderEffects(visual, state);
        
        // Draw infrastructure
        this.drawRoads(visual, room);
        this.drawContainers(visual, room);
        this.drawLinks(visual, room);
        this.drawStorage(visual, room);
        this.drawConstructionSites(visual, room);
        
        // Draw main HUD
        this.drawHUD(room);
        
        // Draw DEFCON indicator
        this.drawDefcon(visual, defcon);
        
        // Draw spawn effects
        this.drawSpawnEffects(visual, room);
        
        // Draw source indicators
        this.drawSources(visual, room);
        
        // Draw hostile markers
        this.drawHostiles(visual, room);
        
        // Draw controller info
        this.drawController(visual, room);
        
        // Draw warning banner (top layer)
        this.drawWarningBanner(visual, state);
    }
};

// ============================================================================
// MAIN LOOP
// ============================================================================

module.exports.loop = function() {
    // Initialize memory
    MemoryManager.initialize();
    
    var cpuStart = Game.cpu.getUsed();
    
    // Print welcome message once
    if (!Memory.hive.welcomed) {
        console.log('');
        console.log('<span style="color:#8B00FF">████████████████████████████████████████████████████████████</span>');
        console.log('<span style="color:#8B00FF">█                                                          █</span>');
        console.log('<span style="color:#9932CC">█   🐛  Z E R G   S W A R M   A I   v2.0  🐛              █</span>');
        console.log('<span style="color:#8B00FF">█                                                          █</span>');
        console.log('<span style="color:#DA70D6">█   "The Swarm hungers... The Swarm grows..."              █</span>');
        console.log('<span style="color:#8B00FF">█                                                          █</span>');
        console.log('<span style="color:#8B00FF">████████████████████████████████████████████████████████████</span>');
        console.log('');
        console.log('<span style="color:#00FF00">✅ Hive Mind initialized successfully!</span>');
        console.log('<span style="color:#E6E6FA">📋 Type: require("main").help() for commands</span>');
        console.log('');
        Memory.hive.welcomed = true;
    }
    
    // Process owned rooms
    for (var roomName in Game.rooms) {
        var room = Game.rooms[roomName];
        
        if (room.controller && room.controller.my) {
            // Colony management
            ColonyManager.run(room);
            
            // Spawning
            SpawnManager.run(room);
            
            // Defense
            DefenseManager.run(room);
            
            // Towers
            TowerManager.run(room);
            
            // Energy management
            EnergyManager.run(room);
            
            // Auto construction
            ConstructionManager.run(room);
            
            // Render Zerg visuals
            ZergVisuals.render(room);
        }
    }
    
    // Global expansion management
    ExpansionManager.run();
    
    // Process all creeps
    for (var name in Game.creeps) {
        CreepDispatcher.run(Game.creeps[name]);
    }
    
    // Periodic memory cleanup
    if (Game.time % 500 === 0) {
        MemoryManager.cleanRoomMemory();
    }
    
    // Periodic Zerg messages
    if (Game.time % 1000 === 0) {
        var quote = ZergVisuals.getRandomQuote();
        console.log('<span style="color:#9932CC">🐛 [OVERMIND] "' + quote + '"</span>');
    }
    
    // CPU warning
    var cpuUsed = Game.cpu.getUsed() - cpuStart;
    if (cpuUsed > Game.cpu.limit * 0.9) {
        Utils.log('High CPU usage: ' + cpuUsed.toFixed(2) + '/' + Game.cpu.limit, 'WARN');
    }
    
    // Generate pixels
    if (Game.cpu.bucket >= CONFIG.THRESHOLDS.BUCKET_PIXEL_THRESHOLD && Game.cpu.generatePixel) {
        Game.cpu.generatePixel();
    }
};

// ============================================================================
// CONSOLE COMMANDS
// ============================================================================

module.exports.help = function() {
    console.log('');
    console.log('<span style="color:#8B00FF">════════════════════════════════════════════════════════════</span>');
    console.log('<span style="color:#9932CC">               🐛 ZERG SWARM COMMANDS 🐛</span>');
    console.log('<span style="color:#8B00FF">════════════════════════════════════════════════════════════</span>');
    console.log('');
    console.log('<span style="color:#E6E6FA">require("main").status()         - Show hive status</span>');
    console.log('<span style="color:#E6E6FA">require("main").creeps()         - Show creep counts</span>');
    console.log('<span style="color:#E6E6FA">require("main").infrastructure() - Show roads/containers</span>');
    console.log('<span style="color:#E6E6FA">require("main").memory()         - Show memory report</span>');
    console.log('<span style="color:#E6E6FA">require("main").clean()          - Force memory cleanup</span>');
    console.log('<span style="color:#E6E6FA">require("main").expand(room)     - Add expansion target</span>');
    console.log('<span style="color:#E6E6FA">require("main").remote(room,home)- Add remote mining</span>');
    console.log('<span style="color:#E6E6FA">require("main").settings()       - Show/edit settings</span>');
    console.log('<span style="color:#E6E6FA">require("main").quote()          - Random Zerg quote</span>');
    console.log('<span style="color:#E6E6FA">require("main").reset()          - Reset hive memory</span>');
    console.log('');
    console.log('<span style="color:#8B00FF">════════════════════════════════════════════════════════════</span>');
    console.log('');
};

module.exports.status = function() {
    console.log('');
    console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
    console.log('<span style="color:#9932CC">           🐛 HIVE STATUS 🐛</span>');
    console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
    console.log('');
    
    for (var roomName in Memory.hive.colonies) {
        var colony = Memory.hive.colonies[roomName];
        var room = Game.rooms[roomName];
        var stateColor = ZergVisuals.getStateColor(colony.state);
        
        console.log('<span style="color:#DA70D6">🏠 Colony: ' + roomName + '</span>');
        console.log('<span style="color:' + stateColor + '">   State: ' + colony.state.toUpperCase() + '</span>');
        console.log('<span style="color:#E6E6FA">   DEFCON: ' + colony.defcon + '</span>');
        
        if (room) {
            var rcl = room.controller.level;
            var progress = ((room.controller.progress / room.controller.progressTotal) * 100).toFixed(1);
            console.log('<span style="color:#E6E6FA">   RCL: ' + rcl + ' (' + progress + '%)</span>');
            console.log('<span style="color:#E6E6FA">   Energy: ' + room.energyAvailable + ' / ' + room.energyCapacityAvailable + '</span>');
            if (room.storage) {
                console.log('<span style="color:#E6E6FA">   Stored: ' + ZergVisuals.formatNumber(room.storage.store[RESOURCE_ENERGY]) + '</span>');
            }
        }
        console.log('');
    }
    
    // Remotes
    var remoteCount = Object.keys(Memory.hive.remotes || {}).length;
    if (remoteCount > 0) {
        console.log('<span style="color:#DA70D6">🌍 Remote Mining: ' + remoteCount + ' rooms</span>');
        for (var remote in Memory.hive.remotes) {
            var remoteData = Memory.hive.remotes[remote];
            var status = remoteData.active ? '<span style="color:#00FF00">ACTIVE</span>' : '<span style="color:#FF0000">INACTIVE</span>';
            console.log('<span style="color:#E6E6FA">   ' + remote + ' → ' + remoteData.homeRoom + ' ' + status + '</span>');
        }
        console.log('');
    }
    
    // Expansion targets
    var targets = Memory.hive.expansionTargets || [];
    if (targets.length > 0) {
        console.log('<span style="color:#DA70D6">🎯 Expansion Targets:</span>');
        for (var i = 0; i < targets.length; i++) {
            console.log('<span style="color:#E6E6FA">   ' + (i + 1) + '. ' + targets[i] + '</span>');
        }
        console.log('');
    }
    
    console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
    console.log('');
};

module.exports.creeps = function() {
    var counts = {};
    var roomCounts = {};
    var total = 0;
    
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        var role = creep.memory.role;
        var home = creep.memory.homeRoom;
        
        counts[role] = (counts[role] || 0) + 1;
        
        if (!roomCounts[home]) roomCounts[home] = {};
        roomCounts[home][role] = (roomCounts[home][role] || 0) + 1;
        
        total++;
    }
    
    console.log('');
    console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
    console.log('<span style="color:#9932CC">        👾 SWARM COMPOSITION: ' + total + ' 👾</span>');
    console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
    console.log('');
    
    var icons = {
        larva: '🐛', drone: '🦟', overlord: '🦑', queen: '👑',
        roach: '🪲', zergling: '🐜', hydralisk: '🐍', mutalisk: '🦇',
        infestor: '🦠', ravager: '🦂', swarmHost: '🕷️', defender: '🛡️',
        remoteHarvester: '⛏️', remoteHauler: '🚚', reserver: '📋'
    };
    
    for (var role in counts) {
        var icon = icons[role] || '🐛';
        console.log('<span style="color:#E6E6FA">' + icon + ' ' + role + ': ' + counts[role] + '</span>');
    }
    
    console.log('');
    console.log('<span style="color:#DA70D6">By Colony:</span>');
    for (var roomName in roomCounts) {
        var roomTotal = 0;
        for (var r in roomCounts[roomName]) {
            roomTotal += roomCounts[roomName][r];
        }
        console.log('<span style="color:#E6E6FA">  ' + roomName + ': ' + roomTotal + ' units</span>');
    }
    
    console.log('');
    console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
    console.log('');
};

module.exports.infrastructure = function() {
    console.log('');
    console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
    console.log('<span style="color:#9932CC">        🏗️ INFRASTRUCTURE STATUS 🏗️</span>');
    console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
    console.log('');
    
    for (var roomName in Memory.hive.colonies) {
        var room = Game.rooms[roomName];
        if (!room) continue;
        
        console.log('<span style="color:#DA70D6">🏠 ' + roomName + '</span>');
        
        // Roads
        var roads = room.find(FIND_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_ROAD; }
        });
        var damagedRoads = roads.filter(function(r) { return r.hits < r.hitsMax * 0.5; });
        
        console.log('<span style="color:#E6E6FA">   🛤️ Roads: ' + roads.length + ' (Damaged: ' + damagedRoads.length + ')</span>');
        
        // Containers
        var containers = room.find(FIND_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_CONTAINER; }
        });
        
        console.log('<span style="color:#E6E6FA">   📦 Containers: ' + containers.length + ' / 5</span>');
        
        for (var i = 0; i < containers.length; i++) {
            var container = containers[i];
            var energy = container.store[RESOURCE_ENERGY] || 0;
            var total = container.store.getUsedCapacity();
            var hitsPercent = ((container.hits / container.hitsMax) * 100).toFixed(0);
            var location = '(' + container.pos.x + ',' + container.pos.y + ')';
            
            console.log('<span style="color:#E6E6FA">      ' + location + ': ' + ZergVisuals.formatNumber(total) + ' stored, ' + hitsPercent + '% HP</span>');
        }
        
        // Links
        var links = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_LINK; }
        });
        
        console.log('<span style="color:#E6E6FA">   🔗 Links: ' + links.length + '</span>');
        
        // Construction sites
        var sites = room.find(FIND_CONSTRUCTION_SITES);
        var roadSites = sites.filter(function(s) { return s.structureType === STRUCTURE_ROAD; });
        var containerSites = sites.filter(function(s) { return s.structureType === STRUCTURE_CONTAINER; });
        
        console.log('<span style="color:#E6E6FA">   🏗️ Pending: ' + roadSites.length + ' roads, ' + containerSites.length + ' containers</span>');
        console.log('');
    }
    
    console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
    console.log('');
};

module.exports.memory = function() {
    var MemMgr = require('manager.memory');
    return MemMgr.printMemoryReport();
};

module.exports.clean = function() {
    var MemMgr = require('manager.memory');
    return MemMgr.forceCleanup();
};

module.exports.expand = function(roomName) {
    if (!roomName) {
        console.log('<span style="color:#FF0000">❌ Usage: require("main").expand("W1N1")</span>');
        return;
    }
    
    if (!Memory.hive.expansionTargets) {
        Memory.hive.expansionTargets = [];
    }
    
    if (Memory.hive.expansionTargets.indexOf(roomName) === -1) {
        Memory.hive.expansionTargets.push(roomName);
        console.log('<span style="color:#00FF00">✅ Added expansion target: ' + roomName + '</span>');
    } else {
        console.log('<span style="color:#FFD700">⚠️ ' + roomName + ' is already an expansion target</span>');
    }
};

module.exports.remote = function(roomName, homeRoom) {
    if (!roomName) {
        console.log('<span style="color:#FF0000">❌ Usage: require("main").remote("W1N2", "W1N1")</span>');
        return;
    }
    
    if (!homeRoom) {
        for (var rName in Memory.hive.colonies) {
            homeRoom = rName;
            break;
        }
    }
    
    if (!homeRoom) {
        console.log('<span style="color:#FF0000">❌ No home room specified or found</span>');
        return;
    }
    
    if (!Memory.hive.remotes) {
        Memory.hive.remotes = {};
    }
    
    Memory.hive.remotes[roomName] = {
        homeRoom: homeRoom,
        sources: 1,
        active: true,
        needsReserver: true,
        established: Game.time
    };
    
    console.log('<span style="color:#00FF00">✅ Added remote: ' + roomName + ' → ' + homeRoom + '</span>');
};

module.exports.settings = function() {
    console.log('');
    console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
    console.log('<span style="color:#9932CC">           ⚙️ HIVE SETTINGS ⚙️</span>');
    console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
    console.log('');
    
    var settings = Memory.hive.settings;
    for (var key in settings) {
        var value = settings[key];
        var color = value === true ? '#00FF00' : (value === false ? '#FF0000' : '#E6E6FA');
        console.log('<span style="color:#E6E6FA">' + key + ': </span><span style="color:' + color + '">' + value + '</span>');
    }
    
    console.log('');
    console.log('<span style="color:#DA70D6">To change settings:</span>');
    console.log('<span style="color:#E6E6FA">Memory.hive.settings.autoExpand = false</span>');
    console.log('<span style="color:#E6E6FA">Memory.hive.settings.autoRemote = true</span>');
    console.log('');
    console.log('<span style="color:#9932CC">════════════════════════════════════════════</span>');
    console.log('');
};

module.exports.quote = function() {
    var quote = ZergVisuals.getRandomQuote();
    console.log('');
    console.log('<span style="color:#9932CC">🐛 "' + quote + '" 🐛</span>');
    console.log('');
    return quote;
};

module.exports.reset = function() {
    console.log('<span style="color:#FFD700">⚠️ This will reset all hive memory!</span>');
    console.log('<span style="color:#E6E6FA">To confirm, run: require("main").confirmReset()</span>');
};

module.exports.confirmReset = function() {
    delete Memory.hive;
    console.log('<span style="color:#00FF00">✅ Hive memory has been reset.</span>');
    console.log('<span style="color:#E6E6FA">Memory will be reinitialized on next tick.</span>');
};