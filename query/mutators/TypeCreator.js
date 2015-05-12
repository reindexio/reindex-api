import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

export default class TypeCreator extends Record({
  name: undefined,
}) {
  toReQL(r, db) {
    let basicType = {
      name: this.name,
      node: true,
      fields: [{
        name: 'id',
        type: 'string',
      }, ],
    };

    return RethinkDB.do(db.tableCreate(this.name), (result) => {
      return RethinkDB.do(db.table('_types').insert(basicType), () => {
        return RethinkDB.expr({}).merge({
          success: result('tables_created').ne(0),
        });
      });
    });
  }
}
