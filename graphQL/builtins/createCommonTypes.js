import {Map} from 'immutable';
import createAuthenticationProvider from './createAuthenticationProvider';
import createUserTypes from './createUserTypes';
import createSecret from './createSecret';

export default function createCommonTypes(interfaces) {
  return Map({
    ...createUserTypes(interfaces),
    ReindexSecret: createSecret(interfaces),
    ReindexAuthethenticationProvider: createAuthenticationProvider(interfaces),
  });
}
