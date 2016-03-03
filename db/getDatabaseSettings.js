import { get } from 'lodash';

import Config from '../server/Config';

export default function getDatabaseSettings(app) {
  return get(app, ['storage', 'settings']) || getCluster(app.database.cluster);
}

function getCluster(name) {
  const clusters = JSON.parse(Config.get('database.clusters'));
  if (!clusters[name]) {
    throw new Error(`Invalid cluster name: ${name}`);
  }
  return clusters[name];
}
