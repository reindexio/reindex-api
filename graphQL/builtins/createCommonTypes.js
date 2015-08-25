import { Map } from 'immutable';
import createAuthenticationProvider from './createAuthenticationProvider';
import createTypeTypes from './createTypeTypes';
import createUserTypes from './createUserTypes';
import createSecret from './createSecret';
import createPermission from './createPermission';

export default function createCommonTypes(interfaces, getTypeSet) {
  return Map({
    ...createTypeTypes(interfaces, getTypeSet),
    ...createUserTypes(interfaces, getTypeSet),
    ReindexSecret: createSecret(interfaces),
    ReindexAuthethenticationProvider: createAuthenticationProvider(interfaces),
    ReindexPermission: createPermission(interfaces, getTypeSet),
  });
}
