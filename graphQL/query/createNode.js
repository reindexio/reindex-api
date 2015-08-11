import {Map} from 'immutable';
import {GraphQLNonNull} from 'graphql';
import {getByID} from '../../db/queries';
import ReindexID from '../builtins/ReindexID';
import createRootField from '../createRootField';

export default function createNode(typeSets, interfaces) {
  return createRootField({
    name: 'node',
    returnType: interfaces.ReindexNode,
    args: Map({
      id: {
        name: 'id',
        type: new GraphQLNonNull(ReindexID),
      },
    }),
    resolve: (parent, {id}, {conn}) => (
      getByID(conn, id)
    ),
  });
}
