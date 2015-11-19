import { difference, intersection, remove } from 'lodash';

import buildTypeMigration from './buildTypeMigration';
import {
  DeleteFieldData,
} from './commands';
import { byName, sortedNames } from './utilities';

export default function buildSchemaMigration(types, nextTypes) {
  const previous = byName(types);
  const next = byName(nextTypes);
  const previousNames = sortedNames(types);
  const nextNames = sortedNames(nextTypes);

  const commands = [];

  difference(nextNames, previousNames).forEach((name) => {
    commands.push(
      ...buildTypeMigration(null, next[name]),
    );
  });
  difference(previousNames, nextNames).forEach((name) => {
    commands.push(
      ...buildTypeMigration(previous[name], null),
    );
  });
  intersection(previousNames, nextNames).forEach((name) => {
    commands.push(
      ...buildTypeMigration(previous[name], next[name])
    );
  });

  createDeleteFieldDataCommands(commands, previous);

  return commands;
}

function createDeleteFieldDataCommands(commands, oldTypes) {
  const remainingInlineCommands = remove(commands, (command) => (
    command.commandType === 'DeleteFieldData'
  ));

  while (remainingInlineCommands.length > 0) {
    const next = remainingInlineCommands.pop();
    const type = next.type;
    if (type.interfaces.includes('Node')) {
      commands.push(next);
    } else {
      const basePath = next.path;
      for (const parentName in oldTypes) {
        if (type.name === parentName) {
          continue;
        }
        const parent = oldTypes[parentName];
        const matchingFields = parent.fields.filter(
          (field) => (
            field.type === type.name || (
              field.type === 'List' &&
              field.ofType === type.name
            )
          )
        );
        for (const field of matchingFields) {
          const path = [field.name, ...basePath];
          remainingInlineCommands.unshift(
            new DeleteFieldData(parent, path)
          );
        }
      }
    }
  }
}
