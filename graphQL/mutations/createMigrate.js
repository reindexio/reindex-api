import {
  GraphQLList,
  GraphQLBoolean,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLNonNull,
} from 'graphql';
import validateSchema from '../../db/migrations/validateSchema';
import buildSchemaMigration from '../../db/migrations/buildSchemaMigration';
import { performMigration } from '../../db/queries/migrationQueries';
import createInputObjectFields from '../createInputObjectFields';
import checkPermission from '../permissions/checkPermission';
import clientMutationIdField from '../utilities/clientMutationIdField';
import { trackEvent } from '../../server/IntercomClient';

export default function createMigrate(typeSets, interfaces) {
  const ReindexTypeSet = typeSets.get('ReindexType');
  const ReindexMigrationCommandSet = typeSets.get('ReindexMigrationCommand');

  const payload = new GraphQLObjectType({
    name: 'ReindexMigrationPayload',
    fields: {
      clientMutationId: clientMutationIdField,
      commands: {
        type: new GraphQLList(ReindexMigrationCommandSet.type),
        description: 'The commands created for this migration.',
      },
      isExecuted: {
        type: GraphQLBoolean,
        description: 'Indicates whether the migration was executed. Only ' +
          'non-destructive migrations are executed by default.',
      },
    },
  });

  const ReindexTypeInputObject = new GraphQLInputObjectType({
    name: 'ReindexTypeInput',
    fields: createInputObjectFields(
      ReindexTypeSet.getInputObjectFields(),
      false,
      (name) => typeSets.get(name),
      interfaces
    ),
  });

  const inputType = new GraphQLInputObjectType({
    name: 'ReindexMigrationInput',
    fields: {
      types: {
        type: new GraphQLList(ReindexTypeInputObject),
        description: 'The list of types in the desired schema.',
      },
      force: {
        type: GraphQLBoolean,
        description: 'Must be `true` to run the migration, if it includes ' +
          'destructive commands.',
      },
      dryRun: {
        type: GraphQLBoolean,
        description: 'If `true`, we only validate the schema and return the ' +
          'migration commands without running them.',
      },
      clientMutationId: clientMutationIdField,
    },
  });

  return {
    name: 'migrate',
    description: 'Migrates the schema of the app.',
    type: payload,
    args: {
      input: {
        type: new GraphQLNonNull(inputType),
      },
    },
    async resolve(parent, { input }, context) {
      const conn = context.rootValue.conn;
      const clientMutationId = input.clientMutationId;

      checkPermission(
        'ReindexType',
        'create',
        {},
        context,
      );

      const errors = validateSchema({ types: input.types }, interfaces, [
        'User',
      ]);

      setImmediate(() => {
        trackEvent(context.rootValue.credentials, 'pushed-schema', {
          dryRun: Boolean(input.dryRun),
          force: Boolean(input.force),
          types: input.types && input.types.map((type) => type.name).join(','),
        });
      });

      if (errors.length > 0) {
        // XXX(freiksenet, 2015-09-22): Can be fixed when graphql is updated
        throw new Error(errors.join('\n'));
      } else {
        const commands = buildSchemaMigration(
          context.rootValue.types, input.types
        );
        const isDestructive = commands.some((command) => command.isDestructive);

        if (input.dryRun || (isDestructive && !input.force)) {
          return {
            clientMutationId,
            commands,
            isExecuted: false,
          };
        } else {
          await performMigration(conn, commands);
          return {
            clientMutationId,
            commands,
            isExecuted: true,
          };
        }
      }
    },
  };
}
