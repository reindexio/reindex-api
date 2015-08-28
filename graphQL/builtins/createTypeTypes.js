import { List } from 'immutable';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLBoolean,
} from 'graphql';
import createCreate from '../mutations/createCreate';
import createDelete from '../mutations/createDelete';
import TypeSet from '../TypeSet';
import injectDefaultFields from './injectDefaultFields';
import ReindexID from './ReindexID';
import { createConnectionFieldResolve } from '../connections';

export default function createTypeTypes(interfaces, getTypeSet) {
  const permissionSet = new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexPermissionSet',
      fields: {
        read: {
          type: GraphQLBoolean,
        },
        create: {
          type: GraphQLBoolean,
        },
        update: {
          type: GraphQLBoolean,
        },
        delete: {
          type: GraphQLBoolean,
        },
      },
    }),
  });
  // XXX(freiksenet, 2015-08-19): Interface would be nicer, but there is no
  // way to neatly convert it to InputObjectType
  const field = new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexField',
      fields: {
        type: {
          type: new GraphQLNonNull(GraphQLString),
        },
        name: {
          type: new GraphQLNonNull(GraphQLString),
        },
        description: {
          type: GraphQLString,
        },
        nonNull: {
          type: GraphQLBoolean,
        },
        builtin: {
          type: GraphQLBoolean,
        },
        deprecationReason: {
          type: GraphQLString,
        },
        ofType: {
          type: GraphQLString,
        },
        reverseName: {
          type: GraphQLString,
        },
        grantPermissions: {
          type: permissionSet.type,
        },
      },
    }),
  });

  const type = new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexType',
      fields: () => ({
        id: {
          type: new GraphQLNonNull(ReindexID),
        },
        kind: {
          type: new GraphQLNonNull(GraphQLString),
        },
        name: {
          type: new GraphQLNonNull(GraphQLString),
        },
        interfaces: {
          type: new GraphQLList(GraphQLString),
        },
        fields: {
          type: new GraphQLList(field.type),
          resolve(parent) {
            return injectDefaultFields(parent);
          },
        },
        permissions: {
          type: getTypeSet('ReindexPermission').type,
          resolve: createConnectionFieldResolve('ReindexPermission', 'type'),
        },
      }),
      interfaces: [interfaces.Node],
      isTypeOf(obj) {
        return obj.id.type === 'ReindexType';
      },
    }),
    blacklistedRootFields: List([
      createCreate,
      createDelete,
    ]),
  });

  return {
    ReindexPermissionSet: permissionSet,
    ReindexField: field,
    ReindexType: type,
  };
}
