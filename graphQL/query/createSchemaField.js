import { GraphQLObjectType } from 'graphql';
import createRootField from '../createRootField';
import { getConnectionQueries } from '../../db/queries/connectionQueries';
import {
  createConnectionArguments,
 } from '../connections';

export default function createSchemaField(typeSets) {
  const schema = new GraphQLObjectType({
    name: 'ReindexSchema',
    fields: {
      types: {
        type: typeSets.get('ReindexType').connection,
        args: createConnectionArguments().toObject(),
        resolve(parent, args, { rootValue: { conn, indexes } }) {
          return getConnectionQueries(
            conn,
            'ReindexType',
            indexes.get('ReindexType'),
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
    resolve() {
      return {};
    },
  });
}
