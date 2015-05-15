/**
 * Something that is applied to query to modify it.
 *
 * @interface
 interface Converter {
   toReQL(db: rethinkdb.db, query: Query): Query
 }
 */
