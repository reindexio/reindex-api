import createServer from './createServer';

export default async function main() {
  let server;
  try {
    server = await createServer();
    await server.start();
  } catch (ex) {
    console.error(ex, 'Failed to start');
  }
  server.log(['info'], 'Server started at ' + server.info.uri);
}
