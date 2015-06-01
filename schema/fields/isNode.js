import SchemaNodeField from './SchemaNodeField';

export default function isNode(type) {
  return type instanceof SchemaNodeField;
}
