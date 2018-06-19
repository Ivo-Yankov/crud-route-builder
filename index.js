const express = require('express');

const Err = (status, msg) => {
    let err = new Error();
    err.status = status;
    err.message = msg;
    return err;
};

const isFunction = (functionToCheck) => {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
};

const allowedMethods = ['get', 'post', 'put', 'delete'];

/**
 * Used for creating custom routes or overwriting the default ones
 * @param method : String    - Accepted values are [get, post, put, delete]
 * @param route  : String
 * @param func   : Function
 */
const Route = (method, route, func) => {
    return {
        method: method,
        route: route,
        function: func
    }
};

const extractMiddleware = (routes, method, route) => {
    return routes.filter(r => {
        return r.method === method && r.route === route
    }) || [];
};

const validateRoutes = (routes) => {
    for (let i = 0; i < routes.length; i++) {
        let r = routes[i];
        if (
            allowedMethods.indexOf(r.method) === -1
            || !(typeof r.route === 'string' || r.route instanceof String)
            || !isFunction(r.function)
        ) {
            throw("Invalid Route object");
        }
    }
};

/**
 * Builds all routes for a given resource
 * The routes generated are:
 *      GET     /all
 *      GET     /single/:id
 *      PUT     /single/:id
 *      POST    /single/
 *      DELETE  /single/:id
 *
 * @param Resource
 * @param args: {
 *        extensions: [Array] Enables the declaration of custom routes
 *                              [
 *                                  {
 *                                      method: "get" || "post" || "put" || "delete",
 *                                      route: String,
 *                                      function: Function(req, res, next)
 *                                  }
 *                              ]
 *        before: [Array] Middleware that is run before the default functions. Same structure as extensions
 *        after:  [Array] Middleware that is run after the default functions. Same structure as extensions
 *
 * @returns {*}
 */

const buildRoutes = (Resource, args = {}) => {
    const router = express.Router();

    let extensions = args.extensions || [];
    let before = args.before || [];
    let after = args.after || [];

    /**
     * Custom routes are declared at the top to enable overwriting of the default routes
     */
    for (let i = 0; i < extensions.length; i++) {
        let ex = extensions[i];
        if (ex.method && ex.route && ex.function) {
            if (allowedMethods.indexOf(ex.method) !== -1) {
                router[ex.method](ex.route, extractMiddleware(before, ex.method, ex.route), ex.function, extractMiddleware(after, ex.method, ex.route));
            }
        }
    }

    /**
     * Returns an array of filtered resources
     *
     * Accepted params:
     *      _end    = NUMBER
     *      _start  = NUMBER
     *      _order  = DESC | ASC
     *      _sort   = FIELD NAME
     *      field   = value
     */
    router.get('/all', extractMiddleware(before, 'get', '/all'), (req, res, next) => {
        try {
            let filter = {};
            let modelProps = Object.keys(Resource.schema.paths);
            let filters = Object.keys(req.query).filter((param) => modelProps.includes(param));

            filters.forEach(f => {
                let val = req.query[f];

                // Value is a Number
                if (!isNaN(val)) {
                    filter[f] = Number(val);
                }

                // Value is a Bool
                else if( ["true", "false"].indexOf(val.toLowerCase()) !== -1 ) {
                    filter[f] = val.toLowerCase() === "true";
                }

                // Value is a String
                else {
                    filter[f] = new RegExp(val, "i");
                }
            });

            let query = Resource.find(filter);

            if (req.query._sort && req.query._order) {
                if (req.query._order === 'ASC') {
                    query.sort([[req.query._sort, 1]])
                }
                else if (req.query._order === 'DESC') {
                    query.sort([[req.query._sort, -1]])
                }
            }

            query.exec()
                .then((data) => {
                    res.header("X-Total-Count", data.length);

                    if (req.query._start !== undefined && req.query._end !== undefined) {
                        data = data.filter((o, i) => i >= req.query._start && i <= req.query._end);
                    }

                    res.send(data);
                    next();
                })
                .catch(e => next(Err(400, e.message)));
        }
        catch (e) {
            next(e);
        }
    }, extractMiddleware(after, 'get', '/all'));

    /**
     * Retrieves a single resource object with a given id
     */
    router.get('/single/:id', extractMiddleware(before, 'get', '/single/:id'), (req, res, next) => {
        try {
            Resource.findOne({_id: req.params.id}).exec()
                .then((data) => {
                    res.send(data);
                    next();
                })
                .catch(e => next(Err(400, e.message)));
        }
        catch (e) {
            next(e);
        }
    }, extractMiddleware(after, 'get', '/single/:id'));

    /**
     * Updates a single resource object with the provided fields-value pairs
     */
    router.put('/:id', extractMiddleware(before, 'put', '/:id'), (req, res, next) => {
        try {
            Resource.findByIdAndUpdate(req.params.id, {$set: req.body}, {
                new: true,
                runValidators: true
            })
                .then((data) => {
                    res.send(data);
                    next();
                })
                .catch(e => next(Err(400, e.message)));
        }
        catch (e) {
            next(e);
        }
    }, extractMiddleware(after, 'put', '/:id'));

    /**
     * Creates a new resource object
     */
    router.post('/', extractMiddleware(before, 'post', '/'), (req, res, next) => {
        try {
            let resource = new Resource(req.body);
            resource.save()
                .then((resource) => {
                    res.send(resource);
                    next();
                })
                .catch(e => next(Err(400, e.message)));
        }
        catch (e) {
            next(e);
        }
    }, extractMiddleware(after, 'post', '/'));

    /**
     * Deletes a resource by id
     */
    router.delete('/:id', extractMiddleware(before, 'delete', '/:id'), (req, res, next) => {
        try {
            Resource.find({_id: req.params.id}).remove().exec()
                .then((data) => {
                    res.send(data);
                    next();
                });
        }
        catch (e) {
            next(e);
        }
    }, extractMiddleware(before, 'delete', '/:id'));

    return router;
};

module.exports = {buildRoutes, Route};