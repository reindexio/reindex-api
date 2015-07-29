import {Map} from 'immutable';
import {GraphQLID, GraphQLNonNull} from 'graphql';
import * as queries from '../../db/queries';
import createRootField from '../createRootField';

export default function createCRU(operation, getById, {
  type,
  inputObject,
  mutation,
}) {
  let opArgs = Map({
    clientMutationId: {
      name: 'clientMutationId',
      type: GraphQLID,
    },
    [type.name]: {
      name: type.name,
      type: new GraphQLNonNull(inputObject),
    },
  });

  if (getById) {
    opArgs = opArgs.set('id', {
      name: 'id',
      type: new GraphQLNonNull(GraphQLID),
    });
  }

  return createRootField({
    name: operation + type.name,
    returnType: mutation,
    args: opArgs,
    resolve(parent, args, {dbContext}) {
      const clientMutationId = args.clientMutationId;
      const object = args[type.name];
      let queryArgs;
      if (getById) {
        queryArgs = [dbContext, type.name, args.id, object];
      } else {
        queryArgs = [dbContext, type.name, object];
      }
      return queries[operation](...queryArgs)
        .run(dbContext.conn)
        .then((result) => ({
          clientMutationId,
          [type.name]: result,
        }));
    },
  });
}
