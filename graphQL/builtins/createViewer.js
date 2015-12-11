import { chain } from 'lodash';

import { GraphQLObjectType, GraphQLNonNull } from 'graphql';

import checkPermission from '../permissions/checkPermission';
import createSearchFor from '../query/createSearchFor';
import ReindexID from './ReindexID';
import { getIntercomSettings } from './IntercomSettings';

export default function createViewer(typeSets, interfaces) {
  const allObjectsFields = chain(typeSets)
    .pick((typeSet) => typeSet.connection)
    .map((typeSet) => createSearchFor(typeSet, interfaces, typeSets))
    .indexBy((field) => field.name)
    .value();

  return new GraphQLObjectType({
    name: 'ReindexViewer',
    description:
`Global \`Node\` used to query all objects and current user.

\`ReindexViewer\` has a \`user\` field, which is currently logged-in user.
If there is no logged-in user, this field will return \`null\`.

For each type, \`ReindexViewer\` holds a field with a Connection to all objects
of that type. Its name is \`allObjects\`, where \`Objects\` is a pluralized name
of the type.
`,
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
        type: typeSets.User.type,
        description: 'The signed in user. Returned for requests made as a ' +
          'user signed in using Reindex authentication.',
        async resolve(parent, args, context) {
          const { userID } = context.rootValue.credentials;
          if (!userID) {
            return null;
          }
          const result = await context.rootValue.db.getByID('User', userID);
          checkPermission('User', 'read', result, context);
          return result;
        },
      },
      __intercomSettings: {
        type: typeSets.ReindexIntercomSettings.type,
        description: 'INTERNAL',
        resolve(parent, args, context) {
          return getIntercomSettings(context.rootValue.credentials);
        },
      },
    },
  });
}

export const VIEWER_ID = {
  type: 'ReindexViewer',
  value: 'viewer',
};

export function isViewerID(id) {
  return (
    id.type === VIEWER_ID.type &&
    id.value === VIEWER_ID.value
  );
}
