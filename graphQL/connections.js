import {Map} from 'immutable';
import {getCount, getNodes, getEdges} from '../db/queries';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
} from 'graphql';

export function createConnection({type}, {Edge, Connection}) {
  const edge = new GraphQLObjectType({
    name: '_' + type.name + 'Edge',
    fields: {
      cursor: {
        name: 'cursor',
        type: GraphQLString,
        resolve() {
          // TODO
          return '';
        },
      },
      node: {
        name: 'node',
        type,
      },
    },
    interfaces: [Edge],
  });
  return new GraphQLObjectType({
    name: '_' + type.name + 'Connection',
    fields: {
      count: {
        name: 'count',
        type: GraphQLInt,
        resolve({query}, args, {conn}) {
          return getCount(conn, query);
        },
      },
      nodes: {
        name: 'nodes',
        type: new GraphQLList(type),
        resolve({paginatedQuery}, args, {conn}) {
          return getNodes(conn, paginatedQuery);
        },
      },
      edges: {
        name: 'edges',
        type: new GraphQLList(edge),
        resolve({paginatedQuery}, args, {conn}) {
          return getEdges(conn, paginatedQuery);
        },
      },
    },
    interfaces: [Connection],
  });
}

export function createConnectionArguments() {
  return Map({
    first: {
      name: 'first',
      type: GraphQLInt,
    },
    after: {
      name: 'after',
      type: GraphQLInt,
    },
    orderBy: {
      name: 'orderBy',
      type: GraphQLString,
    },
  });
}
