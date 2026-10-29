// One-command Android APK build: `npm run build`.
// Logs in if needed, checks the project, then builds on EAS and prints the install link + QR code.
import { spawnSync } from 'node:child_process';

const EAS = 'eas-cli@latest';
const STEPS = 4;

function run(cmd, args, { allowFail = false } = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (res.status !== 0 && !allowFail) {
    console.error(`\n✖ Failed: ${cmd} ${args.join(' ')}`);
    process.exit(res.status ?? 1);
  }
  return res.status === 0;
}

const step = (n, text) => console.log(`\n━━ [${n}/${STEPS}] ${text}`);

step(1, 'Checking Expo login');
if (!run('npx', ['--yes', EAS, 'whoami'], { allowFail: true })) {
  console.log('Not logged in. Log in with your Expo email/username and Expo password.');
  run('npx', ['--yes', EAS, 'login']);
}

step(2, 'Type checking');
run('npx', ['tsc', '--noEmit']);

step(3, 'Checking project health');
run('npx', ['--yes', 'expo-doctor']);

step(4, 'Building the APK on Expo servers (about 10-20 minutes)');
run('npx', ['--yes', EAS, 'build', '--platform', 'android', '--profile', 'preview']);

console.log(`
✔ Build finished.
  On your phone: open the "Install" link above (or scan the QR code), tap Install,
  and allow "Install unknown apps" for your browser when Android asks.
  All builds: https://expo.dev → your project → Builds`);
