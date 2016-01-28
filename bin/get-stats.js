import minimist from 'minimist';
import CliTable from 'cli-table';

import getStats from '../apps/getStats';

import Metrics from '../server/Metrics';

async function main() {
  const argv = minimist(process.argv.slice(2), {
    alias: {
      librato: 'l',
    },
  });

  const result = await getStats();

  if (argv.librato) {
    printLibrato(result);
  } else {
    printTable(result);
  }
}

function printTable(apps) {
  const table = new CliTable({
    head: ['Hostname', 'Cluster', 'Types', 'Nodes', 'Avg node', 'Size'],
  });

  table.push(
    ...apps.map((app) => [
      app.hostname,
      app.cluster,
      app.types,
      app.nodes,
      `${app.averageNodeSize.toFixed(0)}B`,
      `${toMB(app.fileSize).toFixed(2)}MB`,
    ]),
  );

  console.log(table.toString());
}

function printLibrato(apps) {
  const perCluster = {};

  for (const app of apps) {
    if (!perCluster[app.cluster]) {
      perCluster[app.cluster] = {
        count: 0,
        size: 0,
      };
    }
    perCluster[app.cluster].count++;
    perCluster[app.cluster].size += app.fileSize;
    Metrics.sample('app.type', app.types, app.hostname);
    Metrics.sample('app.nodes', app.nodes, app.hostname);
    Metrics.sample(
      'app.averageNodeSize',
      `${app.averageNodeSize.toFixed(0)}B`,
      app.hostname
    );
    Metrics.sample(
      'app.fileSize',
      `${toMB(app.fileSize).toFixed(2)}MB`,
      app.hostname,
    );
  }

  for (const cluster of Object.keys(perCluster)) {
    Metrics.sample(
      'cluster.size',
      perCluster[cluster].size,
      cluster
    );

    Metrics.sample(
      'cluster.dbCount',
      perCluster[cluster].count,
      cluster,
    );
  }
}

function toMB(bytes) {
  return bytes / 1024 / 1024;
}

main().then(() => process.exit(0));
