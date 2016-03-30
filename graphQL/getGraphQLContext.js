import { chain, groupBy, indexBy, mapValues, values, union } from 'lodash';
import createSchema from './createSchema';

export default function getGraphQLContext(
  db, metadata, extraContext, extraRootFields,
) {
  const {
    types: typeData,
    indexes: indexData,
    hooks: hookData,
  } = metadata;
  const indexes = extractIndexes(indexData);
  const typeInfoByName = extractTypeInfo(typeData);
  const typePermissions = extractPermissions(typeData);
  const connectionPermissions = extractConnectionPermissions(typeInfoByName);
  const relatedPermissions = extractRelatedPermissions(typeInfoByName);
  const hooks = extractHooks(hookData, typeData);
  const schema = createSchema(typeData, extraRootFields);
  return {
    ...extraContext,
    db,
    indexes,
    permissions: {
      type: typePermissions,
      connection: connectionPermissions,
      related: relatedPermissions,
    },
    hooks,
    types: typeData,
    typeInfoByName,
    schema,
  };
}

function extractIndexes(indexes) {
  return groupBy(indexes, (index) => index.type);
}

// Return types by name, with fields by name, with fields annotated with
// additional information
function extractTypeInfo(typeData) {
  const typesByName = indexBy(typeData, (type) => type.name);
  return mapValues(typesByName, (type) => {
    const fieldsByName = indexBy(type.fields, (field) => field.name);
    return {
      ...type,
      fields: mapValues(fieldsByName, (field) => {
        if (field.type === 'Connection') {
          const relatedType = typesByName[field.ofType]
            .fields
            .find((relatedField) =>
              relatedField.name === field.reverseName
            )
            .type;
          return {
            ...field,
            connectionType: (
              relatedType === 'Connection' ? 'MANY_TO_MANY' : 'MANY_TO_ONE'
            ),
          };
        } else if (field.reverseName) {
          return {
            ...field,
            connectionType: 'ONE_TO_MANY',
          };
        } else {
          return field;
        }
      }),
    };
  });
}

const DEFAULT_TYPE_PERMISSIONS = {
  EVERYONE: {
    grantee: 'EVERYONE',
    userPath: null,
    read: true,
    create: true,
    update: true,
    delete: true,
    permittedFields: null,
  },
};

function extractPermissions(types) {
  return chain(types)
    .indexBy((type) => type.name)
    .mapValues((type) => type.permissions ?
      extractTypePermissions(type) :
      mapValues(DEFAULT_TYPE_PERMISSIONS, (permission) => addPermittedFields(
        permission, type.fields
      )),
    )
    .value();
}

function extractTypePermissions(type) {
  return chain(type.permissions)
    .filter((permission) => permission.grantee !== 'USER')
    .map((permission) => addPermittedFields(permission, type.fields))
    .groupBy((permission) => permission.grantee)
    .mapValues((permissions) => permissions.reduce(combinePermissions, {
      userPath: null,
      permittedFields: [],
    }))
    .value();
}

function extractConnectionPermissions(typesByName) {
  return chain(typesByName)
    .mapValues((type) => {
      const permissions = (type.permissions || [])
        .filter((permission) => permission.userPath);
      const fieldPermissions = values(type.fields)
        .filter((field) => (
          field.grantPermissions &&
          (field.type === 'User' ||
          field.type === 'Connection' && field.ofType === 'User')
        ))
        .map((field) => ({
          ...field.grantPermissions,
          grantee: 'USER',
          userPath: [field.name],
        }));

      return chain(permissions.concat(fieldPermissions))
        .map((permission) => addPermittedFields(permission, type.fields))
        .groupBy((permission) => permission.userPath.join('.'))
        .map((pathPermissions) => pathPermissions.reduce(combinePermissions, {
          userPath: null,
          permittedFields: [],
        }))
        .flatten()
        .map((permission) => {
          let currentType = type.name;
          permission.path = permission.userPath.map((segment) => {
            const field = typesByName[currentType].fields[segment];
            currentType = field.ofType || field.type;
            let connectionType;
            if (field.name === 'id') {
              connectionType = 'ITSELF';
            } else {
              connectionType = field.connectionType;
            }
            return {
              name: segment,
              connectionType,
              type: currentType,
              reverseName: field.reverseName,
            };
          });

          return permission;
        })
        .value();
    })
    .value();
}

function combinePermissions(left, right) {
  const result = {
    grantee: right.grantee,
    userPath: right.userPath || null,
    permittedFields: union(left.permittedFields, right.permittedFields),
  };

  for (const permission of ['read', 'create', 'update', 'delete']) {
    const leftPermission = left[permission];
    const rightPermission = right[permission];
    result[permission] = Boolean(rightPermission || leftPermission);
  }

  return result;
}

function addPermittedFields(permission, fields) {
  if (!permission.permittedFields) {
    return {
      ...permission,
      permittedFields: chain(fields)
        .filter((field) => !field.readOnly)
        .map((field) => field.name)
        .value(),
    };
  }
  return permission;
}

function extractRelatedPermissions(typesByName) {
  return chain(typesByName)
    .mapValues((type) => values(type.fields)
      .filter((field) => field.connectionType)
      .map((field) => ({
        name: field.name,
        type: field.ofType || field.type,
        reverseName: field.reverseName,
        connectionType: field.connectionType,
      }))
    )
    .value();
}

function extractHooks(hookData, typeData) {
  const typesByID = chain(typeData)
    .groupBy((type) => type.id.value)
    .mapValues((value) => value[0])
    .value();

  return chain(hookData)
    .filter((hook) => !hook.type || typesByID[hook.type.value])
    .map((hook) => ({
      ...hook,
      type: hook.type && typesByID[hook.type.value],
    }))
    .flatten()
    .groupBy((hook) => hook.type ? hook.type.name : 'global')
    .mapValues((hooks) => groupBy(hooks, (hook) => hook.trigger))
    .value();
}
