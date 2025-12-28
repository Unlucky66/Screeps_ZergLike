/**
 * Expansion Manager
 */

var CONFIG = require('config');
var Utils = require('utils');

var ExpansionManager = {
    run: function() {
        if (Game.time % 100 !== 0) return;
        
        if (!Memory.hive.settings.autoExpand && !Memory.hive.settings.autoRemote) return;
        
        this.runObservers();
        
        if (Memory.hive.settings.autoExpand) {
            this.evaluateExpansionTargets();
        }
        
        if (Memory.hive.settings.autoRemote) {
            this.evaluateRemoteTargets();
        }
    },
    
    runObservers: function() {
        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            if (!room.controller || !room.controller.my) continue;
            
            var observers = room.find(FIND_MY_STRUCTURES, {
                filter: function(s) { return s.structureType === STRUCTURE_OBSERVER; }
            });
            
            if (observers.length === 0) continue;
            var observer = observers[0];
            
            var exits = Game.map.describeExits(roomName);
            var rooms = [];
            for (var dir in exits) {
                if (exits[dir]) rooms.push(exits[dir]);
            }
            
            var targetRoom = null;
            var oldestScan = Infinity;
            
            for (var i = 0; i < rooms.length; i++) {
                var r = rooms[i];
                var scanData = Memory.hive.scoutData[r];
                var scanTime = scanData ? scanData.time : 0;
                if (scanTime < oldestScan) {
                    oldestScan = scanTime;
                    targetRoom = r;
                }
            }
            
            if (targetRoom) {
                observer.observeRoom(targetRoom);
            }
        }
    },
    
    evaluateExpansionTargets: function() {
        var myRooms = [];
        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            if (room.controller && room.controller.my) {
                myRooms.push(roomName);
            }
        }
        
        if (myRooms.length >= Game.gcl.level) {
            Memory.hive.expansionTargets = [];
            return;
        }
        
        var candidates = [];
        
        for (var scoutRoom in Memory.hive.scoutData) {
            var data = Memory.hive.scoutData[scoutRoom];
            
            if (!data.controller) continue;
            if (data.controller.owner) continue;
            
            var roomType = Utils.getRoomType(scoutRoom);
            if (roomType === 'sourceKeeper') continue;
            if (roomType === 'center') continue;
            
            if (!data.sources || data.sources < CONFIG.EXPANSION.MIN_SOURCES) continue;
            
            var minDistance = Infinity;
            var nearestRoom = null;
            
            for (var i = 0; i < myRooms.length; i++) {
                var dist = Utils.getRoomDistance(scoutRoom, myRooms[i]);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestRoom = myRooms[i];
                }
            }
            
            if (minDistance > CONFIG.EXPANSION.MAX_DISTANCE) continue;
            if (minDistance < 2) continue;
            
            var score = 0;
            score += data.sources * 50;
            if (data.sources >= CONFIG.EXPANSION.PREFERRED_SOURCES) score += 100;
            if (data.mineral) score += 30;
            score -= minDistance * 20;
            
            candidates.push({
                roomName: scoutRoom,
                score: score,
                sourceRoom: nearestRoom,
                distance: minDistance
            });
        }
        
        candidates.sort(function(a, b) { return b.score - a.score; });
        
        Memory.hive.expansionTargets = [];
        for (var j = 0; j < Math.min(3, candidates.length); j++) {
            Memory.hive.expansionTargets.push(candidates[j].roomName);
        }
        
        if (Memory.hive.expansionTargets.length > 0) {
            Utils.log('Expansion targets: ' + Memory.hive.expansionTargets.join(', '), 'INFO');
        }
    },
    
    evaluateRemoteTargets: function() {
        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            if (!room.controller || !room.controller.my) continue;
            if (room.controller.level < 4) continue;
            
            var exits = Game.map.describeExits(roomName);
            
            for (var dir in exits) {
                var remoteRoom = exits[dir];
                if (!remoteRoom) continue;
                
                if (Memory.hive.remotes[remoteRoom]) continue;
                
                var roomType = Utils.getRoomType(remoteRoom);
                if (roomType === 'sourceKeeper') continue;
                
                var data = Memory.hive.scoutData[remoteRoom];
                if (!data) continue;
                
                if (data.controller && data.controller.owner) continue;
                
                if (!data.sources || data.sources === 0) continue;
                
                if (data.hostiles > 0) continue;
                
                var needsReserver = true;
                if (data.controller && data.controller.reservation) {
                    needsReserver = false;
                }
                
                Memory.hive.remotes[remoteRoom] = {
                    homeRoom: roomName,
                    sources: data.sources,
                    active: true,
                    needsReserver: needsReserver,
                    established: Game.time
                };
                
                Utils.log('New remote mining target: ' + remoteRoom + ' (from ' + roomName + ')', 'SUCCESS');
            }
        }
        
        for (var remoteName in Memory.hive.remotes) {
            var remote = Memory.hive.remotes[remoteName];
            var homeRoom = Game.rooms[remote.homeRoom];
            
            if (!homeRoom || !homeRoom.controller || !homeRoom.controller.my) {
                delete Memory.hive.remotes[remoteName];
                continue;
            }
            
            var threatData = Memory.hive.threats[remoteName];
            if (threatData && threatData.level > 500) {
                remote.active = false;
            } else {
                remote.active = true;
            }
        }
    }
};

module.exports = ExpansionManager;