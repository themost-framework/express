/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
var _ = require("lodash");
var Q = require("q");
var pluralize = require("pluralize");
var express = require('express');
var router = express.Router();
var ODataModelBuilder = require("@themost/data/odata").ODataModelBuilder;
var EdmMapping = require("@themost/data/odata").EdmMapping;
var LangUtils = require("@themost/common/utils").LangUtils;
var DataQueryable = require("@themost/data/data-queryable").DataQueryable;
var parseBoolean = require('@themost/common/utils').LangUtils.parseBoolean;
var HttpNotFoundError = require('@themost/common/errors').HttpNotFoundError;
var HttpBadRequestError = require('@themost/common/errors').HttpBadRequestError;
var HttpMethodNotAllowedError = require('@themost/common/errors').HttpMethodNotAllowedError;

/**
 * @param {DataQueryable} target
 * @param {DataQueryable} source
 */
function extendQueryable(target, source) {
    if (source.query.$select) {
        target.query.$select = source.query.$select;
    }
    if (source.$view) {
        target.$view = source.$view;
    }
    if (source.$expand) {
        target.$expand = (target.$expand || []).concat(source.$expand);
    }
    if (source.query.$expand) {
        var targetExpand = [];
        if (_.isArray(target.query.$expand)) {
            targetExpand = target.query.$expand;
        }
        else if (typeof target.query.$expand === 'object') {
            targetExpand.push(target.query.$expand);
        }
        var sourceExpand = [].concat(source.query.$expand);

        var res = _.filter(sourceExpand, function(x) {
            return typeof _.find(targetExpand, function(y) {
                return y.$entity.name === x.$entity.name;
            }) === 'undefined';
        });
        target.query.$expand = targetExpand.concat(res);
    }
    if (source.query.$group) {
        target.query.$group = source.query.$group;
    }
    if (source.query.$order) {
        target.query.$order = source.query.$order;
    }
    if (source.query.$prepared) {
        target.query.$where = source.query.$prepared;
    }
    if (source.query.$skip) {
        target.query.$skip = source.query.$skip;
    }
    if (source.query.$take) {
        target.query.$take = source.query.$take;
    }
    return target;
}

/**
 * Bind current request to an entitySet for further processing
 */
function bindEntitySetMiddleware() {
    return function(req, res, next) {
        /**
         * @type {ODataModelBuilder}
         */
        var builder = req.context.getApplication().getStrategy(ODataModelBuilder);
        if (typeof builder === 'undefined') {
            return next(new TypeError('Application model builder cannot be empty at this context'));
        }
        /**
         * @type {EntitySetConfiguration}
         */
        var thisEntitySet = builder.getEntitySet(req.params.entitySet);
        if (typeof thisEntitySet === 'undefined') {
            return next();
        }
        // set request entitySet
        req.entitySet = thisEntitySet;
        return next();
    };
}

function getEntitySetMiddleware() {
    return function(req, res, next) {
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        var thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        thisModel.filter(req.query).then(function(q) {
            return q.getList().then(function(result) {
                return res.json(result);
            });
        }).catch(function(err) {
            return next(err);
        });
    };
}


function updateEntitySetMiddleware() {

    return function(req, res, next) {
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        var thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        if (typeof req.body === 'undefined') {
            return next(new HttpBadRequestError());
        }
        thisModel.save(req.body).then(function() {
            return res.json(req.body);
        }).catch(function(err) {
            return next(err);
        });
    };
}

function deleteEntitySetMiddleware() {

    return function(req, res, next) {
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        var thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        if (typeof req.body === 'undefined') {
            return next(new HttpBadRequestError());
        }
        thisModel.remove(req.body).then(function() {
            return res.json(req.body);
        }).catch(function(err) {
            return next(err);
        });
    };
}

function getEntityMiddleware() {
    return function(req, res, next) {
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        var thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        // pick query options (only $select or $expand)
        var filter = _.pick(req.query, ['$select', '$expand']);
        // apply filter
        thisModel.filter(filter).then(function(q) {
            // set query for item
            return q.where(thisModel.primaryKey).equal(req.params.id).getItem().then(function(value) {
                // if value is undefined
                if (typeof value === 'undefined') {
                    // send not found
                    return next(new HttpNotFoundError());
                }
                // othwerwise return object
                return res.json(value);
            });
        }).catch(function(err) {
            return next(err);
        });
    }
}

