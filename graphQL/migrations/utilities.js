import { indexBy } from 'lodash';

export function getName(object) {
  return object.name;
}

export function sortedNames(objects) {
  return objects.map(getName).sort();
}

export function byName(objects) {
  return indexBy(objects, getName);
}

function fieldsOrNull(type, fields) {
  const result = {};
  for (const field of fields) {
    result[field] = type[field] || null;
  }
  return result;
}

export function extractTypeOptions(type) {
  return fieldsOrNull(type, [
    'description',
    'pluralName',
    'permissions',
  ]);
}

export function extractFieldOptions(field) {
  return fieldsOrNull(field, [
    'description',
    'nonNull',
    'deprecationReason',
    'ofType',
    'reverseName',
    'grantPermissions',
    'defaultOrdering',
    'unique',
    'orderable',
    'filterable',
  ]);
}
