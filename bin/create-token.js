import minimist from 'minimist';

import createToken from '../apps/createToken';

async function main() {
  const argv = minimist(process.argv.slice(2), {
    alias: {
      admin: 'a',
      host: 'h',
      user: 'u',
    },
  });

  console.log(`Creating token for ${argv.host}...`);
  const token = await createToken(argv.host, {
    admin: argv.admin,
    user: argv.user,
  });
  console.log(`Token: ${token}`);
}

main();
