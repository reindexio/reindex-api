export default function createCommonRootFields(
  creators,
  typeSets,
  interfaces,
  viewer
) {
  return creators.map((creator) => creator(typeSets, interfaces, viewer));
}
