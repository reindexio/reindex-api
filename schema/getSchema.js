import {fromJS} from 'immutable';
import getSchemaQuery from './getSchemaQuery';
import dbToSchema from './dbToSchema';

export default async function getSchema(db, conn) {
  let schema = await getSchemaQuery(db).run(conn);
  return dbToSchema(fromJS(schema));
}
