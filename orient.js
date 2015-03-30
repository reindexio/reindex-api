import Oriento from "oriento";
import {DB_CONFIG} from "./settings";

export function getDb() {
  return Oriento(DB_CONFIG).use(DB_CONFIG.name);
}

function isOrientClass(cls) {
  let name = cls.name;
  return (
    name === 'V' ||
    name === 'E' ||
    name[0] === 'O' ||
    name === '_studio'
  );
}

function extractType(cls) {
  return {
    name: cls.name
  };
}

export function getType(db, name) {

}

export function getSchema(db) {
  return db['class']
    .list()
    .then((classes) => {
      return classes.filter((cls) => !isOrientClass(cls));
    })
    .then((classes) => classes.map(extractType));
}

export function graphqlToSql(query) {
  let root = query.call;
}
