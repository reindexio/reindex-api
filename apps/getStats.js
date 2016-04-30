import { graphql } from 'graphql';

import getAdminDB from '../db/getAdminDB';
import getGraphQLContext from '../graphQL/getGraphQLContext';
import DatabaseTypes from '../db/DatabaseTypes';
import createDBClient from '../db/createDBClient';
import getDatabaseSettings from '../db/getDatabaseSettings';

const query = `query ListApps {
  viewer {
    allApps(first: 100000) {
      nodes {
        id
        database {
          cluster
          name
        }
        domains(first: 1) {
          nodes {
            hostname
          }
        }
        storage {
          settings {
            connectionString
            type
          }
        }
      }
    }
  }
}
`;

export default async function getStats() {
  const adminDB = getAdminDB();
  try {
    const context = getGraphQLContext(adminDB, await adminDB.getMetadata(), {
      credentials: { isAdmin: true, userID: null },
    });
    const result = await graphql(context.schema, query, null, context);

    return Promise.all(
      result.data.viewer.allApps.nodes
        .filter((app) =>
          getDatabaseSettings(app).type === DatabaseTypes.MongoDB
        )
        .map(async (app) => {
          const settings = getDatabaseSettings(app);
          const hostname = app.domains.nodes[0].hostname;
          const db = createDBClient(
            hostname,
            app.database.name,
            settings,
          );
          try {
            const client = await db.getDB();
            const stats = await client.stats();
            return {
              hostname,
              stats,
              types: stats.collections,
              nodes: stats.objects,
              averageNodeSize: stats.avgObjSize,
              fileSize: stats.fileSize,
              cluster: app.database.cluster,
            };
          } finally {
            await db.close();
          }
        })
    );
  } finally {
    await adminDB.close();
  }
}
