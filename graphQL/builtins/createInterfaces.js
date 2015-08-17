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
    ReindexConnection: new GraphQLInterfaceType({
      name: 'ReindexConnection',
      description: '',
      fields: {},
    }),
    ReindexEdge: new GraphQLInterfaceType({
      name: 'ReindexEdge',
      description: '',
      fields: {},
    }),
    ReindexMutation: new GraphQLInterfaceType({
      name: 'ReindexMutation',
      description: '',
      fields: {
        clientMutationId: {
          type: GraphQLString,
        },
      },
    }),
  };
}
