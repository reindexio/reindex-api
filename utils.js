import Immutable from 'immutable';

/**
 * Walk leafs of nested immutable.js structure, calling function on them, then
 * collects them to List.
 * @param {Iterable} iterable - immutable.js Iterable
 * @param {function (value, [key, [keys]]) -> A} mapper - gets current key and
 *        whole key path
 * @param {function (node, keys) -> Boolean} isLeaf - terminator of the
 *        iteration, Immutable.Iterable.isIterable by default
**/
export function walkLeafs(iterable, mapper,
                          isLeaf = Immutable.Iterable.isIterable) {
  function walkLeafsRecur(node, mapper, keys, keyed, isLeaf) {
    if (isLeaf(node)) {
      if (node.isEmpty()) {
        return Immutable.List();
      }
      if (!keyed) {
        node = node.entrySeq();
      }
      let [nextKey, nextValue] = node.first();
      let rest = node.skip(1);
      return walkLeafsRecur(
        nextValue, mapper, keys.push(nextKey), false, isLeaf
      ).concat(
        walkLeafsRecur(rest, mapper, keys, true, isLeaf)
      );
    } else {
      return Immutable.List.of(mapper(node, keys.last(), keys));
    }
  }

  return walkLeafsRecur(iterable, mapper, Immutable.List(), false, isLeaf);
}
