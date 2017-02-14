import * as restify from 'restify';
import { config } from './env';
import { routes } from '../app/routes';
import { logger } from '../utils/logger';

// create Restify server with the configured name
const app: restify.Server = restify.createServer({ name: config.name });

// parse the http query string into req.query
app.use(restify.queryParser({ mapParams: false }));

// parse the body of the request into req.params
app.use(restify.bodyParser());

// user-defined middleware
app.use((req: any, res: any, next: any) => {
  // Set permissive CORS header - this allows this server to be used only as
  // an API server in conjunction with something like webpack-dev-server.
  res.setHeader('Access-Control-Allow-Origin', '*');

  // disable caching so we'll always get the latest data
  res.setHeader('Cache-Control', 'no-cache');

  // log the request method and url
  logger.info(`${req.method} ${req.url}`);

  // log the request body
  logger.info(`Params: ${JSON.stringify(req.params)}`);

  return next();
});

routes(app);

export { app };
