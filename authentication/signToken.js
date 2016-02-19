import JSONWebToken from 'jsonwebtoken';

export default async function signToken(db, { provider, user }) {
  const secrets = await db.getSecrets();
  if (!secrets.length) {
    throw new Error('We are trying to sign a token but we have no secrets!');
  }

  return JSONWebToken.sign(
    { provider },
    secrets[0],
    { subject: user.id },
  );
}
