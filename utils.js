import {List, Iterable} from 'immutable';

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
                          isLeaf = Iterable.isIterable) {
  return walkLeafsRecur(iterable, mapper, List(), false, isLeaf);
}

function walkLeafsRecur(node, mapper, keys, keyed, isLeaf) {
  if (isLeaf(node)) {
    if (node.isEmpty()) {
      return List();
    }
    if (!keyed) {
      node = node.entrySeq();
    }
    let [nextKey, nextValue] = node.first();
    let rest = node.rest();
    return walkLeafsRecur(
      nextValue, mapper, keys.push(nextKey), false, isLeaf
    ).concat(
      walkLeafsRecur(rest, mapper, keys, true, isLeaf)
    );
  } else {
    return List.of(mapper(node, keys.last(), keys));
  }
}
