import {Map} from 'immutable';
import createAuthenticationProvider from './createAuthenticationProvider';
import createUser from './createUser';
import createSecret from './createSecret';

export default function createCommonTypes(interfaces) {
  return Map({
    ReindexUser: createUser(interfaces),
    ReindexSecret: createSecret(interfaces),
    ReindexAuthethenticationProvider: createAuthenticationProvider(interfaces),
  });
}
