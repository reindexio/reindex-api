export default function mapAndPluck(query, selector, mapper) {
  return query
    .setIn(['map', ...selector], mapper)
    .setIn(['pluck', ...selector], true);
}
