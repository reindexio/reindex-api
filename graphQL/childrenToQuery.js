export default function childrenToQuery(query, parents, newQuery, children) {
  return children
    .map((child) => child.toQuery(query, parents, newQuery))
    .reduce(mergeQueries, query);
}

function mergeQueries(left, right) {
  return left.merge(right).merge({
    pluck: left.pluck.mergeDeep(right.pluck),
    map: left.map.mergeDeep(right.map),
    converters: left.converters
      .concat(right.converters)
      .toOrderedSet()
      .toList(),
  });
}
