const IsUserError = Symbol();

// UserErrors will be sent to the user
export class UserError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'UserError';
    this.message = args[0];
    this[IsUserError] = true;
    Error.captureStackTrace(this, 'Error');
  }
}

export function isUserError(error) {
  return error[IsUserError];
}
