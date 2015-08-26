import {
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLNonNull,
} from 'graphql';
import ReindexID from '../builtins/ReindexID';
import TypeSet from '../TypeSet';
import { createConnectionTargetResolve } from '../connections';

export default function createPermission(interfaces, getTypeSet) {
  return new TypeSet({
    type: new GraphQLObjectType({
      name: 'ReindexPermission',
      interfaces: [interfaces.Node],
      isTypeOf(obj) {
        return obj.id.type === 'ReindexPermission';
      },
      fields: () => ({
        id: {
          type: new GraphQLNonNull(ReindexID),
        },
        user: {
          type: getTypeSet('User').type,
          resolve: createConnectionTargetResolve('User', 'user'),
        },
        type: {
          type: new GraphQLNonNull(getTypeSet('ReindexType').type),
          resolve: createConnectionTargetResolve('ReindexType', 'type'),
        },
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
      }),
    }),
  });
}
