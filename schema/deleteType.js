export default function deleteType(db, name) {
  return {
    run: async function(conn) {
      await db
        .table('_types')
        .get(name)
        .delete()
        .run(conn);
      return await db
        .tableDrop(name)
        .run(conn);
    },
  };
}
