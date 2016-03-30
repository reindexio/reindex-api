import { isEqual, flatten, indexBy, chain } from 'lodash';
import { ObjectId } from 'mongodb';

export async function constructMissingIndexes(db, types, indexes) {
  const potentialIndexes = findPotentialIndexes(types);
  const missingIndexes = filterExistingIndexes(indexes, potentialIndexes);
  await createIndexes(db, missingIndexes);
}

export async function deleteTypeIndexes(db, type, indexes, fields) {
  if (fields) {
    const typeIndexes = indexes[type] || [];
    const indexesToDelete = typeIndexes.filter((index) =>
      fields.some((field) => isEqual(index.fields, field))
    );
    const indexIds = indexesToDelete.map((index) => index.id.value);
    const indexNames = indexesToDelete.map((index) => index.name);
    await* indexNames.map((indexName) =>
      db.collection(type).dropIndex(indexName
    ));
    return db.collection('ReindexIndex').deleteMany({
      _id: {
        $in: indexIds,
      },
    });
  } else {
    return db.collection('ReindexIndex').deleteMany({ type });
  }
}

function findPotentialIndexes(types) {
  const typesByName = indexBy(types, (type) => type.name);
  return chain(types)
    .filter((type) => type.interfaces.includes('Node'))
    .map((type) => findIndexesInType(type, typesByName))
    .flatten()
    .value();
}

function findIndexesInType(type, typesByName) {
  const orderableFields = type.fields.filter((field) => field.orderable);
  return flatten(type.fields.map((field) => {
    if (type.interfaces.includes('Node') && field.name === 'id') {
      return [];
    } else if (field.unique) {
      return [
        {
          type: type.name,
          fields: [field.name, '_id'],
          unique: true,
        },
      ];
    } else if (field.orderable) {
      return [
        {
          type: type.name,
          fields: [field.name, '_id'],
        },
      ];
    } else if (field.type !== 'Connection' && field.reverseName) {
      const indexField = `${field.name}.value`;
      const baseIndexes = [
        {
          type: type.name,
          fields: [indexField, '_id'],
        },
      ];
      return baseIndexes.concat(
        orderableFields.map((orderableField) => ({
          type: type.name,
          fields: [indexField, orderableField.name, '_id'],
        })),
      );
    } else if (
      typesByName[field.type] &&
      !typesByName[field.type].interfaces.includes('Node')
    ) {
      const innerType = typesByName[field.type];
      const innerTypeIndexes = findIndexesInType(innerType, typesByName);
      return innerTypeIndexes.map((index) => ({
        type: type.name,
        fields: [`${field.name}.${index.fields[0]}`, '_id'],
        unique: index.unique,
      }));
    } else {
      return [];
    }
  }));
}

function filterExistingIndexes(indexes, potentialIndexes) {
  return potentialIndexes.filter((index) => !(
    (indexes[index.type] || []).some((existingIndex) =>
      isEqual(index.fields, existingIndex.fields)
    ))
  );
}

async function createIndexes(db, indexes) {
  await* indexes.map(async (index) => {
    index.name = new ObjectId().toString();
    const spec = index.fields.map((field) => [field, 1]);
    await db.collection(index.type).createIndex(spec, {
      name: index.name,
      unique: index.unique,
    });
    await db.collection('ReindexIndex').insert(index);
  });
}
