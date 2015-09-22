import invariantFunction from 'invariant';
import { isEqual, isBoolean, isPlainObject, isString, uniq } from 'lodash';

import getInterfaceDefaultFields
  from '../../graphQL/builtins/InterfaceDefaultFields';
import ScalarTypes from '../../graphQL/builtins/ScalarTypes';
import getTypeDefaultFields from '../../graphQL/builtins/TypeDefaultFields';
import { byName } from './utilities';

const InterfaceDefaultFields = getInterfaceDefaultFields();
const TypeDefaultFields = getTypeDefaultFields();

export default function validateSchema({ types }, interfaces) {
  const errors = [];
  function invariant(...args) {
    try {
      invariantFunction(...args);
    } catch (e) {
      errors.push(e.toString().replace(
        /Error: Invariant Violation: /,
        ''
      ));
    }
  }

  invariant(
    uniq(types, 'name').length === types.length,
    'Expected type names to be unique.',
  );

  if (errors.length > 0) {
    return errors;
  }

  const typesByName = byName(types);
  types.forEach((type) => validateType(
    type, typesByName, interfaces, invariant)
  );

  if (errors.length > 0) {
    return errors;
  }

  for (const type of types) {
    validateFields(type, invariant);
    if (errors.length > 0) {
      continue;
    }
    type.fields.forEach((field) => validateField(
      type, field, typesByName, invariant
    ));
  }

  return errors;
}

const TYPE_NAME_PATTERN = /^[A-Z][_0-9A-Za-z]*$/;

function validateType(type, typesByName, interfaces, invariant) {
  invariant(
    isString(type.name) && TYPE_NAME_PATTERN.test(type.name),
    'Expected `name` of a type to be a string starting with a capital ' +
    'letter. Allowed characters are letters A-Z, a-z and underscore (_).' +
    'Found: %s',
    type.name,
  );
  invariant(
    type.name && !type.name.startsWith('Reindex'),
    'Invalid type `name`: %s. Names that begin with "Reindex" are reserved ' +
    'for built-in types.',
    type.name,
  );
  invariant(
    type.kind === 'OBJECT',
    '%s: Expected type `kind` to be "OBJECT".',
    type.name,
  );
  invariant(
    type.description == null || isString(type.description),
    '%s: Expected `description` to be undefined or a string.',
    type.name,
  );
  invariant(
    Array.isArray(type.interfaces) &&
    type.interfaces.every((name) => isString(name) && interfaces[name]),
    '%s: Expected `interfaces` to be an array of interface names. Found: %s',
    type.name,
    type.interfaces,
  );
  invariant(
    Array.isArray(type.fields) &&
    type.fields.every(isPlainObject),
    '%s: Expected `fields` to be an array of field objects.',
    type.name,
  );
  invariant(
    uniq(type.fields, 'name').length === type.fields.length,
    '%s: Expected field names to be unique within a type.',
    type.name,
  );

}

function validateFields(type, invariant) {
  // must have all fields of interfaces
  type.interfaces.forEach((interfaceName) => {
    for (const defaultField of InterfaceDefaultFields[interfaceName] || []) {
      invariant(
        type.fields.some((field) => isEqual(field, defaultField)),
        `%s.%s: Expected %s field of type %s from interfaces %s`,
        type.name, defaultField.name, defaultField.nonNull ? 'non-null' : '',
        defaultField.type, interfaceName
      );
    }
  });
}

