import TypeDefaultFields from './TypeDefaultFields';
import InterfaceDefaultFields from './InterfaceDefaultFields';

export default function injectDefaultFields(type) {
  let fields = type.fields;
  const typeInjections = TypeDefaultFields();
  const interfaceInjections = InterfaceDefaultFields();

  if (typeInjections[type.name]) {
    fields = fields.concat(typeInjections[type.name]);
  }

  for (const typeInterface of type.interfaces) {
    if (interfaceInjections[typeInterface]) {
      fields = fields.concat(interfaceInjections[typeInterface]);
    }
  }

  return fields;
}
