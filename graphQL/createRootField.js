export default function createRootField({
  name,
  returnType,
  args = {},
  validators = [],
  resolve,
}) {
  return {
    name,
    type: returnType,
    args,
    resolve(parent, passedArgs, context) {
      runValidators(
        validators,
        passedArgs,
        context
      );
      return resolve(parent, passedArgs, context);
    },
  };
}

function runValidators(validators, args, context) {
  for (const validator of validators) {
    validator(args, context);
  }
}
