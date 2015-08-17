import Index from './Index';

export default function extractIndexes(types) {
  return types
    .filter((type) => type.get('interfaces').includes('Node'))
    .toKeyedSeq()
    .mapEntries(([, type]) => [
      type.get('name'),
      type.get('indexes').map((index) => new Index({
        name: index.get('name'),
        fields: index.get('fields'),
      })),
    ])
    .toMap();
}
