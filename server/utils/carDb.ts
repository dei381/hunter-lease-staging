import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export const getCarDb = async () => {
  try {
    const makes = await prisma.vehicleMake.findMany({
      where: { isActive: true },
      include: {
        models: {
          where: { isActive: true },
          include: {
            trims: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    const formattedMakes = makes.map(make => ({
      id: make.name.toLowerCase().replace(/\s+/g, '-'),
      name: make.name,
      tiers: [
        { id: "t1", label: "Tier 1", score: "740+", aprAdd: 0, mfAdd: 0, cls: "r1" },
        { id: "t2", label: "Tier 2", score: "700–739", aprAdd: 1.5, mfAdd: 0.00040, cls: "r2" },
        { id: "t3", label: "Tier 3", score: "660–699", aprAdd: 4.5, mfAdd: 0.00120, cls: "r3" },
        { id: "t4", label: "Tier 4", score: "620–659", aprAdd: 9.0, mfAdd: 0.00240, cls: "r4" }
      ],
      baseMF: 0.002,
      baseAPR: 6.9,
      models: make.models.map(model => ({
        id: model.name.toLowerCase().replace(/\s+/g, '-'),
        name: model.name,
        class: 'Unknown',
        msrpRange: '',
        years: model.years && model.years.length > 0 ? model.years : [new Date().getFullYear()],
        imageUrl: model.imageUrl,
        mf: 0.00150,
        rv36: 0.60,
        baseAPR: 4.9,
        leaseCash: 0,
        trims: model.trims.map(trim => ({
          name: trim.name,
          msrp: trim.msrpCents / 100,
          mf: trim.baseMF,
          apr: trim.baseAPR,
          rv36: trim.rv36,
          leaseCash: trim.leaseCashCents / 100
        }))
      }))
    }));

    return { makes: formattedMakes };
  } catch (error) {
    console.error("Error in getCarDb:", error);
    return { makes: [] };
  }
};

export const saveCarDb = async (data: any) => {
  try {
    const makes = data.makes || [];

    // Now sync to the new relational tables
    const currentMakeNames = makes.map((m: any) => m.name).filter(Boolean);
    
    // Deactivate makes not in the payload
    if (currentMakeNames.length > 0) {
      await prisma.vehicleMake.updateMany({
        where: { name: { notIn: currentMakeNames } },
        data: { isActive: false }
      });
    }

    for (const makeData of makes) {
      if (!makeData.name) continue;
      
      const make = await prisma.vehicleMake.upsert({
        where: { name: makeData.name },
        update: { isActive: true },
        create: { name: makeData.name, isActive: true }
      });

      const models = makeData.models || [];
      const currentModelNames = models.map((m: any) => m.name).filter(Boolean);
      
      if (currentModelNames.length > 0) {
        await prisma.vehicleModel.updateMany({
          where: { makeId: make.id, name: { notIn: currentModelNames } },
          data: { isActive: false }
        });
      } else {
        await prisma.vehicleModel.updateMany({
          where: { makeId: make.id },
          data: { isActive: false }
        });
      }

      for (const modelData of models) {
        if (!modelData.name) continue;
        
        let years = [];
        if (Array.isArray(modelData.years)) {
          years = modelData.years.map((y: any) => parseInt(y)).filter((y: number) => !isNaN(y));
        } else if (typeof modelData.years === 'string' || typeof modelData.years === 'number') {
          const parsed = parseInt(modelData.years as string);
          if (!isNaN(parsed)) years = [parsed];
        }

        if (years.length === 0) years = [new Date().getFullYear()];

        const model = await prisma.vehicleModel.upsert({
          where: { makeId_name: { makeId: make.id, name: modelData.name } },
          update: { 
            isActive: true,
            years,
            imageUrl: modelData.imageUrl || null
          },
          create: {
            makeId: make.id,
            name: modelData.name,
            years,
            imageUrl: modelData.imageUrl || null,
            isActive: true
          }
        });

        const trims = modelData.trims || [];
        const currentTrimNames = trims.map((t: any) => t.name).filter(Boolean);
        
        if (currentTrimNames.length > 0) {
          await prisma.vehicleTrim.updateMany({
            where: { modelId: model.id, name: { notIn: currentTrimNames } },
            data: { isActive: false }
          });
        } else {
          await prisma.vehicleTrim.updateMany({
            where: { modelId: model.id },
            data: { isActive: false }
          });
        }

        for (const trimData of trims) {
          if (!trimData.name) continue;
          
          await prisma.vehicleTrim.upsert({
            where: { modelId_name: { modelId: model.id, name: trimData.name } },
            update: {
              isActive: true,
              msrpCents: Math.round(Number(trimData.msrp || 0) * 100),
              baseMF: Number(trimData.mf || 0),
              baseAPR: Number(trimData.apr || 0),
              rv36: Number(trimData.rv36 || 0),
              leaseCashCents: Math.round(Number(trimData.leaseCash || 0) * 100)
            },
            create: {
              modelId: model.id,
              name: trimData.name,
              msrpCents: Math.round(Number(trimData.msrp || 0) * 100),
              baseMF: Number(trimData.mf || 0),
              baseAPR: Number(trimData.apr || 0),
              rv36: Number(trimData.rv36 || 0),
              leaseCashCents: Math.round(Number(trimData.leaseCash || 0) * 100),
              isActive: true
            }
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed to save CAR_DB to database:", error);
  }
};
