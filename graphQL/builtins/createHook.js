import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLList,
} from 'graphql';

import ReindexID from './ReindexID';
import DateTime from './DateTime';
import TypeSet from '../TypeSet';
import createUpdate from '../mutations/createUpdate';
import createReplace from '../mutations/createReplace';
import {
  createNodeFieldResolve,
  createConnectionFieldResolve,
  createConnectionArguments,
} from '../connections';

export default function createHook(typeRegistry) {
  const triggerType = new GraphQLEnumType({
    name: 'ReindexTriggerType',
    description:
`Type of the hook trigger.

Possible values:

* \`afterCreate\` - after object is created
* \`afterUpdate\` - after object is updated or replaced
* \`afterDelete\` - after object is deleted
`,
    values: {
      afterCreate: {
        value: 'afterCreate',
      },
      afterUpdate: {
        value: 'afterUpdate',
      },
      afterDelete: {
        value: 'afterDelete',
      },
    },
  });

  const logLevel = new GraphQLEnumType({
    name: 'ReindexLogLevel',
    description:
`Log level.

Possible values:

* \`none\` - do not log
* \`all\` - log all events
* \`error\` - log only errors
`,
    values: {
      none: {
        value: 'none',
      },
      all: {
        value: 'all',
      },
      error: {
        value: 'error',
      },
    },
  });

  const eventType = new GraphQLEnumType({
    name: 'ReindexLogEventType',
    description:
`Which event is this log entry.

Possible values:

* \`error\`
* \`success\`
`,
    values: {
      error: {
        value: 'error',
      },
      success: {
        value: 'success',
      },
    },
  });

  const ReindexHttpResponse = new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexHttpResponse',
      description: 'A response from an HTTP endpoint',
      fields: {
        status: {
          type: GraphQLInt,
          description: 'response status code',
        },
        statusText: {
          type: GraphQLString,
          description: 'response status text',
        },
        body: {
          type: GraphQLString,
          description: 'response body',
        },
      },
    }),
  });
  const ReindexHook = new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexHook',
      description:
`A hook that is triggered after some event happening to some type. Performs a
POST request to a specified URL.

* [Reindex docs: Integrating third-party services
](https://www.reindex.io/docs/integrations/)
`,
      fields: () => ({
        id: {
          type: new GraphQLNonNull(ReindexID),
          description: 'The ID of the object.',
          metadata: {
            unique: true,
          },
        },
        type: {
          type: typeRegistry.getTypeSet('ReindexType').type,
          resolve: createNodeFieldResolve('ReindexType', 'type'),
          description:
`Type, from operation on which hook triggers. If null, hook will trigger to any
type operation.
`,
        },
        trigger: {
          type: new GraphQLNonNull(triggerType),
          description: 'Event that triggers the hook.',
        },
        url: {
          type: new GraphQLNonNull(GraphQLString),
          description: 'The full URL to send the request to.',
        },
        fragment: {
          type: new GraphQLNonNull(GraphQLString),
          description:
`Fragment body on the corresponding type payload. Must be surrounded by {} and
not have a name. Can include typed inline fragments.`,
        },
        log: {
          type: typeRegistry.getTypeSet('ReindexHookLog').connection,
          args: createConnectionArguments('ReindexHookLog', typeRegistry),
          resolve: createConnectionFieldResolve(
            'ReindexHookLog', 'hook', {}, typeRegistry
          ),
        },
        logLevel: {
          type: new GraphQLNonNull(logLevel),
          description:
`Which events to log in ReindexHookLog. \`error\` is the default.`,
          resolve(obj) {
            return obj.logLevel || 'error';
          },
        },
      }),
      interfaces: [typeRegistry.getInterface('Node')],
      isTypeOf(obj) {
        return obj.id.type === 'ReindexHook';
      },
    }),
  });
  const ReindexHookLog = new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexHookLog',
      description: 'Log of executed hooks. Log level is configured per hook.',
      fields: () => ({
        id: {
          type: new GraphQLNonNull(ReindexID),
          description: 'The ID of the object.',
          metadata: {
            unique: true,
          },
        },
        hook: {
          type: typeRegistry.getTypeSet('ReindexHook').type,
          description: 'Hook for which this log entry is for.',
        },
        response: {
          type: typeRegistry.getTypeSet('ReindexHttpResponse').type,
          description: 'HTTP response from the endpoint, if any.',
        },
        createdAt: {
          type: DateTime,
          description: 'When log happened.',
          metadata: {
            orderable: true,
          },
        },
        type: {
          type: new GraphQLNonNull(eventType),
          description: 'Type of the log entry.',
        },
        errors: {
          type: new GraphQLList(GraphQLString),
          description: 'List of errors, if any.',
        },
      }),
      interfaces: [typeRegistry.getInterface('Node')],
      isTypeOf(obj) {
        return obj.id.type === 'ReindexHookLog';
      },
    }),
    blacklistedRootFields: [
      createUpdate,
      createReplace,
    ],
  });

  return [
    ReindexHttpResponse,
    ReindexHook,
    ReindexHookLog,
  ];
}
