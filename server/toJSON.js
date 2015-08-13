import {ID, toReindexID} from '../graphQL/builtins/ReindexID';
import {Cursor, toCursor} from '../graphQL/builtins/Cursor';

export default function toJSON(obj) {
  return JSON.stringify(obj, (key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    } else if (value instanceof ID) {
      return toReindexID(value);
    } else if (value instanceof Cursor) {
      return toCursor(value);
    } else {
      return value;
    }
  });
}
