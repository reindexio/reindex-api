import { Map } from 'immutable';
import createAuthenticationProvider from './createAuthenticationProvider';
import createTypeTypes from './createTypeTypes';
import createUserTypes from './createUserTypes';
import createSecret from './createSecret';

export default function createCommonTypes(interfaces) {
  return Map({
    ...createTypeTypes(interfaces),
    ...createUserTypes(interfaces),
    ReindexSecret: createSecret(interfaces),
    ReindexAuthethenticationProvider: createAuthenticationProvider(interfaces),
  });
}
