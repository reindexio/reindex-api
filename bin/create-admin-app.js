import assert from 'assert';

import createToken from '../apps/createToken';
import hasApp from '../apps/hasApp';
import { createAdminApp } from '../apps/createApp';

function usage() {
  process.stdout.write(`Usage: ${process.argv[1]} HOSTNAME\n`);
}

async function main() {
  const hostname = process.argv[2];
  if (!hostname) {
    usage();
    return;
  }
  const exists = await hasApp(hostname);
  assert(!exists, `The app '${hostname}' already exists.`);

  try {
    await createAdminApp(hostname);
    const token = await createToken(hostname, { admin: true });
    console.log(`
URL: https://${hostname}
Admin token: ${token}
`);
    console.log('Done!');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
