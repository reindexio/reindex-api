import { difference, intersection, isEqual } from 'lodash';

import { extractTypeOptions, extractFieldOptions } from './utilities';

import {
  CreateField,
  CreateType,
  CreateTypeData,
  UpdateTypeInfo,
  DeleteField,
  DeleteFieldData,
  DeleteType,
  DeleteTypeData,
  UpdateFieldInfo,
} from './commands';
import { byName, sortedNames } from './utilities';

export default function buildTypeMigration(type, nextType) {
  const commands = [];

  if (type && nextType) {
    if (!isEqual(type.interfaces, nextType.interfaces)) {
      commands.push(...buildDeleteType(type));
      commands.push(...buildCreateType(nextType));
      type = null;
    } else if (!isEqual(
      extractTypeOptions(type),
      extractTypeOptions(nextType),
    )) {
      commands.push(new UpdateTypeInfo(type, extractTypeOptions(nextType)));
    }
  } else if (!type && nextType) {
    commands.push(...buildCreateType(nextType));
  } else if (type && !nextType) {
    commands.push(...buildDeleteType(type));
  }

  if (nextType) {
    commands.push(...buildFieldsMigration(type, nextType));
  }

  return commands;
}

function buildDeleteType(type) {
  const commands = [];
  if (type.interfaces.includes('Node')) {
    commands.push(new DeleteTypeData(type));
  }
  commands.push(new DeleteType(type));
  return commands;
}

function buildCreateType(type) {
  const commands = [];
  if (type.interfaces.includes('Node')) {
    commands.push(new CreateTypeData(type));
  }
  commands.push(new CreateType(type));
  return commands;
}

function buildFieldsMigration(type, nextType) {
  const prevFields = type ? type.fields.filter((field) => !field.builtin) : [];
  const previousFields = byName(prevFields);
  const nextFields = byName(nextType.fields);
  const previousFieldNames = sortedNames(prevFields);
  const nextFieldNames = sortedNames(nextType.fields);

  const commands = [];

  difference(nextFieldNames, previousFieldNames).forEach((name) => {
    const nextField = nextFields[name];
    commands.push(new CreateField(
      type || nextType, name, nextField.type, extractFieldOptions(nextField),
    ));
  });
  difference(previousFieldNames, nextFieldNames).forEach((name) => {
    commands.push(new DeleteField(type, name));
    commands.push(new DeleteFieldData(type, [name]));
  });
  intersection(previousFieldNames, nextFieldNames).forEach((name) => {
    const previousField = previousFields[name];
    const nextField = nextFields[name];
    if (previousField.type !== nextField.type ||
        previousField.ofType !== nextField.ofType) {
      commands.push(new DeleteFieldData(type, [name]));
      commands.push(new DeleteField(type, name));
      commands.push(new CreateField(
        type, name, nextField.type, extractFieldOptions(nextField)
      ));
    } else if (!isEqual(previousField, nextField)) {
      commands.push(new UpdateFieldInfo(type, name, extractFieldOptions(
        nextField
      )));
    }
  });
  return commands;
}
