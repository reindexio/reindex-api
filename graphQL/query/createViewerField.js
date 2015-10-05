import { VIEWER_ID } from '../builtins/createViewer';

export default function createViewerField(typeSets, interfaces, viewer) {
  return {
    type: viewer,
    description: 'Returns the global node with fields used to query all the ' +
      'objects by type as well as the currently signed in user in the `user` ' +
      'field.',
    resolve() {
      return {
        id: VIEWER_ID,
      };
    },
  };
}
