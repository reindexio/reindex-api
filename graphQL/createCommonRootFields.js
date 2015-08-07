export default function createCommonRootFields(creators, typeSets, interfaces) {
  return creators.map((creator) => creator(typeSets, interfaces));
}
