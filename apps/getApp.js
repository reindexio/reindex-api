import Boom from 'boom';
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

const databaseDoesNotExistRegExp = /^Database `[^`]+` does not exist.$/;

export default async function getApp(dbName, conn) {
  if (dbName === 'rethinkdb') {
    throw Boom.notFound();
  }
  try {
    const db = RethinkDB.db(dbName);
    const {schema, secrets} = await getAppQuery.toReQL(db).run(conn);
    return new App({
      dbName,
      schema: dbToSchema(fromJS(schema)),
      secrets: List(secrets.map((secret) => secret.value)),
    });
  } catch (error) {
    if (error.name === 'RqlRuntimeError' &&
        databaseDoesNotExistRegExp.test(error.msg)) {
      throw Boom.notFound();
    } else {
      throw error;
    }
  }
}
