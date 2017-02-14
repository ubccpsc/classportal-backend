import * as fs from 'fs';
import * as restify from 'restify';
import { config } from './env';
import { routes } from '../app/routes';
import { logger } from '../utils/logger';

// create Restify server with the configured name
const app: restify.Server = restify.createServer({
  name: config.app_name,
  key: fs.readFileSync(config.ssl_key_path, 'UTF-8'),
  certificate: fs.readFileSync(config.ssl_cert_path, 'UTF-8'),
});

app.use(restify.CORS());

app.opts(/.*/, function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', req.header('Access-Control-Request-Method'));
  res.header('Access-Control-Allow-Headers', req.header('Access-Control-Request-Headers'));
  res.send(200);
  return next();
});

// parse the http query string into req.query
app.use(restify.queryParser({
  mapParams: false,
}));

// parse the body of the request into req.params
app.use(restify.bodyParser());

// user-defined middleware
app.use((req: any, res: any, next: any) => {
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
