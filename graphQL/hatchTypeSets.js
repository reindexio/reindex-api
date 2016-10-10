import { chain } from 'lodash';

import { createConnection } from './connections';
import createPayload from './createPayload';
import createPermissions from './permissions/createPermissions';

/**
 * Create missing types and metadata for typeSets in type registry
 */
export default function hatchTypeSets(typeRegistry) {
  for (const typeSet of typeRegistry.getTypeSets()) {
    if (typeSet.type.getInterfaces().includes(
      typeRegistry.getInterface('Node'))
    ) {
      if (!typeRegistry.connection) {
        const { connection, edge } = createConnection(typeSet, typeRegistry);
        typeSet.connection = connection;
        typeSet.edge = edge;
      }
    }
  }

  for (const typeSet of typeRegistry.getTypeSets()) {
    if (!typeRegistry.payload) {
      typeSet.payload = createPayload(typeSet, typeRegistry);
    }
    typeSet.connectionTypes = createConnectionTypes(typeSet, typeRegistry);
  }
  for (const typeSet of typeRegistry.getTypeSets()) {
    typeSet.permissions = createPermissions(typeSet, typeRegistry);
  }
}

function createConnectionTypes(typeSet, typeRegistry) {
  return chain(typeSet.type.getFields())
    .pick((field) => field.metadata && field.metadata.reverseName)
    .mapValues((field) => {
      if (field.metadata.type === 'Connection') {
        const relatedType = typeRegistry.getTypeSet(field.metadata.ofType).type;
        const relatedField = relatedType.getFields()[
          field.metadata.reverseName
        ];
        if (relatedField.metadata.type === 'Connection') {
          return 'MANY_TO_MANY';
        } else {
          return 'MANY_TO_ONE';
        }
      } else {
        return 'ONE_TO_MANY';
      }
    })
    .value();
}
