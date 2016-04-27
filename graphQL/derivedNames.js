import { pluralize } from 'inflection';
import { camelCase, startCase, isArray } from 'lodash';

export function getPluralName(name, pluralName) {
  if (pluralName) {
    return pluralName;
  }
  return name ? pluralize(name) : null;
}

export default function getGeneratedTypeName(baseTypeName, suffix) {
  if (baseTypeName.startsWith('Reindex')) {
    return baseTypeName + suffix;
  }
  return '_' + baseTypeName + suffix;
}

export function getAllQueryName(typeName, pluralName) {
  return `all${getPluralName(typeName, pluralName)}`;
}

export function getUniqueFieldQueryName(typeName, fieldName) {
  let nameChain;
  if (isArray(fieldName)) {
    nameChain = fieldName;
  } else {
    nameChain = [fieldName];
  }
  return camelCase(`${typeName} by ${nameChain.join(' ')}`);
}

export function getCreateMutationName(typeName) {
  return `create${typeName}`;
}

export function getCreateInputObjectTypeName(typeName) {
  return `_Create${typeName}Input`;
}

export function getUpdateMutationName(typeName) {
  return `update${typeName}`;
}

export function getUpdateInputObjectTypeName(typeName) {
  return `_Update${typeName}Input`;
}

export function getReplaceMutationName(typeName) {
  return `replace${typeName}`;
}

export function getReplaceInputObjectTypeName(typeName) {
  return `_Replace${typeName}Input`;
}

export function getDeleteMutationName(typeName) {
  return `delete${typeName}`;
}

export function getDeleteInputObjectTypeName(typeName) {
  return `_Delete${typeName}Input`;
}

export function getConnectionTypeName(typeName) {
  return getGeneratedTypeName(typeName, 'Connection');
}

export function getEdgeTypeName(typeName) {
  return getGeneratedTypeName(typeName, 'Edge');
}

export function getPayloadTypeName(typeName) {
  return getGeneratedTypeName(typeName, 'Payload');
}

export function getInputObjectTypeName(typeName) {
  return getGeneratedTypeName(typeName, 'Input');
}

export function getFilterName(typeName, fieldName) {
  return getGeneratedTypeName(
    typeName, `${startCase(fieldName).replace(/ /gi, '')}Filter`
  );
}

export function getFilterOperationName(typeName, fieldName) {
  return getGeneratedTypeName(
    typeName, `${startCase(fieldName).replace(/ /gi, '')}FilterOperation`
  );
}