function deleteEntityMiddleware() {
    return function(req, res, next) {
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        var thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        thisModel.where(thisModel.primaryKey).equal(req.params.id).count().then(function(value) {
            if (value === 0) {
                return res.status(404).send();
            }
            // construct a native object
            var obj = {
                "id": req.params.id
            };
            //try to delete
            return thisModel.remove(obj).then(function() {
                return res.json(obj);
            });
        }).catch(function(err) {
            return next(err);
        });
    };
}


function getEntityNavigationPropertyMiddleware() {
    return function(req, res, next) {
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        /**
         * get current model builder
         * @type {ODataModelBuilder}
         */
        var builder = req.context.getApplication().getStrategy(ODataModelBuilder);
        /**
         * get current data model
         * @type {DataModel}
         */
        var thisModel = req.context.model(req.entitySet.entityType.name);
        // get navigation property param
        var navigationProperty = req.params.navigationProperty;

        if (typeof thisModel === 'undefined') {
            return next();
        }
        thisModel.where(thisModel.primaryKey).equal(req.params.id).select(thisModel.primaryKey).getTypedItem().then(function(obj) {
            if (typeof obj === 'undefined') {
                return res.status(404).send();
            }
            //check if entity set has a function with the same name
            var action = req.entitySet.entityType.hasFunction(navigationProperty);
            if (action) {
                var returnsCollection = _.isString(action.returnCollectionType);
                var returnModel = req.context.model(action.returnType || action.returnCollectionType);
                // find method
                var memberFunc = EdmMapping.hasOwnFunction(obj, action.name);
                if (memberFunc) {
                    var funcParameters = [];
                    _.forEach(action.parameters, function(x) {
                        if (x.name !== 'bindingParameter') {
                            funcParameters.push(LangUtils.parseValue(req.params[x.name]));
                        }
                    });
                    return Q.resolve(memberFunc.apply(obj, funcParameters)).then(function(result) {
                        if (result instanceof DataQueryable) {
                            if (_.isNil(returnModel)) {
                                return next(new HttpNotFoundError("Result Entity not found"));
                            }
                            var returnEntitySet = builder.getEntityTypeEntitySet(returnModel.name);
                            if (_.isNil(returnEntitySet)) {
                                returnEntitySet = builder.getEntity(returnModel.name);
                            }
                            var filter = Q.nbind(returnModel.filter, returnModel);
                            //if the return value is a single instance
                            if (!returnsCollection) {
                                //pass context parameters
                                var params = {};
                                if (_.isNil(navigationProperty)) {
                                    params = {
                                        "$select": req.query.$select,
                                        "$expand": req.query.$expand
                                    };
                                }
                                //filter with parameters
                                return filter(params).then(function(q) {
                                    //get item
                                    return q.getItem().then(function(result) {
                                        if (_.isNil(result)) {
                                            return next(new HttpNotFoundError());
                                        }
                                        //return result
                                        return res.json(result);
                                    });
                                });
                            }
                            //else if the return value is a collection
                            return filter(_.extend({
                                "$top": 25
                            }, req.query)).then(function(q) {
                                var count = req.query.hasOwnProperty('$inlinecount') ? parseBoolean(req.query.$inlinecount) : (req.query.hasOwnProperty('$count') ? parseBoolean(req.query.$count) : false);
                                var q1 = extendQueryable(result, q);
                                if (count) {
                                    return q1.getList().then(function(result) {
                                        //return result
                                        return res.json(result);
                                    });
                                }
                                return q1.getItems().then(function(result) {
                                    //return result
                                    return res.json(result);
                                });
                            });
                        }
                        return res.json(result);
                    });
                }
            }
            //get primary key
            var key = obj[thisModel.primaryKey];
            //get mapping
            var mapping = thisModel.inferMapping(navigationProperty);
            //get count parameter
            var count = req.query.hasOwnProperty('$inlinecount') ? parseBoolean(req.query.$inlinecount) : (req.query.hasOwnProperty('$count') ? parseBoolean(req.query.$count) : false);
            if (_.isNil(mapping)) {
                //try to find associated model
                //get singular model name
                var otherModelName = pluralize.singular(navigationProperty);
                //search for model with this name
                var otherModel = req.context.model(otherModelName);
                if (otherModel) {
                    var otherFields = _.filter(otherModel.attributes, function(x) {
                        return x.type === thisModel.name;
                    });
                    if (otherFields.length > 1) {
                        return next(new HttpMethodNotAllowedError("Multiple associations found"));
                    }
                    else if (otherFields.length === 1) {
                        var otherField = otherFields[0];
                        mapping = otherModel.inferMapping(otherField.name);
                        if (mapping && mapping.associationType === 'junction') {
                            var attr;
                            //search model for attribute that has an association of type junction with child model
                            if (mapping.parentModel === otherModel.name) {
                                attr = _.find(otherModel.attributes, function(x) {
                                    return x.name === otherField.name;
                                });
                            }
                            else {
                                attr = _.find(thisModel.attributes, function(x) {
                                    return x.type === otherModel.name;
                                });
                            }
                            if (attr) {
                                thisModel = attr.name;
                                mapping = thisModel.inferMapping(attr.name);
                            }
                        }
                    }
                }
                if (_.isNil(mapping)) {
                    return next(new HttpNotFoundError("Association not found"));
                }
            }
            if (mapping.associationType === 'junction') {
                /**
                 * @type {DataQueryable}
                 */
                var junction = obj.property(navigationProperty);
                return Q.nbind(junction.model.filter, junction.model)(req.query).then(function(q) {
                    //merge properties
                    if (q.query.$select) {
                        junction.query.$select = q.query.$select;
                    }
                    if (q.$expand) {
                        junction.$expand = q.$expand;
                    }
                    if (q.query.$group) {
                        junction.query.$group = q.query.$group;
                    }
                    if (q.query.$order) {
                        junction.query.$order = q.query.$order;
                    }
                    if (q.query.$prepared) {
                        junction.query.$where = q.query.$prepared;
                    }
                    if (q.query.$skip) {
                        junction.query.$skip = q.query.$skip;
                    }
                    if (q.query.$take) {
                        junction.query.$take = q.query.$take;
                    }
                    if (count) {
                        return junction.getList().then(function(result) {
                            return res.json(result);
                        });
                    }
                    else {
                        return junction.getItems().then(function(result) {
                            return res.json(result);
                        });
                    }
                });
            }
            else if (mapping.parentModel === thisModel.name && mapping.associationType === 'association') {
                //get associated model
                var associatedModel = req.context.model(mapping.childModel);
                if (_.isNil(associatedModel)) {
                    return next(new HttpNotFoundError("Associated model not found"));
                }
                return Q.nbind(associatedModel.filter, associatedModel)(_.extend({
                    "$top": 25
                }, req.query)).then(function(q) {
                    if (count) {
                        return q.where(mapping.childField).equal(key).getList().then(function(result) {
                            return res.json(result);
                        });
                    }
                    else {
                        return q.where(mapping.childField).equal(key).getItems().then(function(result) {
                            return res.json(result);
                        });
                    }
                });
            }
            else if (mapping.childModel === thisModel.name && mapping.associationType === 'association') {
                //get associated model
                var parentModel = req.context.model(mapping.parentModel);
                if (_.isNil(parentModel)) {
                    return next(new HttpNotFoundError("Parent associated model not found"));
                }
                return thisModel.where(thisModel.primaryKey).equal(obj.id).select(thisModel.primaryKey, navigationProperty).expand(navigationProperty).getItem().then(function(result) {
                    return res.json(result[navigationProperty]);
                });
            }
            else {
                return next(new HttpNotFoundError());
            }
        }).catch(function(err) {
            return next(err);
        });
    };
}

/* GET /:entitySet  */
router.get('/:entitySet', bindEntitySetMiddleware(), getEntitySetMiddleware());

/* POST /:entitySet insert or update a data object or an array of data objects. */
router.post('/:entitySet', bindEntitySetMiddleware(), updateEntitySetMiddleware());

/* PUT /:entitySet insert or update a data object or an array of data objects. */
router.put('/:entitySet', bindEntitySetMiddleware(), updateEntitySetMiddleware());

/* DELETE /:entitySet removes a data object or an array of data objects. */
router.delete('/:entitySet', bindEntitySetMiddleware(), deleteEntitySetMiddleware());

/* GET /:entitySet/:id  */
router.get('/:entitySet/:id', bindEntitySetMiddleware(), getEntityMiddleware());

/* DELETE /:entitySet/:id delete a data object by id. */
router.delete('/:entitySet/:id', bindEntitySetMiddleware(), deleteEntityMiddleware());

/* GET /:entitySet/:id/:navigationProperty  */
router.get('/:entitySet/:id/:navigationProperty', bindEntitySetMiddleware(), getEntityNavigationPropertyMiddleware());

module.exports = router;