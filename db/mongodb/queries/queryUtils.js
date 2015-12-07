import { get } from 'lodash';
import { ObjectId } from 'mongodb';

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

export function isValidID(type, id) {
  if (!id) {
    return false;
  }
  if (id.type !== type) {
    return false;
  }
  if (!ObjectId.isValid(id.value)) {
    return false;
  }
  return true;
}
