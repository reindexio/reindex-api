import { pluralize } from 'inflection';

export default function getPluralName({ name, pluralName }) {
  if (pluralName) {
    return pluralName;
  }
  return name ? pluralize(name) : null;
}
