import hasApp from '../apps/hasApp';
import deleteApp from '../apps/deleteApp';
import { yesOrNo } from '../utilities';

function usage() {
  process.stdout.write(`Usage: ${process.argv[1]} HOSTNAME\n`);
}

const warningMessage = (hostname) => `
###########################################################
# DANGER!
# This will PERMANENTLY delete the app
# "${hostname}"
# and all its data. Are you sure you want to continue?
###########################################################
Delete ${hostname}?`;

async function main() {
  const hostname = process.argv[2];
  if (!hostname) {
    usage();
    return;
  }

  try {
    if (!(await hasApp(hostname))) {
      console.log('No such app!');
      process.exit(1);
    }
    if (await yesOrNo(warningMessage(hostname), false)) {
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
