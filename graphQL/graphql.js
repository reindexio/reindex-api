import {Source} from 'graphql/language/source';
import {parse} from 'graphql/language/parser';
import {validate} from 'graphql/validation/validate';
import {execute} from 'graphql/execution/execute';
import {formatError} from 'graphql/error';

import {convertQueryVariables} from './convertQueryVariables';

/**
 * Reimplementation of graphql-js graphql function that does variable
 * conversion.
 **/
export default async function graphql(
  schema,
  requestString,
  rootValue,
  variableValues = {},
  operationName,
) {
  const source = new Source(requestString || '', 'GraphQL request');
  const documentAST = parse(source);
  const validationErrors = validate(schema, documentAST);
  if (validationErrors.length > 0) {
    return {
      errors: validationErrors.map(formatError),
    };
  } else {
    const convertedVariables = convertQueryVariables(
      schema,
      documentAST,
      variableValues,
      operationName,
    );
    try {
      const result = await execute(
        schema,
        documentAST,
        rootValue,
        convertedVariables,
        operationName
      );
      if (result.errors) {
        return {
          data: result.data,
          errors: result.errors.map(formatError),
        };
      }
      return result;
    } catch(error) {
      return {
        errors: [formatError(error)],
      };
    }
  }
}
