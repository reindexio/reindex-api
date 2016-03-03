import createApp from '../apps/createApp';
import createToken from '../apps/createToken';
import createAppName from '../apps/createAppName';
import hasApp from '../apps/hasApp';
import DatabaseTypes from '../db/DatabaseTypes';
import {
  hasIntercom,
  createIntercomUser,
  sendWelcomeEmail,
} from '../server/IntercomClient';
import { choose, confirm, prompt } from '../utilities';

async function createAppForUser() {
  try {
    if (!hasIntercom() &&
        !(await confirm('Intercom is not set up, continue? (y/n)'))) {
      return;
    }
    let hostname;
    let exists;
    do {
      const defaultHostname = createAppName();
      hostname = await prompt(`Hostname: (${defaultHostname})`, {
        default: defaultHostname,
      });
      exists = await hasApp(hostname);
      if (exists) {
        console.warn(`Hostname "${hostname}" is already taken.`);
      }
    } while (exists);
    const types = Object.values(DatabaseTypes).sort();
    const defaultType = DatabaseTypes.MongoDB;
    const choices = types.map((name) =>
      name === defaultType ? `[${name}]` : name
    ).join(', ');
    const databaseType = await choose(`Database type: (${choices})`, types, {
      default: defaultType,
    });
    console.log(`Creating app ${hostname}...`);
    await createApp(hostname, databaseType);
    const token = await createToken(hostname, { admin: true });

    console.log(`
  URL: https://${hostname}
  Admin token: ${token}
  `);

    if (hasIntercom()) {
      console.log('Please enter the details for Intercom...');
      const name = await prompt('Full name:', { default: '' });
      const email = await prompt('Email:');
      console.log(`Creating user ${name || ''} <${email}>`);
      const user = await createIntercomUser(email, name, hostname);
      if (await confirm('Send welcome email? (y/n)', { default: true })) {
        console.log('Sending welcome email...');
        await sendWelcomeEmail(user.id);
      }
    }

    console.log('Done!');
  } catch (e) {
    console.error('Failure!');
    console.error(e);
  }
  process.exit(0);
}

createAppForUser();
