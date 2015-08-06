export default function createCommonRootFields(creators, typeSets) {
  return creators.map((creator) => creator(typeSets));
}
