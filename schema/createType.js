export default async function createType(db, conn, name) {
  let basicType = {
    name: name,
    fields: [{
      name: 'id',
      type: 'string',
    }, ],
  };
  await db
    .tableCreate(name)
    .run(conn);
  return await db
    .table('_types')
    .insert(basicType)
    .run(conn);
}
