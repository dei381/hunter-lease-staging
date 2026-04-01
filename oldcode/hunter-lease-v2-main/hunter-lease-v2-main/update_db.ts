import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateDb() {
  const correctCarDb = {
    makes: [
      {
        name: "Toyota",
        destinationFee: 1095,
        rules: {
          mileageRV: { "7500": 1, "10000": 0, "12000": -1, "15000": -2 },
          tierMF: { "t1": 0, "t2": 0.00020, "t3": 0.00045, "t4": 0.00085 }
        },
        models: [
          {
            name: "Camry",
            trims: [
              { id: "camry-le-2026", name: "LE (2026)", msrp: 29495, rv36: 58, mf: 0.00210, baseAPR: 4.9, leaseCash: 500 },
              { id: "camry-se-2026", name: "SE (2026)", msrp: 31795, rv36: 59, mf: 0.00210, baseAPR: 4.9, leaseCash: 500 },
              { id: "camry-xle-2026", name: "XLE (2026)", msrp: 34495, rv36: 56, mf: 0.00210, baseAPR: 4.9, leaseCash: 500 }
            ]
          },
          {
            name: "RAV4",
            trims: [
              { id: "rav4-le-2026", name: "LE (2026)", msrp: 29970, rv36: 62, mf: 0.00240, baseAPR: 5.9, leaseCash: 0 },
              { id: "rav4-xle-2026", name: "XLE (2026)", msrp: 31480, rv36: 61, mf: 0.00240, baseAPR: 5.9, leaseCash: 0 },
              { id: "rav4-limited-2026", name: "Limited (2026)", msrp: 38275, rv36: 59, mf: 0.00240, baseAPR: 5.9, leaseCash: 0 }
            ]
          },
          {
            name: "Prius",
            trims: [
              { id: "prius-le-2026", name: "LE (2026)", msrp: 29045, rv36: 63, mf: 0.00220, baseAPR: 4.9, leaseCash: 0 },
              { id: "prius-xle-2026", name: "XLE (2026)", msrp: 32490, rv36: 61, mf: 0.00220, baseAPR: 4.9, leaseCash: 0 }
            ]
          }
        ]
      },
      {
        name: "BMW",
        destinationFee: 1175,
        rules: {
          mileageRV: { "7500": 1, "10000": 0, "12000": -1, "15000": -3 },
          tierMF: { "t1": 0, "t2": 0.00025, "t3": 0.00060, "t4": 0.00100 }
        },
        models: [
          {
            name: "3 Series",
            trims: [
              { id: "330i-2026", name: "330i (2026)", msrp: 46675, rv36: 57, mf: 0.00210, baseAPR: 4.9, leaseCash: 1000 },
              { id: "m340i-2026", name: "M340i (2026)", msrp: 58775, rv36: 55, mf: 0.00210, baseAPR: 4.9, leaseCash: 1000 }
            ]
          },
          {
            name: "5 Series",
            trims: [
              { id: "530i-2026", name: "530i (2026)", msrp: 59375, rv36: 54, mf: 0.00220, baseAPR: 5.2, leaseCash: 1500 },
              { id: "i5-edrive40-2026", name: "i5 eDrive40 (2026)", msrp: 68975, rv36: 52, mf: 0.00190, baseAPR: 4.9, leaseCash: 7500 }
            ]
          },
          {
            name: "X5",
            trims: [
              { id: "x5-40i-2026", name: "sDrive40i (2026)", msrp: 66375, rv36: 54, mf: 0.00210, baseAPR: 4.9, leaseCash: 1000 },
              { id: "x5-xdrive40i-2026", name: "xDrive40i (2026)", msrp: 68675, rv36: 53, mf: 0.00210, baseAPR: 4.9, leaseCash: 1000 }
            ]
          }
        ]
      },
      {
        name: "Kia",
        destinationFee: 1325,
        rules: {
          mileageRV: { "7500": 1, "10000": 0, "12000": -1, "15000": -3 },
          tierMF: { "t1": 0, "t2": 0.00020, "t3": 0.00050, "t4": 0.00090 }
        },
        models: [
          {
            name: "Sportage",
            trims: [
              { id: "sportage-lx-2026", name: "LX (2026)", msrp: 28515, rv36: 60, mf: 0.00230, baseAPR: 5.4, leaseCash: 1000 },
              { id: "sportage-ex-2026", name: "EX (2026)", msrp: 30415, rv36: 59, mf: 0.00230, baseAPR: 5.4, leaseCash: 1000 },
              { id: "sportage-sx-2026", name: "SX Prestige (2026)", msrp: 35915, rv36: 57, mf: 0.00230, baseAPR: 5.4, leaseCash: 1000 }
            ]
          },
          {
            name: "Telluride",
            trims: [
              { id: "telluride-s-2026", name: "S (2026)", msrp: 39215, rv36: 64, mf: 0.00260, baseAPR: 6.5, leaseCash: 0 },
              { id: "telluride-ex-2026", name: "EX (2026)", msrp: 42915, rv36: 62, mf: 0.00260, baseAPR: 6.5, leaseCash: 0 },
              { id: "telluride-sx-2026", name: "SX (2026)", msrp: 47115, rv36: 60, mf: 0.00260, baseAPR: 6.5, leaseCash: 0 }
            ]
          },
          {
            name: "EV9",
            trims: [
              { id: "ev9-light-2026", name: "Light RWD (2026)", msrp: 56225, rv36: 55, mf: 0.00050, baseAPR: 2.9, leaseCash: 7500 },
              { id: "ev9-wind-2026", name: "Wind AWD (2026)", msrp: 65225, rv36: 53, mf: 0.00050, baseAPR: 2.9, leaseCash: 7500 }
            ]
          }
        ]
      }
    ]
  };

  await prisma.siteSettings.upsert({
    where: { id: 'car_db' },
    update: { data: JSON.stringify(correctCarDb) },
    create: { id: 'car_db', data: JSON.stringify(correctCarDb) }
  });

  console.log("Database updated with correct CA-specific data (MSRP including destination fee)");
  await prisma.$disconnect();
}

updateDb();
