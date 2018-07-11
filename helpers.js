const Err = (status, msg) => {
    let err = new Error();
    err.status = status;
    err.message = msg;
    return err;
};

const isFunction = (functionToCheck) => {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
};

const emptyMiddleware = (req, res, next) => {next()};

/**
 * Returns the function of the first route with the specified method and route fields
 * @param routes
 * @param method
 * @param route
 * @returns {function(*, *, *)}
 */
const extractMiddleware = (routes, method, route) => {
    let middleware = routes.filter(r => {
            return r.method === method && r.route === route
        }) || [];

    if (middleware.length > 0) {
        return middleware[0].function;
    }
    else {
        return emptyMiddleware;
    }
};

/**
 * Checks weather there is any middleware after the current one.
 * If there is - the resulting data is saved to the req.crbResult object,
 * otherwise it is simply sent to the client.
 *
 * @param afterMiddleware
 * @param data
 * @param req
 * @param res
 * @param next
 */
const sendCrbResult = (afterMiddleware, data, req, res, next) => {
    if (!afterMiddleware || afterMiddleware === emptyMiddleware) {
        res.send(data);
    }
    else {
        req.crbResult = data;
        next();
    }
};

module.exports = {Err, isFunction, extractMiddleware, sendCrbResult};