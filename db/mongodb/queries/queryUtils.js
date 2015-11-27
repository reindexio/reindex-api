import { get } from 'lodash';

export function addID(type, object) {
  if (object && object._id) {
    object.id = {
      type,
      value: object._id.toString(),
    };
  }
  return object;
}

export function addTransform(cursor, transform) {
  let finalTransform;
  const existingTransform = get(cursor, ['cursorState', 'transforms', 'doc']);
  if (existingTransform) {
    finalTransform = (object) => transform(existingTransform(object));
  } else {
    finalTransform = transform;
  }
  return cursor.map(finalTransform);
}
