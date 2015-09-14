import {
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLList,
} from 'graphql';
import {
  getNodes,
  getEdges,
  getCount,
  getPageInfo,
  getByID,
} from '../db/queries/simpleQueries';
import { getConnectionQueries } from '../db/queries/connectionQueries';
import checkPermission from './permissions/checkPermission';
import Cursor from './builtins/Cursor';

export function createConnection({ type }) {
  const edge = new GraphQLObjectType({
    name: '_' + type.name + 'Edge',
    fields: {
      cursor: {
        name: 'cursor',
        type: new GraphQLNonNull(Cursor),
      },
      node: {
        name: 'node',
        type,
      },
    },
  });
  return {
    edge,
    connection: new GraphQLObjectType({
      name: '_' + type.name + 'Connection',
      fields: {
        count: {
          name: 'count',
          type: GraphQLInt,
          resolve({ query }, args, { rootValue: { conn } }) {
            return getCount(conn, query);
          },
        },
        nodes: {
          name: 'nodes',
          type: new GraphQLList(type),
          resolve({ paginatedQuery }, args, { rootValue: { conn } }) {
            return getNodes(conn, paginatedQuery);
          },
        },
        edges: {
          name: 'edges',
          type: new GraphQLList(edge),
          resolve({ paginatedQuery }, args, { rootValue: { conn } }) {
            return getEdges(conn, paginatedQuery);
          },
        },
        pageInfo: {
          name: 'pageInfo',
          type: new GraphQLNonNull(PageInfo),
          resolve({ pageInfo }, args, { rootValue: { conn } }) {
            return getPageInfo(conn, pageInfo);
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

export function createConnectionArguments(getTypeSet, interfaces) {
  return {
    first: {
      name: 'first',
      type: GraphQLInt,
    },
    last: {
      name: 'last',
      type: GraphQLInt,
    },
    before: {
      name: 'before',
      type: Cursor,
    },
    after: {
      name: 'after',
      type: Cursor,
    },
    orderBy: {
      name: 'orderBy',
      type: getTypeSet('ReindexOrdering')
        .getInputObject(getTypeSet, interfaces),
    },
  };
}

export function createNodeFieldResolve(ofType, fieldName) {
  return async (parent, args, context) => {
    const result = await getByID(context.rootValue.conn, parent[fieldName]);
    checkPermission(ofType, 'read', result, context);
    return result;
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
    return getConnectionQueries(
      context.rootValue.conn,
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
