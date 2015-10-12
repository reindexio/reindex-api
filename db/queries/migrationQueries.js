import { chain, remove, groupBy, sortBy, map, set } from 'lodash';
import RethinkDB from 'rethinkdb';

import { TYPE_TABLE } from '../DBTableNames';

export async function performMigration(conn, commands) {
  const commandsByType = groupBy(commands, (command) => command.commandType);

  if (commandsByType.DeleteType) {
    await deleteTypes(conn, commandsByType.DeleteType);
  }
  if (commandsByType.DeleteTypeData) {
    await deleteTypesData(conn, commandsByType.DeleteTypeData);
  }
  if (commandsByType.DeleteFieldData) {
    await deleteFieldsData(conn, commandsByType.DeleteFieldData);
  }
  if (commandsByType.CreateTypeData) {
    await createNewTypeData(conn, commandsByType.CreateTypeData);
  }
  await updateTypes(conn, commands);
}

function deleteTypes(conn, commands) {
  const typeIds = commands.map((command) => command.type.id);
  return RethinkDB.table(TYPE_TABLE).getAll(...typeIds).delete().run(conn);
}

function deleteTypesData(conn, commands) {
  const names = commands.map((command) => command.type.name);
  return RethinkDB.expr(names).forEach((name) => (
    RethinkDB.tableDrop(name)
  )).run(conn);
}

function deleteFieldsData(conn, commands) {
  const fieldsByType = groupBy(commands, (command) => command.type.name);
  const typeData = map(fieldsByType, (fields, typeName) => ({
    name: typeName,
    fields: fields.map((field) => set({}, field.path, true)),
  }));

  return RethinkDB.expr(typeData).forEach((type) =>
    RethinkDB.table(type('name')).replace((row) =>
      row.without(RethinkDB.args(type('fields')))
    )
  ).run(conn);
}

function createNewTypeData(conn, commands) {
  const names = commands.map((command) => command.type.name);
  return RethinkDB.expr(names).forEach((name) => (
    RethinkDB.tableCreate(name)
  )).run(conn);
}

function updateTypes(conn, commands) {
  const commandsByTypeName = chain(commands)
    .filter((command) => (
      [
        'CreateType',
        'CreateField',
        'UpdateTypeInfo',
        'DeleteField',
        'UpdateFieldInfo',
      ].includes(
        command.commandType
      ))
    )
    .groupBy((command) => command.type.name)
    .value();

  const updatedTypes = map(commandsByTypeName, createUpdatedType);

  return RethinkDB.table(TYPE_TABLE).insert(updatedTypes, {
    conflict: 'replace',
  }).run(conn);
}

function createUpdatedType(commands) {
  let type;
  let fields = [];
  const commandsByType = groupBy(commands, (command) => command.commandType);
  if (commandsByType.CreateType) {
    type = commandsByType.CreateType[0].getData();
  } else {
    type = {
      ...commands[0].type,
    };
    fields = type.fields.filter((field) => !field.builtin);
  }

  if (commandsByType.UpdateTypeInfo) {
    type = {
      ...type,
      ...commandsByType.UpdateTypeInfo[0].getData(),
    };
  }

  for (const command of commandsByType.DeleteField || []) {
    remove(fields, (field) => field.name === command.fieldName);
  }

  for (const command of commandsByType.UpdateFieldInfo || []) {
    fields = fields.map((field) => {
      if (field.name === command.fieldName) {
        return {
          name: field.name,
          type: field.type,
          ...command.getData(),
        };
      } else {
        return field;
      }
    });
  }

  for (const command of commandsByType.CreateField || []) {
    fields.push(command.getData());
  }

  fields = sortBy(fields, (field) => field.name);

  return {
    ...type,
    fields,
  };
}
