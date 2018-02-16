import * as fs from 'fs';
import * as restify from 'restify';
import {config} from './env';
import {routes} from '../app/routes';
import {logger} from '../utils/logger';
import {session, CookieParser, passport} from './auth';


// create https server
const app = restify.createServer({
  name:        config.app_name,
  key:         fs.readFileSync(config.ssl_key_path),
  certificate: fs.readFileSync(config.ssl_cert_path),
  ca:          fs.readFileSync(config.ssl_int_cert_path).toString(),
});

const io = require('socket.io').listen(app);

restify.CORS.ALLOW_HEADERS.push('Accept-Encoding');
restify.CORS.ALLOW_HEADERS.push('Accept-Language');

// allow cors
app.use(restify.CORS({
  credentials: true,
}));
console.log('App path', `${config.app_path}`);

// set cors options
app.opts(/.*/, (req: restify.Request, res: restify.Response, next: restify.Next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.send(200);
  return next();
});

// parse the http query string into req.query, but not into req.params
app.use(restify.queryParser({mapParams: false}));

// parse the body of the request into req.params
app.use(restify.bodyParser({
  maxBodySize:    0,
  mapParams:      true,
  mapFiles:       false,
  overrideParams: false,
  keepExtensions: true,
  uploadDir:      './build/uploads/',
  multiples:      true,
  hash:           'sha1',
}));

// custom middleware to log the request method, url, and params
app.use((req: restify.Request, res: restify.Response, next: restify.Next) => {
  logger.info(`${req.method} ${req.url}\nParams: ${JSON.stringify(req.params, null, 2)}`);
  return next();
});

app.use(CookieParser.parse);
app.use(session({
  keys:   ['key1', 'key2'],
  maxAge: 48 * 3600 /*hours*/ * 1000, /*in milliseconds*/
  secure: true, // if you do SSL outside of node
}));
app.use(passport.initialize());
app.use(passport.session());

// add routes and their handlers
routes(app);

export {app};
