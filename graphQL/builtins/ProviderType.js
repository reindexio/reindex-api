import {
  GraphQLEnumType,
} from 'graphql';

export const ProviderType = new GraphQLEnumType({
  name: 'ReindexProviderType',
  values: {
    github: {
      value: 'github',
    },
    facebook: {
      value: 'facebook',
    },
    google: {
      value: 'google',
    },
    twitter: {
      value: 'twitter',
    },
  },
});

export default ProviderType;
