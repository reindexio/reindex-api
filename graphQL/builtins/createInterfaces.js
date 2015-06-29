import {
  GraphQLInterfaceType,
  GraphQLID,
} from 'graphql';

export default function createInterfaces() {
  return {
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
          type: GraphQLID,
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
