import uuid from 'uuid';
import stats from 'stats-lite';
import {
  makeRunQuery,
  testSetup,
  testTearDown,
} from '../test/testAppUtils';
import {
  createBenchmarkApp,
  benchmarkQuery,
} from '../test/benchmark';
import deleteApp from '../apps/deleteApp';
import getDB from '../db/getDB';

async function runBenchmark() {
  console.log('Running benchmark. This will take a while...');
  const adminHostname = `admin.${uuid.v4()}.example.com`;
  await testSetup(adminHostname);
  const hostname = `benchmark.${uuid.v4()}.example.com`;
  const userIds = await createBenchmarkApp(hostname);
  const db = await getDB(hostname);
  const runQuery = makeRunQuery(db);

  const start = process.hrtime();
  const measurements = [];
  for (const userId of userIds) {
    const queryStart = process.hrtime();
    await benchmarkQuery(runQuery, userId);
    const [seconds, nanoseconds] = process.hrtime(queryStart);
    measurements.push((seconds * 1000) + (nanoseconds / 1e6));
  }
  const [seconds, nanoseconds] = process.hrtime(start);
  const end = (seconds * 1000) + (nanoseconds / 1e6);

  console.log(`Done total of ${userIds.length} queries.`);
  console.log(`Total time: ${end}ms`);
  console.log(`Total db queries: ${db.stats.count}`);
  console.log(`Total db time: ${db.stats.totalTime}ms`);
  console.log(`Min query: ${Math.min(...measurements)}ms`);
  console.log(`Max query: ${Math.max(...measurements)}ms`);
  console.log(`Mean query: ${stats.mean(measurements)}ms`);
  console.log(`Median query: ${stats.median(measurements)}ms`);
  console.log(`95p query: ${stats.percentile(measurements, 0.95)}ms`);
  console.log(`99p query: ${stats.percentile(measurements, 0.99)}ms`);

  await deleteApp(hostname);
  await testTearDown(adminHostname);
}

runBenchmark().then(() => process.exit(0));
