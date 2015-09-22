
import {
  GraphQLList,
  GraphQLBoolean,
  GraphQLString,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLNonNull,
} from 'graphql';
import validateSchema from '../../db/migrations/validateSchema';
import buildSchemaMigration from '../../db/migrations/buildSchemaMigration';
import { performMigration } from '../../db/queries/migrationQueries';
import createInputObjectFields from '../createInputObjectFields';
import checkPermission from '../permissions/checkPermission';

export default function createMigrate(typeSets, interfaces) {
  const ReindexTypeSet = typeSets.get('ReindexType');
  const ReindexMigrationCommandSet = typeSets.get('ReindexMigrationCommand');

  const payload = new GraphQLObjectType({
    name: '_ReindexMigrationPayload',
    fields: () => ({
      clientMutationId: {
        type: GraphQLString,
      },
      commands: {
        type: new GraphQLList(ReindexMigrationCommandSet.type),
      },
      isExecuted: {
        type: GraphQLBoolean,
      },
    }),
  });

  const ReindexTypeInputObject = new GraphQLInputObjectType({
    name: '_ReindexTypeMigrationInputObject',
    fields: createInputObjectFields(
      ReindexTypeSet.getInputObjectFields(),
      false,
      (name) => typeSets.get(name),
      interfaces
    ),
  });

  const inputType = new GraphQLInputObjectType({
    name: '_ReindexMigrationInput',
    fields: {
      types: {
        type: new GraphQLList(ReindexTypeInputObject),
      },
      force: {
        type: GraphQLBoolean,
      },
      clientMutationId: {
        type: GraphQLString,
      },
    },
  });

  return {
    name: 'migrate',
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

      const errors = validateSchema({ types: input.types }, interfaces);

      if (errors.length > 0) {
        // XXX(freiksenet, 2015-09-22): Can be fixed when graphql is updated
        throw new Error(errors.join('\n'));
      } else {
        const commands = buildSchemaMigration(
          context.rootValue.types, input.types
        );
        const isDestructive = commands.some((command) => command.isDestructive);

        if (isDestructive && !input.force) {
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
