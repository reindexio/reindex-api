export async function createStorageForApp() {
  // NOOP for MongoDB, collections are created implicitly.
}

export async function deleteStorageForApp(db) {
  await db.dropDatabase();
}
