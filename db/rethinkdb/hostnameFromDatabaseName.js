import Base64Url from 'base64-url';

const dbNamePattern = /^reindex_/;

export default function hostnameFromDatabaseName(dbName) {
  if (!dbNamePattern.test(dbName)) {
    throw new Error(`Expected a Reindex database name, got: ${dbName}`);
  }
  return Base64Url.decode(dbName.replace(dbNamePattern, ''));
}
