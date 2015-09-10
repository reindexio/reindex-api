import { GraphQLObjectType } from 'graphql';
import { getConnectionQueries } from '../../db/queries/connectionQueries';
import {
  createConnectionArguments,
} from '../connections';
import checkPermission from '../permissions/checkPermission';

export default function createSchemaField(typeSets, interfaces) {
  const schema = new GraphQLObjectType({
    name: 'ReindexSchema',
    fields: {
      types: {
        type: typeSets.get('ReindexType').connection,
        args: createConnectionArguments(
          (name) => typeSets.get(name),
          interfaces
        ),
        resolve(parent, args, { rootValue: { conn, indexes } }) {
          return getConnectionQueries(
            conn,
            'ReindexType',
            indexes.ReindexType,
            {},
            {
              orderBy: {
                field: 'name',
              },
              ...args,
            }
          );
        },
      },
    },
  });
  return {
    name: 'schema',
    type: schema,
    resolve(parent, args, context) {
      checkPermission('ReindexType', 'read', {}, context);
      return {};
    },
  };
}
