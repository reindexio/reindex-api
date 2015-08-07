import {Map} from 'immutable';
import {GraphQLNonNull} from 'graphql';
import {getById} from '../../db/queries';
import ReindexID from '../builtins/ReindexID';
import createRootField from '../createRootField';

export default function createNode(typeSets, {Node}) {
  return createRootField({
    name: 'node',
    returnType: Node,
    args: Map({
      id: {
        name: 'id',
        type: new GraphQLNonNull(ReindexID),
      },
    }),
    resolve: (parent, {id}, {dbContext}) => (
      getById(dbContext, id.type, id).run(dbContext.conn)
    ),
  });
}
