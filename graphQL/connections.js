import { isFunction } from 'lodash';
import {
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLList,
} from 'graphql';

import checkPermission from './permissions/checkPermission';
import Cursor from './builtins/Cursor';
import getGeneratedTypeName from './utilities/getGeneratedTypeName';

export function createConnection({ type }) {
  const edge = new GraphQLObjectType({
    name: getGeneratedTypeName(type.name, 'Edge'),
    description:
`This is a generated Edge for ${type.name}.

Edges are elements of \`edges\` list of Connections.

* [Reindex docs: Connection
](https://reindex)
* [Relay docs: Connections
](https://facebook.github.io/relay/docs/graphql-connections.html#content)
`,
    fields: {
      cursor: {
        name: 'cursor',
        description:
`The opaque string-like object, that points to the current node. To be used with
\`before\` and \`after\` arguments of the Connection field.
`,
        type: new GraphQLNonNull(Cursor),
      },
      node: {
        name: 'node',
        description: 'The ${type.name} object wrapped by this edge.',
        type,
      },
    },
  });
  return {
    edge,
    connection: new GraphQLObjectType({
      name: getGeneratedTypeName(type.name, 'Connection'),
      description:
`This is a generated Connection for ${type.name}.

Connection is a pattern from Relay.
It's a specification, designed to make management of ordered collections easier,
when pagination and ordering is required. Reindex uses Connections for linking
\`Node\` types and for providing an interface to retrieving all objects of some
type.

* [Reindex docs: Connection
](https://reindex)
* [Relay docs: Connections
](https://facebook.github.io/relay/docs/graphql-connections.html#content)
`,
      fields: {
        count: {
          name: 'count',
          description:
`The total number of elements in the connection.
`,
          type: GraphQLInt,
          resolve({ query }, args, { rootValue: { db } }) {
            return db.getCount(query);
          },
        },
        nodes: {
          name: 'nodes',
          description:
`A plain list of ${type.name} objects without the ${edge.name} wrapper object.`,
          type: new GraphQLList(type),
          resolve({ paginatedQuery }, args, { rootValue: { db } }) {
            return db.getNodes(paginatedQuery);
          },
        },
        edges: {
          name: 'edges',
          description: 'A list of edges included in the connection.',
          type: new GraphQLList(edge),
          resolve({ paginatedQuery }, args, { rootValue: { db } }) {
            return db.getEdges(paginatedQuery);
          },
        },
        pageInfo: {
          name: 'pageInfo',
          description:
`Information about if there are any more elements before or after the current
slice.
`,
          type: new GraphQLNonNull(PageInfo),
          resolve({ pageInfo }, args, { rootValue: { db } }) {
            return db.getPageInfo(pageInfo);
          },
        },
      },
    }),
  };
}

export const PageInfo = new GraphQLObjectType({
  name: 'PageInfo',
  fields: {
    hasNextPage: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    hasPreviousPage: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
  },
});

export function createConnectionArguments(typeName, getTypeSet) {
  const args = {
    first: {
      name: 'first',
      description:
        'Number of edges to include from the beginning of the result.',
      type: GraphQLInt,
    },
    last: {
      name: 'last',
      description:
        'Number of edges to include from the end of the result.',
      type: GraphQLInt,
    },
    before: {
      name: 'before',
      description: 'Only return edges before given cursor.',
      type: Cursor,
    },
    after: {
      name: 'after',
      description: 'Only return edges after given cursor.',
      type: Cursor,
    },
  };

  const ordering = getTypeSet(typeName).getOrdering();
  if (ordering) {
    args.orderBy = {
      name: 'orderBy',
      description: 'The ordering to sort the results by.',
      type: ordering,
    };
  }

  return args;
}

export function createNodeFieldResolve(ofType, fieldName) {
  return async (parent, args, context) => {
    const id = isFunction(fieldName) ? fieldName(parent) : parent[fieldName];
    if (id) {
      const result = await context.rootValue.db.getByID(id);
      checkPermission(ofType, 'read', result, context);
      return result;
    } else {
      return null;
    }
  };
}

function checkConnectionPermissions(type, reverseName, parent, context) {
  const userFields = context.rootValue.permissions.connection[type];
  const object = {};
  if (userFields) {
    const userField = userFields.find((field) => (
      field.name === reverseName
    ));
    if (userField) {
      object[reverseName] = parent.id;
    }
  }
  checkPermission(type, 'read', object, context);
}

export function createConnectionFieldResolve(
  ofType,
  reverseName,
  defaultOrdering
) {
  return (parent, args, context) => {
    checkConnectionPermissions(ofType, reverseName, parent, context);
    if (!defaultOrdering) {
      defaultOrdering = {
        field: 'id',
      };
    }
    const processedArgs = {
      orderBy: defaultOrdering,
      ...args,
    };
    return context.rootValue.db.getConnectionQueries(
      ofType,
      context.rootValue.indexes[ofType],
      {
        keyPrefixFields: [[reverseName, 'value']],
        keyPrefix: [parent.id.value],
      },
      processedArgs
    );
  };
}
