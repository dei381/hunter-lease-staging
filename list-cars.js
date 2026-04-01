const fs = require('fs');
const path = require('path');

const carsPath = path.join(process.cwd(), 'server', 'data', 'cars.json');
const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

let output = '';
carsData.makes.forEach(make => {
  output += `\n### ${make.name}\n`;
  make.models.forEach(model => {
    output += `- **${model.name}**\n`;
    if (model.trims && model.trims.length > 0) {
      model.trims.forEach(trim => {
        output += `  - ${trim.name}: $${trim.msrp.toLocaleString('en-US')}\n`;
      });
    } else {
      output += `  - (Нет данных о комплектациях)\n`;
    }
  });
});

console.log(output);
