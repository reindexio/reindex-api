export default function createType(db, name) {
  let basicType = {
    name: name,
    fields: [{
      name: 'id',
      type: 'string',
    }, ],
  };
  return {
    run: async function(conn) {
      await db.tableCreate(name).run(conn);
      return await db
        .table('_types')
        .insert(basicType)
        .run(conn);
    },
  };
}
