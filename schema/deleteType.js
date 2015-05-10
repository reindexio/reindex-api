export default async function deleteType(db, conn, name) {
  await db
    .table('_types')
    .get(name)
    .delete()
    .run(conn);
  return await db
    .tableDrop(name)
    .run(conn);
}
