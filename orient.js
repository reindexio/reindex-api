import Oriento from "oriento";
import Immutable from "immutable";
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

const ORIENT_TYPES = [
  'BOOLEAN',
  'INTEGER',
  'SHORT',
  'LONG',
  'FLOAT',
  'DOUBLE',
  'DATETIME',
  'STRING',
  'BINARY',
  'EMBEDDED',
  'EMBEDDEDLIST',
  'EMBEDDEDSET',
  'EMBEDDEDMAP',
  'LINK',
  'LINKLIST',
  'LINKSET',
  'LINKMAP',
  'BYTE',
  'TRANSIENT',
  'DATE',
  'CUSTOM',
  'DECIMAL',
  'LINKBAG',
  'ANY'
];

function extractType(cls) {
  return {
    name: cls.name,
    properties: Immutable.Seq(cls.properties)
      .toKeyedSeq()
      .mapEntries(([,prop]) => {
        let obj = {
          name: prop.name,
          type: ORIENT_TYPES[prop.type],
          linkedClass: prop.linkedClass
        };
        return [prop.name, obj];
      })
      .toJS()
  };
}

export function getSchema(db) {
  return db['class']
    .list()
    .then((classes) => {
      let result = {};
      for (let cls of classes) {
        if (!isOrientClass(cls)) {
          result[cls.name] = extractType(cls);
        }
      }
      return result;
    });
}
