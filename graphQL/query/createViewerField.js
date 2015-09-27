import { VIEWER_ID } from '../builtins/createViewer';

export default function createViewerField(typeSets, interfaces, viewer) {
  return {
    name: 'ReindexViewer',
    type: viewer,
    resolve() {
      return {
        id: VIEWER_ID,
      };
    },
  };
}
