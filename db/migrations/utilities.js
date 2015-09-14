import { indexBy } from 'lodash';

function getName(object) {
  return object.name;
}

export function sortedNames(objects) {
  return objects.map(getName).sort();
}

export function byName(objects) {
  return indexBy(objects, getName);
}
