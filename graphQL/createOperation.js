import {Map, List} from 'immutable';

export default function createOperation(
  name,
  returnType,
  argDefinitions,
  validators,
  resolve
) {
  return {
    name,
    type: returnType,
    args: argDefinitions
      .map(({type, description}) => ({
        type,
        description,
      }))
      .toObject(),
    resolve(parent, args, context, ...rest) {
      const processedArgs = runValidators(
        validators,
        argDefinitions,
        Map(args),
        context
      );
      return resolve(parent, processedArgs.toObject(), context, ...rest);
    },
  };
}

function runValidators(globalValidators, argDefinitions, args, context) {
  return globalValidators
    .reduce((newArgs, validator) => (
      validator(argDefinitions, newArgs, context)
    ), args)
    .map((arg, key, all) => {
      const validators = argDefinitions.get(key).validators || List();
      return validators.reduce((newArg, validator) => {
        return validator(newArg, all, context);
      }, arg);
    });
}
