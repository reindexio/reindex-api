import {Map, List} from 'immutable';
import {GraphQLNonNull, GraphQLString} from 'graphql';
import {getById} from '../../db/queries';
import createOperation from '../createOperation';

export default function createGet({type}) {
  return createOperation(
    'get' + type.name,
    type,
    Map({
      id: {
        name: 'id',
        description: `id of ${type.name}`,
        type: new GraphQLNonNull(GraphQLString),
      },
    }),
    List(),
    (parent, {id}, {dbContext}) => (
      getById(dbContext, type.name, id).run(dbContext.conn)
    ),
  );
}
