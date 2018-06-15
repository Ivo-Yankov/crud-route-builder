const express = require('express');
const router = express.Router();

const Err = (status, msg) => {
    let err = new Error();
    err.status = status;
    err.message = msg;
    return err;
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
 * @param Extensions: array
 *
 *        Enables the declaration of custom routes
 *        [
 *          {
 *              method: "get" || "post" || "put" || "delete",
 *              route: String,
 *              function: Function(req, res, next)
 *          }
 *        ]
 *
 *
 * @returns {*}
 */

const buildRoutes = (Resource, Extensions = []) => {

    /**
     * Custom routes are declared at the top to enable overwriting of the default routes
     */
    const allowedMethods = ['get', 'post', 'put', 'delete'];
    for (let i = 0; i < Extensions.length; i++) {
        let ex = Extensions[i];
        if (ex.method && ex.route && ex.function) {
            if (allowedMethods.indexOf(ex.method) !== -1) {
                router[ex.method](ex.route, ex.function);
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
    router.get('/all', (req, res, next) => {
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
                })
                .catch(e => next(Err(400, e.message)));
        }
        catch (e) {
            next(e);
        }
    });

    /**
     * Retrieves a single resource object with a given id
     */
    router.get('/single/:id', (req, res, next) => {
        try {
            Resource.findOne({_id: req.params.id}).exec()
                .then((data) => {
                    res.send(data);
                })
                .catch(e => next(Err(400, e.message)));
        }
        catch (e) {
            next(e);
        }
    });

    /**
     * Updates a single resource object with the provided fields-value pairs
     */
    router.put('/:id', (req, res, next) => {
        try {
            Resource.findByIdAndUpdate(req.params.id, {$set: req.body}, {
                new: true,
                runValidators: true
            })
                .then((data) => {
                    res.send(data);
                })
                .catch(e => next(Err(400, e.message)));
        }
        catch (e) {
            next(e);
        }
    });

    /**
     * Creates a new resource object
     */
    router.post('/', (req, res, next) => {
        try {
            let resource = new Resource(req.body);
            resource.save()
                .then((resource) => {
                    res.send(resource);
                })
                .catch(e => next(Err(400, e.message)));
        }
        catch (e) {
            next(e);
        }
    });

    /**
     * Deletes a resource by id
     */
    router.delete('/:id', (req, res, next) => {
        try {
            Resource.find({_id: req.params.id}).remove().exec()
                .then((data) => {
                    res.send(data);
                });
        }
        catch (e) {
            next(e);
        }
    });

    return router;
};

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

module.exports = {buildRoutes, Route};