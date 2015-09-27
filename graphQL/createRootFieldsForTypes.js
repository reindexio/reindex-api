import { Map } from 'immutable';

export default function createRootFieldsForTypes(
  creators,
  typeSets,
  interfaces,
  viewer
) {
  return typeSets
    .map((typeSet) => (
      createRootFieldsForType(
        creators,
        typeSet,
        interfaces,
        typeSets,
        viewer
      )
    ))
    .reduce((operations, next) => operations.merge(next), Map());
}

function createRootFieldsForType(
  creators,
  typeSet,
  interfaces,
  typeSets,
  viewer
) {
  return creators
    .filter((creator) =>
      typeSet.type.getInterfaces().includes(interfaces.Node) &&
      !typeSet.blacklistedRootFields.includes(creator)
    )
    .map((creator) => creator(typeSet, interfaces, typeSets, viewer))
    .toKeyedSeq()
    .mapEntries(([, query]) => [query.name, query]);
}
