import { Client } from 'intercom-client';

import Config from './Config';
import Monitoring from '../Monitoring';
import { getIntercomSettings } from '../graphQL/builtins/IntercomSettings.js';

let client;
const { appId, appApiKey } = Config.get('Intercom');
if (appId && appApiKey) {
  client = new Client({ appId, appApiKey });
}

/* eslint no-unused-vars: [2, { "args": "none" }] */
/* `response` defined because number of args is significant. */
function callback(error, response) {
  if (error) {
    Monitoring.noticeError(error.body);
  }
}

export function trackEvent(credentials, eventName, metadata) {
  const settings = getIntercomSettings(credentials);
  if (client && settings) {
    client.events.create({
      created_at: Math.round(Date.now() / 1000),
      event_name: eventName,
      user_id: settings.userId,
      metadata,
    }, callback);
  }
}
