import { readFileSync } from 'fs';
const file = readFileSync('dist/assets/pdf.worker.min-C8C3nV5T.js', 'utf-8');
console.log(file.slice(0, 100));
