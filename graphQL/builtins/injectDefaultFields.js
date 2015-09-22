import TypeDefaultFields from './TypeDefaultFields';

export default function injectDefaultFields(type) {
  let fields = type.fields;
  const typeInjections = TypeDefaultFields();

  if (typeInjections[type.name]) {
    fields = typeInjections[type.name].concat(fields);
  }

  return fields;
}
