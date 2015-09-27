import { Cursor } from '../builtins/Cursor';

export default function formatMutationResult(
  clientMutationId, typeName, result
) {
  return {
    clientMutationId,
    ['changed' + typeName]: result,
    ['changed' + typeName + 'Edge']: {
      node: result,
      cursor: new Cursor({
        value: result.id.value,
      }),
    },
    id: result.id,
  };
}
