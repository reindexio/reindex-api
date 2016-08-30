import createAuthenticationProvider from './createAuthenticationProvider';
import createIntercomSettings from './createIntercomSettings';
import createTypeTypes from './createTypeTypes';
import createCredentialTypes from './createCredentialTypes';
import createSecret from './createSecret';
import createMigrationTypes from './createMigrationTypes';
import createHook from './createHook';

export default function createCommonTypes(typeRegistry) {
  return [
    ...createTypeTypes(typeRegistry),
    ...createCredentialTypes(typeRegistry),
    ...createMigrationTypes(typeRegistry),
    ...createHook(typeRegistry),
    ...createSecret(typeRegistry),
    ...createAuthenticationProvider(typeRegistry),
    ...createIntercomSettings(typeRegistry),
  ];
}
