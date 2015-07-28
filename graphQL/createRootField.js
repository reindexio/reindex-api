import {Map, List} from 'immutable';

export default function createRootField({
  name,
  returnType,
  args = Map(),
  validators = List(),
  resolve,
}) {
  return {
    name,
    type: returnType,
    args: args
      .map(({type, description}) => ({
        type,
        description,
      }))
      .toObject(),
    resolve(parent, passedArgs, context, ...rest) {
      const processedArgs = runValidators(
        validators,
        args,
        Map(passedArgs),
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
