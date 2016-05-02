import { chain, range, sample } from 'lodash';
import createApp from '../apps/createApp';
import getDB from '../db/getDB';
import { migrate, makeRunQuery } from './testAppUtils';
import { BENCHMARK_SCHEMA } from './fixtures';

export async function createBenchmarkApp(hostname) {
  await createApp(hostname);
  const db = await getDB(hostname);
  const runQuery = makeRunQuery(db);
  await migrate(runQuery, BENCHMARK_SCHEMA);
  return await populateBenchmarkApp(db);
}

const NUM_USERS = 50;
const APPS_PER_USER = 5;
const SCREENSHOTS_PER_APP = 10;
const COMMENTS_PER_SCREENSHOT = 10;

async function populateBenchmarkApp(db) {
  const rawDB = await db.getDB();
  let mongoResult = await rawDB.collection('User').insertMany(
    range(NUM_USERS).map((i) => ({
      handle: `i-${i}`,
    }))
  );
  const userIds = mongoResult.insertedIds.map((id) => ({
    type: 'User',
    value: id.toString(),
  }));

  mongoResult = await rawDB.collection('Application').insertMany(
    chain(userIds)
      .map((userId) => range(APPS_PER_USER).map(() => ({
        user: userId,
        invitedUsers: sampleSize(userIds, 10),
      })))
      .flatten()
      .value()
  );
  const applicationIds = mongoResult.insertedIds.map((id) => ({
    type: 'Application',
    value: id.toString(),
  }));
  for (const applicationId of applicationIds) {
    mongoResult = await rawDB.collection('Screenshot').insertMany(
      range(SCREENSHOTS_PER_APP).map(() => ({
        application: applicationId,
        user: sample(userIds),
      }))
    );
    const screenshotIds = mongoResult.insertedIds.map((id) => ({
      type: 'Screenshot',
      value: id.toString(),
    }));
    for (const screenshotId of screenshotIds) {
      await rawDB.collection('Comment').insertMany(
        range(COMMENTS_PER_SCREENSHOT).map(() => ({
          screenshot: screenshotId,
          user: sample(userIds),
        }))
      );
    }
  }

  return userIds;
}

export function benchmarkQuery(runQuery, userID) {
  return runQuery(`
    {
      viewer {
        user {
          id
          applications(first: 50) {
            count
            nodes {
              id
              screenshots(first: 50) {
                count
                nodes {
                  user {
                    id
                  }
                  comments(first: 50) {
                    count
                    nodes {
                      id
                      user {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
          comments {
            count
            edges {
              cursor
              node {
                id
              }
            }
          }
        }
      }
    }
  `, {}, {
    credentials: {
      isAdmin: false,
      userID,
    },
    newContext: true,
  });
}

function sampleSize(arr, n) {
  const length = arr.length;
  if (n > length) {
    n = length;
  }
  const indexes = [];
  for (let i = 0; i < n; i++) {
    let rand = Math.floor(Math.random() * length);
    while (indexes.includes(rand)) {
      rand = Math.floor(Math.random() * length);
    }
    indexes.push(rand);
  }
  return indexes.map((i) => arr[i]);
}
