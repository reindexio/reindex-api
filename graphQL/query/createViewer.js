import { GraphQLObjectType, GraphQLNonNull } from 'graphql';
import checkPermission from '../permissions/checkPermission';
import { getByID } from '../../db/queries/simpleQueries';
import createSearchFor from './createSearchFor';
import ReindexID, { ID } from '../builtins/ReindexID';


export default function createViewer(typeSets, interfaces) {
  const viewerFields = typeSets
    .filter((typeSet) => typeSet.connection)
    .mapEntries(([, typeSet]) => {
      const field = createSearchFor(typeSet, interfaces, typeSets);
      return [field.name, field];
    })
    .toObject();

  viewerFields.id = {
    name: 'id',
    type: new GraphQLNonNull(ReindexID),
  };

  viewerFields.user = {
    name: 'user',
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

  const viewerType = new GraphQLObjectType({
    name: 'ReindexViewer',
    interfaces: [interfaces.Node],
    isTypeOf(obj) {
      return obj.id.type === 'ReindexViewer';
    },
    fields: viewerFields,
  });

  return {
    name: 'ReindexViewer',
    type: viewerType,
    resolve() {
      return {
        id: new ID({
          type: 'ReindexViewer',
          value: 'viewer',
        }),
      };
    },
  };
}
