import * as restify from 'restify';

// Verify that user is not yet logged in
function notLoggedIn (req: restify.Request, res: restify.Response, next: restify.Next) {
  // Logic to restrict access
  // check();

  return next();
}

// Verify that user is logged in
const loggedIn = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  // Logic to restrict access
  // check();

  return next();
};

// Verify that user is a TA or prof
const admin = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  // Logic to restrict access
  // check();

  return next();
};

// Verify that user is a prof
const prof = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  // Logic to restrict access
  // check();

  return next();
};

export { notLoggedIn, loggedIn, admin, prof };
