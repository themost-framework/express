/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
var _app = require("./app");
var _middleware = require("./middleware");
var _serviceRouter = require("./service");
var _helpers = require("./helpers");

module.exports.ExpressDataContext = _app.ExpressDataContext;
module.exports.ExpressDataApplication = _app.ExpressDataApplication;

module.exports.getEntitySetIndex = _middleware.getEntitySetIndex;
module.exports.getMetadataDocument = _middleware.getMetadataDocument;
module.exports.bindEntitySet = _middleware.bindEntitySet;
module.exports.getEntitySet = _middleware.getEntitySet;
module.exports.postEntitySet = _middleware.postEntitySet;
module.exports.deleteEntitySet = _middleware.deleteEntitySet;
module.exports.getEntity = _middleware.getEntity;
module.exports.postEntity = _middleware.postEntity;
module.exports.deleteEntity = _middleware.deleteEntity;
module.exports.getEntityNavigationProperty = _middleware.getEntityNavigationProperty;
module.exports.getEntitySetFunction = _middleware.getEntitySetFunction;
module.exports.postEntitySetFunction = _middleware.postEntitySetFunction;
module.exports.postEntitySetAction = _middleware.postEntitySetAction;
module.exports.getEntityFunction = _middleware.getEntityFunction;
module.exports.postEntityAction = _middleware.postEntityAction;

module.exports.serviceRouter = _serviceRouter;

module.exports.dateReviver = _helpers.dateReviver;