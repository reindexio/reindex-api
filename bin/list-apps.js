import listApps from '../apps/listApps';

async function main() {
  const apps = await listApps();
  apps.forEach((name) => console.log(name));
}

main();
