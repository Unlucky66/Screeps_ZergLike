/**
 * ██████████████████████████████████████████████████████████████████████████████
 * █                                                                            █
 * █   ███████╗███████╗██████╗  ██████╗     ███████╗██╗    ██╗ █████╗ ██████╗ ███╗   ███╗   █
 * █   ╚══███╔╝██╔════╝██╔══██╗██╔════╝     ██╔════╝██║    ██║██╔══██╗██╔══██╗████╗ ████║   █
 * █     ███╔╝ █████╗  ██████╔╝██║  ███╗    ███████╗██║ █╗ ██║███████║██████╔╝██╔████╔██║   █
 * █    ███╔╝  ██╔══╝  ██╔══██╗██║   ██║    ╚════██║██║███╗██║██╔══██║██╔══██╗██║╚██╔╝██║   █
 * █   ███████╗███████╗██║  ██║╚██████╔╝    ███████║╚███╔███╔╝██║  ██║██║  ██║██║ ╚═╝ ██║   █
 * █   ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝     ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝   █
 * █                                                                            █
 * █   FULLY AUTOMATED HIVE MIND v2.0                                           █
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
var Statistics = require('manager.statistics');

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
        "The Swarm remembers."
    ],
    
    // State-specific messages
    STATE_MESSAGES: {
        emergency: [
            "⚠️ CRITICAL: Larvae depleted!",
            "🆘 Hive threatened!",
            "⚡ Emergency protocols active!",
            "🔴 Spawning pool compromised!"
        ],
        startup: [
            "🥚 New hive establishing...",
            "🌱 The infestation begins...",
            "🏗️ Building the hive cluster...",
            "📈 Growth phase initiated..."
        ],
        developing: [
            "🔬 Evolution in progress...",
            "🧬 Adapting to environment...",
            "📊 Biomass increasing...",
            "🌿 Creep spreading..."
        ],
        stable: [
            "✅ Hive operating normally.",
            "⚖️ Balance achieved.",
            "🔄 Resources flowing.",
            "💚 The Swarm is content."
        ],
        thriving: [
            "👑 The Swarm prospers!",
            "💪 Maximum efficiency!",
            "🌟 Evolution complete!",
            "🏆 Dominance assured!"
        ],
        recovering: [
            "🔧 Regenerating biomass...",
            "💉 Healing in progress...",
            "🔄 Recovery protocols...",
            "📉 Rebuilding reserves..."
        ],
        defense: [
            "⚔️ Hostiles detected!",
            "🛡️ Defending the hive!",
            "🎯 Engaging enemies!",
            "💀 Destroy the intruders!"
        ],
        critical: [
            "🚨 HIVE UNDER ATTACK!",
            "☠️ CRITICAL THREAT!",
            "🔥 ALL UNITS DEFEND!",
            "⚠️ SAFE MODE IMMINENT!"
        ]
    },
    
    // Zerg symbols for different states
    SYMBOLS: {
        hive: '🐛',
        drone: '🦟',
        overlord: '🦑',
        queen: '👑',
        zergling: '🐜',
        hydralisk: '🐍',
        mutalisk: '🦇',
        roach: '🪲',
        infestor: '🦠',
        ravager: '🦂',
        swarmHost: '🕷️',
        defender: '🛡️',
        energy: '⚡',
        minerals: '💎',
        attack: '⚔️',
        defend: '🛡️',
        creep: '💜',
        evolution: '🧬',
        warning: '⚠️',
        danger: '☠️',
        success: '✅',
        building: '🏗️'
    },
    
    // Colors for different states
    COLORS: {
        primary: '#8B00FF',      // Purple (Zerg primary)
        secondary: '#4B0082',    // Indigo
        accent: '#9932CC',       // Dark orchid
        creep: '#551A8B',        // Purple4
        warning: '#FFD700',      // Gold
        danger: '#FF0000',       // Red
        success: '#00FF00',      // Green
        energy: '#FFFF00',       // Yellow
        text: '#E6E6FA',         // Lavender
        dark: '#1A0033',         // Very dark purple
        glow: '#DA70D6'          // Orchid (for glow effects)
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
     * Draw main hive HUD
     */
    drawHiveHUD: function(room) {
        var visual = room.visual;
        var colony = Memory.hive.colonies[room.name];
        var state = colony ? colony.state : 'startup';
        var defcon = colony ? colony.defcon : 0;
        
        // Get room stats
        var controller = room.controller;
        var rcl = controller.level;
        var progress = ((controller.progress / controller.progressTotal) * 100).toFixed(1);
        var energy = room.energyAvailable;
        var capacity = room.energyCapacityAvailable;
        var stored = room.storage ? room.storage.store[RESOURCE_ENERGY] : 0;
        var creepCount = _.filter(Game.creeps, function(c) {
            return c.memory.homeRoom === room.name;
        }).length;
        var sites = room.find(FIND_CONSTRUCTION_SITES).length;
        
        // Calculate positions
        var hudX = 0.5;
        var hudY = 0.5;
        var hudWidth = 14;
        var hudHeight = 10;
        
        // Draw background with glow effect
        this.drawGlowingPanel(visual, hudX, hudY, hudWidth, hudHeight, state);
        
        // Draw title
        this.drawTitle(visual, hudX, hudY, hudWidth, state);
        
        // Draw stats
        var statsY = hudY + 2;
        this.drawStats(visual, hudX + 0.5, statsY, {
            room: room.name,
            state: state,
            rcl: rcl,
            progress: progress,
            energy: energy,
            capacity: capacity,
            stored: stored,
            creeps: creepCount,
            sites: sites,
            defcon: defcon
        });
        
        // Draw quote
        this.drawQuote(visual, hudX + hudWidth / 2, hudY + hudHeight - 0.5, state);
        
        // Draw creep visualization
        this.drawCreepOverview(visual, hudX + hudWidth + 0.5, hudY, room);
        
        // Draw state-specific effects
        this.drawStateEffects(visual, room, state, defcon);
        
        // Draw border decorations
        this.drawZergDecorations(visual, room, state);
    },
    
    /**
     * Draw glowing panel background
     */
    drawGlowingPanel: function(visual, x, y, width, height, state) {
        var glowColor = this.COLORS.primary;
        
        // Adjust glow color based on state
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
            opacity: 0.1,
            stroke: glowColor,
            strokeWidth: 0.1
        });
        
        // Main background
        visual.rect(x, y, width, height, {
            fill: this.COLORS.dark,
            opacity: 0.85,
            stroke: this.COLORS.primary,
            strokeWidth: 0.05
        });
        
        // Inner border
        visual.rect(x + 0.1, y + 0.1, width - 0.2, height - 0.2, {
            fill: 'transparent',
            stroke: this.COLORS.secondary,
            strokeWidth: 0.02,
            opacity: 0.5
        });
    },
    
    /**
     * Draw title section
     */
    drawTitle: function(visual, x, y, width, state) {
        var titleY = y + 0.8;
        
        // Title background bar
        visual.rect(x, y, width, 1.5, {
            fill: this.COLORS.secondary,
            opacity: 0.6
        });
        
        // Main title
        visual.text(this.SYMBOLS.hive + ' ZERG HIVE MIND ' + this.SYMBOLS.hive, x + width / 2, titleY, {
            color: this.COLORS.glow,
            font: 'bold 0.8 monospace',
            align: 'center',
            stroke: this.COLORS.primary,
            strokeWidth: 0.03
        });
        
        // Subtitle with state
        var stateColor = this.getStateColor(state);
        visual.text('[ ' + state.toUpperCase() + ' ]', x + width / 2, titleY + 0.6, {
            color: stateColor,
            font: '0.4 monospace',
            align: 'center'
        });
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
                return this.COLORS.success;
            case 'stable':
                return this.COLORS.success;
            default:
                return this.COLORS.text;
        }
    },
    
    /**
     * Draw statistics
     */
    drawStats: function(visual, x, y, stats) {
        var lineHeight = 0.7;
        var labelX = x;
        var valueX = x + 7;
        var currentY = y;
        
        var lines = [
            { label: '🏠 Hive:', value: stats.room, color: this.COLORS.text },
            { label: '📊 Status:', value: stats.state.toUpperCase(), color: this.getStateColor(stats.state) },
            { label: '🎮 RCL:', value: stats.rcl + ' (' + stats.progress + '%)', color: this.COLORS.energy },
            { label: '⚡ Energy:', value: stats.energy + '/' + stats.capacity, color: this.COLORS.energy },
            { label: '💰 Stored:', value: this.formatNumber(stats.stored), color: this.COLORS.energy },
            { label: '👾 Creeps:', value: stats.creeps, color: this.COLORS.text },
            { label: '🏗️ Sites:', value: stats.sites, color: this.COLORS.text },
            { label: '🛡️ DEFCON:', value: stats.defcon, color: stats.defcon > 0 ? this.COLORS.danger : this.COLORS.success }
        ];
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            
            // Label
            visual.text(line.label, labelX, currentY, {
                color: this.COLORS.accent,
                font: '0.45 monospace',
                align: 'left'
            });
            
            // Value
            visual.text(String(line.value), valueX, currentY, {
                color: line.color,
                font: 'bold 0.45 monospace',
                align: 'left'
            });
            
            currentY += lineHeight;
        }
        
        // CPU usage
        currentY += 0.2;
        var cpuUsed = Game.cpu.getUsed();
        var cpuLimit = Game.cpu.limit;
        var cpuPercent = ((cpuUsed / cpuLimit) * 100).toFixed(1);
        var cpuColor = cpuPercent > 80 ? this.COLORS.danger : (cpuPercent > 50 ? this.COLORS.warning : this.COLORS.success);
        
        visual.text('💻 CPU:', labelX, currentY, {
            color: this.COLORS.accent,
            font: '0.45 monospace',
            align: 'left'
        });
        
        visual.text(cpuUsed.toFixed(1) + '/' + cpuLimit + ' (' + cpuPercent + '%)', valueX, currentY, {
            color: cpuColor,
            font: 'bold 0.45 monospace',
            align: 'left'
        });
        
        // Bucket
        currentY += lineHeight;
        var bucket = Game.cpu.bucket;
        var bucketColor = bucket > 9000 ? this.COLORS.success : (bucket > 5000 ? this.COLORS.warning : this.COLORS.danger);
        
        visual.text('🪣 Bucket:', labelX, currentY, {
            color: this.COLORS.accent,
            font: '0.45 monospace',
            align: 'left'
        });
        
        visual.text(bucket + '/10000', valueX, currentY, {
            color: bucketColor,
            font: 'bold 0.45 monospace',
            align: 'left'
        });
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
     * Draw quote section
     */
    drawQuote: function(visual, x, y, state) {
        // Get quote based on time (changes every 100 ticks)
        var quoteIndex = Math.floor(Game.time / 100) % this.QUOTES.length;
        var quote = this.QUOTES[quoteIndex];
        
        // Or use state message sometimes
        if (Game.time % 200 < 100) {
            quote = this.getStateMessage(state);
        }
        
        visual.text('"' + quote + '"', x, y, {
            color: this.COLORS.glow,
            font: 'italic 0.4 monospace',
            align: 'center',
            opacity: 0.8
        });
    },
    
    /**
     * Draw creep overview panel
     */
    drawCreepOverview: function(visual, x, y, room) {
        var creeps = _.filter(Game.creeps, function(c) {
            return c.memory.homeRoom === room.name;
        });
        
        // Count by role
        var roleCounts = {};
        for (var i = 0; i < creeps.length; i++) {
            var role = creeps[i].memory.role;
            roleCounts[role] = (roleCounts[role] || 0) + 1;
        }
        
        // Panel dimensions
        var panelWidth = 8;
        var panelHeight = 6;
        
        // Draw panel
        visual.rect(x, y, panelWidth, panelHeight, {
            fill: this.COLORS.dark,
            opacity: 0.8,
            stroke: this.COLORS.secondary,
            strokeWidth: 0.03
        });
        
        // Title
        visual.text('👾 SWARM UNITS', x + panelWidth / 2, y + 0.6, {
            color: this.COLORS.glow,
            font: 'bold 0.5 monospace',
            align: 'center'
        });
        
        // Role icons and counts
        var roles = [
            { role: 'drone', icon: '🦟', name: 'Drones' },
            { role: 'overlord', icon: '🦑', name: 'Overlords' },
            { role: 'queen', icon: '👑', name: 'Queens' },
            { role: 'roach', icon: '🪲', name: 'Roaches' },
            { role: 'zergling', icon: '🐜', name: 'Zerglings' },
            { role: 'hydralisk', icon: '🐍', name: 'Hydralisks' },
            { role: 'mutalisk', icon: '🦇', name: 'Mutalisks' },
            { role: 'infestor', icon: '🦠', name: 'Infestors' }
        ];
        
        var col1X = x + 0.3;
        var col2X = x + panelWidth / 2 + 0.3;
        var startY = y + 1.2;
        var lineHeight = 0.55;
        
        for (var j = 0; j < roles.length; j++) {
            var roleData = roles[j];
            var count = roleCounts[roleData.role] || 0;
            var posX = j < 4 ? col1X : col2X;
            var posY = startY + (j % 4) * lineHeight;
            
            var countColor = count > 0 ? this.COLORS.success : this.COLORS.text;
            
            visual.text(roleData.icon + ' ' + count, posX, posY, {
                color: countColor,
                font: '0.4 monospace',
                align: 'left'
            });
        }
        
        // Total
        var totalY = startY + 4 * lineHeight + 0.3;
        visual.text('Total: ' + creeps.length + ' units', x + panelWidth / 2, totalY, {
            color: this.COLORS.accent,
            font: 'bold 0.45 monospace',
            align: 'center'
        });
    },
    
    /**
     * Draw state-specific effects
     */
    drawStateEffects: function(visual, room, state, defcon) {
        switch (state) {
            case 'critical':
                this.drawAlertEffect(visual, room, this.COLORS.danger);
                this.drawWarningBanner(visual, '☠️ CRITICAL THREAT DETECTED ☠️', this.COLORS.danger);
                break;
                
            case 'defense':
                this.drawAlertEffect(visual, room, this.COLORS.warning);
                this.drawWarningBanner(visual, '⚔️ HOSTILES IN HIVE CLUSTER ⚔️', this.COLORS.warning);
                break;
                
            case 'emergency':
                this.drawPulseEffect(visual, room, this.COLORS.warning);
                this.drawWarningBanner(visual, '⚠️ EMERGENCY PROTOCOLS ACTIVE ⚠️', this.COLORS.warning);
                break;
                
            case 'thriving':
                this.drawGlowEffect(visual, room, this.COLORS.success);
                break;
        }
        
        // DEFCON indicator
        if (defcon > 0) {
            this.drawDefconIndicator(visual, defcon);
        }
    },
    
    /**
     * Draw alert effect (flashing border)
     */
    drawAlertEffect: function(visual, room, color) {
        var flash = Math.sin(Game.time * 0.5) > 0;
        if (flash) {
            visual.rect(0, 0, 50, 50, {
                fill: 'transparent',
                stroke: color,
                strokeWidth: 0.2,
                opacity: 0.8
            });
        }
    },
    
    /**
     * Draw pulse effect
     */
    drawPulseEffect: function(visual, room, color) {
        var pulse = (Math.sin(Game.time * 0.2) + 1) / 2;
        visual.rect(0, 0, 50, 50, {
            fill: color,
            opacity: pulse * 0.05
        });
    },
    
    /**
     * Draw glow effect
     */
    drawGlowEffect: function(visual, room, color) {
        // Subtle ambient glow for thriving state
        visual.rect(0, 0, 50, 50, {
            fill: color,
            opacity: 0.02
        });
    },
    
    /**
     * Draw warning banner
     */
    drawWarningBanner: function(visual, message, color) {
        var y = 48;
        
        visual.rect(0, y - 0.8, 50, 1.6, {
            fill: this.COLORS.dark,
            opacity: 0.9
        });
        
        visual.text(message, 25, y, {
            color: color,
            font: 'bold 0.7 monospace',
            align: 'center',
            stroke: '#000',
            strokeWidth: 0.05
        });
    },
    
    /**
     * Draw DEFCON indicator
     */
    drawDefconIndicator: function(visual, defcon) {
        var x = 45;
        var y = 2;
        var colors = ['#00ff00', '#ffff00', '#ffaa00', '#ff5500', '#ff0000', '#ff00ff'];
        var color = colors[defcon] || colors[5];
        
        // Background
        visual.rect(x - 2, y - 0.8, 4, 1.6, {
            fill: this.COLORS.dark,
            opacity: 0.9,
            stroke: color,
            strokeWidth: 0.05
        });
        
        // Text
        visual.text('DEFCON', x, y - 0.2, {
            color: color,
            font: 'bold 0.4 monospace',
            align: 'center'
        });
        
        visual.text(String(defcon), x, y + 0.5, {
            color: color,
            font: 'bold 0.8 monospace',
            align: 'center'
        });
    },
    
    /**
     * Draw Zerg decorations
     */
    drawZergDecorations: function(visual, room, state) {
        // Corner decorations
        this.drawCornerDecoration(visual, 0, 0, 1, 1);           // Top-left
        this.drawCornerDecoration(visual, 50, 0, -1, 1);         // Top-right
        this.drawCornerDecoration(visual, 0, 50, 1, -1);         // Bottom-left
        this.drawCornerDecoration(visual, 50, 50, -1, -1);       // Bottom-right
        
        // Draw creep spread effect around structures
        if (state === 'thriving' || state === 'stable') {
            this.drawCreepSpread(visual, room);
        }
        
        // Draw spawn egg effect
        this.drawSpawnEffects(visual, room);
        
        // Draw source markers
        this.drawSourceMarkers(visual, room);
    },
    
    /**
     * Draw corner decoration
     */
    drawCornerDecoration: function(visual, x, y, dirX, dirY) {
        var size = 3;
        var color = this.COLORS.primary;
        
        // Draw organic-looking corner
        visual.line(x, y, x + size * dirX, y, {
            color: color,
            width: 0.1,
            opacity: 0.6
        });
        
        visual.line(x, y, x, y + size * dirY, {
            color: color,
            width: 0.1,
            opacity: 0.6
        });
        
        // Add small circle at corner
        visual.circle(x + 0.3 * dirX, y + 0.3 * dirY, {
            radius: 0.15,
            fill: color,
            opacity: 0.5
        });
    },
    
    /**
     * Draw creep spread effect
     */
    drawCreepSpread: function(visual, room) {
        var spawns = room.find(FIND_MY_SPAWNS);
        
        for (var i = 0; i < spawns.length; i++) {
            var spawn = spawns[i];
            var pos = spawn.pos;
            
            // Draw organic spread around spawn
            for (var r = 2; r <= 5; r++) {
                var opacity = 0.1 - (r * 0.015);
                if (opacity > 0) {
                    visual.circle(pos.x, pos.y, {
                        radius: r,
                        fill: this.COLORS.creep,
                        opacity: opacity
                    });
                }
            }
        }
    },
    
    /**
     * Draw spawn effects
     */
    drawSpawnEffects: function(visual, room) {
        var spawns = room.find(FIND_MY_SPAWNS);
        
        for (var i = 0; i < spawns.length; i++) {
            var spawn = spawns[i];
            
            if (spawn.spawning) {
                var pos = spawn.pos;
                var progress = (spawn.spawning.needTime - spawn.spawning.remainingTime) / spawn.spawning.needTime;
                
                // Pulsing effect
                var pulse = (Math.sin(Game.time * 0.3) + 1) / 2;
                
                // Egg glow
                visual.circle(pos.x, pos.y, {
                    radius: 0.8 + pulse * 0.2,
                    fill: this.COLORS.glow,
                    opacity: 0.3 + pulse * 0.2
                });
                
                // Progress ring
                visual.circle(pos.x, pos.y, {
                    radius: 1.2,
                    fill: 'transparent',
                    stroke: this.COLORS.success,
                    strokeWidth: 0.1,
                    opacity: progress
                });
                
                // Spawning text
                var creepName = spawn.spawning.name.split('_')[0];
                visual.text('🥚 ' + creepName, pos.x, pos.y - 1.5, {
                    color: this.COLORS.glow,
                    font: '0.4 monospace',
                    align: 'center'
                });
                
                visual.text((progress * 100).toFixed(0) + '%', pos.x, pos.y + 1.5, {
                    color: this.COLORS.success,
                    font: 'bold 0.4 monospace',
                    align: 'center'
                });
            } else {
                // Idle spawn - subtle glow
                visual.circle(spawn.pos.x, spawn.pos.y, {
                    radius: 0.6,
                    fill: this.COLORS.primary,
                    opacity: 0.2
                });
            }
        }
    },
    
    /**
     * Draw source markers
     */
    drawSourceMarkers: function(visual, room) {
        var sources = room.find(FIND_SOURCES);
        
        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];
            var pos = source.pos;
            var energyPercent = source.energy / source.energyCapacity;
            
            // Color based on energy
            var color = energyPercent > 0.5 ? this.COLORS.success : 
                       (energyPercent > 0 ? this.COLORS.warning : this.COLORS.danger);
            
            // Draw resource indicator
            visual.circle(pos.x, pos.y, {
                radius: 0.5,
                fill: 'transparent',
                stroke: color,
                strokeWidth: 0.08,
                opacity: 0.6
            });
            
            // Energy text
            if (energyPercent > 0) {
                visual.text((energyPercent * 100).toFixed(0) + '%', pos.x, pos.y + 1, {
                    color: color,
                    font: '0.3 monospace',
                    align: 'center',
                    opacity: 0.8
                });
            } else {
                visual.text('⏳', pos.x, pos.y + 1, {
                    font: '0.4',
                    align: 'center',
                    opacity: 0.6
                });
            }
        }
    },
    
    /**
     * Draw hostile markers
     */
    drawHostileMarkers: function(visual, room) {
        var hostiles = room.find(FIND_HOSTILE_CREEPS);
        
        for (var i = 0; i < hostiles.length; i++) {
            var hostile = hostiles[i];
            var pos = hostile.pos;
            
            // Danger circle
            visual.circle(pos.x, pos.y, {
                radius: 0.8,
                fill: this.COLORS.danger,
                opacity: 0.3
            });
            
            // Skull marker
            visual.text('☠️', pos.x, pos.y, {
                font: '0.6',
                align: 'center'
            });
            
            // Owner name
            visual.text(hostile.owner.username, pos.x, pos.y - 1.2, {
                color: this.COLORS.danger,
                font: '0.3 monospace',
                align: 'center',
                opacity: 0.8
            });
        }
    },
    
    /**
     * Draw controller progress
     */
    drawControllerProgress: function(visual, room) {
        var controller = room.controller;
        if (!controller || !controller.my) return;
        
        var pos = controller.pos;
        var progress = controller.progress / controller.progressTotal;
        
        // Progress bar background
        var barWidth = 3;
        var barHeight = 0.3;
        var barX = pos.x - barWidth / 2;
        var barY = pos.y - 2;
        
        visual.rect(barX, barY, barWidth, barHeight, {
            fill: this.COLORS.dark,
            opacity: 0.8,
            stroke: this.COLORS.primary,
            strokeWidth: 0.02
        });
        
        // Progress bar fill
        visual.rect(barX, barY, barWidth * progress, barHeight, {
            fill: this.COLORS.success,
            opacity: 0.8
        });
        
        // RCL text
        visual.text('RCL ' + controller.level, pos.x, pos.y - 2.5, {
            color: this.COLORS.glow,
            font: 'bold 0.4 monospace',
            align: 'center'
        });
    },
    
    /**
     * Main render function
     */
    render: function(room) {
        // Draw main HUD
        this.drawHiveHUD(room);
        
        // Draw hostile markers
        this.drawHostileMarkers(room.visual, room);
        
        // Draw controller progress
        this.drawControllerProgress(room.visual, room);
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
        console.log('<span style="color:#E6E6FA">📋 Colonies: ' + Object.keys(Memory.hive.colonies).length + '</span>');
        console.log('<span style="color:#E6E6FA">👾 Creeps: ' + Object.keys(Game.creeps).length + '</span>');
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
    
    // Statistics
    Statistics.run();
    
    // Periodic Zerg messages
    if (Game.time % 500 === 0) {
        var quote = ZergVisuals.getRandomQuote();
        console.log('<span style="color:#9932CC">🐛 [HIVE MIND] ' + quote + '</span>');
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

/**
 * Console commands for manual control
 * Usage: require('main').command()
 */

module.exports.help = function() {
    console.log('');
    console.log('<span style="color:#8B00FF">════════════════════════════════════════════════════════════</span>');
    console.log('<span style="color:#9932CC">                  🐛 ZERG SWARM COMMANDS 🐛</span>');
    console.log('<span style="color:#8B00FF">════════════════════════════════════════════════════════════</span>');
    console.log('');
    console.log('<span style="color:#E6E6FA">require("main").status()       - Show hive status</span>');
    console.log('<span style="color:#E6E6FA">require("main").creeps()       - Show creep counts</span>');
    console.log('<span style="color:#E6E6FA">require("main").memory()       - Show memory report</span>');
    console.log('<span style="color:#E6E6FA">require("main").clean()        - Force memory cleanup</span>');
    console.log('<span style="color:#E6E6FA">require("main").expand(room)   - Add expansion target</span>');
    console.log('<span style="color:#E6E6FA">require("main").remote(room)   - Add remote mining target</span>');
    console.log('<span style="color:#E6E6FA">require("main").settings()     - Show/edit settings</span>');
    console.log('<span style="color:#E6E6FA">require("main").quote()        - Random Zerg quote</span>');
    console.log('');
    console.log('<span style="color:#8B00FF">════════════════════════════════════════════════════════════</span>');
    console.log('');
};

module.exports.status = function() {
    console.log('');
    console.log('<span style="color:#9932CC">🐛 HIVE STATUS 🐛</span>');
    console.log('');
    
    for (var roomName in Memory.hive.colonies) {
        var colony = Memory.hive.colonies[roomName];
        var room = Game.rooms[roomName];
        var stateColor = ZergVisuals.getStateColor(colony.state);
        
        console.log('<span style="color:#E6E6FA">Colony: ' + roomName + '</span>');
        console.log('<span style="color:' + stateColor + '">  State: ' + colony.state.toUpperCase() + '</span>');
        console.log('<span style="color:#E6E6FA">  DEFCON: ' + colony.defcon + '</span>');
        
        if (room) {
            console.log('<span style="color:#E6E6FA">  RCL: ' + room.controller.level + '</span>');
            console.log('<span style="color:#E6E6FA">  Energy: ' + room.energyAvailable + '/' + room.energyCapacityAvailable + '</span>');
        }
        console.log('');
    }
};

module.exports.creeps = function() {
    var counts = {};
    var total = 0;
    
    for (var name in Game.creeps) {
        var role = Game.creeps[name].memory.role;
        counts[role] = (counts[role] || 0) + 1;
        total++;
    }
    
    console.log('');
    console.log('<span style="color:#9932CC">👾 SWARM UNITS: ' + total + ' 👾</span>');
    console.log('');
    
    for (var role in counts) {
        var icon = ZergVisuals.SYMBOLS[role] || '🐛';
        console.log('<span style="color:#E6E6FA">' + icon + ' ' + role + ': ' + counts[role] + '</span>');
    }
    console.log('');
};

module.exports.memory = function() {
    var MemMgr = require('manager.memory');
    MemMgr.printMemoryReport();
};

module.exports.clean = function() {
    var MemMgr = require('manager.memory');
    MemMgr.forceCleanup();
};

module.exports.expand = function(roomName) {
    if (!roomName) {
        console.log('<span style="color:#FF0000">Usage: require("main").expand("W1N1")</span>');
        return;
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
        console.log('<span style="color:#FF0000">Usage: require("main").remote("W1N2", "W1N1")</span>');
        return;
    }
    
    if (!homeRoom) {
        // Try to find closest owned room
        for (var rName in Memory.hive.colonies) {
            homeRoom = rName;
            break;
        }
    }
    
    if (!homeRoom) {
        console.log('<span style="color:#FF0000">No home room specified or found</span>');
        return;
    }
    
    Memory.hive.remotes[roomName] = {
        homeRoom: homeRoom,
        sources: 1,
        active: true,
        needsReserver: true,
        established: Game.time
    };
    
    console.log('<span style="color:#00FF00">✅ Added remote: ' + roomName + ' (home: ' + homeRoom + ')</span>');
};

module.exports.settings = function() {
    console.log('');
    console.log('<span style="color:#9932CC">⚙️ HIVE SETTINGS ⚙️</span>');
    console.log('');
    
    var settings = Memory.hive.settings;
    for (var key in settings) {
        var value = settings[key];
        var color = value ? '#00FF00' : '#FF0000';
        console.log('<span style="color:#E6E6FA">' + key + ': </span><span style="color:' + color + '">' + value + '</span>');
    }
    console.log('');
    console.log('<span style="color:#E6E6FA">To change: Memory.hive.settings.autoExpand = false</span>');
    console.log('');
};

module.exports.quote = function() {
    var quote = ZergVisuals.getRandomQuote();
    console.log('');
    console.log('<span style="color:#9932CC">🐛 "' + quote + '" 🐛</span>');
    console.log('');
};
