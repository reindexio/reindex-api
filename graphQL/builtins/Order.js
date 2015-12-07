import { GraphQLEnumType } from 'graphql';

const Order = new GraphQLEnumType({
  name: 'ReindexOrder',
  description: 'A sort order (ascending/descending).',
  values: {
    ASC: {
      value: 'ASC',
    },
    DESC: {
      value: 'DESC',
    },
  },
});

export default Order;
