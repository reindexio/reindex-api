import { GraphQLObjectType } from 'graphql';
import createRootField from '../createRootField';
import { getConnectionQueries } from '../../db/queries/connectionQueries';
import {
  createConnectionArguments,
} from '../connections';
import checkPermissionValidator from '../validators/checkPermissionValidator';

export default function createSchemaField(typeSets) {
  const schema = new GraphQLObjectType({
    name: 'ReindexSchema',
    fields: {
      types: {
        type: typeSets.get('ReindexType').connection,
        args: createConnectionArguments(),
        resolve(parent, args, { rootValue: { conn, indexes } }) {
          return getConnectionQueries(
            conn,
            'ReindexType',
            indexes.ReindexType,
            {},
            args
          );
        },
      },
    },
  });
  return createRootField({
    name: 'schema',
    returnType: schema,
    validators: [
      checkPermissionValidator('ReindexType', 'read'),
    ],
    resolve() {
      return {};
    },
  });
}
