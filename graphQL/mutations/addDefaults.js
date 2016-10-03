import { values } from 'lodash';

import { TIMESTAMP } from '../builtins/DateTime';

export default function addDefaults(type, object, existing, isCreate) {
  const defaultFields = values(type.getFields()).filter(
    (field) => field.metadata && field.metadata.defaultValue && (
      field.metadata.defaultValue.updateOn === 'UPDATE' ||
      isCreate
    )
  );
  const result = { ...object };
  const checkObject = {
    ...existing,
    ...object,
  };
  for (const field of defaultFields) {
    const {
      name: fieldName,
      type: fieldType,
      metadata: {
        defaultValue: {
          type: defaultType,
          value: defaultValue,
        },
      },
    } = field;
    if (!result[fieldName]) {
      if (defaultType === 'CREDENTIALS') {
        const credentials = normalizeCredentials(checkObject.credentials);
        if (credentials[defaultValue]) {
          result[fieldName] = fieldType.parseValue(credentials[defaultValue]);
        }
      } else if (defaultType === 'TIMESTAMP') {
        result[fieldName] = TIMESTAMP;
      } else if (defaultType === 'VALUE') {
        result[fieldName] = fieldType.parseValue(defaultValue);
      }
    }
  }
  return result;
}

function normalizeCredentials(credentials) {
  return (credentials && credentials[Object.keys(credentials)[0]]) || {};
}
