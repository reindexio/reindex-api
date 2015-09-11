import { difference, intersection } from 'lodash';

import buildTypeMigration from './buildTypeMigration';
import { CreateType, DeleteType } from './commands';
import { byName, sortedNames } from './utilities';

export default function buildSchemaMigration(types, nextTypes) {
  const previous = byName(types);
  const next = byName(nextTypes);
  const previousNames = sortedNames(types);
  const nextNames = sortedNames(nextTypes);

  const commands = [];

  difference(nextNames, previousNames).forEach((name) => {
    commands.push(new CreateType(name));
  });
  difference(previousNames, nextNames).forEach((name) => {
    commands.push(new DeleteType(name));
  });
  intersection(previousNames, nextNames).forEach((name) => {
    commands.push(
      ...buildTypeMigration(previous[name], next[name])
    );
  });
  return commands;
}
