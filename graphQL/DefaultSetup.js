import SchemaSetup from './SchemaSetup';
import CommonQueryFields from './CommonQueryFields';
import CommonMutationFields from './CommonMutationFields';
import TypeQueryFieldCreators from './TypeQueryFieldCreators';
import TypeMutationFieldCreators from './TypeMutationFieldCreators';

const DefaultSetup = new SchemaSetup({
  commonQueryFields: CommonQueryFields,
  commonMutationFields: CommonMutationFields,
  typeQueryFieldCreators: TypeQueryFieldCreators,
  typeMutationFieldCreators: TypeMutationFieldCreators,
});

export default DefaultSetup;
