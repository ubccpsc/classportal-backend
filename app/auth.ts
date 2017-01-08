import * as restify from 'restify';

// The following handlers are only accessible by the prof and TAs.
const requireAdmin = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  // Logic to restrict access
  // checkIfAdmin();

  return next();
};

// The following handlers are only accessible by the prof.
const requireProf = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  // Logic to restrict access
  // checkIfAdmin();

  return next();
};

export { requireAdmin, requireProf };
