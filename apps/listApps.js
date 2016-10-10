import { graphql } from 'graphql';

import createReindex from '../graphQL/createReindex';
import getAdminDB from '../db/getAdminDB';

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
      }
    }
  }
}
`;

export default async function listApps() {
  const db = getAdminDB();
  try {
    const { schema, context } = await createReindex().getOptions({
      db,
      credentials: { isAdmin: true, userID: null },
    });
    const result = await graphql(schema, query, null, context);
    if (result.errors) {
      console.error(result.errors);
      throw new Error(result.errors[0].message);
    }
    return result.data.viewer.allApps.nodes.map((app) => {
      const { id, database } = app;
      const { hostname } = app.domains.nodes[0];
      return {
        id,
        hostname,
        database: {
          name: database.name,
          cluster: database.cluster,
        },
      };
    });
  } finally {
    db.close();
  }
}
