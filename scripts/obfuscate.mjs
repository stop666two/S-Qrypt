/**
 * S-Qrypt Control Flow Flattening Build Script
 * Extracts inline JS from template strings in homeHtml.ts / cryptoSandboxHtml.ts,
 * applies javascript-obfuscator controlFlowFlattening, and re-embeds.
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '../src/') + '/';
const FILES = ['homeHtml.ts', 'cryptoSandboxHtml.ts'];

function extractJS(content, file) {
  // Find the <script> ... </script> section
  const scriptStart = content.indexOf('<script>');
  const scriptEnd = content.lastIndexOf('</script>');
  if (scriptStart === -1 || scriptEnd === -1) {
    console.log(`  [skip] no <script> found in ${file}`);
    return null;
  }
  // Extract JS including the tag markers for re-embedding
  const before = content.slice(0, scriptStart);
  const jsRaw = content.slice(scriptStart + '<script>'.length, scriptEnd);
  const after = content.slice(scriptEnd + '</script>'.length);
  return { before, js: jsRaw, after };
}

function obfuscateJS(js) {
  // Write JS to temp file, run obfuscator, read back
  const tmpDir = resolve(__dirname, '../');
  const tmpIn = resolve(tmpDir, '__tmp_in.js');
  const tmpOut = resolve(tmpDir, '__tmp_out.js');
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
    return obfuscated;
  } catch (e) {
    console.error(`  obfuscation error: ${e.message}`);
    return js; // fallback to original
  } finally {
    try {
      if (existsSync(tmpIn)) unlinkSync(tmpIn);
      if (existsSync(tmpOut)) unlinkSync(tmpOut);
    } catch (_) {}
  }
}

for (const file of FILES) {
  console.log(`Processing ${file}...`);
  const path = `${SRC_DIR}${file}`;
  const content = readFileSync(path, 'utf-8');
  const parts = extractJS(content, file);
  if (!parts) continue;

  const obfJS = obfuscateJS(parts.js);
  console.log(`  JS length: ${parts.js.length} chars → obfuscated: ${obfJS.length} chars`);
  const newContent = parts.before + '<script>' + obfJS + '</script>' + parts.after;
  writeFileSync(path, newContent, 'utf-8');
  console.log(`  Written to ${file}`);
}
console.log('Done.');
