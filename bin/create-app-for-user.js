import Config from '../server/Config';
import createApp from '../apps/createApp';
import createToken from '../apps/createToken';
import createAppName from '../apps/createAppName';
import hasApp from '../apps/hasApp';
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
    const defaultCluster = Config.get('database.defaultCluster');
    const clusters = Object.keys(JSON.parse(Config.get('database.clusters')));
    const choices = clusters.map((name) =>
      name === defaultCluster ? `[${name}]` : name
    ).join(', ');
    const cluster = await choose(`Cluster name: (${choices})`, clusters, {
      default: defaultCluster,
    });
    console.log(`Creating app ${hostname} in cluster ${cluster}...`);
    await createApp(hostname, cluster);
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
}

createAppForUser();
