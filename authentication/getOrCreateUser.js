import { capitalize, get } from 'lodash';
import { graphql } from 'graphql';

import createReindex from '../graphQL/createReindex';

export default async function getOrCreateUser(db, provider, credentials) {
  const credential = normalizedCredential(credentials);
  const { schema, context } = await createReindex().getOptions({
    db,
    credentials: { isAdmin: true },
  });
  const query = `userByCredentials${capitalize(provider)}Id`;

  const userFragment = `
    id
    credentials {
      auth0 {
        id
        accessToken
        displayName
      }
      github {
        id
        accessToken
        displayName
      }
      google {
        id
        accessToken
        displayName
      }
      facebook {
        id
        accessToken
        displayName
      }
      twitter {
        id
        accessToken
        displayName
      }
    }
  `;

  const fetchResult = await graphql(schema, `
    query($id: String!) {
      ${query}(id: $id) {
        id
      }
    }`,
    null,
    context,
    { id: credential.id },
  );

  if (fetchResult.errors) {
    throw new Error(JSON.stringify(fetchResult.errors));
  }

  let updateResult;
  let updateData;
  if (fetchResult.data && fetchResult.data[query]) {
    const id = fetchResult.data[query].id;
    updateResult = await graphql(schema, `
      mutation($input: _UpdateUserInput!) {
        updateUser(input: $input) {
          changedUser {
            ${userFragment}
          }
        }
      }`,
      null,
      context,
      {
        input: {
          id,
          credentials: {
            [provider]: credential,
          },
        },
      },
    );
    updateData = get(updateResult, [
      'data',
      'updateUser',
      'changedUser',
    ]);
  } else {
    updateResult = await graphql(schema, `
      mutation($input: _CreateUserInput!) {
        createUser(input: $input) {
          changedUser {
            ${userFragment}
          }
        }
      }`,
      null,
      context,
      {
        input: {
          credentials: {
            [provider]: credential,
          },
        },
      },
    );
    updateData = get(updateResult, [
      'data',
      'createUser',
      'changedUser',
    ]);
  }

  if (updateResult.errors) {
    throw new Error(JSON.stringify(updateResult.errors));
  }
  return updateData;
}

export default function normalizedCredential({ profile, token, secret }) {
  const result = {
    accessToken: token,
    displayName: profile.displayName,
    id: profile.id.toString(),
  };

  if (profile.email) {  // Facebook, GitHub
    result.email = profile.email;
  } else if (profile.emails) {  // Google
    const accountEmail = profile.emails.find((email) =>
      email.type === 'account'
    );
    result.email = accountEmail.value;
  }

  if (secret) {
    result.accessTokenSecret = secret;
  }

  if (profile.username) {
    result.username = profile.username;
  }

  if (profile.raw.profile_image_url_https) {  // Twitter
    result.picture = profile.raw.profile_image_url_https;
  } else if (profile.raw.avatar_url) {  // GitHub
    result.picture = profile.raw.avatar_url;
  } else if (profile.raw.image && profile.raw.image.url) {  // Google
    result.picture = profile.raw.image.url;
  } else if (profile.picture) {  // Auth0
    result.picture = profile.picture;
  }
  return result;
}
