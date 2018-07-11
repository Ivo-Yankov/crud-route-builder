const express = require('express');
const {Err, isFunction, extractMiddleware, sendCrbResult} = require('./helpers');

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

/**
 * Checks if the provided routes have the required structure
 * @param routes
 */
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
 * @param args
 *              {
 *                  extensions: [Array] Enables the declaration of custom routes
 *                  before: [Array] Middleware that is run before the default functions. Same structure as extensions
 *                  after:  [Array] Middleware that is run after the default functions. Same structure as extensions
 *    }
 *
 * @returns {*}
 */

const buildRoutes = (Resource, args = {}) => {
    const router = express.Router();

    let extensions = args.extensions || [];
    let before = args.before || [];
    let after = args.after || [];

    validateRoutes(extensions);
    validateRoutes(before);
    validateRoutes(after);

    /**
     * Custom routes are declared at the top to enable overwriting of the default routes
     */
    for (let i = 0; i < extensions.length; i++) {
        let ex = extensions[i];
        router[ex.method](ex.route, extractMiddleware(before, ex.method, ex.route), ex.function, extractMiddleware(after, ex.method, ex.route));
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

    const getAllAfterMiddleware = extractMiddleware(after, 'get', '/all');
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

                    sendCrbResult(getAllAfterMiddleware, data, req, res, next);
                })
                .catch(e => next(Err(400, e.message)));
        }
        catch (e) {
            next(e);
        }
    }, getAllAfterMiddleware);

    /**
     * Retrieves a single resource object with a given id
     */

    const getSingleAfterMiddleware = extractMiddleware(after, 'get', '/single/:id');
    router.get('/single/:id', extractMiddleware(before, 'get', '/single/:id'), (req, res, next) => {
        try {
            Resource.findOne({_id: req.params.id}).exec()
                .then((data) => {
                    sendCrbResult(getSingleAfterMiddleware, data, req, res, next);
                })
                .catch(e => next(Err(400, e.message)));
        }
        catch (e) {
            next(e);
        }
    }, getSingleAfterMiddleware);

    /**
     * Updates a single resource object with the provided fields-value pairs
     */

    const putAfterMiddleware = extractMiddleware(after, 'put', '/:id');
    router.put('/:id', extractMiddleware(before, 'put', '/:id'), (req, res, next) => {
        try {
            Resource.findByIdAndUpdate(req.params.id, {$set: req.body}, {
                new: true,
                runValidators: true
            })
                .then((data) => {
                    sendCrbResult(putAfterMiddleware, data, req, res, next);
                })
                .catch(e => next(Err(400, e.message)));
        }
        catch (e) {
            next(e);
        }
    }, putAfterMiddleware);

    /**
     * Creates a new resource object
     */
    const postAfterMiddleware = extractMiddleware(after, 'post', '/');
    router.post('/', extractMiddleware(before, 'post', '/'), (req, res, next) => {
        try {
            let resource = new Resource(req.body);
            resource.save()
                .then((data) => {
                    sendCrbResult(postAfterMiddleware, data, req, res, next);
                })
                .catch(e => next(Err(400, e.message)));
        }
        catch (e) {
            next(e);
        }
    }, postAfterMiddleware);

    /**
     * Deletes a resource by id
     */
    const deleteAfterMiddleware = extractMiddleware(after, 'delete', '/:id');
    router.delete('/:id', extractMiddleware(before, 'delete', '/:id'), (req, res, next) => {
        try {
            Resource.find({_id: req.params.id}).remove().exec()
                .then((data) => {
                    sendCrbResult(deleteAfterMiddleware, data, req, res, next);
                });
        }
        catch (e) {
            next(e);
        }
    }, deleteAfterMiddleware);

    return router;
};

module.exports = {buildRoutes, Route};