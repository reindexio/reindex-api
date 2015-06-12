import RethinkDB from 'rethinkdb';
import {fromJS, List, Map} from 'immutable';

import App from './App';
import Query from '../query/Query';
import ObjectSelector from '../query/selectors/ObjectSelector';
import SchemaSelector from '../query/selectors/SchemaSelector';
import SecretsSelector from '../query/selectors/SecretsSelector';
import dbToSchema from '../schema/dbToSchema';

const getAppQuery = new Query({
  selector: new ObjectSelector(),
  map: new Map({
    schema: new SchemaSelector(),
    secrets: new SecretsSelector(),
  }),
});

export default async function getApp(dbName, conn) {
  const db = RethinkDB.db(dbName);
  const {schema, secrets} = await getAppQuery.toReQL(db).run(conn);
  return new App({
    dbName,
    schema: dbToSchema(fromJS(schema)),
    secrets: List(secrets.map((secret) => secret.value)),
  });
}
