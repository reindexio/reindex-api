let raven;
if (process.env.SENTRY_DSN) {
  raven = new (require('raven')).Client(process.env.SENTRY_DSN);
  raven.on('error', (e) => {
    console.error('Sentry error');
    console.error(e);
  });
}

let logging = true;

const Monitoring = {
  noticeError(error, {
    request,
    extra,
    tags,
    level = 'error',
  } = {}) {
    if (raven) {
      let requestContext = {};
      let userId;
      if (request) {
        userId = request.info.hostname;
        const url = (
          request.connection.info.protocol +
          '://' +
          request.info.host +
          request.url.path
        );
        requestContext = {
          url,
          method: request.method,
          path: request.path,
          query_string: request.query,
          data: (request.url.path !== '/graphql') ? request.payload : null,
        };
      }
      raven.captureException(error, {
        user: {
          id: userId,
        },
        request: requestContext,
        extra,
        tags: {
          ...tags,
          context: process.env.NODE_ENV || 'development',
        },
        level,
        release: process.env.HEROKU_SLUG_COMMIT || 'development',
      });
    }
    if (logging) {
      console.error(error.stack);
      if (extra) {
        console.error(extra);
      }
    }
  },

  setLogging(value) {
    logging = value;
  },
};

export default Monitoring;
