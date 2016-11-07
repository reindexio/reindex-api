import { extractHooks } from '../createReindex';

import assert from '../../test/assert';

const micropostType = {
  id: {
    value: '91ffff68-50ec-403d-9d55-1d1fdc86b335',
    type: 'Micropost',
  },
  name: 'Micropost',
};
const userType = {
  id: {
    value: '1fddbcca-d9dd-4a59-9192-4ad83cff6535',
    type: 'User',
  },
  name: 'User',
};

const types = [micropostType, userType];

describe('extractHooks', () => {
  it('extracts hooks', () => {
    const hooks = [
      {
        type: null,
        trigger: 'afterCreate',
        url: 'http://example.com',
        fragment: '{ id, foo }',
      },
      {
        type: micropostType.id,
        trigger: 'afterUpdate',
        url: 'http://example.com/micropost',
        fragment: '{ id }',
      },
      {
        type: {
          type: 'ReindexType',
          value: 'some-deleted-type-id',
        },
        trigger: 'afterUpdate',
        url: 'http://example.com/deleted',
        fragment: '{ id }',
      },
    ];

    const result = extractHooks(hooks, types);

    assert.deepEqual(result, {
      global: {
        afterCreate: [
          {
            type: null,
            trigger: 'afterCreate',
            url: 'http://example.com',
            fragment: '{ id, foo }',
          },
        ],
      },
      Micropost: {
        afterUpdate: [
          {
            type: micropostType,
            trigger: 'afterUpdate',
            url: 'http://example.com/micropost',
            fragment: '{ id }',
          },
        ],
      },
    });
  });
});
