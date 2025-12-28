/**
 * Utility Functions
 */

var CONFIG = require('config');
var CacheManager = require('cache');

var Utils = {
    log: function(message, level) {
        level = level || 'INFO';
        var colors = {
            'DEBUG': '#888888',
            'INFO': '#ffffff',
            'WARN': '#ffaa00',
            'ERROR': '#ff0000',
            'SUCCESS': '#00ff00',
            'COMBAT': '#ff00ff'
        };
        var icons = {
            'DEBUG': '🔍',
            'INFO': '📋',
            'WARN': '⚠️',
            'ERROR': '❌',
            'SUCCESS': '✅',
            'COMBAT': '⚔️'
        };
        console.log('<span style="color:' + colors[level] + '">' + icons[level] + ' [' + Game.time + '] ' + message + '</span>');
    },
    
    getBody: function(role, energy, rcl) {
        rcl = rcl || 8;
        var templates = {
            larva: {
                base: [WORK, CARRY, MOVE],
                repeat: [WORK, CARRY, MOVE],
                maxParts: 9
            },
            drone: {
                base: [WORK, WORK, MOVE],
                repeat: [WORK],
                maxParts: 7
            },
            overlord: {
                base: [CARRY, CARRY, MOVE],
                repeat: [CARRY, CARRY, MOVE],
                maxParts: 30
            },
            queen: {
                base: [WORK, CARRY, MOVE],
                repeat: [WORK, CARRY, MOVE],
                maxParts: 30
            },
            roach: {
                base: [WORK, CARRY, MOVE, MOVE],
                repeat: [WORK, CARRY, MOVE],
                maxParts: 30
            },
            zergling: {
                base: [TOUGH, ATTACK, MOVE, MOVE],
                repeat: [ATTACK, MOVE],
                maxParts: 20
            },
            hydralisk: {
                base: [RANGED_ATTACK, MOVE],
                repeat: [RANGED_ATTACK, MOVE],
                maxParts: 20
            },
            infestor: {
                base: [HEAL, MOVE],
                repeat: [HEAL, MOVE],
                maxParts: 20
            },
            mutalisk: {
                base: [MOVE, MOVE, MOVE, MOVE, MOVE],
                repeat: [MOVE],
                maxParts: 10
            },
            swarmHost: {
                base: [CLAIM, MOVE],
                repeat: [MOVE],
                maxParts: 5
            },
            ravager: {
                base: [TOUGH, TOUGH, WORK, MOVE, MOVE, MOVE],
                repeat: [WORK, MOVE],
                maxParts: 20
            },
            defender: {
                base: [TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE],
                repeat: [ATTACK, MOVE],
                maxParts: 24
            },
            remoteHarvester: {
                base: [WORK, WORK, CARRY, MOVE, MOVE, MOVE],
                repeat: [WORK, CARRY, MOVE],
                maxParts: 15
            },
            remoteHauler: {
                base: [CARRY, CARRY, MOVE, MOVE],
                repeat: [CARRY, CARRY, MOVE, MOVE],
                maxParts: 32
            },
            reserver: {
                base: [CLAIM, CLAIM, MOVE, MOVE],
                repeat: [],
                maxParts: 4
            }
        };
        
        var template = templates[role] || templates.larva;
        var body = template.base.slice();
        var cost = this.getBodyCost(body);
        
        while (template.repeat.length > 0 &&
               cost + this.getBodyCost(template.repeat) <= energy &&
               body.length + template.repeat.length <= template.maxParts) {
            body = body.concat(template.repeat);
            cost = this.getBodyCost(body);
        }
        
        return this.sortBody(body);
    },
    
    getBodyCost: function(body) {
        var costs = {};
        costs[MOVE] = 50;
        costs[WORK] = 100;
        costs[CARRY] = 50;
        costs[ATTACK] = 80;
        costs[RANGED_ATTACK] = 150;
        costs[HEAL] = 250;
        costs[CLAIM] = 600;
        costs[TOUGH] = 10;
        
        var total = 0;
        for (var i = 0; i < body.length; i++) {
            total += costs[body[i]] || 0;
        }
        return total;
    },
    
    sortBody: function(body) {
        var order = [TOUGH, WORK, CARRY, CLAIM, ATTACK, RANGED_ATTACK, HEAL, MOVE];
        return body.sort(function(a, b) {
            return order.indexOf(a) - order.indexOf(b);
        });
    },
    
    getThreatLevel: function(room) {
        if (!room) return 0;
        
        var cacheKey = 'threat_' + room.name;
        var cached = CacheManager.get(cacheKey, 5);
        if (cached !== null) return cached;
        
        var hostiles = room.find(FIND_HOSTILE_CREEPS);
        var threat = 0;
        var self = this;
        
        for (var i = 0; i < hostiles.length; i++) {
            var creep = hostiles[i];
            if (self.isAlly(creep.owner.username)) continue;
            
            threat += creep.getActiveBodyparts(ATTACK) * 80;
            threat += creep.getActiveBodyparts(RANGED_ATTACK) * 150;
            threat += creep.getActiveBodyparts(HEAL) * 250;
            threat += creep.getActiveBodyparts(WORK) * 50;
            threat += creep.getActiveBodyparts(CLAIM) * 100;
        }
        
        var towers = room.find(FIND_HOSTILE_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_TOWER; }
        });
        threat += towers.length * 600;
        
        return CacheManager.set(cacheKey, threat);
    },
    
    isAlly: function(username) {
        var allies = ['Screeps', 'Invader'];
        return allies.indexOf(username) !== -1;
    },
    
    smartMove: function(creep, target, range, opts) {
        range = range || 1;
        opts = opts || {};
        
        if (!target) return ERR_INVALID_TARGET;
        
        var targetPos = target.pos || target;
        var currentRange = creep.pos.getRangeTo(targetPos);
        
        if (currentRange <= range) return OK;
        if (creep.fatigue > 0) return ERR_TIRED;
        
        if (!creep.memory._move) {
            creep.memory._move = { lastPos: null, stuck: 0 };
        }
        
        var posKey = creep.pos.x + ',' + creep.pos.y;
        if (creep.memory._move.lastPos === posKey) {
            creep.memory._move.stuck++;
        } else {
            creep.memory._move.stuck = 0;
            creep.memory._move.lastPos = posKey;
        }
        
        if (creep.memory._move.stuck >= CONFIG.PERFORMANCE.STUCK_THRESHOLD) {
            var adjacentCreeps = creep.pos.findInRange(FIND_MY_CREEPS, 1, {
                filter: function(c) { return c.id !== creep.id && !c.fatigue; }
            });
            
            if (adjacentCreeps.length > 0) {
                var adjacentCreep = adjacentCreeps[0];
                var dir = adjacentCreep.pos.getDirectionTo(creep);
                adjacentCreep.move(dir);
            }
            
            creep.memory._move.stuck = 0;
        }
        
        var moveOpts = {
            reusePath: CONFIG.PERFORMANCE.PATH_REUSE,
            range: range,
            visualizePathStyle: {
                stroke: opts.stroke || '#ffaa00',
                lineStyle: 'dashed',
                opacity: 0.3
            },
            maxRooms: opts.maxRooms || 16
        };
        
        return creep.moveTo(targetPos, moveOpts);
    },
    
    getRoomType: function(roomName) {
        var parsed = this.parseRoomName(roomName);
        if (!parsed) return 'normal';
        
        var x = parsed.x;
        var y = parsed.y;
        
        if (x % 10 === 0 || y % 10 === 0) return 'highway';
        
        if ((x % 10 >= 4 && x % 10 <= 6) && (y % 10 >= 4 && y % 10 <= 6)) {
            if (x % 10 === 5 && y % 10 === 5) return 'center';
            return 'sourceKeeper';
        }
        
        return 'normal';
    },
    
    parseRoomName: function(roomName) {
        var match = roomName.match(/^([WE])(\d+)([NS])(\d+)$/);
        if (!match) return null;
        
        var x = parseInt(match[2]);
        var y = parseInt(match[4]);
        
        if (match[1] === 'W') x = -x - 1;
        if (match[3] === 'N') y = -y - 1;
        
        return { 
            x: Math.abs(x % 10), 
            y: Math.abs(y % 10), 
            wx: x, 
            wy: y 
        };
    },
    
    getRoomDistance: function(room1, room2) {
        var pos1 = this.parseRoomName(room1);
        var pos2 = this.parseRoomName(room2);
        if (!pos1 || !pos2) return Infinity;
        
        return Math.abs(pos1.wx - pos2.wx) + Math.abs(pos1.wy - pos2.wy);
    }
};

module.exports = Utils;