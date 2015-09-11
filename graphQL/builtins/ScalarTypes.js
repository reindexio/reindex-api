import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
} from 'graphql';

import DateTime from './DateTime';
import ReindexID from './ReindexID';

const ScalarTypes = {
  ID: ReindexID,
  String: GraphQLString,
  Int: GraphQLInt,
  Float: GraphQLFloat,
  Boolean: GraphQLBoolean,
  DateTime,
};

export default ScalarTypes;
