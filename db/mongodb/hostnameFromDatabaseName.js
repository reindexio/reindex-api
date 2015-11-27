const dbNamePattern = /^r_/;

export default function hostnameFromDatabaseName(dbName) {
  if (!dbNamePattern.test(dbName)) {
    throw new Error(`Expected a Reindex database name, got: ${dbName}`);
  }
  return dbName.replace(dbNamePattern, '').replace(/\_/g, '-');
}
