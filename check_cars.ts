import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const record = await prisma.siteSettings.findUnique({ where: { id: 'car_db' } });
  if (record) {
    console.log("Size of car_db data:", record.data.length, "bytes");
    const data = JSON.parse(record.data);
    console.log("Makes count:", data.makes?.length);
    if (data.makes?.length > 0) {
      console.log("First make:", data.makes[0].name);
      console.log("Models count:", data.makes[0].models?.length);
      if (data.makes[0].models?.length > 0) {
        console.log("First model:", data.makes[0].models[0]);
        console.log("Trims count:", data.makes[0].models[0].trims?.length);
        if (data.makes[0].models[0].trims?.length > 0) {
          console.log("First trim:", data.makes[0].models[0].trims[0]);
        }
      }
    }
  } else {
    console.log("No car_db record found");
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
