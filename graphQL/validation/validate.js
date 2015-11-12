import { filter } from 'lodash';

import { getByIndex } from '../../db/queries/simpleQueries';

export default async function validate(
  conn,
  context,
  type,
  newObject,
  existingObject
) {
  await validateUnique(conn, context, type, newObject, existingObject);
}

async function validateUnique(
  conn,
  context,
  type,
  newObject,
  existingObject = {}
) {
  const uniqueFields = filter(type.getFields(),
    (field) => (
      field.name !== 'id' &&
      field.metadata && field.metadata.unique &&
      newObject[field.name] !== existingObject[field.name]
    )
  );

  const uniqueChecks = await* uniqueFields.map((field) => getByIndex(
    conn,
    type.name,
    context.rootValue.indexes[type.name],
    field.name,
    newObject[field.name]
  ));

  for (const index in uniqueFields) {
    const field = uniqueFields[index];
    const check = uniqueChecks[index];
    if (check) {
      throw new Error(
        `${type.name}.${field.name}: value must be unique, got ` +
        `${JSON.stringify(newObject[field.name])}`
      );
    }
  }
}
