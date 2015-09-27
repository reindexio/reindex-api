export default function getGeneratedTypeName(baseTypeName, suffix) {
  if (baseTypeName.startsWith('Reindex')) {
    return baseTypeName + suffix;
  }
  return '_' + baseTypeName + suffix;
}
