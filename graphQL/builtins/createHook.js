import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLEnumType,
} from 'graphql';
import ReindexID from './ReindexID';
import TypeSet from '../TypeSet';
import { createNodeFieldResolve } from '../connections';

export default function createHook(interfaces, getTypeSet) {
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

  return new TypeSet({
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
        },
        type: {
          type: getTypeSet('ReindexType').type,
          resolve: createNodeFieldResolve('ReindexType', 'type'),
          description:
`Type, from operation on which hook triggers. If null, hook will trigger to any
type operation.
`,
        },
        trigger: {
          type: new GraphQLNonNull(triggerType),
          description: 'Event that triggers the hook',
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
      }),
      interfaces: [interfaces.Node],
      isTypeOf(obj) {
        return obj.id.type === 'ReindexHook';
      },
    }),
  });
}
