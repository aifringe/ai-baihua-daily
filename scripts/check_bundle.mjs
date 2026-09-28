import {gzipSync} from 'node:zlib';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const directory = 'dist/assets';
const files = readdirSync(directory);
const totals = {js: 0, css: 0};
for (const file of files) {
  const extension = file.endsWith('.js') ? 'js' : file.endsWith('.css') ? 'css' : null;
  if (extension) totals[extension] += gzipSync(readFileSync(join(directory, file))).length;
}
const limits = {js: 155 * 1024, css: 15 * 1024};
console.log(`gzip bundle: JS ${(totals.js / 1024).toFixed(1)} KiB, CSS ${(totals.css / 1024).toFixed(1)} KiB`);
for (const type of ['js', 'css']) {
  if (totals[type] > limits[type]) {
    throw new Error(`${type.toUpperCase()} bundle exceeds ${(limits[type] / 1024).toFixed(0)} KiB budget`);
  }
}
