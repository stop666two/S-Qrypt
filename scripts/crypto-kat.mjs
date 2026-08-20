import { readFileSync } from 'fs';
import { runInNewContext } from 'vm';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = readFileSync(join(root, 'src', 'cryptoSandboxHtml.ts'), 'utf8');
const m = src.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.error('crypto-kat: no inline <script> block found in cryptoSandboxHtml.ts');
  process.exit(1);
}

const sandbox = {
  TextEncoder,
  TextDecoder,
  atob,
  btoa,
  crypto: { subtle: {} },
  Module: {},
};
runInNewContext(m[1], sandbox);

const hex = (b) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
const KAT = [
  ['sha256', '', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['sha256', 'abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  ['sha256', 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
  ['sha224', '', 'd14a028c2a3a2bc9476102bb288234c415a2b01f828ea62ac5b3e42f'],
  ['sha224', 'abc', '23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7'],
  ['sha224', 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '75388b16512776cc5dba5da1fd890150b0c6455cb4f58b1952522525'],
];

let failed = 0;
for (const [fn, input, expected] of KAT) {
  const actual = hex(sandbox[fn](input));
  if (actual !== expected) {
    console.error(`crypto-kat FAIL: ${fn}(${JSON.stringify(input)}) = ${actual}, expected ${expected}`);
    failed++;
  }
}
if (failed > 0) {
  console.error(`crypto-kat: ${failed}/${KAT.length} vectors failed`);
  process.exit(1);
}
console.log(`crypto-kat OK: ${KAT.length} FIPS 180-4 vectors passed`);
