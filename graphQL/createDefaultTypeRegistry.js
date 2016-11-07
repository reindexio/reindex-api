import createInterfaces from './builtins/createInterfaces';
import hatchTypeSets from './hatchTypeSets';
import TypeRegistry from './TypeRegistry';

import createCommonTypes from './builtins/createCommonTypes';
import createTypesFromReindexSchema from './createTypesFromReindexSchema';

export default function createDefaultTypeRegistry({
  types,
  hooksByType = {},
  indexesByType = {},
}) {
  const typeRegistry = new TypeRegistry();
  createInterfaces(typeRegistry);
  typeRegistry.registerTypeSets(createCommonTypes(typeRegistry));
  typeRegistry.registerTypeSets(createTypesFromReindexSchema(
    typeRegistry, types, indexesByType, hooksByType
  ));
  hatchTypeSets(typeRegistry);

  return typeRegistry;
}
