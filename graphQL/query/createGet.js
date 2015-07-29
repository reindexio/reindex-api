import {Map} from 'immutable';
import {GraphQLNonNull, GraphQLID} from 'graphql';
import {getById} from '../../db/queries';
import createRootField from '../createRootField';

export default function createGet({type}) {
  return createRootField({
    name: 'get' + type.name,
    returnType: type,
    args: Map({
      id: {
        name: 'id',
        description: `id of ${type.name}`,
        type: new GraphQLNonNull(GraphQLID),
      },
    }),
    resolve: (parent, {id}, {dbContext}) => (
      getById(dbContext, type.name, id).run(dbContext.conn)
    ),
  });
}
