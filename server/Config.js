import convict from 'convict';

const Config = convict({
  connection: {
    port: {
      default: 5000,
      doc: 'The TCP port the connection will listen to.',
      env: 'PORT',
      format: 'port',
    },
    routes: {
      cors: true,
      state: {
        parse: false,  // Do not parse cookies.
      },
    },
  },
});

export default Config;
