import {ID, toReindexID} from '../graphQL/builtins/ReindexID';

export default function toJSON(obj) {
  return JSON.stringify(obj, (key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    } else if (value instanceof ID) {
      return toReindexID(value);
    } else {
      return value;
    }
  });
}
