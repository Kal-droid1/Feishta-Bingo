"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("./index");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-admin-key-feshta';
// --- Auth Middleware ---
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized. No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Unauthorized. Invalid token.' });
    }
};
const requireSuperAdmin = (req, res, next) => {
    if (req.admin.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
    }
    next();
};
async function logAdminAction(admin, action, target) {
    try {
        await prisma.adminLog.create({
            data: {
                adminId: admin.id,
                adminName: admin.username,
                action,
                target
            }
        });
    }
    catch (e) {
        console.error('Failed to log admin action:', e);
    }
}
// --- Initialization / Login ---
router.post('/init', async (req, res) => {
    try {
        const adminCount = await prisma.admin.count();
        if (adminCount > 0) {
            return res.status(400).json({ error: 'Admin already initialized' });
        }
        const { username, password } = req.body;
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        await prisma.admin.create({
            data: { username, password: hashedPassword, role: 'SUPER_ADMIN' }
        });
        res.json({ success: true, message: 'Super Admin created successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to init admin' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await prisma.admin.findUnique({ where: { username } });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isValid = await bcryptjs_1.default.compare(password, admin.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ id: admin.id, username: admin.username, role: admin.role }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ success: true, token, role: admin.role, username: admin.username });
    }
    catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});
// Protect all routes below
router.use(authenticateAdmin);
// --- Staff Management & Profile ---
router.get('/staff', requireSuperAdmin, async (req, res) => {
    try {
        const staff = await prisma.admin.findMany({ select: { id: true, username: true, role: true, createdAt: true } });
        res.json(staff);
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to fetch staff' });
    }
});
router.post('/staff', requireSuperAdmin, async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const admin = await prisma.admin.create({
            data: { username, password: hashedPassword, role }
        });
        res.json({ success: true, admin: { id: admin.id, username: admin.username, role: admin.role } });
    }
    catch (e) {
        res.status(400).json({ error: 'Failed to create staff member' });
    }
});
router.delete('/staff/:id', requireSuperAdmin, async (req, res) => {
    try {
        await prisma.admin.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(400).json({ error: 'Failed to delete staff member' });
    }
});
router.post('/change-password', async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const adminId = req.admin.id;
        const admin = await prisma.admin.findUnique({ where: { id: adminId } });
        if (!admin)
            return res.status(404).json({ error: 'Admin not found' });
        const isValid = await bcryptjs_1.default.compare(oldPassword, admin.password);
        if (!isValid)
            return res.status(400).json({ error: 'Invalid old password' });
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma.admin.update({ where: { id: adminId }, data: { password: hashed } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to change password' });
    }
});
// --- The "Money Hub" ---
router.get('/transactions/pending', async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { status: 'PENDING' },
            include: { user: true },
            orderBy: { createdAt: 'asc' }
        });
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
router.get('/transactions', async (req, res) => {
    try {
        const { type, status, q } = req.query;
        const where = {};
        if (type && type !== 'ALL')
            where.type = type;
        if (status && status !== 'ALL')
            where.status = status;
        if (q) {
            where.user = {
                OR: [
                    { username: { contains: q, mode: 'insensitive' } },
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { telegramId: { contains: q } },
                    { phone: { contains: q } }
                ]
            };
        }
        const transactions = await prisma.transaction.findMany({
            where,
            include: { user: { select: { firstName: true, username: true, telegramId: true, phone: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
router.post('/transactions/:id/approve', async (req, res) => {
    const txId = parseInt(req.params.id);
    try {
        const result = await prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.findUnique({ where: { id: txId }, include: { user: true } });
            if (!transaction || transaction.status !== 'PENDING') {
                throw new Error('Transaction not found or not pending');
            }
            const updatedTx = await tx.transaction.update({
                where: { id: txId },
                data: { status: 'APPROVED' }
            });
            if (transaction.type === 'DEPOSIT') {
                await tx.user.update({
                    where: { id: transaction.userId },
                    data: { balance: { increment: transaction.amount } }
                });
            }
            else if (transaction.type === 'WITHDRAWAL') {
                if (transaction.user.balance < transaction.amount) {
                    throw new Error('User has insufficient balance for this withdrawal');
                }
                await tx.user.update({
                    where: { id: transaction.userId },
                    data: { balance: { decrement: transaction.amount } }
                });
            }
            return { updatedTx, transaction };
        });
        // Fire and forget log
        logAdminAction(req.admin, `Approved ${result.transaction.type}`, `Tx ID: ${txId} | User: ${result.transaction.user.telegramId} | Amount: ${result.transaction.amount}`);
        res.json({ success: true, transaction: result.updatedTx });
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to approve transaction' });
    }
});
router.post('/transactions/:id/reject', async (req, res) => {
    const txId = parseInt(req.params.id);
    try {
        const tx = await prisma.transaction.findUnique({ where: { id: txId }, include: { user: true } });
        const updatedTx = await prisma.transaction.update({
            where: { id: txId },
            data: { status: 'REJECTED' }
        });
        if (tx) {
            logAdminAction(req.admin, `Rejected ${tx.type}`, `Tx ID: ${txId} | User: ${tx.user.telegramId} | Amount: ${tx.amount}`);
        }
        res.json({ success: true, transaction: updatedTx });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reject transaction' });
    }
});
// --- User Management ---
router.get('/users/search', async (req, res) => {
    const query = req.query.q || '';
    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { telegramId: { contains: query } },
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query } }
                ]
            },
            include: {
                transactions: { orderBy: { createdAt: 'desc' }, take: 5 }
            },
            take: 50
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});
router.post('/users/:id/adjust-balance', async (req, res) => {
    const userId = parseInt(req.params.id);
    const { amount } = req.body;
    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { balance: { increment: amount } }
        });
        // Log action
        logAdminAction(req.admin, 'Adjusted Balance', `User: ${updatedUser.telegramId} | Amount: ${amount}`);
        res.json({ success: true, balance: updatedUser.balance });
    }
    catch (error) {
        res.status(500).json({ error: 'Balance adjustment failed' });
    }
});
router.post('/users/:id/toggle-ban', async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { isBanned: !user.isBanned }
        });
        // Log action
        logAdminAction(req.admin, updatedUser.isBanned ? 'Suspended User' : 'Unbanned User', `User: ${updatedUser.telegramId}`);
        res.json({ success: true, isBanned: updatedUser.isBanned });
    }
    catch (error) {
        res.status(500).json({ error: 'Toggle ban failed' });
    }
});
// --- Game & Room Config ---
router.get('/settings', async (req, res) => {
    try {
        const settings = await prisma.systemSetting.findMany();
        const settingsObj = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        const defaultSettings = {
            room1_fee: '5',
            room2_fee: '10',
            room3_fee: '50',
            house_cut: '20',
            min_deposit: '10',
            max_withdrawal: '1000',
            telebirr_phone: '0991538407',
            telebirr_name: 'Kaleab Girma',
            cbe_account: '1000123456789',
            cbe_name: 'Kaleab Girma'
        };
        res.json({ ...defaultSettings, ...settingsObj });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
router.post('/settings', async (req, res) => {
    const updates = req.body;
    try {
        for (const [key, value] of Object.entries(updates)) {
            await prisma.systemSetting.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) }
            });
        }
        // Log action
        logAdminAction(req.admin, 'Updated System Settings', 'Configuration');
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// --- Business Analytics ---
router.get('/analytics', async (req, res) => {
    try {
        const range = req.query.range || 'TODAY';
        let dateFilter = {};
        const now = new Date();
        if (range === 'TODAY') {
            const start = new Date(now.setHours(0, 0, 0, 0));
            dateFilter = { gte: start };
        }
        else if (range === 'YESTERDAY') {
            const start = new Date(now);
            start.setDate(now.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            const end = new Date(now);
            end.setDate(now.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            dateFilter = { gte: start, lte: end };
        }
        else if (range === 'THIS_WEEK') {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            dateFilter = { gte: start };
        }
        else if (range === 'THIS_MONTH') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter = { gte: start };
        }
        // 1. User deposits/withdrawals for escrow tracking
        const totalDepositsAll = await prisma.transaction.aggregate({ where: { type: 'DEPOSIT', status: 'APPROVED' }, _sum: { amount: true } });
        const totalWithdrawalsAll = await prisma.transaction.aggregate({ where: { type: 'WITHDRAWAL', status: 'APPROVED' }, _sum: { amount: true } });
        const userBalances = await prisma.user.aggregate({ _sum: { balance: true } });
        const deposits = totalDepositsAll._sum.amount || 0;
        const withdrawals = totalWithdrawalsAll._sum.amount || 0;
        const totalUserBalances = userBalances._sum.balance || 0;
        // 2. Net Profit = sum of all platform cuts across all rooms (never negative)
        // Bot wins generate platform cut (income), real wins pay from house pot (no cut)
        let netProfit = 0;
        const roomBreakdown = {};
        for (const [roomId, conf] of Object.entries(index_1.roomConfigs)) {
            netProfit += conf.platformProfit || 0;
            // Get entry fee from roomId (e.g., 'room-5' -> 5, 'room-10' -> 10)
            const feeMatch = roomId.match(/-(\d+)$/);
            const entryFee = feeMatch ? parseInt(feeMatch[1]) : 0;
            roomBreakdown[roomId] = {
                platformProfit: conf.platformProfit || 0,
                housePot: conf.housePot || 0,
                entryFee
            };
        }
        // 3. Time-filtered aggregates
        const periodDepositsAgg = await prisma.transaction.aggregate({ where: { type: 'DEPOSIT', status: 'APPROVED', createdAt: dateFilter }, _sum: { amount: true } });
        const periodDeposits = periodDepositsAgg._sum.amount || 0;
        const totalUsers = await prisma.user.count();
        // 4. Chart data (last 7 days)
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const endD = new Date(d);
            endD.setHours(23, 59, 59, 999);
            const deps = await prisma.transaction.aggregate({ where: { type: 'DEPOSIT', status: 'APPROVED', createdAt: { gte: d, lte: endD } }, _sum: { amount: true } });
            const users = await prisma.user.count({ where: { createdAt: { gte: d, lte: endD } } });
            chartData.push({
                date: d.toLocaleDateString('en-US', { weekday: 'short' }),
                revenue: deps._sum.amount || 0,
                users: users
            });
        }
        res.json({
            netProfit,
            roomBreakdown,
            totalUserBalances,
            totalDeposits: deposits,
            totalWithdrawals: withdrawals,
            periodDeposits,
            totalUsers,
            chartData
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
// --- Audit Log ---
router.get('/logs', requireSuperAdmin, async (req, res) => {
    try {
        const logs = await prisma.adminLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 200
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});
exports.default = router;
