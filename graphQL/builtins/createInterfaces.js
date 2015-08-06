import {
  GraphQLInterfaceType,
  GraphQLString,
} from 'graphql';
import ReindexID from './ReindexID';

export default function createInterfaces() {
  return {
    Node: new GraphQLInterfaceType({
      name: 'Node',
      description: {},
      fields: {
        id: {
          type: ReindexID,
        },
      },
    }),
    Connection: new GraphQLInterfaceType({
      name: 'ReindexConnection',
      description: '',
      fields: {},
    }),
    Edge: new GraphQLInterfaceType({
      name: 'ReindexEdge',
      description: '',
      fields: {},
    }),
    Mutation: new GraphQLInterfaceType({
      name: 'ReindexMutation',
      description: '',
      fields: {
        clientMutationId: {
          type: GraphQLString,
        },
      },
    }),
    Builtin: new GraphQLInterfaceType({
      name: 'ReindexBuiltin',
      description: '',
      fields: {},
    }),
    ExtendableBuiltin: new GraphQLInterfaceType({
      name: 'ReindexExtendableBuiltin',
      description: '',
      fields: {},
    }),
  };
}
