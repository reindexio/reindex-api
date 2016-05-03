import {
  GraphQLList,
  GraphQLBoolean,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLNonNull,
} from 'graphql';

import { UserError } from '../UserError';
import validateSchema from '../../graphQL/migrations/validateSchema';
import buildSchemaMigration from
  '../../graphQL/migrations/buildSchemaMigration';
import createInputObjectFields from '../createInputObjectFields';
import checkPermission from '../permissions/checkPermission';
import clientMutationIdField from '../utilities/clientMutationIdField';
import { trackEvent } from '../../server/IntercomClient';

export default function createMigrate(typeSets, interfaces) {
  const ReindexTypeSet = typeSets.ReindexType;
  const ReindexMigrationCommandSet = typeSets.ReindexMigrationCommand;

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
      (name) => typeSets[name],
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
        description:
`Must be \`true\` to run the migration, if it includes destructive commands.
`,
      },
      dryRun: {
        type: GraphQLBoolean,
        description:
`If \`true\`, we only validate the schema and return the migration commands
without running them.
`,
      },
      clientMutationId: clientMutationIdField,
    },
  });

  return {
    name: 'migrate',
    description:
`Performs a migration.

This mutation is used by \`reindex-cli\` to perform \`schema-push\`.

* [Reindex docs: Reindex schema
](https://www.reindex.io/docs/reindex-schema/)
* [Reindex docs: Reindex CLI
](https://www.reindex.io/docs/reindex-cli/)
`,
    type: payload,
    args: {
      input: {
        type: new GraphQLNonNull(inputType),
      },
    },
    async resolve(parent, { input }, context) {
      const db = context.db;
      const clientMutationId = input.clientMutationId;

      await checkPermission(
        'ReindexType',
        'create',
        {},
        {},
        context,
      );

      const errors = validateSchema({ types: input.types }, interfaces, [
        'User',
      ]);

      setImmediate(() => {
        trackEvent(context.credentials, 'pushed-schema', {
          dryRun: Boolean(input.dryRun),
          force: Boolean(input.force),
          types: input.types && input.types.map((type) => type.name).join(','),
        });
      });

      if (errors.length > 0) {
        // XXX(freiksenet, 2015-09-22): Can be fixed when graphql is updated
        throw new UserError(errors.join('\n'));
      } else {
        const commands = buildSchemaMigration(context.types, input.types);
        const isDestructive = commands.some((command) => command.isDestructive);

        if (input.dryRun || (isDestructive && !input.force)) {
          return {
            clientMutationId,
            commands,
            isExecuted: false,
          };
        } else {
          await db.performMigration(commands, input.types, context);
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
