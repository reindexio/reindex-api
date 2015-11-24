export default function formatMutationResult(
  clientMutationId, typeName, result
) {
  return {
    clientMutationId,
    ['changed' + typeName]: result,
    ['changed' + typeName + 'Edge']: {
      node: result,
      cursor: {
        value: result.id.value,
      },
    },
    id: result.id,
  };
}
