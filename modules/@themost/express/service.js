/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
var express = require('express');
var router = express.Router();

var getEntitySetIndex = require("./middleware").getEntitySetIndex;
var getMetadataDocument = require("./middleware").getMetadataDocument;
var bindEntitySet = require("./middleware").bindEntitySet;
var getEntitySet = require("./middleware").getEntitySet;
var postEntitySet = require("./middleware").postEntitySet;
var deleteEntitySet = require("./middleware").deleteEntitySet;
var getEntity = require("./middleware").getEntity;
var postEntity = require("./middleware").postEntity;
var deleteEntity = require("./middleware").deleteEntity;
var getEntityNavigationProperty = require("./middleware").getEntityNavigationProperty;
var getEntitySetFunction = require("./middleware").getEntitySetFunction;
var postEntitySetFunction = require("./middleware").postEntitySetFunction;
var postEntitySetAction = require("./middleware").postEntitySetAction;
var getEntityFunction = require("./middleware").getEntityFunction;
var postEntityAction = require("./middleware").postEntityAction;

/* GET /  */
router.get('/', getEntitySetIndex());

/* GET /  */
router.get('/\\$metadata', getMetadataDocument());

/* GET /:entitySet  */
router.get('/:entitySet', bindEntitySet(), getEntitySet());

/* POST /:entitySet insert or update a data object or an array of data objects. */
router.post('/:entitySet', bindEntitySet(), postEntitySet());

/* PUT /:entitySet insert or update a data object or an array of data objects. */
router.put('/:entitySet', bindEntitySet(), postEntitySet());

/* DELETE /:entitySet removes a data object or an array of data objects. */
router.delete('/:entitySet', bindEntitySet(), deleteEntitySet());

/* GET /:entitySet/:entitySetFunction/  */
router.get('/:entitySet/:entitySetFunction', bindEntitySet(), getEntitySetFunction());

/* POST /:entitySet/:entitySetAction/  */
router.post('/:entitySet/:entitySetAction', bindEntitySet(), postEntitySetAction());

/* GET /:entitySet/:entitySetFunction/:entityFunction  */
router.get('/:entitySet/:entitySetFunction/:entityFunction', bindEntitySet(), getEntitySetFunction());

/* GET /:entitySet/:entitySetFunction/:entityAction  */
router.post('/:entitySet/:entitySetFunction/:entityAction', bindEntitySet(), postEntitySetFunction());

/* GET /:entitySet/:entitySetFunction/:navigationProperty  */
router.get('/:entitySet/:entitySetFunction/:navigationProperty', bindEntitySet(), getEntitySetFunction());

/* GET /:entitySet/:id/:entityFunction  */
router.get('/:entitySet/:id/:entityFunction', bindEntitySet(), getEntityFunction());

/* POST /:entitySet/:id/:entityAction  */
router.post('/:entitySet/:id/:entityAction', bindEntitySet(), postEntityAction());

/* GET /:entitySet/:id/:navigationProperty  */
router.get('/:entitySet/:id/:navigationProperty', bindEntitySet(), getEntityNavigationProperty());

/* GET /:entitySet/:id  */
router.get('/:entitySet/:id', bindEntitySet(), getEntity());

/* POST /:entitySet/:id posts a data object by id. */
router.post('/:entitySet/:id', bindEntitySet(), postEntity());

/* DELETE /:entitySet/:id deletes a data object by id. */
router.delete('/:entitySet/:id', bindEntitySet(), deleteEntity());

module.exports = router;