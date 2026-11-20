import { execSync } from 'child_process';

// Refuse to run the deploy pipeline if the obfuscator's input file carries
// uncommitted changes: obfuscate.mjs overwrites it in place and the pipeline
// restores it via git checkout at the end.
try {
  execSync('git diff --quiet -- src/homeHtml.ts', { stdio: 'pipe' });
} catch {
  console.error('error: uncommitted changes in src/homeHtml.ts would be destroyed by deploy, commit or stash first');
  process.exit(1);
}
