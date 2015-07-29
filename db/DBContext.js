import {Record} from 'immutable';

export default class DatabaseContext extends Record({
  db: undefined,
  conn: undefined,
}) {}
