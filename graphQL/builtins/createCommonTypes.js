import createAuthenticationProvider from './createAuthenticationProvider';
import createIntercomSettings from './createIntercomSettings';
import createTypeTypes from './createTypeTypes';
import createCredentialTypes from './createCredentialTypes';
import createSecret from './createSecret';
import createPermission from './createPermission';
import createMigrationTypes from './createMigrationTypes';
import createHook from './createHook';

export default function createCommonTypes(interfaces, getTypeSet) {
  return {
    ...createTypeTypes(interfaces, getTypeSet),
    ...createCredentialTypes(interfaces, getTypeSet),
    ...createMigrationTypes(interfaces, getTypeSet),
    ...createHook(interfaces, getTypeSet),
    ReindexSecret: createSecret(interfaces),
    ReindexAuthenticationProvider: createAuthenticationProvider(interfaces),
    ReindexPermission: createPermission(interfaces, getTypeSet),
    ReindexIntercomSettings: createIntercomSettings(),
  };
}
