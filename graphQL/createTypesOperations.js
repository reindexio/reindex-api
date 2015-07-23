import {Map} from 'immutable';

export default function createTypesOperations(
  creators,
  types,
) {
  return types
    .map((type) => (
      createTypeOperations(
        creators,
        type,
      )
    ))
    .reduce((operations, next) => operations.merge(next), Map());
}

function createTypeOperations(creators, type) {
  return creators
    .map((creator) => creator(type))
    .toKeyedSeq()
    .mapEntries(([, query]) => [query.name, query]);
}
