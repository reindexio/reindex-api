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
      description: 'A migration command. This type is never created ' +
        'directly, but returned as a result from calling `migrate`, ' +
        'typically using the `reindex schema-push` command in the CLI.',
      fields: {
        commandType: {
          type: GraphQLString,
          description: 'A type of a migration command, e.g. "CreateField".',
        },
        isDestructive: {
          type: GraphQLBoolean,
          description: 'Boolean indicating whether this is a destructive ' +
            'command, i.e. whether running it may permanently delete data.',
        },
        description: {
          type: GraphQLString,
          description: 'A human readable description of the command.',
        },
      },
    }),
  });

  return [ReindexMigrationCommand];
}
