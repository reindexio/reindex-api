import {
  GraphQLBoolean,
  GraphQLString,
  GraphQLObjectType,
} from 'graphql';
import TypeSet from '../TypeSet';

export default function createMigrationTypes() {
  const ReindexMigrationCommand = new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexMigrationCommand',
      fields: () => ({
        commandType: {
          type: GraphQLString,
        },
        isDestructive: {
          type: GraphQLBoolean,
        },
        description: {
          type: GraphQLString,
        },
      }),
    }),
  });

  return {
    ReindexMigrationCommand,
  };
}
