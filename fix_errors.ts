import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const regex = /\} catch \(error(?:: any)?\) \{\n\s+res\.status\(500\)\.json\(\{ error: "([^"]+)"/g;

content = content.replace(regex, (match, errorMsg) => {
  return `} catch (error: any) {\n      console.error("${errorMsg}:", error);\n      res.status(500).json({ error: "${errorMsg}"`;
});

fs.writeFileSync('server.ts', content);
console.log("Fixed missing console.errors");
