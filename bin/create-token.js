const JSONWebToken = require('jsonwebtoken');
const minimist = require('minimist');

function createToken() {
  const argv = minimist(process.argv.slice(2), {
    alias: {
      help: 'h',
      user: 'u',
    },
  });
  if (argv.help) {
    console.log('Usage: create-token.js [ -h ] [ -u USER ]');
    return;
  }
  const payload = {};
  const secret = process.env.REINDEX_SECRET;
  if (!secret) {
    throw new Error('Environment variable REINDEX_SECRET must be set');
  }
  const options = {};

  if (argv.user) {
    options.subject = argv.user;
  }

  const token = JSONWebToken.sign(payload, secret, options);

  console.log(token);
}

createToken();
