import { VIEWER_ID } from '../builtins/createViewer';

export default function createViewerField(typeRegistry) {
  return {
    type: typeRegistry.getViewer(),
    description:
`Returns the global node with fields used to query all the objects by type as
well as the currently signed in user in the \`user\` field.

* [Reindex docs: Viewer
](https://www.reindex.io/docs/graphql-api/queries/#viewer)
`,
    resolve() {
      return {
        id: VIEWER_ID,
      };
    },
  };
}
