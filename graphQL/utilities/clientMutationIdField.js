import { GraphQLString } from 'graphql';

const clientMutationIdField = {
  type: GraphQLString,
  description: 'The client mutation ID used by clients like Relay to track ' +
    'the mutation. If given, returned in the response payload of the mutation.',
};

export default clientMutationIdField;
