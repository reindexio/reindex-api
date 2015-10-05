import { GraphQLObjectType, GraphQLNonNull } from 'graphql';

import checkPermission from '../permissions/checkPermission';
import createSearchFor from '../query/createSearchFor';
import ReindexID, { ID } from './ReindexID';
import { getIntercomSettings } from './IntercomSettings';
import { getByID } from '../../db/queries/simpleQueries';

export default function createViewer(typeSets, interfaces) {
  const allObjectsFields = typeSets
    .filter((typeSet) => typeSet.connection)
    .mapEntries(([, typeSet]) => {
      const field = createSearchFor(typeSet, interfaces, typeSets);
      return [field.name, field];
    })
    .toObject();

  return new GraphQLObjectType({
    name: 'ReindexViewer',
    description: 'The global node with fields used to query all the objects ' +
      'by type as well as the currently signed in user in the `user` field.',
    interfaces: [interfaces.Node],
    isTypeOf(obj) {
      return isViewerID(obj.id);
    },
    fields: {
      ...allObjectsFields,
      id: {
        type: new GraphQLNonNull(ReindexID),
        description: 'The ID of the global viewer node.',
      },
      user: {
        type: typeSets.get('User').type,
        description: 'The signed in user. Returned for requests made as a ' +
          'user signed in using Reindex authentication.',
        async resolve(parent, args, context) {
          const { userID } = context.rootValue.credentials;
          if (!userID) {
            return null;
          }
          const result = await getByID(
            context.rootValue.conn,
            new ID({ type: 'User', value: userID }),
          );
          checkPermission('User', 'read', result, context);
          return result;
        },
      },
      __intercomSettings: {
        type: typeSets.get('ReindexIntercomSettings').type,
        description: 'INTERNAL',
        resolve(parent, args, context) {
          return getIntercomSettings(context.rootValue.credentials);
        },
      },
    },
  });
}

export const VIEWER_ID = new ID({
  type: 'ReindexViewer',
  value: 'viewer',
});

export function isViewerID(id) {
  return (
    id.type === VIEWER_ID.type &&
    id.value === VIEWER_ID.value
  );
}
