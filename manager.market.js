// manager.market
//
// Auto-seller + boost-aware reagent buying:
// - Sells non-energy resources above a minimum and not needed for boosts
// - Sells surplus energy
// - Keeps some U and H (and UH) for ATTACK boosts, and buys them if cheap

const TRADE_INTERVAL = 50;
const MIN_BUCKET = 3000;
const MIN_TERMINAL_ENERGY = 20000;
const MIN_RESOURCE_AMOUNT = 100;
const MAX_DEAL_AMOUNT = 5000;

// Boost plan: make RESOURCE_UTRIUM_HYDRIDE (UH) for ATTACK boosts
const BOOST_PRODUCT = RESOURCE_UTRIUM_HYDRIDE;
const BOOST_REAGENTS = [RESOURCE_UTRIUM, RESOURCE_HYDROGEN];

const BOOST_RESERVE_PRODUCT = 800;
const BOOST_RESERVE_REAGENT = 500;

const MIN_PRICE = {};
const MAX_BUY_PRICE = {};

// Typical shard-ish defaults; tune if needed
MIN_PRICE[RESOURCE_ENERGY] = 0.02;
MIN_PRICE[RESOURCE_POWER] = 8;

[
    RESOURCE_HYDROGEN,
    RESOURCE_OXYGEN,
    RESOURCE_UTRIUM,
    RESOURCE_LEMERGIUM,
    RESOURCE_KEANIUM,
    RESOURCE_ZYNTHIUM,
    RESOURCE_CATALYST
].forEach(r => (MIN_PRICE[r] = 0.05));

if (typeof RESOURCE_GHODIUM !== 'undefined') MIN_PRICE[RESOURCE_GHODIUM] = 0.2;

if (typeof PIXEL !== 'undefined') MIN_PRICE[PIXEL] = 7000;
if (typeof CPU_UNLOCK !== 'undefined') MIN_PRICE[CPU_UNLOCK] = 8000;
if (typeof SUBSCRIPTION_TOKEN !== 'undefined')
    MIN_PRICE[SUBSCRIPTION_TOKEN] = 50000;
if (typeof ACCESS_KEY !== 'undefined') MIN_PRICE[ACCESS_KEY] = 10000;

// Buy prices for boost reagents (soft caps)
MAX_BUY_PRICE[RESOURCE_UTRIUM] = 1.5;
MAX_BUY_PRICE[RESOURCE_HYDROGEN] = 0.5;

