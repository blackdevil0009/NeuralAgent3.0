import fs from 'fs';

const dtsPath = 'node_modules/@google/genai/dist/genai.d.ts';
if (fs.existsSync(dtsPath)) {
  const content = fs.readFileSync(dtsPath, 'utf8');
  console.log('--- Searching genai.d.ts for LiveSendClientContentParameters ---');
  const lines = content.split('\n');
  let insideParam = false;
  let count = 0;
  for (const line of lines) {
    if (line.includes('interface LiveSendClientContentParameters') || line.includes('type LiveSendClientContentParameters')) {
      insideParam = true;
    }
    if (insideParam) {
      console.log(line);
      count++;
      if (count > 25 || line.startsWith('}')) {
        break;
      }
    }
  }
}
