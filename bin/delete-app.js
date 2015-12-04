import deleteApp from '../apps/deleteApp';
import getApp from '../apps/getApp';
import { confirm } from '../utilities';

function usage() {
  process.stdout.write(`Usage: ${process.argv[1]} HOSTNAME\n`);
}

const warningMessage = (hostname, app) => `
###########################################################
# DANGER!
# This will PERMANENTLY delete the app
# "${hostname}" in cluster "${app.database.cluster}"
# and all its data. Are you sure you want to continue?
###########################################################
Delete ${hostname}? (y/N)`;

async function main() {
  const hostname = process.argv[2];
  if (!hostname) {
    usage();
    return;
  }

  try {
    const app = await getApp(hostname);
    if (!app) {
      console.error('No such app!');
      process.exit(1);
    }
    if (await confirm(warningMessage(hostname, app), { default: false })) {
      console.log(`Deleting ${hostname}... `);
      await deleteApp(hostname);
      console.log('Done!');
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
}

main();
