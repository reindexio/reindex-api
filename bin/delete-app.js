import hasApp from '../apps/hasApp';
import deleteApp from '../apps/deleteApp';
import { yesOrNo } from '../utilities';

function usage() {
  process.stdout.write(`Usage: ${process.argv[1]} HOSTNAME\n`);
}

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
    if (await yesOrNo(`Are you sure you want to delete ${hostname}?`, false) &&
        await yesOrNo('Are you ABSOLUTELY positive about that?', false)) {
      console.log(`Deleting ${hostname}... `);
      await deleteApp(hostname);
      console.log('Note that I am not deleting intercom data.');
      console.log('Done! I hope it was not someone\'s production system ;)');
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
}

main();
