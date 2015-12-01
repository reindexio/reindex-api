import Config from '../server/Config';

let clusters;

export default function getCluster(name) {
  if (!clusters) {
    clusters = JSON.parse(Config.get('database.clusters'));
  }
  if (!clusters[name]) {
    throw new Error(`Invalid cluster name: ${name}`);
  }
  return clusters[name];
}
