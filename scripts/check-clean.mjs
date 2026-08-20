import { execSync } from 'child_process';

// Refuse to run the deploy pipeline if the obfuscator's input files carry
// uncommitted changes: obfuscate.mjs overwrites them in place and the
// pipeline restores them via git checkout at the end.
try {
  execSync('git diff --quiet -- src/homeHtml.ts src/cryptoSandboxHtml.ts', { stdio: 'pipe' });
} catch {
  console.error('error: uncommitted changes in src/homeHtml.ts or src/cryptoSandboxHtml.ts would be destroyed by deploy, commit or stash first');
  process.exit(1);
}
