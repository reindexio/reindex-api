export default function createSchema(db) {
  return db
    .tableCreate('_types', {primaryKey: 'name'});
}
