"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    // List all admins first
    const admins = await prisma.admin.findMany({ select: { id: true, username: true, role: true } });
    console.log('Current admins:', JSON.stringify(admins, null, 2));
    // Reset the SUPER_ADMIN's password
    const superAdmin = admins.find(a => a.role === 'SUPER_ADMIN');
    if (!superAdmin) {
        console.log('No SUPER_ADMIN found!');
        return;
    }
    const newPassword = 'Feshta@2025';
    const hashed = await bcryptjs_1.default.hash(newPassword, 10);
    await prisma.admin.update({
        where: { id: superAdmin.id },
        data: { password: hashed }
    });
    console.log(`\n✅ Password reset for "${superAdmin.username}" (${superAdmin.role})`);
    console.log(`   Username: ${superAdmin.username}`);
    console.log(`   Password: ${newPassword}`);
    await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
