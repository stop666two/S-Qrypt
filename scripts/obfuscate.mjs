/**
 * S-Qrypt Control Flow Flattening Build Script
 * src/app.client.txt holds the SPA's JavaScript as a plain text asset; it is
 * obfuscated in place and restored by scripts/deploy.mjs afterwards.
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '../src/') + '/';
const FILES = ['app.client.txt'];

function obfuscateJS(js) {
  // Write JS to temp file, run obfuscator, read back
  const tmpDir = resolve(__dirname, '../');
  const tmpIn = resolve(tmpDir, '__tmp_in.js');
  const tmpOut = resolve(tmpDir, '__tmp_out.js');
  const tmpCheck = resolve(tmpDir, '__tmp_check.js');
  writeFileSync(tmpIn, js, 'utf-8');
  try {
    execSync(
      `javascript-obfuscator "${tmpIn}" --output "${tmpOut}" ` +
      `--control-flow-flattening true ` +
      `--control-flow-flattening-threshold 0.8 ` +
      `--string-array-encoding none ` +
      `--string-array-threshold 0 ` +
      `--rename-globals false ` +
      `--compact true ` +
      `--self-defending false ` +
      `--disable-console-output false`,
      { stdio: 'pipe', timeout: 60000, shell: true, cwd: tmpDir }
    );
    const obfuscated = readFileSync(tmpOut, 'utf-8');
    if (!obfuscated || obfuscated.trim().length === 0) {
      throw new Error('obfuscator produced empty output');
    }
    if (obfuscated === js) {
      throw new Error('obfuscator returned the input unchanged');
    }
    writeFileSync(tmpCheck, obfuscated, 'utf-8');
    execSync('node --check "' + tmpCheck + '"', { stdio: 'pipe', timeout: 30000, shell: true, cwd: tmpDir });
    unlinkSync(tmpCheck);
    return obfuscated;
  } finally {
    try {
      if (existsSync(tmpIn)) unlinkSync(tmpIn);
      if (existsSync(tmpOut)) unlinkSync(tmpOut);
      if (existsSync(tmpCheck)) unlinkSync(tmpCheck);
    } catch (_) {}
  }
}

for (const file of FILES) {
  console.log(`Processing ${file}...`);
  const path = `${SRC_DIR}${file}`;
  const js = readFileSync(path, 'utf-8');
  const obfJS = obfuscateJS(js);
  console.log(`  JS length: ${js.length} chars → obfuscated: ${obfJS.length} chars`);
  writeFileSync(path, obfJS, 'utf-8');
  console.log(`  Written to ${file}`);
}
console.log('Done.');
