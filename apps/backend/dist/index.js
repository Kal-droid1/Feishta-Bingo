"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomConfigs = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./auth"));
const admin_1 = __importDefault(require("./admin"));
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// --- CORS ---
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5000',
    'http://localhost:3000',
    'http://127.0.0.1:5437', // browser preview proxy
    'https://two-pandas-study.loca.lt', // frontend localtunnel
    'https://eleven-wasps-rush.loca.lt', // backend localtunnel
    process.env.FRONTEND_URL,
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        // Allow all localtunnel and ngrok URLs automatically
        if (origin.includes('loca.lt') || origin.includes('ngrok'))
            return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin))
            return callback(null, true);
        callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Telegram Mini App Backend is running!' });
});
// Root route
app.get('/', (req, res) => {
    res.send('Feshta Bingo API Backend is running. Please access the frontend instead.');
});
// List all users (useful for debugging)
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});
// Refresh user state
app.get('/api/auth/me', async (req, res) => {
    try {
        const telegramId = String(req.query.telegramId);
        const user = await prisma.user.findUnique({ where: { telegramId } });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user.' });
    }
});
// Public settings (for Room configurations)
app.get('/api/settings/public', async (req, res) => {
    try {
        const settings = await prisma.systemSetting.findMany();
        const obj = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json({
            room1_fee: Number(obj.room1_fee || 5),
            room2_fee: Number(obj.room2_fee || 10),
            room3_fee: Number(obj.room3_fee || 50),
            house_cut: Number(obj.house_cut || 20),
            telebirr_phone: obj.telebirr_phone || '0991538407',
            telebirr_name: obj.telebirr_name || 'Kaleab Girma',
            cbe_account: obj.cbe_account || '1000123456789',
            cbe_name: obj.cbe_name || 'Kaleab Girma'
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings.' });
    }
});
// --- Bot Engine Utils ---
const BOT_NAMES = ['Abebe', 'Kebede', 'Chala', 'Tigist', 'Meron', 'Dawit', 'Ephrem', 'Helen', 'Selam', 'Yared', 'Bruk', 'Nati', 'Micky', 'Meti', 'Feven'];
let globalBotsEnabled = true;
let globalSteeringRatio = 65;
exports.roomConfigs = {
    'room-5': { botMultiplier: 4, housePot: 0, steeringRatio: 65, overrides: {}, sessionsPlayed: 0, paidOut: 0, collected: 0, platformProfit: 0 },
    'room-10': { botMultiplier: 4, housePot: 0, steeringRatio: 65, overrides: {}, sessionsPlayed: 0, paidOut: 0, collected: 0, platformProfit: 0 },
    'room-50': { botMultiplier: 4, housePot: 0, steeringRatio: 65, overrides: {}, sessionsPlayed: 0, paidOut: 0, collected: 0, platformProfit: 0 },
};
async function saveRoomConfigToDB(roomId) {
    const conf = exports.roomConfigs[roomId];
    if (!conf)
        return;
    try {
        await prisma.systemSetting.upsert({
            where: { key: `room_config_${roomId}` },
            update: { value: JSON.stringify(conf) },
            create: { key: `room_config_${roomId}`, value: JSON.stringify(conf) }
        });
    }
    catch (e) {
        console.error(`Failed to save room config ${roomId}`, e);
    }
}
async function loadRoomConfigsFromDB() {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: { key: { startsWith: 'room_config_' } }
        });
        for (const setting of settings) {
            const roomId = setting.key.replace('room_config_', '');
            if (exports.roomConfigs[roomId]) {
                try {
                    const parsed = JSON.parse(setting.value);
                    exports.roomConfigs[roomId] = { ...exports.roomConfigs[roomId], ...parsed };
                }
                catch (e) { }
            }
        }
        console.log('✅ Room configs loaded from DB');
    }
    catch (e) {
        console.error('Failed to load room configs', e);
    }
}
function mulberry32(a) {
    return function () {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function generateBingoCard(seed) {
    const rand = mulberry32(seed);
    const getUnique = (min, max, count) => {
        const nums = new Set();
        while (nums.size < count)
            nums.add(Math.floor(rand() * (max - min + 1)) + min);
        return Array.from(nums);
    };
    return { B: getUnique(1, 15, 5), I: getUnique(16, 30, 5), N: getUnique(31, 45, 4), G: getUnique(46, 60, 5), O: getUnique(61, 75, 5) };
}
function getBingoLines(card) {
    const lines = [];
    const matrix = [
        [card.B[0], card.I[0], card.N[0], card.G[0], card.O[0]],
        [card.B[1], card.I[1], card.N[1], card.G[1], card.O[1]],
        [card.B[2], card.I[2], 0, card.G[2], card.O[2]],
        [card.B[3], card.I[3], card.N[2], card.G[3], card.O[3]],
        [card.B[4], card.I[4], card.N[3], card.G[4], card.O[4]],
    ];
    // 5 horizontal rows
    for (let r = 0; r < 5; r++)
        lines.push(matrix[r]);
    // 5 vertical columns
    for (let c = 0; c < 5; c++)
        lines.push([matrix[0][c], matrix[1][c], matrix[2][c], matrix[3][c], matrix[4][c]]);
    // 2 diagonals
    lines.push([matrix[0][0], matrix[1][1], matrix[2][2], matrix[3][3], matrix[4][4]]);
    lines.push([matrix[0][4], matrix[1][3], matrix[2][2], matrix[3][1], matrix[4][0]]);
    // 4 corners (B top-left, O top-right, B bottom-left, O bottom-right)
    lines.push([matrix[0][0], matrix[0][4], matrix[4][0], matrix[4][4], 0]);
    return lines;
}
function precalculateDrawOrder(roomId, state, conf, steeringRatio) {
    // Separate real player cards from bot cards (both are in boughtCards now)
    const realCards = new Map();
    const botCards = [];
    const botCardIds = [];
    for (const [cardId, ownerId] of state.boughtCards.entries()) {
        const card = generateBingoCard(cardId);
        if (state.botTelegramIds.has(ownerId)) {
            botCards.push(card);
            botCardIds.push(cardId);
        }
        else {
            realCards.set(cardId, card);
        }
    }
    let uncalled = new Set(Array.from({ length: 75 }, (_, i) => i + 1));
    let drawOrder = [];
    let called = new Set();
    let botWinAtBall = -1;
    let botWinCard = -1;
    let closestRealPlayerAway = 5;
    for (let i = 0; i < 75; i++) {
        let realOneAwayNeeds = new Set();
        let currentClosest = 5;
        for (const card of realCards.values()) {
            const lines = getBingoLines(card);
            for (const line of lines) {
                let missing = [];
                for (const num of line)
                    if (num !== 0 && !called.has(num))
                        missing.push(num);
                if (missing.length === 1)
                    realOneAwayNeeds.add(missing[0]);
                if (missing.length < currentClosest)
                    currentClosest = missing.length;
            }
        }
        if (i === 0)
            closestRealPlayerAway = currentClosest; // Initial state
        if (botWinAtBall === -1) {
            for (let b = 0; b < botCards.length; b++) {
                const lines = getBingoLines(botCards[b]);
                for (const line of lines) {
                    let missing = [];
                    for (const num of line)
                        if (num !== 0 && !called.has(num))
                            missing.push(num);
                    if (missing.length === 0) {
                        botWinAtBall = i - 1;
                        botWinCard = botCardIds[b];
                        break;
                    }
                }
                if (botWinAtBall !== -1)
                    break;
            }
        }
        let avoidNumbers = new Set();
        if (state.sessionMode === 'BOT WIN') {
            // Enhanced BOT WIN enforcement: Scan all real player patterns
            for (const [cardId, ownerId] of state.boughtCards.entries()) {
                if (state.botTelegramIds.has(ownerId))
                    continue; // Skip bot cards
                const card = generateBingoCard(cardId);
                const lines = getBingoLines(card);
                // Check all 13 patterns (5 horiz, 5 vert, 2 diag, 4 corners)
                for (const line of lines) {
                    let markedCount = 0;
                    let neededNumbers = [];
                    for (const num of line) {
                        if (num === 0) {
                            // FREE space - always marked
                            markedCount++;
                        }
                        else if (called.has(num)) {
                            markedCount++;
                        }
                        else {
                            neededNumbers.push(num);
                        }
                    }
                    // If real player needs exactly 1 more number to complete any pattern
                    if (markedCount === 4 && neededNumbers.length === 1) {
                        avoidNumbers.add(neededNumbers[0]);
                    }
                }
            }
        }
        let candidates = Array.from(uncalled).filter(n => !avoidNumbers.has(n));
        if (candidates.length === 0)
            candidates = Array.from(uncalled);
        let nextNum = -1;
        let useBotPool = Math.random() * 100 < steeringRatio;
        if (useBotPool && botCards.length > 0) {
            let botNums = new Set();
            for (const card of botCards) {
                card.B.forEach(n => botNums.add(n));
                card.I.forEach(n => botNums.add(n));
                card.N.forEach(n => botNums.add(n));
                card.G.forEach(n => botNums.add(n));
                card.O.forEach(n => botNums.add(n));
            }
            let botCandidates = candidates.filter(n => botNums.has(n));
            if (botCandidates.length > 0)
                nextNum = botCandidates[Math.floor(Math.random() * botCandidates.length)];
        }
        if (nextNum === -1)
            nextNum = candidates[Math.floor(Math.random() * candidates.length)];
        uncalled.delete(nextNum);
        called.add(nextNum);
        drawOrder.push(nextNum);
    }
    const botNames = conf.overrides.botNames && conf.overrides.botNames.length > 0 ? conf.overrides.botNames : BOT_NAMES;
    const botWinName = botNames[Math.floor(Math.random() * botNames.length)];
    return { drawOrder, botWinAtBall, botWinCard, botWinName };
}
const roomStates = {};
const LOBBY_DURATION = 45; // 45 seconds lobby
const DRAW_INTERVAL_MS = 3500; // 3.5 seconds per ball
const RESERVATION_TTL = 60000;
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function createFreshRound(fee = 0, cycleNumber = 0) {
    return {
        status: 'lobby',
        boughtCards: new Map(),
        reservedCards: new Map(),
        fee,
        cycleStartedAt: Date.now(),
        cycleNumber,
        drawOrder: [],
        gameStartedAt: 0,
        finalPrizePool: 0,
        finalPlayersCount: 0,
        winnerData: null,
        botTelegramIds: new Set(),
    };
}
// --- Bot Trickle-In System (Dynamic Multiplier-Based, Every-Second Recalculation) ---
// Adds a single bot card to the room. Returns true on success.
function addOneBotToRoom(roomId, state) {
    if (roomStates[roomId] !== state || state.status !== 'lobby')
        return false;
    const conf = exports.roomConfigs[roomId] || exports.roomConfigs['room-5'];
    const botNames = conf.overrides.botNames?.length ? conf.overrides.botNames : BOT_NAMES;
    const botIndex = state.botTelegramIds.size;
    // Find a unique card ID starting at 10000
    let cardId = 10000;
    while (state.boughtCards.has(cardId))
        cardId++;
    const botTelegramId = `bot-${roomId}-${state.cycleNumber}-${botIndex}`;
    const botName = botNames[botIndex % botNames.length];
    state.boughtCards.set(cardId, botTelegramId);
    state.botTelegramIds.add(botTelegramId);
    const now = Date.now();
    state.lastBotJoinAt = now;
    if (!state.recentBotJoins)
        state.recentBotJoins = [];
    state.recentBotJoins.push(now);
    console.log(`🤖 Bot "${botName}" joined ${roomId} card #${cardId} (Bots: ${state.botTelegramIds.size}, Total: ${state.boughtCards.size})`);
    return true;
}
// Schedules one bot to join after a human-like delay, respecting all rate limits.
function scheduleOneBotJoin(roomId, state) {
    const delay = 1000 + Math.floor(Math.random() * 3000); // 1–4 second random delay
    state.scheduledBotCount = (state.scheduledBotCount || 0) + 1;
    setTimeout(() => {
        state.scheduledBotCount = Math.max(0, (state.scheduledBotCount || 1) - 1);
        if (roomStates[roomId] !== state || state.status !== 'lobby')
            return;
        const now = Date.now();
        // Enforce 800ms minimum gap between any two bot joins
        if (state.lastBotJoinAt && (now - state.lastBotJoinAt) < 800) {
            const retryIn = 800 - (now - state.lastBotJoinAt) + 50;
            state.scheduledBotCount = (state.scheduledBotCount || 0) + 1;
            setTimeout(() => { state.scheduledBotCount = Math.max(0, (state.scheduledBotCount || 1) - 1); addOneBotToRoom(roomId, state); }, retryIn);
            return;
        }
        // Enforce max 2 bots in any 3-second window
        if (!state.recentBotJoins)
            state.recentBotJoins = [];
        state.recentBotJoins = state.recentBotJoins.filter(t => now - t < 3000);
        if (state.recentBotJoins.length >= 2) {
            const oldest = Math.min(...state.recentBotJoins);
            const retryIn = 3000 - (now - oldest) + 50;
            state.scheduledBotCount = (state.scheduledBotCount || 0) + 1;
            setTimeout(() => { state.scheduledBotCount = Math.max(0, (state.scheduledBotCount || 1) - 1); addOneBotToRoom(roomId, state); }, retryIn);
            return;
        }
        addOneBotToRoom(roomId, state);
    }, delay);
}
// Main loop: runs every 1 second during countdown, recalculates bot target dynamically.
function startBotTrickleLoop(roomId, state) {
    if (state.botTrickleActive)
        return;
    state.botTrickleActive = true;
    state.scheduledBotCount = 0;
    state.recentBotJoins = [];
    const conf = exports.roomConfigs[roomId] || exports.roomConfigs['room-5'];
    if (!globalBotsEnabled || conf.overrides.pauseBots) {
        console.log(`⏸️ Bots paused/disabled for ${roomId}`);
        return;
    }
    const tick = () => {
        if (roomStates[roomId] !== state || state.status !== 'lobby')
            return;
        const now = Date.now();
        const elapsed = (now - state.cycleStartedAt) / 1000;
        const remaining = LOBBY_DURATION - elapsed;
        if (remaining <= 2)
            return; // Stop 2s before end — game transition handles the rest
        // Count joined real players (paid, not bots) - count unique players, not cards
        const uniqueRealPlayerIds = new Set([...state.boughtCards.values()].filter(id => !state.botTelegramIds.has(id)));
        const joinedReal = uniqueRealPlayerIds.size;
        if (joinedReal === 0) {
            setTimeout(tick, 1000);
            return;
        }
        // Estimate final joined using elapsed proportion
        const estimatedFinal = Math.ceil(joinedReal * (LOBBY_DURATION / remaining));
        // Apply override count or multiplier formula
        let targetBots;
        if (conf.overrides.botCount !== undefined) {
            targetBots = conf.overrides.botCount;
        }
        else {
            const multiplier = Math.max(2, Math.min(8, conf.botMultiplier || 4));
            const maxBots = estimatedFinal * multiplier;
            targetBots = Math.floor(Math.random() * (maxBots - estimatedFinal + 1)) + estimatedFinal;
        }
        const alreadyJoined = state.botTelegramIds.size;
        const alreadyScheduled = state.scheduledBotCount || 0;
        if ((alreadyJoined + alreadyScheduled) < targetBots) {
            scheduleOneBotJoin(roomId, state);
        }
        setTimeout(tick, 1000);
    };
    setTimeout(tick, 3000); // Start first tick 3 seconds into lobby
    console.log(`🎯 Bot trickle loop started for ${roomId}`);
}
function getRoomState(roomId) {
    if (!roomStates[roomId]) {
        roomStates[roomId] = createFreshRound();
        console.log(`🏠 Room ${roomId} created — global lobby running.`);
    }
    return roomStates[roomId];
}
function checkAndProgressRoomState(roomId) {
    const state = getRoomState(roomId);
    const now = Date.now();
    if (state.status === 'lobby') {
        const elapsed = Math.floor((now - state.cycleStartedAt) / 1000);
        if (elapsed >= LOBBY_DURATION) {
            // Step 1: Release all unpaid seat reservations silently
            state.reservedCards.clear();
            // Step 2: Count final JOINED real players (paid only, not bots) - count unique players, not cards
            const uniqueRealPlayerIds = new Set([...state.boughtCards.values()].filter(id => !state.botTelegramIds.has(id)));
            const joinedRealPlayers = uniqueRealPlayerIds.size;
            if (joinedRealPlayers === 0) {
                const newState = createFreshRound(state.fee, state.cycleNumber + 1);
                roomStates[roomId] = newState;
                console.log(`🔄 Room ${roomId} LOBBY RESTARTED (No real players joined and paid)`);
                return newState;
            }
            // Step 3: Calculate final bot count using multiplier formula
            const conf = exports.roomConfigs[roomId] || exports.roomConfigs['room-5'];
            let finalTargetBots;
            if (conf.overrides.botCount !== undefined) {
                finalTargetBots = conf.overrides.botCount;
            }
            else {
                const multiplier = Math.max(2, Math.min(8, conf.botMultiplier || 4));
                const maxBots = joinedRealPlayers * multiplier;
                finalTargetBots = Math.floor(Math.random() * (maxBots - joinedRealPlayers + 1)) + joinedRealPlayers;
            }
            // Step 4: Add any remaining bots silently (not visible — game screen is transitioning)
            const currentBotCount = state.botTelegramIds.size;
            const botsToAdd = Math.max(0, finalTargetBots - currentBotCount);
            for (let i = 0; i < botsToAdd; i++) {
                const botIndex = state.botTelegramIds.size;
                let cardId = 10000;
                while (state.boughtCards.has(cardId))
                    cardId++;
                const botTelegramId = `bot-${roomId}-${state.cycleNumber}-silent-${botIndex}`;
                state.boughtCards.set(cardId, botTelegramId);
                state.botTelegramIds.add(botTelegramId);
            }
            if (botsToAdd > 0)
                console.log(`🤖 Added ${botsToAdd} bots silently at game start for ${roomId}`);
            // Transition to GAME
            state.status = 'game';
            state.gameStartedAt = now;
            const finalBotCount = state.botTelegramIds.size;
            let steeringRatio = conf.overrides.steeringRatio ?? conf.steeringRatio;
            // FIX 1 & 2: Total players = R + B, Prize = totalPlayers × fee × 0.8
            state.finalPlayersCount = joinedRealPlayers + finalBotCount;
            state.finalPrizePool = Math.floor(state.finalPlayersCount * state.fee * 0.8);
            state.botCount = finalBotCount;
            let mode = 'REAL WIN';
            if (conf.overrides.forceWin) {
                mode = conf.overrides.forceWin;
            }
            else {
                if (conf.housePot < state.finalPrizePool)
                    mode = 'BOT WIN';
                else
                    mode = 'REAL WIN';
            }
            state.sessionMode = mode;
            state.activeSteeringRatio = steeringRatio;
            conf.sessionsPlayed++;
            const botSim = precalculateDrawOrder(roomId, state, conf, steeringRatio);
            state.drawOrder = botSim.drawOrder;
            state.botWinAtBall = botSim.botWinAtBall;
            state.botWinData = botSim.botWinAtBall && botSim.botWinAtBall >= 0 && botSim.botWinCard !== undefined ? {
                telegramId: 'bot-' + Math.random(),
                username: botSim.botWinName || 'Bot',
                winType: 'BINGO',
                cells: [],
                cardId: botSim.botWinCard,
            } : null;
            conf.overrides = {};
            saveRoomConfigToDB(roomId);
            console.log(`🚀 Room ${roomId} GAME STARTED. Joined Real: ${joinedRealPlayers}, Bots: ${finalBotCount}, Mode: ${mode}`);
        }
    }
    else if (state.status === 'game') {
        // Check if game has run out of balls
        const elapsedGameMs = now - state.gameStartedAt;
        const currentBallIndex = Math.floor(elapsedGameMs / DRAW_INTERVAL_MS);
        // Auto-claim bot win
        if (state.botWinAtBall !== undefined && state.botWinAtBall >= 0 && currentBallIndex >= state.botWinAtBall && !state.winnerData) {
            state.winnerData = state.botWinData || null;
            // Add real entry fees to house pot (bots don't pay fees)
            // FIX 1: Count unique real players, not cards
            const uniqueRealPlayerIds = new Set([...state.boughtCards.values()].filter(id => !state.botTelegramIds.has(id)));
            const realPlayerCount = uniqueRealPlayerIds.size;
            const realFees = realPlayerCount * state.fee;
            if (exports.roomConfigs[roomId]) {
                const platformCut = Math.floor(realFees * 0.2);
                const toPot = realFees - platformCut;
                exports.roomConfigs[roomId].platformProfit += platformCut;
                exports.roomConfigs[roomId].housePot += toPot;
                exports.roomConfigs[roomId].collected += realFees;
                exports.roomConfigs[roomId].lastSessionData = { type: 'BOT WIN', collected: realFees, cut: platformCut, addedToPot: toPot, prizePaid: 0, potAfter: exports.roomConfigs[roomId].housePot };
                exports.roomConfigs[roomId].history = exports.roomConfigs[roomId].history || [];
                exports.roomConfigs[roomId].history.unshift({ gameId: exports.roomConfigs[roomId].sessionsPlayed, type: 'BOT WIN', cut: platformCut, potAfter: exports.roomConfigs[roomId].housePot });
                if (exports.roomConfigs[roomId].history.length > 10)
                    exports.roomConfigs[roomId].history.pop();
                saveRoomConfigToDB(roomId);
            }
            console.log(`🤖 BOT WON automatically in Room ${roomId}! Collected: ${realFees}. To Pot: ${Math.floor(realFees * 0.8)}.`);
            setTimeout(() => {
                if (roomStates[roomId] === state)
                    roomStates[roomId] = createFreshRound(state.fee, state.cycleNumber + 1);
            }, 8000);
        }
        const maxGameDuration = 76 * DRAW_INTERVAL_MS;
        if (elapsedGameMs >= maxGameDuration) {
            // Transition back to LOBBY if no winner
            if (!state.winnerData) {
                const newState = createFreshRound(state.fee, state.cycleNumber + 1);
                roomStates[roomId] = newState;
                console.log(`🔄 Room ${roomId} RESET to LOBBY (No Winner)`);
                return newState;
            }
        }
    }
    return state;
}
// Player registers presence in the room
app.post('/api/rooms/:roomId/join', (req, res) => {
    const { fee } = req.body;
    const roomId = req.params.roomId;
    const state = checkAndProgressRoomState(roomId);
    if (state.fee === 0 && fee)
        state.fee = fee;
    // Start bot trickle loop once a real player joins (only starts once per cycle)
    if (state.status === 'lobby' && !state.botTrickleActive) {
        startBotTrickleLoop(roomId, state);
    }
    const elapsed = Math.floor((Date.now() - state.cycleStartedAt) / 1000);
    const timeLeft = Math.max(0, LOBBY_DURATION - elapsed);
    res.json({ success: true, timeLeft, cycleNumber: state.cycleNumber, status: state.status });
});
// GET STATE — Polled every 1s by all clients (Lobby + Game)
app.get('/api/rooms/:roomId/state', (req, res) => {
    const state = checkAndProgressRoomState(req.params.roomId);
    const telegramId = String(req.query.telegramId || '');
    if (state.status === 'lobby') {
        // Cleanup old reservations
        const now = Date.now();
        for (const [cardId, resData] of state.reservedCards.entries()) {
            if (now - resData.lockedAt > RESERVATION_TTL)
                state.reservedCards.delete(cardId);
        }
        const elapsed = Math.floor((Date.now() - state.cycleStartedAt) / 1000);
        const timeLeft = Math.max(0, LOBBY_DURATION - elapsed);
        const allTaken = new Set([...state.boughtCards.keys(), ...state.reservedCards.keys()]);
        const myReserved = [];
        const myBought = [];
        for (const [cardId, ownerId] of state.boughtCards.entries()) {
            if (ownerId === telegramId)
                myBought.push(cardId);
        }
        for (const [cardId, resData] of state.reservedCards.entries()) {
            if (resData.telegramId === telegramId)
                myReserved.push(cardId);
        }
        // FIX 1 & 2: Calculate total players = R + B (not cards)
        const uniqueRealPlayerIds = new Set([...state.boughtCards.values()].filter(id => !state.botTelegramIds.has(id)));
        const realPlayerCount = uniqueRealPlayerIds.size;
        const botCount = state.botTelegramIds.size;
        const totalPlayerCount = realPlayerCount + botCount;
        // FIX 2: Prize = total players × fee × 0.8
        const totalCollected = totalPlayerCount * state.fee;
        const prizePool = Math.floor(totalCollected * 0.8);
        const houseCut = Math.floor(totalCollected * 0.2);
        res.json({
            status: 'lobby',
            allTaken: Array.from(allTaken),
            myReserved,
            myBought,
            playersCount: totalPlayerCount, // FIX 1: R + B exactly
            seatsTaken: allTaken.size,
            prizePool,
            prizeBreakdown: {
                totalCollected,
                houseCut,
                prizeAmount: prizePool
            },
            timeLeft,
            cycleNumber: state.cycleNumber,
        });
    }
    else {
        // Game State (Returns all data for perfect client-side interpolation)
        const totalCollected = state.finalPlayersCount * state.fee;
        const houseCut = Math.floor(totalCollected * 0.2);
        res.json({
            status: 'game',
            prizePool: state.finalPrizePool,
            prizeBreakdown: {
                totalCollected,
                houseCut,
                prizeAmount: state.finalPrizePool
            },
            playersCount: state.finalPlayersCount,
            drawOrder: state.drawOrder,
            gameStartedAt: state.gameStartedAt,
            serverNow: Date.now(),
            winnerData: state.winnerData,
            drawIntervalMs: DRAW_INTERVAL_MS
        });
    }
});
// INSTANT LOCK
app.post('/api/rooms/:roomId/select', (req, res) => {
    const { telegramId, cardId } = req.body;
    const state = checkAndProgressRoomState(req.params.roomId);
    if (state.status !== 'lobby')
        return res.status(400).json({ error: 'Game in progress.' });
    if (state.boughtCards.has(cardId) || (state.reservedCards.has(cardId) && state.reservedCards.get(cardId)?.telegramId !== String(telegramId))) {
        return res.status(400).json({ error: 'Card taken by another player.' });
    }
    let myLockCount = 0;
    for (const res of state.reservedCards.values()) {
        if (res.telegramId === String(telegramId))
            myLockCount++;
    }
    if (myLockCount >= 2)
        return res.status(400).json({ error: 'Max 2 cards.' });
    state.reservedCards.set(cardId, { telegramId: String(telegramId), lockedAt: Date.now() });
    res.json({ success: true });
});
// INSTANT UNLOCK
app.post('/api/rooms/:roomId/deselect', (req, res) => {
    const { telegramId, cardId } = req.body;
    const state = getRoomState(req.params.roomId);
    if (state.status !== 'lobby')
        return res.json({ success: true });
    const resData = state.reservedCards.get(cardId);
    if (resData && resData.telegramId === String(telegramId)) {
        state.reservedCards.delete(cardId);
    }
    res.json({ success: true });
});
// BUY CARDS
app.post('/api/rooms/:roomId/buy', async (req, res) => {
    try {
        const { telegramId, cards, fee } = req.body;
        const state = checkAndProgressRoomState(req.params.roomId);
        if (state.status !== 'lobby')
            return res.status(400).json({ error: 'Game in progress.' });
        const roomFee = state.fee || fee;
        // Verify
        for (const cardId of cards) {
            if (state.boughtCards.has(cardId))
                return res.status(400).json({ error: `Card ${cardId} already bought!` });
            const resData = state.reservedCards.get(cardId);
            if (!resData || resData.telegramId !== String(telegramId))
                return res.status(400).json({ error: `Card ${cardId} not reserved by you!` });
        }
        // Convert to bought
        for (const cardId of cards) {
            state.reservedCards.delete(cardId);
            state.boughtCards.set(cardId, String(telegramId));
        }
        // Deduct DB balance
        const totalCost = cards.length * roomFee;
        const user = await prisma.user.update({
            where: { telegramId: String(telegramId) },
            data: { balance: { decrement: totalCost } }
        });
        // FIX 1 & 2: Calculate total players = R + B for prize
        const uniqueRealPlayerIds = new Set([...state.boughtCards.values()].filter(id => !state.botTelegramIds.has(id)));
        const realPlayerCount = uniqueRealPlayerIds.size;
        const botCount = state.botTelegramIds.size;
        const totalPlayerCount = realPlayerCount + botCount;
        const totalPool = Math.floor(totalPlayerCount * roomFee * 0.8);
        res.json({ success: true, newBalance: user.balance, prizePool: totalPool });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to buy cards.' });
    }
});
// GAME CLAIM WIN
app.post('/api/game/claim-win', async (req, res) => {
    try {
        const { telegramId, username, roomId, cardId, winType, cells, prize } = req.body;
        const state = getRoomState(roomId);
        if (state.status !== 'game')
            return res.status(400).json({ error: 'No active game.' });
        if (state.winnerData)
            return res.status(400).json({ error: 'Game already won.' });
        const conf = exports.roomConfigs[roomId];
        // Chunk 2: Instant Steal
        if (state.sessionMode === 'BOT WIN' || (conf && conf.housePot < prize)) {
            // Bot instantly steals the win!
            const botNames = BOT_NAMES;
            state.winnerData = {
                telegramId: 'bot-steal-' + Math.random(),
                username: botNames[Math.floor(Math.random() * botNames.length)],
                winType: 'BINGO',
                cells: [],
                cardId: 99999
            };
            // FIX 1: Count unique real players, not cards
            const uniqueRealPlayerIds = new Set([...state.boughtCards.values()].filter(id => !state.botTelegramIds.has(id)));
            const realPlayerCount = uniqueRealPlayerIds.size;
            const realFees = realPlayerCount * state.fee;
            if (conf) {
                const platformCut = Math.floor(realFees * 0.2);
                const toPot = realFees - platformCut;
                conf.platformProfit += platformCut;
                conf.housePot += toPot;
                conf.collected += realFees;
                conf.lastSessionData = { type: 'BOT WIN', collected: realFees, cut: platformCut, addedToPot: toPot, prizePaid: 0, potAfter: conf.housePot };
                conf.history = conf.history || [];
                conf.history.unshift({ gameId: conf.sessionsPlayed, type: 'BOT WIN', cut: platformCut, potAfter: conf.housePot });
                if (conf.history.length > 10)
                    conf.history.pop();
                saveRoomConfigToDB(roomId);
            }
            console.log(`🤖 BOT STOLE WIN in Room ${roomId}! Collected: ${realFees}. To Pot: ${Math.floor(realFees * 0.8)}.`);
            setTimeout(() => {
                if (roomStates[roomId] === state)
                    roomStates[roomId] = createFreshRound(state.fee, state.cycleNumber + 1);
            }, 8000);
            return res.status(400).json({ error: 'Game already won by someone else!' });
        }
        // Real player wins!
        if (conf) {
            conf.housePot -= prize;
            if (conf.housePot < 0)
                conf.housePot = 0; // Prevent negative pot
            conf.paidOut += prize;
            conf.lastSessionData = { type: 'REAL WIN', collected: 0, cut: 0, addedToPot: 0, prizePaid: prize, potAfter: conf.housePot };
            conf.history = conf.history || [];
            conf.history.unshift({ gameId: conf.sessionsPlayed, type: 'REAL WIN', prizePaid: prize, potAfter: conf.housePot });
            if (conf.history.length > 10)
                conf.history.pop();
            saveRoomConfigToDB(roomId);
        }
        state.winnerData = {
            telegramId: String(telegramId),
            username: String(username || 'Player'),
            winType,
            cells,
            cardId
        };
        const user = await prisma.user.update({
            where: { telegramId: String(telegramId) },
            data: {
                balance: { increment: prize },
                totalGames: { increment: 1 }
            }
        });
        console.log(`🏆 BINGO! ${username} (${telegramId}) won ${prize} ETB in Room ${roomId}`);
        setTimeout(() => {
            if (roomStates[roomId] === state) {
                roomStates[roomId] = createFreshRound(state.fee, state.cycleNumber + 1);
                console.log(`🔄 Room ${roomId} RESET to LOBBY after win.`);
            }
        }, 8000);
        res.json({ success: true, newBalance: user.balance });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to claim win.' });
    }
});
// Admin: Force-reset a room
app.post('/api/rooms/:roomId/reset', (req, res) => {
    delete roomStates[req.params.roomId];
    console.log(`🔄 Room ${req.params.roomId} force-reset by admin.`);
    res.json({ success: true });
});
// Phase 3: Claim a Bingo win and update balance in PostgreSQL
app.post('/api/game/claim-win', async (req, res) => {
    try {
        const { telegramId, roomId, cardId, winType, prize } = req.body;
        if (!telegramId || !prize || prize <= 0) {
            return res.status(400).json({ error: 'Invalid claim data.' });
        }
        // Update the user's balance and games played in the database
        const user = await prisma.user.update({
            where: { telegramId: String(telegramId) },
            data: {
                balance: { increment: prize },
                totalGames: { increment: 1 } // Increment games played when they finish a game
            },
        });
        console.log(`🏆 WIN: User ${telegramId} won ${prize} ETB in room ${roomId} (card #${cardId}, ${winType})`);
        res.json({
            success: true,
            newBalance: user.balance,
            prize,
            winType,
        });
    }
    catch (error) {
        console.error('Failed to process win claim:', error);
        res.status(500).json({ error: 'Failed to process win.' });
    }
});
// Phase 4: Wallet Endpoints
// Get wallet status (pending txs, balance, totalGames, history)
app.get('/api/wallet/:telegramId/status', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const user = await prisma.user.findUnique({
            where: { telegramId },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const pendingTransaction = user.transactions.find(tx => tx.status === 'PENDING') || null;
        const transactionHistory = user.transactions.filter(tx => tx.status !== 'PENDING' || tx !== pendingTransaction);
        res.json({
            balance: user.balance,
            totalGames: user.totalGames,
            pendingTransaction,
            transactionHistory
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch wallet status.' });
    }
});
// Deposit Request
app.post('/api/wallet/deposit', async (req, res) => {
    try {
        const { telegramId, amount, method, reference } = req.body;
        if (!telegramId || !amount || amount <= 0 || !method || !reference) {
            return res.status(400).json({ error: 'Invalid deposit data' });
        }
        const user = await prisma.user.findUnique({ where: { telegramId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        // Check for existing pending transaction
        const existingPending = await prisma.transaction.findFirst({
            where: { userId: user.id, status: 'PENDING' }
        });
        if (existingPending) {
            return res.status(400).json({ error: 'You already have a pending transaction.' });
        }
        const transaction = await prisma.transaction.create({
            data: {
                userId: user.id,
                type: 'DEPOSIT',
                status: 'PENDING',
                amount: Number(amount),
                method,
                reference
            }
        });
        res.json({ success: true, transaction });
    }
    catch (error) {
        res.status(500).json({ error: 'Deposit failed.' });
    }
});
// Withdraw Request
app.post('/api/wallet/withdraw', async (req, res) => {
    try {
        const { telegramId, amount, reference } = req.body;
        if (!telegramId || !amount || amount < 50 || !reference) {
            return res.status(400).json({ error: 'Invalid withdrawal data. Minimum is 50 ETB.' });
        }
        const user = await prisma.user.findUnique({ where: { telegramId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        if (user.totalGames < 5) {
            return res.status(403).json({ error: 'Must play at least 5 games to withdraw.' });
        }
        if (amount > user.balance) {
            return res.status(400).json({ error: 'Insufficient balance.' });
        }
        // Check for existing pending transaction
        const existingPending = await prisma.transaction.findFirst({
            where: { userId: user.id, status: 'PENDING' }
        });
        if (existingPending) {
            return res.status(400).json({ error: 'You already have a pending transaction.' });
        }
        const transaction = await prisma.transaction.create({
            data: {
                userId: user.id,
                type: 'WITHDRAWAL',
                status: 'PENDING',
                amount: Number(amount),
                reference // Phone number
            }
        });
        res.json({ success: true, transaction });
    }
    catch (error) {
        res.status(500).json({ error: 'Withdrawal failed.' });
    }
});
// Auth route — POST /api/auth
app.use('/api/auth', auth_1.default);
function calculateClosestRealPlayerNeeds(state, currentBallIndex) {
    if (state.boughtCards.size === 0)
        return 5;
    const called = new Set(state.drawOrder.slice(0, currentBallIndex));
    // Get only real player cards (exclude bots)
    const realPlayerCards = [];
    for (const [cardId, ownerId] of state.boughtCards.entries()) {
        if (!state.botTelegramIds.has(ownerId)) {
            realPlayerCards.push(generateBingoCard(cardId));
        }
    }
    if (realPlayerCards.length === 0)
        return 5;
    let globalClosest = 5;
    for (const card of realPlayerCards) {
        // Use the shared getBingoLines function to ensure consistency with steering engine
        const winningLines = getBingoLines(card);
        // For each winning line, count how many numbers are still needed
        for (const line of winningLines) {
            let numbersCalledInLine = 0;
            for (const num of line) {
                // FREE space (0) always counts as called
                if (num === 0 || called.has(num)) {
                    numbersCalledInLine++;
                }
            }
            const numbersNeeded = 5 - numbersCalledInLine;
            if (numbersNeeded < globalClosest) {
                globalClosest = numbersNeeded;
            }
            // Early exit if we found a bingo
            if (globalClosest === 0)
                return 0;
        }
    }
    return globalClosest;
}
// Bot Admin routes
app.get('/api/admin/bots', (req, res) => {
    const roomsData = Object.keys(exports.roomConfigs).map(roomId => {
        const conf = exports.roomConfigs[roomId];
        const state = roomStates[roomId] || createFreshRound();
        const isGame = state.status === 'game';
        let currentBallIndex = 0;
        if (isGame) {
            currentBallIndex = Math.floor((Date.now() - state.gameStartedAt) / DRAW_INTERVAL_MS);
        }
        // R = joined real players (paid, not bots); B = bots in room
        // Count unique real players, not cards (one player can have multiple cards)
        const uniqueRealPlayerIds = new Set([...state.boughtCards.values()].filter(id => !state.botTelegramIds.has(id)));
        const joinedRealCount = uniqueRealPlayerIds.size;
        const botCountNow = state.botTelegramIds.size;
        // FIX 1: Total players = R + B exactly (not cards)
        const totalPlayerCount = joinedRealCount + botCountNow;
        // FIX 2: Prize = total players × entry fee × 0.8 (not cards)
        const feeMatch = roomId.match(/-(\d+)$/);
        const entryFee = feeMatch ? parseInt(feeMatch[1]) : 5;
        const currentPrize = state.finalPrizePool || Math.floor(totalPlayerCount * entryFee * 0.8);
        return {
            id: roomId,
            config: conf,
            state: {
                status: state.status,
                realPlayersCount: joinedRealCount, // R counter: joined & paid only
                botCount: botCountNow, // B counter: bots in room
                displayedTotal: totalPlayerCount, // FIX 1: R + B exactly
                sessionMode: state.sessionMode || 'REAL WIN',
                prizeAmount: currentPrize,
                housePot: conf.housePot || 0,
                prizeThreshold: currentPrize,
                numbersCalled: isGame ? currentBallIndex : 0,
                botWinAtBall: state.botWinAtBall,
                queuedOverrides: conf.overrides,
                botMultiplier: conf.botMultiplier,
                activeSteeringRatio: state.activeSteeringRatio || conf.steeringRatio,
                lastNumberCalled: isGame && currentBallIndex > 0 ? state.drawOrder[currentBallIndex - 1] : null,
                closestRealPlayerNeeds: isGame ? calculateClosestRealPlayerNeeds(state, currentBallIndex) : null,
                timeLeft: state.status === 'lobby' ? Math.max(0, LOBBY_DURATION - Math.floor((Date.now() - state.cycleStartedAt) / 1000)) : 0,
                winnerData: state.winnerData || null,
                winnerType: state.winnerData ? (state.winnerData.telegramId.startsWith('bot') ? 'BOT' : 'REAL PLAYER') : null
            }
        };
    });
    res.json({
        global: { globalBotsEnabled, globalSteeringRatio },
        rooms: roomsData
    });
});
app.post('/api/admin/bots/global', (req, res) => {
    const { enabled, steeringRatio, stopGames } = req.body;
    if (enabled !== undefined)
        globalBotsEnabled = enabled;
    if (steeringRatio !== undefined)
        globalSteeringRatio = steeringRatio;
    if (stopGames) {
        Object.keys(roomStates).forEach(roomId => {
            roomStates[roomId] = createFreshRound();
        });
    }
    res.json({ success: true });
});
app.post('/api/admin/bots/room/:roomId/override', (req, res) => {
    const conf = exports.roomConfigs[req.params.roomId];
    if (!conf)
        return res.status(404).json({ error: 'Room not found' });
    const overrides = { ...req.body };
    // botMultiplier is a permanent room config (not a session override)
    if (overrides.botMultiplier !== undefined) {
        conf.botMultiplier = Math.max(2, Math.min(8, Number(overrides.botMultiplier)));
        delete overrides.botMultiplier;
        saveRoomConfigToDB(req.params.roomId);
    }
    // Directly apply pot top up if passed
    if (overrides.topUpPot) {
        conf.housePot += Number(overrides.topUpPot);
        delete overrides.topUpPot;
    }
    // Handle forceWin deselection (null = remove)
    if (overrides.forceWin === null) {
        delete conf.overrides.forceWin;
        delete overrides.forceWin;
    }
    conf.overrides = { ...conf.overrides, ...overrides };
    saveRoomConfigToDB(req.params.roomId);
    res.json({ success: true });
});
// Admin route
app.use('/api/admin', admin_1.default);
loadRoomConfigsFromDB().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
});
