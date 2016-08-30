import { chain } from 'lodash';
import { GraphQLObjectType } from 'graphql';

import { VIEWER_ID } from './builtins/createViewer';
import ReindexID from './builtins/ReindexID';
import clientMutationIdField from './utilities/clientMutationIdField';
import { getPayloadTypeName, getAllQueryName } from './derivedNames';
import {
  createNodeFieldResolve,
 } from './connections';

export default function createPayload(typeSet, typeRegistry) {
  const { type, edge, pluralName } = typeSet;
  const allConnectionName = getAllQueryName(type.name, pluralName);
  const edgeName = `changed${type.name}Edge`;
  return new GraphQLObjectType({
    name: getPayloadTypeName(type.name),
    description:
`The payload returned from mutations of \`${type.name}\`.

* [Reindex docs: Mutations
](https://www.reindex.io/docs/graphql-api/mutations/)
`,
    fields: () => {
      const nodeFields = chain(type.getFields())
        .pick((field) => (
          field.type.getInterfaces &&
          field.type.getInterfaces().includes(typeRegistry.getInterface('Node'))
        ))
        .mapValues((field) => ({
          type: field.type,
          resolve: createNodeFieldResolve(
            field.type.name,
            (object) => object['changed' + type.name][field.name]
          ),
        }))
        .value();
      return {
        clientMutationId: clientMutationIdField,
        id: {
          type: ReindexID,
          description: 'The ID of the mutated object.',
        },
        viewer: {
          type: typeRegistry.getViewer(),
          description:
`The global viewer object. Can be used in the client to add
a newly created object to the connection of all objects of
the type.

E.g. when creating a ${type.name} object, you can add it
to \`viewer.${allConnectionName}\` using the following Relay
mutation config:
\`\`\`javascript
{
  type: 'RANGE_ADD',
  parentID: this.props.viewer.id,
  connectionName: '${allConnectionName}',
  edgeName: '${edgeName}',
  rangeBehaviors: {
    '': 'prepend',
  },
}
\`\`\`
`,
          resolve() {
            return {
              id: VIEWER_ID,
            };
          },
        },
        ...nodeFields,
        ['changed' + type.name]: {
          type,
          description: 'The mutated object.',
        },
        [edgeName]: {
          type: edge,
          description:
`A connection edge containing the mutated object. Can be used to add a newly
created object to a connection in Relay.
`,
        },
      };
    },
  });
}
