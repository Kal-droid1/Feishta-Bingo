"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// POST /api/auth
// Body: { telegramId: string, username?: string, firstName?: string, lastName?: string }
router.post('/', async (req, res) => {
    const { telegramId, username, firstName, lastName } = req.body;
    if (!telegramId) {
        return res.status(400).json({ error: 'telegramId is required.' });
    }
    try {
        // 1. Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { telegramId: String(telegramId) },
        });
        if (existingUser) {
            // EXISTING user — return their data
            return res.status(200).json({
                isNew: false,
                user: existingUser,
            });
        }
        // 2. NEW user — create with a starting balance of 100 Birr (as per request)
        const newUser = await prisma.user.create({
            data: {
                telegramId: String(telegramId),
                username: username ?? null,
                firstName: firstName ?? null,
                lastName: lastName ?? null,
                balance: 100,
            },
        });
        return res.status(201).json({
            isNew: true,
            user: newUser,
        });
    }
    catch (error) {
        if (error.code === 'P2002') {
            const user = await prisma.user.findUnique({
                where: { telegramId: String(telegramId) },
            });
            return res.status(200).json({ isNew: false, user });
        }
        console.error('[auth] Error during authentication:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});
// POST /api/auth/phone
router.post('/phone', async (req, res) => {
    const { telegramId, phone } = req.body;
    if (!telegramId || !phone) {
        return res.status(400).json({ error: 'telegramId and phone are required.' });
    }
    try {
        const user = await prisma.user.update({
            where: { telegramId: String(telegramId) },
            data: { phone: String(phone) }
        });
        return res.json({ success: true, user });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to update phone number.' });
    }
});
exports.default = router;
