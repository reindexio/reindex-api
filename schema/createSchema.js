export default async function createSchema(db, conn) {
  await db
    .tableCreate('_types', {primaryKey: 'name'})
    .run(conn);
}
