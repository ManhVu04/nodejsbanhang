"use strict";

// Forward rejected promises from async Express handlers to `next(err)`.
// Express 4 does not do this by default, which can crash the process.
const Layer = require("express/lib/router/layer");

const originalHandleRequest = Layer.prototype.handle_request;

Layer.prototype.handle_request = function patchedHandleRequest(req, res, next) {
  const fn = this.handle;

  if (fn.length > 3) {
    return originalHandleRequest.call(this, req, res, next);
  }

  try {
    const result = fn(req, res, next);
    if (result && typeof result.then === "function") {
      result.catch(next);
    }
  } catch (error) {
    next(error);
  }
};
