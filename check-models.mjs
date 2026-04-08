import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const models = await p.vehicleModel.findMany({ take: 10 });
console.log(JSON.stringify(models.map(m => ({ id: m.id, name: m.name, makeId: m.makeId })), null, 2));
await p.$disconnect();
