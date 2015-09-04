import { Map } from 'immutable';

export default function createRootFieldsForTypes(
  creators,
  typeSets,
  interfaces
) {
  return typeSets
    .map((typeSet) => (
      createRootFieldsForType(
        creators,
        typeSet,
        interfaces,
        typeSets
      )
    ))
    .reduce((operations, next) => operations.merge(next), Map());
}

function createRootFieldsForType(creators, typeSet, interfaces, typeSets) {
  return creators
    .filter((creator) =>
      typeSet.type.getInterfaces().includes(interfaces.Node) &&
      !typeSet.blacklistedRootFields.contains(creator)
    )
    .map((creator) => creator(typeSet, interfaces, typeSets))
    .toKeyedSeq()
    .mapEntries(([, query]) => [query.name, query]);
}
