import {Map} from 'immutable';
import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLEnumType,
} from 'graphql';
import {getNodes, getEdges, getCount, getPageInfo} from '../db/queries/simple';
import Cursor from './builtins/Cursor';

export function createConnection({type}) {
  const edge = new GraphQLObjectType({
    name: '_' + type.name + 'Edge',
    fields: {
      cursor: {
        name: 'cursor',
        type: Cursor,
      },
      node: {
        name: 'node',
        type,
      },
    },
  });
  return new GraphQLObjectType({
    name: '_' + type.name + 'Connection',
    fields: {
      count: {
        name: 'count',
        type: GraphQLInt,
        resolve({query}, args, {rootValue: {conn}}) {
          return getCount(conn, query);
        },
      },
      nodes: {
        name: 'nodes',
        type: new GraphQLList(type),
        resolve({paginatedQuery}, args, {rootValue: {conn}}) {
          return getNodes(conn, paginatedQuery);
        },
      },
      edges: {
        name: 'edges',
        type: new GraphQLList(edge),
        resolve({paginatedQuery, cursorFn}, args, {rootValue: {conn}}) {
          return getEdges(conn, paginatedQuery, cursorFn);
        },
      },
      pageInfo: {
        name: 'pageInfo',
        type: new GraphQLNonNull(PageInfo),
        resolve({pageInfo}, args, {rootValue: {conn}}) {
          return getPageInfo(conn, pageInfo);
        },
      },
    },
  });
}

const PageInfo = new GraphQLObjectType({
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

const OrderByOrderEnum = new GraphQLEnumType({
  name: 'ReindexOrderByOrder',
  values: {
    ASC: {
      value: 'ASC',
    },
    DESC: {
      value: 'DESC',
    },
  },
});

const OrderByInputType = new GraphQLInputObjectType({
  name: 'ReindexOrderBy',
  fields: {
    order: {
      type: OrderByOrderEnum,
    },
    field: {
      type: new GraphQLNonNull(GraphQLString),
    },
  },
});

export function createConnectionArguments() {
  return Map({
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
      type: OrderByInputType,
    },
  });
}
