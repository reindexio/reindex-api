import { Map } from 'immutable';
import createAuthenticationProvider from './createAuthenticationProvider';
import createIntercomSettings from './createIntercomSettings';
import createTypeTypes from './createTypeTypes';
import createUserTypes from './createUserTypes';
import createSecret from './createSecret';
import createPermission from './createPermission';
import createMigrationTypes from './createMigrationTypes';
import createHook from './createHook';

export default function createCommonTypes(interfaces, getTypeSet) {
  return Map({
    ...createTypeTypes(interfaces, getTypeSet),
    ...createUserTypes(interfaces, getTypeSet),
    ...createMigrationTypes(interfaces, getTypeSet),
    ...createHook(interfaces, getTypeSet),
    ReindexSecret: createSecret(interfaces),
    ReindexAuthethenticationProvider: createAuthenticationProvider(interfaces),
    ReindexPermission: createPermission(interfaces, getTypeSet),
    ReindexIntercomSettings: createIntercomSettings(),
  });
}
