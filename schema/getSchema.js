import {fromJS} from 'immutable';
import SchemaSelector from '../query/selectors/SchemaSelector';
import dbToSchema from './dbToSchema';

export default async function getSchema(db, conn) {
  const schema = await new SchemaSelector().toReQL(db).run(conn);
  return dbToSchema(fromJS(schema));
}
