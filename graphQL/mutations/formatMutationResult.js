export default function formatMutationResult(
  clientMutationId, typeName, result, changedName
) {
  if (!changedName) {
    changedName = `changed${typeName}`;
  }

  return {
    clientMutationId,
    [changedName]: result,
    [`${changedName}Edge`]: {
      node: result,
      cursor: {
        value: result.id.value,
      },
    },
    id: result.id,
  };
}
