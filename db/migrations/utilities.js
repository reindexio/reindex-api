import { pick, omit, indexBy } from 'lodash';

export function getName(object) {
  return object.name;
}

export function sortedNames(objects) {
  return objects.map(getName).sort();
}

export function byName(objects) {
  return indexBy(objects, getName);
}


export function extractTypeOptions(type) {
  return pick(type, ['description', 'pluralName']);
}

export function extractFieldOptions(field) {
  return omit(field, ['name', 'type']);
}
