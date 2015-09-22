import { GraphQLObjectType } from 'graphql';
import createSearchFor from './createSearchFor';

export default function createList(typeSets, interfaces) {
  const listFields = typeSets
    .filter((typeSet) => typeSet.connection)
    .mapEntries(([, typeSet]) => {
      const field = createSearchFor(typeSet, interfaces, typeSets);
      return [field.name, field];
    })
    .toObject();
  const list = new GraphQLObjectType({
    name: 'ReindexList',
    fields: listFields,
  });

  return {
    name: 'list',
    type: list,
    resolve() {
      return {};
    },
  };
}
