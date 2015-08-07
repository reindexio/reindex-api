import {
  GraphQLScalarType,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLList,
} from 'graphql';
import {Kind} from 'graphql/language';
import {typeFromAST} from 'graphql/utilities/typeFromAST';
import {fromReindexID} from '../graphQL/builtins/ReindexID';

export function convertQueryVariables(
  schema,
  documentAST,
  variableValues,
  operationName,
) {
  let variableDefinitions;
  for (const statement of documentAST.definitions) {
    if (statement.kind === Kind.OPERATION_DEFINITION) {
      const name = statement.name ? statement.name.value : '';
      if (!operationName || operationName === name) {
        variableDefinitions = statement.variableDefinitions;
        break;
      }
    }
  }

  if (!variableDefinitions) {
    return variableValues;
  }

  const variableDefinitionMap = {};
  for (const definition of variableDefinitions) {
    variableDefinitionMap[definition.variable.name.value] = typeFromAST(
      schema,
      definition.type
    );
  }

  return convertVariables(variableDefinitionMap, variableValues);
}

function convertVariables(variableDefs, variableValues) {
  const result = {};
  for (const name in variableValues) {
    result[name] = convertVariable(variableDefs[name], variableValues[name]);
  }
  return result;
}

function convertVariable(type, value) {
  if (type instanceof GraphQLInputObjectType) {
    return convertInputObject(type, value);
  } else if (type instanceof GraphQLNonNull) {
    return convertVariable(type.ofType, value);
  } else if (type instanceof GraphQLList) {
    return value.map((element) => convertVariable(type.ofType, element));
  } else if (type instanceof GraphQLScalarType) {
    return convertScalar(type, value);
  } else {
    return value;
  }
}

function convertInputObject(type, value) {
  const result = {};
  const fields = type.getFields();
  for (const name in value) {
    result[name] = convertVariable(fields[name].type, value[name]);
  }
  return result;
}

function convertScalar(type, value) {
  if (type.name === 'ID') {
    return fromReindexID(value);
  } else if (type.name === 'DateTime') {
    // DateTime coerce actually  checks for date validity
    return new Date(value);
  } else {
    return value;
  }
}
