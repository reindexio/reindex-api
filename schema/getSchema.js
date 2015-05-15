import {fromJS} from 'immutable';
import SchemaSelector from '../query/selectors/SchemaSelector';
import dbToSchema from './dbToSchema';

export default async function getSchema(db, conn) {
  let schema = await new SchemaSelector().toReQL(null, db).run(conn);
  return dbToSchema(fromJS(schema));
}
