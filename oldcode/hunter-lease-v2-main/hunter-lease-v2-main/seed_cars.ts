import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const dummyCarDb = {
  makes: [
    {
      name: "Toyota",
      models: [
        {
          name: "Camry",
          trims: [
            { id: "camry-le", name: "LE", msrp: 26420, vehicleId: "camry-le", lenderId: "tfs", rv36: 0.58, mf: 0.00215, apr: 4.99 },
            { id: "camry-se", name: "SE", msrp: 27960, vehicleId: "camry-se", lenderId: "tfs", rv36: 0.57, mf: 0.00215, apr: 4.99 },
            { id: "camry-xse", name: "XSE", msrp: 31720, vehicleId: "camry-xse", lenderId: "tfs", rv36: 0.56, mf: 0.00215, apr: 4.99 }
          ]
        },
        {
          name: "RAV4",
          trims: [
            { id: "rav4-le", name: "LE", msrp: 28475, vehicleId: "rav4-le", lenderId: "tfs", rv36: 0.62, mf: 0.00225, apr: 5.49 },
            { id: "rav4-xle", name: "XLE", msrp: 29985, vehicleId: "rav4-xle", lenderId: "tfs", rv36: 0.61, mf: 0.00225, apr: 5.49 }
          ]
        }
      ]
    },
    {
      name: "Honda",
      models: [
        {
          name: "Civic",
          trims: [
            { id: "civic-lx", name: "LX", msrp: 23950, vehicleId: "civic-lx", lenderId: "hfs", rv36: 0.64, mf: 0.00210, apr: 4.99 },
            { 
              id: "civic-sport", 
              name: "Sport", 
              msrp: 25550, 
              vehicleId: "civic-sport", 
              lenderId: "hfs", 
              rv36: 0.63, 
              mf: 0.00210, 
              apr: 4.99,
              availableIncentives: [
                { id: "honda-grad", name: "College Grad Program", nameRu: "Программа для выпускников", amount: 500, description: "For recent college graduates.", descriptionRu: "Для недавних выпускников колледжей.", type: "rebate" },
                { id: "honda-military", name: "Military Appreciation", nameRu: "Военная программа", amount: 500, description: "For active duty and retired military.", descriptionRu: "Для действующих и отставных военных.", type: "rebate" },
                { id: "honda-loyalty", name: "Honda Loyalty", nameRu: "Лояльность Honda", amount: 750, description: "For current Honda owners.", descriptionRu: "Для текущих владельцев Honda.", type: "loyalty" }
              ]
            }
          ]
        },
        {
          name: "Accord",
          trims: [
            { id: "accord-lx", name: "LX", msrp: 27895, vehicleId: "accord-lx", lenderId: "hfs", rv36: 0.59, mf: 0.00220, apr: 5.29 },
            { id: "accord-ex", name: "EX", msrp: 29910, vehicleId: "accord-ex", lenderId: "hfs", rv36: 0.58, mf: 0.00220, apr: 5.29 }
          ]
        }
      ]
    }
  ]
};

async function seed() {
  await prisma.siteSettings.upsert({
    where: { id: 'car_db' },
    update: { data: JSON.stringify(dummyCarDb) },
    create: { id: 'car_db', data: JSON.stringify(dummyCarDb) }
  });
  console.log("Seeded car_db");
}

seed().catch(console.error).finally(() => prisma.$disconnect());