function validateField(type, field, typesByName, invariant) {
  invariant(
    isString(field.name),
    '%s: Expected field name to be a string.',
    type.name
  );
  invariant(
    field.isRequired == null || isBoolean(field.isRequired),
    '%s.%s: Expected `isRequired` to be undefined or boolean value. Found %s.',
    type.name, field.name, field.isRequired,
  );
  invariant(
    field.description == null || isString(field.description),
    '%s.%s: Expected `description` to be undefined or string. Found %s.',
    type.name, field.name, field.description,
  );
  invariant(
    field.deprecationReason == null || isString(field.deprecationReason),
    '%s.%s: Expected `deprecationReason` to be undefined or string. Found %s.',
    type.name, field.name, field.deprecationReason,
  );

  invariant(
    isString(field.type),
    '%s.%s: Expected field type to be a string. Found: %s.',
    type.name, field.name, field.type
  );
  invariant(
    field.type in ScalarTypes ||
    field.type in typesByName ||
    field.type === 'Connection' ||
    field.type === 'List',
    '%s.%s: Expected `type` to be a valid scalar or object type. Found: %s.',
    type.name, field.name, field.type
  );

  // ofType
  if (field.type === 'Connection') {
    invariant(
      field.ofType in typesByName &&
      isNodeType(typesByName[field.ofType]),
      '%s.%s: Expected `ofType` of a connection field to be an object type ' +
      'that implements the Node interface. Found: %s.',
      type.name, field.name, field.ofType,
    );
  } else if (field.type === 'List') {
    invariant(
      field.ofType in ScalarTypes ||
      (field.ofType in typesByName && !isNodeType(typesByName[field.ofType])),
      '%s.%s: Expected `ofType` of a list field to be a scalar or non-Node ' +
      'object type. Found: %s.',
      type.name, field.name, field.ofType,
    );
  } else {
    invariant(
      field.ofType == null,
      '%s.%s: Expected `ofType` to be undefined for a field with non-wrapper ' +
      'type "%s". Found: %s.',
      type.name, field.name, field.type, field.ofType,
    );
  }

  // reverseName
  const ofType = field.type === 'Connection' ? field.ofType : field.type;
  if (ofType in typesByName && isNodeType(typesByName[ofType])) {
    validateReverseField(type, field, typesByName, invariant);
  }

  // no overriding default fields
  const typeFields = TypeDefaultFields[type.name];
  invariant(
    !typeFields ||
    typeFields.every((defaultField) => defaultField.name !== field.name),
    '%s.%s: Field name shadows a built-in field.',
    type.name, field.name,
  );
}

function validateReverseField(
  type,
  field,
  typesByName,
  invariant
) {
  let reverseType;
  let expectedFieldType;
  let expectedFieldOfType;
  if (field.type === 'Connection') {
    reverseType = field.ofType;
    expectedFieldType = type.name;
    expectedFieldOfType = null;
  } else {
    reverseType = field.type;
    expectedFieldType = 'Connection';
    expectedFieldOfType = type.name;
  }

  invariant(
    isString(field.reverseName),
    '%s.%s: Expected Connection field to define `reverseName`. Found: %s.',
    type.name, field.name, field.reverseName,
  );
  const reverseField = typesByName[reverseType].fields.find(({ name }) =>
    name === field.reverseName
  );
  invariant(
    reverseField,
    '%s.%s: Expected `reverseName` to be a field name in type %s. Found: %s.',
    type.name, field.name, reverseType, field.reverseName,
  );
  if (reverseField) {
    invariant(
      reverseField.reverseName === field.name,
      '%s.%s: Expected reverse field of %s.%s to have matching `reverseName` ' +
      '%s. Found: %s.',
      reverseType, reverseField.name, type.name, field.name, field.name,
      reverseField.reverseName,
    );
    invariant(
      reverseField.type === expectedFieldType,
      '%s.%s: Expected reverse field of %s.%s to have type %s. Found: %s.',
      reverseType, reverseField.name, type.name, field.name, expectedFieldType,
      reverseField.type,
    );
  }
  if (expectedFieldOfType) {
    invariant(
      reverseField.ofType === expectedFieldOfType,
      '%s.%s: Expected reverse field of %s.%s to have ofType %s. Found: %s.',
      reverseType, reverseField.name, type.name, field.name,
      expectedFieldOfType, reverseField.ofType,
    );
  }
}

function isNodeType(type) {
  return type.interfaces.includes('Node');
}
