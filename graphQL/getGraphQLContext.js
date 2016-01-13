import { chain, groupBy, indexBy, mapValues, values } from 'lodash';
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
      extractTypePermissions(type.permissions) :
      DEFAULT_TYPE_PERMISSIONS,
    )
    .value();
}

function extractTypePermissions(typePermissions) {
  return chain(typePermissions)
    .filter((permission) => permission.grantee !== 'USER')
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
          connectionType: field.connectionType,
          reverseName: field.reverseName,
        }));

      return chain(permissions.concat(fieldPermissions))
        .groupBy((permission) => permission.userPath.join('.'))
        .map((pathPermissions) => pathPermissions.reduce(combinePermissions, {
          userPath: null,
          permittedFields: [],
        }))
        .flatten()
        .map((permission) => {
          if (!permission.connectionType) {
            const lastFieldName = permission.userPath[
              permission.userPath.length - 1
            ];
            const lastField = values(typesByName.User.fields).find(
              (userField) => userField.reverseName === lastFieldName
            );
            if (lastFieldName === 'id') {
              permission.connectionType = 'ITSELF';
            } else {
              permission.connectionType = lastField.connectionType;
              permission.reverseName = lastField.name;
            }
          }
          return permission;
        })
        .value();
    })
    .value();
}

function combinePermissions(left, right) {
  let permittedFields = null;
  if (left.permittedFields && right.permittedFields) {
    permittedFields = left.permittedFields.concat(right.permittedFields);
  }

  const result = {
    grantee: right.grantee,
    userPath: right.userPath || null,
    permittedFields,
  };

  for (const permission of ['read', 'create', 'update', 'delete']) {
    const leftPermission = left[permission];
    const rightPermission = right[permission];
    result[permission] = Boolean(rightPermission || leftPermission);
  }

  return result;
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
    .map((hook) => ({
      ...hook,
      type: hook.type && typesByID[hook.type.value],
    }))
    .flatten()
    .groupBy((hook) => hook.type ? hook.type.name : 'global')
    .mapValues((hooks) => groupBy(hooks, (hook) => hook.trigger))
    .value();
}
