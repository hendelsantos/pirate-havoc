import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const source = resolve(process.argv[2] ?? '');
const target = resolve(process.argv[3] ?? '');

if (!process.argv[2] || !process.argv[3]) {
  throw new Error('Usage: node scripts/sync-official-assets.mjs <source-assets> <target-assets>');
}

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true, force: true, preserveTimestamps: true });

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'asset-manifest.json' || entry.name === 'README.md') continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

const files = (await collect(target)).sort((a, b) => a.localeCompare(b));
const inventory = [];
for (const absolute of files) {
  const contents = await readFile(absolute);
  inventory.push({
    path: relative(target, absolute).replaceAll('\\', '/'),
    extension: extname(absolute).toLowerCase(),
    bytes: contents.byteLength,
    sha256: createHash('sha256').update(contents).digest('hex'),
  });
}

await writeFile(
  join(target, 'asset-manifest.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), source: 'junglegaming/game-developer-challenge', files: inventory }, null, 2)}\n`,
  'utf8',
);

console.log(`Synced and inventoried ${inventory.length} official asset files.`);

