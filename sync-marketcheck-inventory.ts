import dotenv from 'dotenv';
import { MarketcheckInventoryService, type InventorySyncOptions } from './server/services/MarketcheckInventoryService';

dotenv.config({ override: true });

function readNumberArg(name: string): number | undefined {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) return undefined;
  const parsed = Number(value.slice(prefix.length));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readStringArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}

async function main() {
  const options: Partial<InventorySyncOptions> = {
    zip: readStringArg('zip'),
    radius: readNumberArg('radius'),
    rows: readNumberArg('rows'),
    priceMin: readNumberArg('price-min'),
    priceMax: readNumberArg('price-max'),
    milesMin: readNumberArg('miles-min'),
    milesMax: readNumberArg('miles-max'),
    domMin: readNumberArg('dom-min'),
    domMax: readNumberArg('dom-max'),
    dosMin: readNumberArg('dos-min'),
    dosMax: readNumberArg('dos-max'),
    yearMin: readNumberArg('year-min'),
    yearMax: readNumberArg('year-max'),
    vehicleStatus: readStringArg('vehicle-status'),
  };

  const compactOptions = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));
  const result = await MarketcheckInventoryService.syncInventory(compactOptions);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});