import { Client } from 'intercom-client';

import Config from './Config';
import Monitoring from '../Monitoring';

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

export function trackEvent(userId, eventName, metadata) {
  if (client) {
    client.events.create({
      created_at: Math.round(Date.now() / 1000),
      event_name: eventName,
      user_id: userId,
      metadata,
    }, callback);
  }
}
