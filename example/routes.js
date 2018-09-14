const express = require('express');
const router = express.Router();
const {buildRoutes, Route} = require('./../index');

const Item = require('./models/Item');

router.use('/items', buildRoutes(Item, {
    extensions: [Route('get', '/custom-route', (req, res, next) => {
        res.send("This is a custom route");
    })],

    resourceModifier: (Resource, req, res) => {
        let r = Resource;
        r.resourceIsModified = true;
        return r;
    },

    before: [
        Route('get', '/all', (req, res, next) => {
            console.log('before get all');
            next();
        }),
        Route('get', '/single/:id', (req, res, next) => {
            console.log('before get single');
            next();
        }),
        Route('put', '/:id', (req, res, next) => {
            console.log('before put');
            next();
        }),
        Route('delete', '/:id', (req, res, next) => {
            console.log('before delete');
            next();
        }),
        Route('post', '/', (req, res, next) => {
            console.log('before post');
            next();
        }),
        Route('get', '/custom-route', (req, res, next) => {
            res.send("This is a custom route");
        })
    ],

    after: [
        Route('get', '/all', (req, res, next) => {
            console.log('after all');
            res.send(req.crbResult.map(obj => {
                obj = obj.toObject();
                obj.modifiedProp = "this prop is modified";
                return obj;
            }));
        }),
        Route('get', '/single/:id', (req, res, next) => {
            console.log('after get single');
            res.send(req.crbResult);
        }),
        Route('put', '/:id', (req, res, next) => {
            console.log('after put');
            res.send(req.crbResult);
        }),
        Route('delete', '/:id', (req, res, next) => {
            console.log('after delete');
            res.send(req.crbResult);
        }),
        Route('post', '/', (req, res, next) => {
            console.log('after post');
            res.send(req.crbResult);
        })
    ]
}));

module.exports = router;
