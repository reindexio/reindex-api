import createApp from '../apps/createApp';

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
    process.stdout.write(`Creating ${hostname}... `);
    const { secret } = await createApp(hostname);
    process.stdout.write(`done.
        app: ${hostname}:5000
        secret: ${secret}\n`);
    process.exit(0);
  } catch (e) {
    process.stdout.write('failed.\n');
    console.error(e);
    process.exit(1);
  }
}

main();
