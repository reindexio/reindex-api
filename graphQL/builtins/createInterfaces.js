import {
  GraphQLInterfaceType,
  GraphQLNonNull,
} from 'graphql';
import ReindexID from './ReindexID';

export default function createInterfaces() {
  return {
    Node: new GraphQLInterfaceType({
      name: 'Node',
      description: {},
      fields: {
        id: {
          type: new GraphQLNonNull(ReindexID),
        },
      },
    }),
  };
}
