import { getVal } from './src/utils/finance';

const data = {
  msrp: { value: 25324, provenance_status: "catalog" }
};

console.log('msrp:', getVal(data.msrp));
