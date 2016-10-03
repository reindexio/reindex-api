import checkAndEnqueueHooks from './checkAndEnqueueHooks';

// Check related connection onDelete property and perform nullifying updates
export default async function updateRelatedObjects(typeName, object, {
  db,
  permissions: {
    related: relatedConnections,
  },
  hooks,
}) {
  const connectionFields = relatedConnections[typeName] || [];
  const nullableConnections = connectionFields.filter(
    (field) => field.connectionType !== 'ONE_TO_MANY'
  );

  return Promise.all(nullableConnections.map(async (field) => {
    const result = await db.removeAllFromConnection(
      field.type,
      field.reverseName,
      object.id,
      field.connectionType === 'MANY_TO_MANY',
    );
    for (const node of result) {
      await checkAndEnqueueHooks(
        db,
        hooks,
        field.type,
        'afterUpdate',
        null,
        node
      );
    }
  }));
}
