import checkPermission from '../permissions/checkPermission';
import { getByID } from '../../db/queries/simpleQueries';
import { ID } from '../builtins/ReindexID';

export default function createViewer(typeSets) {
  return {
    name: 'viewer',
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
}
