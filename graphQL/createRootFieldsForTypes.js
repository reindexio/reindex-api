import {Map} from 'immutable';

export default function createRootFieldsForTypes(
  creators,
  typeSets,
) {
  return typeSets
    .map((typeSet) => (
      createRootFieldsForType(
        creators,
        typeSet,
      )
    ))
    .reduce((operations, next) => operations.merge(next), Map());
}

function createRootFieldsForType(creators, typeSet) {
  return creators
    .map((creator) => creator(typeSet))
    .toKeyedSeq()
    .mapEntries(([, query]) => [query.name, query]);
}
