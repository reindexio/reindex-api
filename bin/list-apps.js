import listApps from '../apps/listApps';
import CliTable from 'cli-table';

async function main() {
  const apps = await listApps();
  const table = new CliTable({
    head: ['ID', 'Hostname', 'DB Name', 'Cluster'],
  });
  apps.forEach((app) => table.push(
    [app.id, app.hostname, app.database.name, app.database.cluster],
  ));
  console.log(table.toString());
}

main();
