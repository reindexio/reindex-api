import Index from './Index';

export default function extractIndexes(indexes) {
  return indexes
    .groupBy((index) => index.get('type'))
    .map((list) => (
      list.map((index) => new Index(index))
    ));
}
