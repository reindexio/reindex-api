import listApps from '../apps/listApps';

async function main() {
  const apps = await listApps();
  apps.forEach((app) => console.log(
    `${app.id}\t${app.hostname}\t${app.database.name}\t${app.database.cluster}`
  ));
}

main();
