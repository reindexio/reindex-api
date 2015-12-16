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

export async function sendWelcomeEmail(userId, name, hostname, token) {
  const client = getClient();
  /* eslint-disable max-len */
  const body = `Hi${name ? ' ' + name : ''},

You've got access to the private beta of Reindex.

To learn how to get started, check out the tutorial at https://www.reindex.io/docs/

You can make queries and view your API docs in GraphiQL.
Use this link to sign in:
https://${hostname}/?token=${token}

Install [Reindex CLI](https://www.reindex.io/docs/reindex-cli/) with:

    npm install -g reindex-cli

and configure your environment:

    export REINDEX_URL="https://${hostname}"
    export REINDEX_TOKEN="${token}"

If you have any questions, problems or feedback please email us at
support@reindex.io or click the "?" button in GraphiQL to chat with us.

Happy hacking!

Ville Immonen
CEO
Reindex
`;
  /* eslint-enable */

  try {
    const result = await fromNode((callback) => client.messages.create({
      message_type: 'email',
      subject: 'Welcome to Reindex beta',
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