module.exports = {
    run() {
        if (Game.time % TRADE_INTERVAL !== 0) return;
        if (Game.cpu.bucket < MIN_BUCKET) return;

        const mainRoom = this.getMainRoom();
        if (!mainRoom || !mainRoom.terminal) return;

        const terminal = mainRoom.terminal;
        const roomName = mainRoom.name;

        // First, make sure we have enough reagents for boosts
        this.handleBoostBuys(mainRoom);

        const store = terminal.store;

        // Sell all non-energy resources
        for (const resource in store) {
            const amount = store[resource];
            if (resource === RESOURCE_ENERGY) continue;
            if (amount < MIN_RESOURCE_AMOUNT) continue;
            this.sellResource(resource, amount, roomName, terminal, mainRoom);
        }

        // Sell surplus energy
        this.sellEnergy(terminal, roomName, mainRoom);
    },

    getMainRoom() {
        const owned = _.filter(
            Game.rooms,
            r => r.controller && r.controller.my
        );
        if (!owned.length) return null;
        return _.max(owned, r => (r.controller && r.controller.level) || 0);
    },

    getMinPrice(resource) {
        if (MIN_PRICE[resource] != null) return MIN_PRICE[resource];
        return 0.01;
    },

    getRoomTotal(room, resource) {
        let total = 0;
        if (room.storage) total += room.storage.store[resource] || 0;
        if (room.terminal) total += room.terminal.store[resource] || 0;
        return total;
    },

    sellResource(resource, amount, roomName, terminal, room) {
        const minPrice = this.getMinPrice(resource);

        // Don't sell below reserves for boost product/reagents
        if (resource === BOOST_PRODUCT) {
            const total = this.getRoomTotal(room, resource);
            const sellable = Math.max(0, total - BOOST_RESERVE_PRODUCT);
            amount = Math.min(amount, sellable);
            if (amount <= 0) return;
        } else if (BOOST_REAGENTS.includes(resource)) {
            const total = this.getRoomTotal(room, resource);
            const sellable = Math.max(0, total - BOOST_RESERVE_REAGENT);
            amount = Math.min(amount, sellable);
            if (amount <= 0) return;
        }

        const orders = Game.market.getAllOrders({
            type: ORDER_BUY,
            resourceType: resource
        });
        if (!orders.length) return;

        const best = _.max(orders, 'price');
        if (!best || best.price < minPrice) return;

        let dealAmount = Math.min(amount, best.amount, MAX_DEAL_AMOUNT);
        if (dealAmount <= 0) return;

        const energyCost = Game.market.calcTransactionCost(
            dealAmount,
            roomName,
            best.roomName
        );

        const energyAvailable = terminal.store[RESOURCE_ENERGY] || 0;
        if (energyAvailable <= MIN_TERMINAL_ENERGY) return;

        const maxAffordable = Math.floor(
            (energyAvailable - MIN_TERMINAL_ENERGY) /
                Math.max(1, energyCost) *
                dealAmount
        );
        if (maxAffordable <= 0) return;

        dealAmount = Math.min(dealAmount, maxAffordable);
        if (dealAmount <= 0) return;

        const result = Game.market.deal(best.id, dealAmount, roomName);
        if (result === OK) {
            console.log(
                `[MARKET] Sold ${dealAmount} ${resource} at ${best.price.toFixed(
                    3
                )} from ${roomName} -> ${best.roomName}`
            );
        }
    },

    sellEnergy(terminal, roomName, room) {
        const energy = terminal.store[RESOURCE_ENERGY] || 0;
        const surplus = energy - (MIN_TERMINAL_ENERGY + 50000);
        if (surplus <= 0) return;

        const minPrice = this.getMinPrice(RESOURCE_ENERGY);
        const orders = Game.market.getAllOrders({
            type: ORDER_BUY,
            resourceType: RESOURCE_ENERGY
        });
        if (!orders.length) return;

        const best = _.max(orders, 'price');
        if (!best || best.price < minPrice) return;

        let dealAmount = Math.min(surplus, best.amount, MAX_DEAL_AMOUNT);
        if (dealAmount <= 0) return;

        const energyCost = Game.market.calcTransactionCost(
            dealAmount,
            roomName,
            best.roomName
        );
        if (energyCost >= dealAmount) return;

        const result = Game.market.deal(best.id, dealAmount, roomName);
        if (result === OK) {
            console.log(
                `[MARKET] Sold ${dealAmount} energy at ${best.price.toFixed(
                    3
                )} from ${roomName} -> ${best.roomName}`
            );
        }
    },

    handleBoostBuys(room) {
        if (!room.terminal) return;
        if (Game.market.credits < 5000) return;

        for (const reagent of BOOST_REAGENTS) {
            const have = this.getRoomTotal(room, reagent);
            if (have >= BOOST_RESERVE_REAGENT) continue;

            this.buyReagent(room, reagent, BOOST_RESERVE_REAGENT - have);
        }
    },

    buyReagent(room, resource, missingAmount) {
        const maxPrice = MAX_BUY_PRICE[resource];
        if (!maxPrice) return;
        const roomName = room.name;

        const orders = Game.market.getAllOrders({
            type: ORDER_SELL,
            resourceType: resource
        });
        if (!orders.length) return;

        const affordable = orders.filter(o => o.price <= maxPrice);
        if (!affordable.length) return;

        const best = _.min(affordable, 'price');
        if (!best) return;

        let amount = Math.min(
            missingAmount,
            best.amount,
            MAX_DEAL_AMOUNT
        );
        if (amount <= 0) return;

        const energyCost = Game.market.calcTransactionCost(
            amount,
            roomName,
            best.roomName
        );
        const term = room.terminal;
        const energyAvailable = term.store[RESOURCE_ENERGY] || 0;
        if (energyAvailable <= MIN_TERMINAL_ENERGY) return;

        const maxAffordable = Math.floor(
            (energyAvailable - MIN_TERMINAL_ENERGY) /
                Math.max(1, energyCost) *
                amount
        );
        if (maxAffordable <= 0) return;
        amount = Math.min(amount, maxAffordable);
        if (amount <= 0) return;

        const result = Game.market.deal(best.id, amount, roomName);
        if (result === OK) {
            console.log(
                `[MARKET] Bought ${amount} ${resource} at ${best.price.toFixed(
                    3
                )} into ${roomName} from ${best.roomName}`
            );
        }
    }
};