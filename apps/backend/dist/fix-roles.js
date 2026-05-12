"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    // Update any MODERATOR admins to SUPER_ADMIN before enum migration
    const result = await prisma.$executeRaw `UPDATE "Admin" SET role = 'SUPER_ADMIN' WHERE role = 'MODERATOR'`;
    console.log(`Updated ${result} admin(s) from MODERATOR to SUPER_ADMIN`);
    await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
