import * as fs from 'fs';
import * as restify from 'restify';
import { config } from './env';
import { routes } from '../app/routes';
import { logger } from '../utils/logger';
import { session, CookieParser, passport } from './auth';

// create https server
const app = restify.createServer({
  name: config.app_name,
//  key: fs.readFileSync(config.ssl_key_path, 'UTF-8'),
//  certificate: fs.readFileSync(config.ssl_cert_path, 'UTF-8'),
});

// allow cors
app.use(restify.CORS());

// set cors options
app.opts(/.*/, (req: restify.Request, res: restify.Response, next: restify.Next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', req.header('Access-Control-Request-Method'));
  res.header('Access-Control-Allow-Headers', req.header('Access-Control-Request-Headers'));
  res.send(200);
  return next();
});

// parse the http query string into req.query, but not into req.params
app.use(restify.queryParser({ mapParams: false }));

// parse the body of the request into req.params
app.use(restify.bodyParser({
  maxBodySize: 0,
  mapParams: true,
  mapFiles: false,
  overrideParams: false,
  keepExtensions: true,
  uploadDir: './build/uploads/',
  multiples: true,
  hash: 'sha1',
}));

// custom middleware to log the request method, url, and params
app.use((req: restify.Request, res: restify.Response, next: restify.Next) => {
  logger.info(`${req.method} ${req.url}\nParams: ${JSON.stringify(req.params, null, 2)}`);
  return next();
});

app.use(CookieParser.parse);
app.use(session({
  keys: ['key1', 'key2'],
  maxAge: 48 * 3600 /*hours*/ * 1000,  /*in milliseconds*/
  secure: false, // if you do SSL outside of node
}));
app.use(passport.initialize());
app.use(passport.session());

// add routes and their handlers
routes(app);

export { app };
