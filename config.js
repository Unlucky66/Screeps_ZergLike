/**
 * Configuration - Hive Mind Parameters
 */

module.exports = {
    ROLES: {
        larva:      { priority: 0, combatRole: false },
        drone:      { priority: 1, combatRole: false },
        overlord:   { priority: 2, combatRole: false },
        queen:      { priority: 3, combatRole: false },
        roach:      { priority: 4, combatRole: false },
        zergling:   { priority: 5, combatRole: true },
        hydralisk:  { priority: 6, combatRole: true },
        infestor:   { priority: 7, combatRole: true },
        mutalisk:   { priority: 8, combatRole: false },
        swarmHost:  { priority: 9, combatRole: false },
        ravager:    { priority: 10, combatRole: true },
        defender:   { priority: 5, combatRole: true },
        remoteHarvester: { priority: 4, combatRole: false },
        remoteHauler: { priority: 4, combatRole: false },
        reserver:   { priority: 8, combatRole: false }
    },
    
    THRESHOLDS: {
        EMERGENCY_ENERGY: 300,
        LOW_ENERGY: 1000,
        SAFE_ENERGY: 5000,
        RICH_ENERGY: 50000,
        CRITICAL_HITS: 0.1,
        LOW_HITS: 0.5,
        WALL_TARGET_MULTIPLIER: 1000,
        RAMPART_TARGET_MULTIPLIER: 1000,
        TOWER_ENERGY_MIN: 0.3,
        TOWER_ENERGY_REPAIR: 0.7,
        LINK_TRANSFER_MIN: 400,
        TERMINAL_ENERGY_TARGET: 50000,
        STORAGE_CRITICAL: 2000,
        BUCKET_PIXEL_THRESHOLD: 9500
    },
    
    EXPANSION: {
        MIN_RCL_TO_EXPAND: 4,
        MAX_ROOMS: 3,
        MAX_REMOTE_ROOMS: 3,
        SCOUT_INTERVAL: 1000,
        EXPANSION_INTERVAL: 5000,
        MIN_SOURCES: 1,
        PREFERRED_SOURCES: 2,
        MAX_DISTANCE: 3
    },
    
    COMBAT: {
        DEFENSE_RANGE: 50,
        SAFE_MODE_THRESHOLD: 5000,
        NUKE_RESPONSE_TICKS: 500,
        RAID_PARTY_SIZE: 4,
        MIN_RAID_RCL: 5
    },
    
    BUILD: {
        MAX_CONSTRUCTION_SITES: 10,
        ROAD_PLAIN_COST: 1,
        ROAD_SWAMP_COST: 5,
        MIN_RCL_ROADS: 3,
        MIN_RCL_RAMPARTS: 3
    },
    
    PERFORMANCE: {
        CACHE_TTL: 20,
        PATH_REUSE: 10,
        STUCK_THRESHOLD: 3
    }
};