import createApp from '../apps/createApp';
import createToken from '../apps/createToken';
import createAppName from '../apps/createAppName';
import hasApp from '../apps/hasApp';
import {
  hasIntercom,
  createIntercomUser,
  sendWelcomeEmail
} from '../server/IntercomClient';
import { yesOrNo } from '../utilities';

async function main() {
  const email = process.argv[2];
  const name = process.argv[3];
  if (email && name) {
    try {
      await createAppForUser(email, name);
      process.exit(0);
    } catch (e) {
      console.log('Failure!');
      process.stderr.write(e);
      process.exit(1);
    }
  } else {
    usage();
  }
}

function usage() {
  console.log(`Usage: ${process.argv[1]} "email" "name"`);
}

async function createAppForUser(email, name) {
  try {
    if (!hasIntercom() &&
        !(await yesOrNo('Intercom is not set up, continue?'))) {
      return;
    }
    console.log(`Creating app for user ${name} <${email}>`);
    let appName = createAppName();
    let hostname = `${appName}.myreindex.com`;
    while ((await hasApp(appName)) || !(await promptIfAppNameIsFine(appName))) {
      appName = createAppName();
      hostname = `${appName}.myreindex.com`;
    }
    console.log(`Creating app ${hostname}...`);
    await createApp(hostname);
    const token = await createToken(hostname, {
      admin: true,
    });

    console.log(`
  URL: https://${hostname}
  Admin token: ${token}
  `);

    if (hasIntercom() && await yesOrNo('Create intercom user?')) {
      const user = await createIntercomUser(email, name, hostname);
      if (await yesOrNo('Send welcome email?')) {
        await sendWelcomeEmail(user.id, name, hostname, token);
      }
    }

    console.log('Done!');
  } catch (e) {
    process.stderr.write(e);
  }
}


function promptIfAppNameIsFine(appName) {
  console.log(`Generated app name: ${appName}`);
  return yesOrNo('App name ok?');
}

main();
