import TypeDefaultFields from './TypeDefaultFields';
import InterfaceDefaultFields from './InterfaceDefaultFields';

export default function injectDefaultFields(type) {
  let fields = type.fields;
  const typeInjections = TypeDefaultFields();
  const interfaceInjections = InterfaceDefaultFields();

  if (typeInjections[type.name]) {
    fields = typeInjections[type.name].concat(fields);
  }

  for (const typeInterface of type.interfaces) {
    if (interfaceInjections[typeInterface]) {
      fields = interfaceInjections[typeInterface].concat(fields);
    }
  }

  return fields;
}
