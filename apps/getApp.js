import Boom from 'boom';
import RethinkDB from 'rethinkdb';
import {fromJS, List} from 'immutable';

import App from './App';
import DBContext from '../db/DBContext';
import {getApp as getAppQuery} from '../db/queries';
import createSchema from '../graphQL/createSchema';
import defaultSetup from '../graphQL/defaultSetup';

const databaseDoesNotExistRegExp = /^Database `[^`]+` does not exist.$/;

export default async function getApp(dbName, conn) {
  if (dbName === 'rethinkdb') {
    throw Boom.notFound();
  }
  try {
    const dbContext = new DBContext({
      db: RethinkDB.db(dbName),
      conn,
    });
    const {schema, secrets} = await getAppQuery(dbContext).run(conn);
    return new App({
      dbName,
      schema: createSchema(defaultSetup, fromJS(schema)),
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
