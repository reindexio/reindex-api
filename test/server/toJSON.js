import assert from '../assert';
import toJSON from '../../server/toJSON';
import {toReindexID, ID} from '../../graphQL/builtins/ReindexID';

describe('toJSON', () => {
  it('converts to JSON as usual', () => {
    const object = {
      foo: [1, {
        bar: 'baz',
      }],
      quaz: 'quar',
      burg: 'zorg',
    };
    assert.equal(
      toJSON(object),
      JSON.stringify(object),
    );
  });

  it('converts dates to strings', () => {
    const date = '2015-10-12T18:00:00.000Z';
    assert.equal(JSON.parse(toJSON(new Date(date))), date);
  });

  it('converts ids', () => {
    const id = new ID({
      type: 'User',
      value: 'some-id-string',
    });
    assert.equal(JSON.parse(toJSON(id)), toReindexID(id));
  });
});
