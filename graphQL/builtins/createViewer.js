import { GraphQLObjectType, GraphQLNonNull } from 'graphql';

import checkPermission from '../permissions/checkPermission';
import createSearchFor from '../query/createSearchFor';
import ReindexID, { ID } from './ReindexID';
import { getIntercomSettings } from './IntercomSettings';
import { getByID } from '../../db/queries/simpleQueries';

export default function createViewer(typeSets, interfaces) {
  const viewerFields = typeSets
    .filter((typeSet) => typeSet.connection)
    .mapEntries(([, typeSet]) => {
      const field = createSearchFor(typeSet, interfaces, typeSets);
      return [field.name, field];
    })
    .toObject();

  viewerFields.id = {
    type: new GraphQLNonNull(ReindexID),
  };

  viewerFields.user = {
    type: typeSets.get('User').type,
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
  };

  viewerFields.__intercomSettings = {
    type: typeSets.get('ReindexIntercomSettings').type,
    resolve(parent, args, context) {
      return getIntercomSettings(context.rootValue.credentials);
    },
  };

  return new GraphQLObjectType({
    name: 'ReindexViewer',
    interfaces: [interfaces.Node],
    isTypeOf(obj) {
      return isViewerID(obj.id);
    },
    fields: viewerFields,
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
