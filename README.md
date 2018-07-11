## crud-route-builder
This is used to build simple routes for create/read/update/delete operations for your Mongoose models.

### Installation
``npm install crud-route-builder --save``

### Usage

```js
router.use(basePath, buildRoutes(mongooseModel, {
    extensions: [Routes],
    before: [Routes],
    after: [Routes]
}))
```

The `buildRoutes` function expects two parameters:

`mongooseModel` - A Mongoose model object

`args` - This is used to specify additional routes, overwrite existing ones, or add middleware before or after the default functions.
The `args` object can have the following properties, all of which accept only arrays of the `Route` object: `extensions`, `before`, `after`.  

### Example

```js
const express = require('express');
const router = express.Router();
const {buildRoutes, Route} = require('crud-route-builder');
const Example1 = require('../models/Example1');
const Example2 = require('../models/Example2');

const app = express();

router.use('/example-1', buildRoutes(Example1));
router.use('/example-2', buildRoutes(Example2,{ extensions: [
        Route('post', '/custom-route', (req, res, next) => {
            ...
        })
    ],
    before: [{
        Route('get', '/all', (req, res, next) => {
            // This will be executed before the default GET example-2/all functionality
            ...
        })
    }],
    after: [{
        Route('get', '/all', (req, res, next) => {
            // This will be executed after the default GET example-2/all functionality 
            ...
            res.send(req.crbResult);    // When an After middleware is specified the result is saved in req.cebResult
        })
    }],
}));

app.use('/', router);
```

This example will create the following routes:

``GET /example-1/all`` - Returns all documents. Additional GET params can be sent to filter or sort the request:

    _start  = NUMBER
    _end    = NUMBER
    _order  = DESC | ASC    
    _sort   = FIELD NAME    
    field   = value
    
Example: `GET /example-1/all/?start=0&_end=10_order=ASC&_sort=name&color=red` 
This request will return the first 10 documents, where the field "color" is "red", 
sorted by the field "name" in ascending order.

``GET /example-1/single/:id `` - Returns a single document by id.

``POST /example-1/`` - Creates a document. The data is expected to be sent in the body. 

``DELETE /example-1/:id`` - Deletes a document by id.

``PUT /example-1/:id`` - Updates a document. The data is expected to be sent in the body. Only updates the provided fields.

The same routes will be created for `/example-2` plus the additional `POST /example-2/custom-route`

You can find a simple example app in the `example` folder. 

### Additional note

This module requires you to use `body-parser`. It won't work without it.