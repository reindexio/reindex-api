import checkAndEnqueueHooks from './checkAndEnqueueHooks';

// Check related connection onDelete property and perform nullifying updates
export default async function updateRelatedObjects(typeName, object, {
  db,
  hooks,
  typeRegistry,
}) {
  const connectionFields = typeRegistry
    .getTypeSet(typeName).permissions.related;
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
      checkAndEnqueueHooks(db, hooks, field.type, 'afterUpdate', null, node);
    }
  }));
}
