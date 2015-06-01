import SchemaConnectionField from './SchemaConnectionField';

export default function isConnection(type) {
  return type instanceof SchemaConnectionField;
}
