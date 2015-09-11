import { difference, intersection, isEqual } from 'lodash';

import {
  CreateField,
  CreateType,
  DeleteField,
  DeleteType,
  UpdateFieldInfo,
} from './commands';
import { byName, sortedNames } from './utilities';

function buildFieldsMigration(type, nextType) {
  const previousFields = byName(type.fields);
  const nextFields = byName(nextType.fields);
  const previousFieldNames = sortedNames(type.fields);
  const nextFieldNames = sortedNames(nextType.fields);

  const commands = [];

  difference(nextFieldNames, previousFieldNames).forEach((name) => {
    commands.push(new CreateField(type.name, name));
  });
  difference(previousFieldNames, nextFieldNames).forEach((name) => {
    commands.push(new DeleteField(type.name, name));
  });
  intersection(previousFieldNames, nextFieldNames).forEach((name) => {
    const previousField = previousFields[name];
    const nextField = nextFields[name];
    if (previousField.type !== nextField.type ||
        previousField.ofType !== nextField.ofType) {
      commands.push(new DeleteField(type.name, name));
      commands.push(new CreateField(type.name, name));
    } else if (previousField.description !== nextField.description ||
        previousField.deprecationReason !== nextField.deprecationReason ||
        previousField.isRequired !== nextField.isRequired) {
      commands.push(new UpdateFieldInfo(type.name, name));
    }
  });
  return commands;
}

export default function buildTypeMigration(type, nextType) {
  const commands = [];

  if (!isEqual(type.interfaces, nextType.interfaces)) {
    commands.push(new DeleteType(type.name));
    commands.push(new CreateType(type.name));
  }

  commands.push(...buildFieldsMigration(type, nextType));

  return commands;
}
