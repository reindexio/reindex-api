import { Client } from 'intercom-client';
import { fromNode } from 'bluebird';

import Config from './Config';
import Monitoring from '../Monitoring';
import { getIntercomSettings } from '../graphQL/builtins/IntercomSettings.js';

const ADMIN_ID = '207028';

export function hasIntercom() {
  const client = getClient();
  return Boolean(client);
}

export function trackEvent(credentials, eventName, metadata) {
  const client = getClient();
  const settings = getIntercomSettings(credentials);
  if (client && settings) {
    client.events.create({
      created_at: Math.round(Date.now() / 1000),
      event_name: eventName,
      user_id: settings.userId,
      metadata,
    }, errorHandler);
  }
}

export async function createIntercomUser(email, name, hostname) {
  const client = getClient();
  try {
    const result = await fromNode((callback) => client.users.create({
      ...name && { name },
      user_id: `admin@${hostname}`,
      email,
      signed_up_at: Math.round(Date.now() / 1000),
      custom_attributes: {
        url: `https://${hostname}`,
      },
    }, callback));

    return result.body;
  } catch (e) {
    if (e.body) {
      throw e.body;
    } else {
      throw e;
    }
  }
}

export async function sendWelcomeEmail(userId) {
  const client = getClient();
  /* eslint-disable max-len */
  const body = `Hi there,

It's great to have you on board! Reindex will enable you to develop apps fast
using GraphQL, a data query language designed for building client-side web
and mobile apps.

Here's how you can get started:

1) Check your new Reindex app:
We have automatically created a Reindex app for you. Go to your dashboard at
https://accounts.reindex.io, click "Open GraphiQL" and start firing GraphQL
queries at it. GraphiQL is a powerful in-browser tool that makes it very easy to
write GraphQL.

2) Make it your own:
The heart of your app is it's schema. By editing the schema you can add your
own types of data and define the relationships between them. When you edit the
schema a GraphQL API will be created automatically for accessing the data in
your client-side apps.
Learn how to define your schema and build an app with Reindex: https://www.reindex.io/docs/tutorial/

3) Explore Reindex:
Reindex lets you build whole applications without having to develop and deploy
server-side code. You can easily enable authentication with Facebook, Google,
Twitter and GitHub, add permissions to protect access to your data, integrate
with 3rd party services using hooks and more.
Learn about all the features in the docs: https://www.reindex.io/docs/

If you have any questions, feel free to contact us at support@reindex.io
or click the "?" button in GraphiQL to chat with us. We're always here to help!

Happy hacking!

Ville Immonen
CEO
Reindex
`;
  /* eslint-enable */

  try {
    const result = await fromNode((callback) => client.messages.create({
      message_type: 'email',
      subject: 'Welcome to Reindex!',
      template: 'plain',
      body,
      from: {
        type: 'admin',
        id: ADMIN_ID,
      },
      to: {
        type: 'user',
        id: userId,
      },
    }, callback));

    return result.body;
  } catch (e) {
    if (e.body) {
      throw e.body;
    } else {
      throw e;
    }
  }
}

let client;

function getClient() {
  if (client) {
    return client;
  } else {
    const { appId, appApiKey } = Config.get('Intercom');

    if (appId && appApiKey) {
      client = new Client({ appId, appApiKey });
      return client;
    }
  }
}

/* eslint-disable no-unused-vars */
/* `response` defined because number of args is significant. */
function errorHandler(error, response) {
  if (error) {
    Monitoring.noticeError(error.body);
  }
}
/* eslint-enable */
