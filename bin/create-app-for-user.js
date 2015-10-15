import parseArgs from 'minimist';
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
  const args = parseArgs(process.argv.slice(2), {
    boolean: ['n'],
  });
  const email = args._[0];
  const name = args._[1];
  const dontPrompt = args.n;
  if (email && name) {
    try {
      await createAppForUser(email, name, dontPrompt);
      process.exit(0);
    } catch (e) {
      console.log('Failure!');
      console.error(e);
      process.exit(1);
    }
  } else {
    usage();
  }
}

function usage() {
  console.log(`Usage: ${process.argv[1]} [-n] "email" "name"`);
}

async function createAppForUser(email, name, dontPrompt) {
  try {
    if (!hasIntercom() &&
        !dontPrompt &&
        !(await yesOrNo('Intercom is not set up, continue?'))) {
      return;
    }
    console.log(`Creating app for user ${name} <${email}>`);
    let appName = createAppName();
    let hostname = `${appName}.myreindex.com`;
    while ((await hasApp(hostname)) ||
           (!dontPrompt && !(await promptIfAppNameIsFine(appName)))) {
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

    if (hasIntercom() &&
        (dontPrompt || await yesOrNo('Create intercom user?'))) {
      console.log('Creating intercom user...');
      const user = await createIntercomUser(email, name, hostname);
      if (dontPrompt || await yesOrNo('Send welcome email?')) {
        console.log('Sending welcome email...');
        await sendWelcomeEmail(user.id, name, hostname, token);
      }
    }

    console.log('Done!');
  } catch (e) {
    console.error('Failure!');
    console.error(e);
  }
}


function promptIfAppNameIsFine(appName) {
  console.log(`Generated app name: ${appName}`);
  return yesOrNo('App name ok?');
}

main();
