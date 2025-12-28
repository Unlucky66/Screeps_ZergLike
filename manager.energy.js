/**
 * Energy Manager
 */

var CONFIG = require('config');

var EnergyManager = {
    run: function(room) {
        this.manageLinks(room);
        this.manageTerminal(room);
    },
    
    manageLinks: function(room) {
        var links = room.find(FIND_MY_STRUCTURES, {
            filter: function(s) { return s.structureType === STRUCTURE_LINK; }
        });
        
        if (links.length < 2) return;
        
        var sourceLinks = [];
        var sinkLinks = [];
        var sources = room.find(FIND_SOURCES);
        
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            var nearSource = link.pos.findInRange(sources, 2).length > 0;
            var nearController = link.pos.getRangeTo(room.controller) <= 4;
            var nearStorage = room.storage && link.pos.getRangeTo(room.storage) <= 2;
            
            if (nearSource) {
                sourceLinks.push(link);
            } else if (nearController || nearStorage) {
                sinkLinks.push(link);
            }
        }
        
        for (var s = 0; s < sourceLinks.length; s++) {
            var source = sourceLinks[s];
            if (source.store[RESOURCE_ENERGY] < CONFIG.THRESHOLDS.LINK_TRANSFER_MIN) continue;
            if (source.cooldown > 0) continue;
            
            for (var t = 0; t < sinkLinks.length; t++) {
                var target = sinkLinks[t];
                if (target.store.getFreeCapacity(RESOURCE_ENERGY) >= source.store[RESOURCE_ENERGY]) {
                    source.transferEnergy(target);
                    break;
                }
            }
        }
    },
    
    manageTerminal: function(room) {
        if (!room.terminal || !room.storage) return;
        
        var terminal = room.terminal;
        var terminalEnergy = terminal.store[RESOURCE_ENERGY] || 0;
        
        if (Game.market && terminalEnergy > 10000) {
            var resources = Object.keys(terminal.store);
            
            for (var i = 0; i < resources.length; i++) {
                var resource = resources[i];
                if (resource === RESOURCE_ENERGY) continue;
                
                var amount = terminal.store[resource];
                if (amount > 10000) {
                    var orders = Game.market.getAllOrders({
                        type: ORDER_BUY,
                        resourceType: resource
                    });
                    
                    orders = orders.filter(function(o) { return o.amount > 0; });
                    orders.sort(function(a, b) { return b.price - a.price; });
                    
                    if (orders.length > 0 && orders[0].price > 0.01) {
                        var order = orders[0];
                        var dealAmount = Math.min(amount - 5000, order.amount);
                        Game.market.deal(order.id, dealAmount, room.name);
                    }
                }
            }
        }
    },
    
    getBestEnergySource: function(creep) {
        var room = creep.room;
        
        // Dropped resources
        var dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: function(r) { 
                return r.resourceType === RESOURCE_ENERGY && r.amount >= 50; 
            }
        });
        if (dropped) return { target: dropped, action: 'pickup' };
        
        // Tombstones
        var tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
            filter: function(t) { return t.store[RESOURCE_ENERGY] >= 50; }
        });
        if (tombstone) return { target: tombstone, action: 'withdraw' };
        
        // Ruins
        var ruin = creep.pos.findClosestByPath(FIND_RUINS, {
            filter: function(r) { return r.store[RESOURCE_ENERGY] >= 50; }
        });
        if (ruin) return { target: ruin, action: 'withdraw' };
        
        // Link near controller (for queens)
        if (creep.memory.role === 'queen') {
            var links = room.controller.pos.findInRange(FIND_MY_STRUCTURES, 4, {
                filter: function(s) {
                    return s.structureType === STRUCTURE_LINK && 
                           s.store[RESOURCE_ENERGY] > 0;
                }
            });
            if (links.length > 0) return { target: links[0], action: 'withdraw' };
        }
        
        // Storage
        if (room.storage && room.storage.store[RESOURCE_ENERGY] > CONFIG.THRESHOLDS.STORAGE_CRITICAL) {
            return { target: room.storage, action: 'withdraw' };
        }
        
        // Containers
        var container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: function(s) {
                return s.structureType === STRUCTURE_CONTAINER &&
                       s.store[RESOURCE_ENERGY] >= creep.store.getCapacity() / 2;
            }
        });
        if (container) return { target: container, action: 'withdraw' };
        
        // Harvest directly
        var source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) return { target: source, action: 'harvest' };
        
        return null;
    },
    
    getBestEnergyTarget: function(creep) {
        var room = creep.room;
        
        // Spawns and extensions
        var spawn = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
            filter: function(s) {
                return (s.structureType === STRUCTURE_SPAWN ||
                       s.structureType === STRUCTURE_EXTENSION) &&
                       s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        if (spawn) return spawn;
        
        // Towers
        var tower = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
            filter: function(s) {
                return s.structureType === STRUCTURE_TOWER &&
                       s.store[RESOURCE_ENERGY] < s.store.getCapacity(RESOURCE_ENERGY) * 0.8;
            }
        });
        if (tower) return tower;
        
        // Terminal
        if (room.terminal && 
            room.terminal.store[RESOURCE_ENERGY] < CONFIG.THRESHOLDS.TERMINAL_ENERGY_TARGET &&
            room.terminal.store.getFreeCapacity() > 0) {
            return room.terminal;
        }
        
        // Storage
        if (room.storage && room.storage.store.getFreeCapacity() > 0) {
            return room.storage;
        }
        
        return null;
    }
};

module.exports = EnergyManager;