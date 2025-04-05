// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2019-2023, THEMOST LP All rights reserved
import _ from 'lodash';

import Q from 'q';
import {ODataModelBuilder, EdmMapping, DataQueryable, EdmType} from '@themost/data';
import {LangUtils, HttpNotFoundError, HttpBadRequestError, HttpMethodNotAllowedError, TraceUtils} from '@themost/common';
import { ResponseFormatter, StreamFormatter } from './formatter';
import {multerInstance} from './multer';
import fs from 'fs';

const parseBoolean = LangUtils.parseBoolean;
const DefaultTopOption = 25;
/**
 * Interface for options that may be passed to bindEntitySet middleware.
 *
 * @interface BindEntitySetOptions
 */

/**
 * Gets or sets the name of the route parameter that holds the name of the entity set to bind
 * @property
 * @name BindEntitySetOptions#from
 * @returns string
 */

/**
 * Interface for options that may be passed to middleware that handles requests against entity sets.
 *
 * @interface EntitySetOptions
 */

/**
 * Gets or sets the name of the entity set
 * @property
 * @name EntitySetOptions#entitySet
 * @returns string
 */

/**
 * Gets or sets the name of the route parameter that holds the name of an entity set action
 * @property
 * @name EntitySetOptions#entitySetActionFrom
 * @returns string
 */

/**
 * Gets or sets the name of the route parameter that holds the name of an entity set function
 * @property
 * @name EntitySetOptions#entitySetFunctionFrom
 * @returns string
 */

/**
 * Gets or sets the name of the route parameter that holds the name of a navigation property
 * @property
 * @name EntitySetOptions#navigationPropertyFrom
 * @returns string
 */

/**
 * Gets or sets the name of the route parameter that holds the name of an entity action
 * @property
 * @name EntitySetOptions#entityActionFrom
 * @returns string
 */

/**
 * Gets or sets the name of the route parameter that holds the name of an entity function
 * @property
 * @name EntitySetOptions#entityFunctionFrom
 * @returns string
 */

/**
 * Interface for options that may be passed to middleware that handles requests against entities.
 *
 * @interface EntityOptions
 */

/**
 * Gets or sets the name of the entity set
 * @property
 * @name EntityOptions#entitySet
 * @returns string
 */

/**
 * Gets or sets the name of the route parameter that holds the identifier of the entity
 * @property
 * @name EntityOptions#from
 * @returns string
 */

/**
 * Gets or sets the name of the route parameter that holds the entity's navigation property
 * @property
 * @name EntityOptions#navigationPropertyFrom
 * @returns string
 */

/**
 * Gets or sets the name of the route parameter that holds the name of an entity action
 * @property
 * @name EntityOptions#entityActionFrom
 * @returns string
 */

function finalizeContext(req, next) {
    if (req && req.context && typeof req.context.finalize === 'function') {
        return req.context.finalize(next);
    }
    return next();
}

/**
 * Gets or sets the name of the route parameter that holds the name of an entity function
 * @property
 * @name EntityOptions#entityFunctionFrom
 * @returns string
 */
/**
 *
 * @param {*} data
 * @param {*} req 
 * @param {*} res
 */
function tryFormat(data, req, res) {
    // finalize context
    return finalizeContext(req, () => {
        // get response formatter
        const responseFormatter = req.context.getApplication().getStrategy(ResponseFormatter);
        //if service exists
        if (responseFormatter) {
            // call Response.format with formatter
            return res.format(responseFormatter.format(data).for(req, res));
        }
        if (data == null) {
            // send no content if data is empty
            return res.status(204).type('application/json').send();
        }
        // otherwise send json data
        return res.json(data);
    });
 }

/**
 * @param {*} data
 * @param {Request|*} req
 * @param {Response|*} res
 * @param {NextFunction} next
 */
function tryFormatStream(data, req, res, next) {
    return finalizeContext(req, () => {
        return new StreamFormatter(data).execute(req, res, next);
    });
}

/**
 * Binds current request to an entitySet for further processing
 * @param {BindEntitySetOptions=} options
 * @returns {Function}
 */
function bindEntitySet(options) {
    // assign defaults
    const opts = Object.assign({
        from: 'entitySet'
    }, options);

    return (req, res, next) => {
        /**
         * @type {ODataModelBuilder}
         */
        const builder = req.context.getApplication().getStrategy(ODataModelBuilder);
        if (typeof builder === 'undefined') {
            return next(new TypeError('Application model builder cannot be empty at this context'));
        }
        /**
         * @type {EntitySetConfiguration}
         */
        const thisEntitySet = builder.getEntitySet(req.params[opts.from]);
        if (typeof thisEntitySet === 'undefined') {
            return next();
        }
        /**
         * Gets or sets an entity set configuration
         * @name entitySet
         * @type {EntitySetConfiguration}
         * @memberOf req
         */
        req.entitySet = thisEntitySet;
        return next();
    };
}

function tryBindEntitySet(req, entitySet) {
    if (typeof req.context === 'undefined') {
        return null;
    }
    /**
     * @type {ODataModelBuilder}
     */
    const builder = req.context.getApplication().getStrategy(ODataModelBuilder);
    if (typeof builder === 'undefined') {
        return null;
    }
    /**
     * @type {EntitySetConfiguration}
     */
    return builder.getEntitySet(entitySet);
}

/**
 * Extends a data queryable based on an given source data queryable
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
        let targetExpand = [];
        if (_.isArray(target.query.$expand)) {
            targetExpand = target.query.$expand;
        }
        else if (typeof target.query.$expand === 'object') {
            targetExpand.push(target.query.$expand);
        }
        const sourceExpand = [].concat(source.query.$expand);

        const res = _.filter(sourceExpand, x => {
            return typeof _.find(targetExpand, y => {
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
 * Handles incoming GET requests against an entity set e.g. GET /api/people/
 * @param {EntitySetOptions=} options
 * @returns {Function}
 */
function getEntitySet(options) {

    // assign defaults
    const opts = Object.assign({}, options);

    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (req.entitySet == null) {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        // if entity set is undefined do nothing
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        /**
         * Gets the data model for this entity set
         * @type {DataModel}
         */
        const thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        //get count parameter
        const hasCountProperty = Object.prototype.hasOwnProperty.call(req.query, '$count');
        const count = Object.prototype.hasOwnProperty.call(req.query, '$inlinecount') ? parseBoolean(req.query.$inlinecount) : (hasCountProperty ? parseBoolean(req.query.$count) : false);
        thisModel.filter(_.extend({
            $top: DefaultTopOption
        }, req.query)).then(q => {
            if (count) {
                return q.getList().then(result => {
                    const data = req.entitySet.mapInstanceSet(req.context, result);
                    return tryFormat(data, req, res);
                });
            }
            return q.getItems().then(result => {
                const data = req.entitySet.mapInstanceSet(req.context, result);
                return tryFormat(data, req, res);
            });

        }).catch(err => {
            return next(err);
        });
    };
}

/**
 * Handles incoming POST or PUT requests against an entity set e.g. POST /api/people/
 * @param {EntitySetOptions=} options
 * @returns {Function}
 */
function postEntitySet(options) {

    // assign defaults
    const opts = Object.assign({}, options);

    return (req, res, next) => {

        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (req.entitySet == null) {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        // if entity set is undefined exit
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        /**
         * Gets the data model for this entity set
         * @type {DataModel}
         */
        const thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        if (typeof req.body === 'undefined') {
            return next(new HttpBadRequestError());
        }
        thisModel.save(req.body).then(() => {
            return tryFormat(req.body, req, res);
        }).catch(err => {
            return next(err);
        });
    };
}

/**
 * Handles incoming DELETE requests against an entity set e.g. DELETE /api/people/
 * @param {EntitySetOptions=} options
 * @returns {Function}
 */
function deleteEntitySet(options) {

    // assign defaults
    const opts = Object.assign({}, options);

    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (req.entitySet == null) {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        /**
         * Gets the data model for this entity set
         * @type {DataModel}
         */
        const thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        if (typeof req.body === 'undefined') {
            return next(new HttpBadRequestError());
        }
        thisModel.remove(req.body).then(() => {
            return tryFormat(req.body, req, res);
        }).catch(err => {
            return next(err);
        });
    };
}

/**
 * Handles incoming GET requests against an entity e.g. GET /api/people/101/
 * @param {EntityOptions=} options
 * @returns {Function}
 */
function getEntity(options) {

    // assign defaults
    const opts = Object.assign({
        from: 'id'
    }, options);

    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (req.entitySet == null) {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        // if entity set is empty do nothing
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        const thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        // pick query options (only $select or $expand)
        const filter = _.pick(req.query, ['$select', '$expand']);
        // apply filter
        thisModel.filter(filter).then(q => {
            // set query for item
            return q.where(thisModel.primaryKey).equal(req.params[opts.from]).getItem().then(value => {
                // if value is undefined
                if (typeof value === 'undefined') {
                    // send not found
                    return next();
                }
                // othwerwise return object
                return tryFormat(value, req, res);
            });
        }).catch(err => {
            return next(err);
        });
    };
}

/**
 * Handles incoming DELETE requests against an entity e.g. GET /api/people/101/
 * @param {EntityOptions=} options
 * @returns {Function}
 */
function deleteEntity(options) {

    // assign defaults
    const opts = Object.assign({
        from: 'id'
    }, options);
    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (req.entitySet == null) {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        const thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        thisModel.where(thisModel.primaryKey).equal(req.params[opts.from]).count().then(value => {
            if (value === 0) {
                return res.status(404).send();
            }
            // construct a native object
            const obj = {
                'id': req.params[opts.from]
            };
            //try to delete
            return thisModel.remove(obj).then(() => {
                return tryFormat(obj, req, res);
            });
        }).catch(err => {
            return next(err);
        });
    };
}

/**
 * Handles incoming POST or PUT requests against an entity e.g. POST /api/people/101/
 * @param {EntityOptions=} options
 * @returns {Function}
 */
function postEntity(options) {

    // assign defaults
    const opts = Object.assign({
        from: 'id'
    }, options);
    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (req.entitySet == null) {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        const thisModel = req.context.model(req.entitySet.entityType.name);
        if (typeof thisModel === 'undefined') {
            return next();
        }
        // validate primary key
        const key = req.params[opts.from];
        if (typeof key === 'undefined' || key === null) {
            return next(new HttpBadRequestError('Object identifier cannot be empty at this context'));
        }
        thisModel.where(thisModel.primaryKey).equal(key).count().then(value => {
            if (value === 0) {
                return res.status(404).send();
            }
            // validate req.body
            if (typeof req.body === 'undefined') {
                return next(new HttpBadRequestError('Request body cannot be empty'));
            }
            // clone body
            const obj = Object.assign({}, req.body);
            // set identifier
            obj[thisModel.primaryKey] = key;
            // try to save
            return thisModel.save(obj).then(() => {
                return tryFormat(obj, req, res);
            });
        }).catch(err => {
            return next(err);
        });
    };
}

/**
 * Handles incoming GET requests against an entity's navigation property e.g. GET /api/people/101/address
 * @param {EntityOptions=} options
 * @returns {Function}
 */
function getEntityNavigationProperty(options) {

    // assign defaults
    const opts = Object.assign({
        from: 'id',
        navigationPropertyFrom: 'navigationProperty'
    }, options);

    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (req.entitySet == null) {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        /**
         * get current data model
         * @type {DataModel}
         */
        const thisModel = req.context.model(req.entitySet.entityType.name);
        // get navigation property param
        const navigationProperty = req.params[opts.navigationPropertyFrom];

        if (typeof thisModel === 'undefined') {
            return next();
        }
        /**
         * get current model builder
         * @type {ODataModelBuilder}
         */
        const builder = req.context.getApplication().getStrategy(ODataModelBuilder);

        thisModel.where(thisModel.primaryKey).equal(req.params[opts.from]).select(thisModel.primaryKey).getTypedItem().then(obj => {
            if (typeof obj === 'undefined') {
                return res.status(404).send();
            }
            //get primary key
            const key = obj[thisModel.primaryKey];
            //get mapping
            const mapping = thisModel.inferMapping(navigationProperty);
            // if mapping is undefined exit
            if (_.isNil(mapping)) {
                return next();
            }
            //get count parameter
            const hasCountProperty = Object.prototype.hasOwnProperty.call(req.query, '$count');
            const count = Object.prototype.hasOwnProperty.call(req.query, '$inlinecount') ? parseBoolean(req.query.$inlinecount) : (hasCountProperty ? parseBoolean(req.query.$count) : false);
            // validate mapping
            let returnEntitySet;
            if (mapping.associationType === 'junction') {
                /**
                 * @type {DataQueryable}
                 */
                const junction = obj.property(navigationProperty);
                return Q.nbind(junction.model.filter, junction.model)(_.extend({
                    $top: DefaultTopOption
                }, req.query)).then(q => {
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
                    returnEntitySet = builder.getEntityTypeEntitySet(junction.model.name);
                    if (count) {
                        return junction.getList().then(result => {
                            if (returnEntitySet) {
                                const data = returnEntitySet.mapInstanceSet(req.context, result);
                                return tryFormat(data, req, res);
                            }
                            return tryFormat(result, req, res);
                        });
                    }
                    else {
                        return junction.getItems().then(result => {
                            if (returnEntitySet) {
                                const data = returnEntitySet.mapInstanceSet(req.context, result);
                                return tryFormat(data, req, res);
                            }
                            return tryFormat(result, req, res);
                        });
                    }
                });
            }
            else if (mapping.parentModel === thisModel.name && mapping.associationType === 'association') {
                //get associated model
                const associatedModel = req.context.model(mapping.childModel);
                if (_.isNil(associatedModel)) {
                    return next(new HttpNotFoundError('Associated model not found'));
                }
                returnEntitySet = builder.getEntityTypeEntitySet(mapping.childModel);
                return Q.nbind(associatedModel.filter, associatedModel)(_.extend({
                    $top: DefaultTopOption
                }, req.query)).then(q => {
                    if (count) {
                        return q.where(mapping.childField).equal(key).getList().then(result => {
                            if (returnEntitySet) {
                                const data = returnEntitySet.mapInstanceSet(req.context, result);
                                return tryFormat(data, req, res);
                            }
                            return tryFormat(result, req, res);
                        });
                    }
                    else {
                        return q.where(mapping.childField).equal(key).getItems().then(result => {
                            if (returnEntitySet) {
                                const data = returnEntitySet.mapInstanceSet(req.context, result);
                                return tryFormat(data, req, res);
                            }
                            return tryFormat(result, req, res);
                        });
                    }
                });
            }
            else if (mapping.childModel === thisModel.name && mapping.associationType === 'association') {
                // get associated model
                const parentModel = req.context.model(mapping.parentModel);
                if (_.isNil(parentModel)) {
                    return next(new HttpNotFoundError('Parent associated model not found'));
                }
                // init expand property
                const navigationPropertyExpand = {
                    // set name
                    name: navigationProperty,
                    // set options to empty object
                    options: {
                    }
                };
                // validate $select system query option
                if (req.query.$select) {
                    // add $select option
                    navigationPropertyExpand.options.$select = req.query.$select;
                }
                // validate $expand system query option
                if (req.query.$expand) {
                    // add $expand option
                    navigationPropertyExpand.options.$expand = req.query.$expand;
                }
                // select identifier and navigation property and also expand navigation prop
                return thisModel.where(thisModel.primaryKey).equal(obj.id).select(thisModel.primaryKey,navigationProperty).expand(navigationPropertyExpand).getItem().then(result => {
                    return tryFormat(result[navigationProperty], req, res);
                });
            }
            else {
                return next(new HttpNotFoundError());
            }
        }).catch(err => {
            return next(err);
        });
    };
}

/**
 * Handles incoming GET requests against an entity's action  e.g. GET /api/people/me/
 * @param {EntitySetOptions=} options
 * @returns {Function}
 */
function getEntitySetFunction(options) {
    // assign defaults
    const opts = Object.assign({
        entitySetFunctionFrom: 'entitySetFunction',
        entityFunctionFrom: 'entityFunction',
        navigationPropertyFrom: 'navigationProperty'
    }, options);
    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (req.entitySet == null) {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }

        const model = req.context.model(req.entitySet.entityType.name);
        if (_.isNil(model)) {
            return next(new HttpNotFoundError('Entity not found'));
        }
        const entitySetFunction = req.params[opts.entitySetFunctionFrom];
        const entityFunction = req.params[opts.entityFunctionFrom];
        const navigationProperty = req.params[opts.navigationPropertyFrom];
        /**
         * get current model builder
         * @type {ODataModelBuilder}
         */
        const builder = req.context.getApplication().getStrategy(ODataModelBuilder);
        const func = req.entitySet.entityType.collection.hasFunction(entitySetFunction);
        if (func) {
            const funcParameters = [];
            const parameters = _.filter(func.parameters, x => {
                return x.name !== 'bindingParameter';
            });
            // add other parameters by getting request body attributes
            try {
                _.forEach(parameters, x => {
                    if (x.nullable === false) {
                        // throw exception if a required parameter is missing
                        if (Object.prototype.hasOwnProperty.call(req.query, x.name) === false) {
                            throw new HttpBadRequestError('A required parameter is missing');
                        }
                    }
                    // validate that query has this property and add it to function parameters
                    if (Object.prototype.hasOwnProperty.call(req.query, x.name) === true) {
                        funcParameters.push(req.query[x.name]);
                    }
                });
            } catch (err) {
                return next(err);
            }
            //get data object class
            const DataObjectClass = model.getDataObjectType();
            const staticFunc = EdmMapping.hasOwnFunction(DataObjectClass, entitySetFunction);
            if (staticFunc) {
                // add context to function parameters
                funcParameters.splice(0, 0, req.context);
                return Q.resolve(staticFunc.apply(null, funcParameters)).then(result => {
                    if (func.returnType === 'Edm.Stream') {
                        return tryFormatStream(result, req, res, next);
                    }
                    const returnsCollection = _.isString(func.returnCollectionType);
                    let returnEntitySet;
                    let returnModel;
                    if (result instanceof DataQueryable) {
                        // get return model (if any)
                        returnModel = req.context.model(func.returnType || func.returnCollectionType);
                        // get return entity set
                        if (returnModel) {
                            returnEntitySet = builder.getEntityTypeEntitySet(returnModel.name);
                        }
                        // throw exception for unknown model
                        if (_.isNil(returnModel)) {
                            return Q.reject(new HttpNotFoundError('Result Entity not found'));
                        }
                        const filter = Q.nbind(returnModel.filter, returnModel);
                        if (!returnsCollection) {
                            //pass context parameters (if both navigationProperty and entityFunction are empty)
                            let params = {};
                            if (_.isNil(navigationProperty) && _.isNil(entityFunction)) {
                                params = _.pick(req.query, [
                                    '$select',
                                    '$expand'
                                ]);
                            }
                            return filter(params).then(q => {
                                //do not add context params
                                const q1 = extendQueryable(result, q);
                                return q1.getItem().then(result => {
                                    if (_.isString(navigationProperty)) {
                                        if (_.isNil(result)) {
                                            return next(new HttpNotFoundError());
                                        }
                                        //set internal identifier for object
                                        req.params._id = result[returnModel.primaryKey];
                                        //set internal navigation property
                                        req.params._navigationProperty = navigationProperty;
                                        // call navigation property middleware
                                        return getEntityNavigationProperty({
                                            entitySet: returnEntitySet.name,
                                            from: '_id',
                                            navigationPropertyFrom: '_navigationProperty'
                                        })(req, res, next);
                                    }
                                    else if (_.isString(entityFunction)) {
                                        if (_.isNil(result)) {
                                            return next(new HttpNotFoundError());
                                        }
                                        //set internal identifier for object
                                        req.params._id = result[returnModel.primaryKey];
                                        //set internal entity function
                                        req.params._entityFunction = entityFunction;
                                        // call entity function middleware
                                        return getEntityFunction({
                                            entitySet: returnEntitySet.name,
                                            from: '_id',
                                            entityFunctionFrom: '_entityFunction'
                                        })(req, res, next);
                                    }
                                    return tryFormat(result, req, res);
                                });
                            });
                        }
                        if (typeof navigationProperty !== 'undefined') {
                            return next(new HttpBadRequestError());
                        }
                        return filter(_.extend({
                            $top: DefaultTopOption
                        }, req.query)).then(q => {
                            const hasCountProperty = Object.prototype.hasOwnProperty.call(req.query, '$count');
                            const count = Object.prototype.hasOwnProperty.call(req.query, '$inlinecount') ?
                                parseBoolean(req.query.$inlinecount) : (hasCountProperty ?
                                    parseBoolean(req.query.$count) : false);
                            const q1 = extendQueryable(result, q);
                            if (count) {
                                return q1.getList().then(result => {
                                    if (returnEntitySet) {
                                        const data = returnEntitySet.mapInstance(req.context, result);
                                        return tryFormat(data, req, res);
                                    }
                                    return tryFormat(result, req, res);
                                });
                            }
                            return q1.getItems().then(result => {
                                if (returnEntitySet) {
                                    const data = returnEntitySet.mapInstance(req.context, result);
                                    return tryFormat(data, req, res);
                                }
                                return tryFormat(result, req, res);
                            });
                        });
                    }
                    // check if entitySetFunction route contains an entityFunction call
                    if (_.isString(entityFunction)) {
                        // get return model
                        returnModel = req.context.model(func.returnType);
                        if (returnModel == null) {
                            // throw error for unknown model
                            return next(new HttpBadRequestError('Entity set function return type is invalid. Expected an instance of DataModel but the specified data model cannot be found.'));
                        }
                        // throw error if result is empty
                        if (_.isNil(result)) {
                            return next(new HttpNotFoundError());
                        }
                        // get return entity set
                        returnEntitySet = builder.getEntityTypeEntitySet(returnModel.name);
                        //set internal identifier for object
                        req.params._id = result[returnModel.primaryKey];
                        //set internal entity function
                        req.params._entityFunction = entityFunction;
                        // set entity for further use
                        req.entity = result;
                        // call entity function middleware
                        return getEntityFunction({
                            entitySet: returnEntitySet.name,
                            from: '_id',
                            entityFunctionFrom: '_entityFunction'
                        })(req, res, next);
                    }
                    if (_.isNil(navigationProperty)) {
                        if (returnsCollection) {
                            return tryFormat(result, req, res);
                        }
                        else {
                            if (Array.isArray(result)) {
                                // send no content if empty
                                if (typeof result[0] === 'undefined') {
                                    return res.status(204).send();
                                }
                                // get first item only
                                return tryFormat(result[0], req, res);
                            }
                            // send no content if empty
                            if (typeof result === 'undefined') {
                                return res.status(204).send();
                            }
                            return tryFormat(result, req, res);
                        }
                    }
                    if (returnEntitySet == null) {
                        return next(new HttpNotFoundError('Result EntitySet not found'));
                    }
                    // throw error if result is empty
                    if (_.isNil(result)) {
                        return next(new HttpNotFoundError());
                    }
                    //set internal identifier for object
                    req.params._id = result[returnModel.primaryKey];
                    //set internal navigation property
                    req.params._navigationProperty = navigationProperty;
                    return getEntityNavigationProperty({
                        entitySet: returnEntitySet.name,
                        from: '_id',
                        navigationPropertyFrom: '_navigationProperty'
                    })(req, res, next);
                }).catch((err => {
                    return next(err);
                }));
            }
            // an entity set function method with the specified name was not found, throw error
            return next(new Error('The specified entity set function cannot be found'));
        }
        // an entity set function was not found, continue
        return next();
    };
}

/**
 * Handles incoming POST requests against an entity set function result  e.g. GET /api/people/me/lastOrder
 * @param {EntitySetOptions=} options
 * @returns {Function}
 */
function postEntitySetFunction(options) {
    // assign defaults
    const opts = Object.assign({
        entitySetFunctionFrom: 'entitySetFunction',
        entityActionFrom: 'entityAction'
    }, options);
    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (req.entitySet == null) {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }

        const model = req.context.model(req.entitySet.entityType.name);
        if (_.isNil(model)) {
            return next(new HttpNotFoundError('Entity not found'));
        }
        const entitySetFunction = req.params[opts.entitySetFunctionFrom];
        const entityAction = req.params[opts.entityActionFrom];
        /**
         * get current model builder
         * @type {ODataModelBuilder}
         */
        const builder = req.context.getApplication().getStrategy(ODataModelBuilder);
        const func = req.entitySet.entityType.collection.hasFunction(entitySetFunction);
        if (func) {
            // get return collection flag
            const returnsCollection = _.isString(func.returnCollectionType);
            if (returnsCollection) {
                // throw exception for invalid entity function result
                return next(new HttpMethodNotAllowedError('Invalid entity set function configuration. An entity function must return an entity at this context.'));
            }
            const funcParameters = [];
            const parameters = _.filter(func.parameters, x => {
                return x.name !== 'bindingParameter';
            });
            // add other parameters by getting request body attributes
            _.forEach(parameters, x => {
                funcParameters.push(req.query[x.name]);
            });
            //get data object class
            const DataObjectClass = model.getDataObjectType();
            const staticFunc = EdmMapping.hasOwnFunction(DataObjectClass, entitySetFunction);
            if (staticFunc) {
                // validate entityAction
                if (_.isNil(entityAction)) {
                    // do nothing
                    return next();
                }
                let returnEntitySet;
                let returnModel;
                return Q.resolve(staticFunc(req.context)).then(result => {
                    if (result instanceof DataQueryable) {
                        // get return model (if any)
                        returnModel = req.context.model(func.returnType || func.returnCollectionType);
                        // throw exception for unknown model
                        if (_.isNil(returnModel)) {
                            return Q.reject(new HttpNotFoundError('Result Entity not found'));
                        }
                        // get return entity set
                        returnEntitySet = builder.getEntityTypeEntitySet(returnModel.name);
                        // get item
                        return result.getItem().then(result => {
                            if (_.isNil(result)) {
                                return next(new HttpNotFoundError());
                            }
                            //set internal identifier for object
                            req.params._id = result[returnModel.primaryKey];
                            //set internal entity function
                            req.params._entityAction = entityAction;
                            // call entity function middleware
                            return postEntityAction({
                                entitySet: returnEntitySet.name,
                                from: '_id',
                                entityActionFrom: '_entityAction'
                            })(req, res, next);
                        });
                    }
                    if (typeof result === 'object')
                    {
                        // get return model
                        returnModel = req.context.model(func.returnType);
                        if (returnModel == null) {
                            // throw error for unknown model
                            return next(new HttpBadRequestError('Entity set function return type is invalid. Expected an instance of DataModel but the specified data model cannot be found.'));
                        }
                        // get return entity set
                        returnEntitySet = builder.getEntityTypeEntitySet(returnModel.name);
                        req.entity = result;
                        //set internal identifier for object
                        req.params._id = result[returnModel.primaryKey];
                        //set internal entity function
                        req.params._entityAction = entityAction;
                        // call entity function middleware
                        return postEntityAction({
                            entitySet: returnEntitySet.name,
                            from: '_id',
                            entityActionFrom: '_entityAction'
                        })(req, res, next);
                    }
                    return next();
                }).catch((err => {
                    return next(err);
                }));
            }
            // an entity set function method with the specified name was not found, throw error
            return next(new Error('The specified entity set function cannot be found'));
        }
        // an entity set function was not found, continue
        return next();
    };
}

/**
 * Handles incoming POST requests against an entity set action  e.g. GET /api/people/me/
 * @param {EntityOptions=} options
 * @returns {Function}
 */
function postEntitySetAction(options) {
    // assign defaults
    const opts = Object.assign({
        entitySetActionFrom: 'entitySetAction',
        entityActionFrom: 'entityAction'
    }, options);
    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (req.entitySet == null) {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        const model = req.context.model(req.entitySet.entityType.name);
        if (_.isNil(model)) {
            return next(new HttpNotFoundError('Entity not found'));
        }
        /**
         * get current model builder
         * @type {ODataModelBuilder}
         */
        const builder = req.context.getApplication().getStrategy(ODataModelBuilder);

        const entitySetAction = req.params[opts.entitySetActionFrom];
        const action = req.entitySet.entityType.collection.hasAction(entitySetAction);
        if (action) {
            //get data object class
            const DataObjectClass = model.getDataObjectType();
            const actionFunc = EdmMapping.hasOwnAction(DataObjectClass, entitySetAction);
            if (typeof actionFunc !== 'function') {
                return next(new Error('Invalid entity set configuration. The specified action cannot be found'));
            }
            const actionParameters = [];
            const parameters = _.filter(action.parameters, x => {
                return x.name !== 'bindingParameter';
            });
            // if parameters must be included in body
            if (parameters.length) {
                // validate request body
                if (typeof req.body === 'undefined') {
                    // throw bad request if body is missing
                    return next(new HttpBadRequestError('Request body cannot be empty'));
                }
            }
            // add context as the first parameter
            actionParameters.push(req.context);
            const multerOptions = req.context.getApplication().getConfiguration().getSourceAt('settings/multer');
            let tryGetStream = tryGetActionStream(parameters, multerOptions);
            return tryGetStream(req, res, (err) => {
                if (err) {
                    return next(err);
                }
                // if action has only one parameter and this parameter has fromBody flag
                if (parameters.length === 1 && parameters[0].fromBody) {
                    actionParameters.push(req.body);
                } else {
                    // add other parameters by getting request body attributes
                    _.forEach(parameters, x => {
                        if (x.type === EdmType.EdmStream) {
                            let bufferedStream = null;
                            if (req.files && Object.prototype.hasOwnProperty.call(req.files, x.name)) {
                                const files = req.files[x.name];
                                // convert file to read stream
                                if (Array.isArray(files) && files.length) {
                                    // get first file
                                    const file = files[0];
                                    bufferedStream = fs.createReadStream(file.path);
                                    bufferedStream.contentEncoding = file.encoding;
                                    bufferedStream.contentType = file.mimetype;
                                    bufferedStream.contentFileName = Buffer.from(file.originalname, 'latin1').toString('utf-8');
                                    bufferedStream.on('close', () => {
                                        TraceUtils.debug(`(postEntitySetAction), Closing read stream, ${file.path}`);
                                        try {
                                            if (fs.existsSync(file.path)) {
                                                fs.unlinkSync(file.path);
                                            }
                                        } catch (error) {
                                            TraceUtils.warn(`(postEntitySetAction) An error occurred while trying to cleanup user uploaded content ${file.path}`);
                                            TraceUtils.warn(error);
                                        }
                                    });
                                }
                            }
                            if (bufferedStream == null && x.nullable === false) {
                                return next(new HttpBadRequestError('File parameter is missing'));
                            }
                            actionParameters.push(bufferedStream);
                            
                        } else {
                            if (x.fromBody) {
                                actionParameters.push(req.body);
                            } else {
                                actionParameters.push(req.body[x.name]);
                            }

                        }
                    });
                }
                // invoke action
                return Q.resolve(actionFunc.apply(null, actionParameters)).then(result => {
                    if (action.returnType === 'Edm.Stream') {
                        return tryFormatStream(result, req, res, next);
                    }
                    // check if action returns a collection of object
                    const returnsCollection = _.isString(action.returnCollectionType);
                    let returnEntitySet;
                    // if func returns a collection of items
                    if (returnsCollection) {
                        // get return entity set
                        returnEntitySet = builder.getEntityTypeEntitySet(action.returnCollectionType);
                    }
                    if (result instanceof DataQueryable) {
                        // todo:: validate return collection type and pass system query options ($filter, $expand, $select etc)
                        if (returnsCollection) {
                            // call DataModel.getItems() instead of DataModel.getList()
                            // an action that returns a collection of objects must always return a native array (without paging parameters)
                            return result.getItems().then(finalResult => {
                                //return result
                                if (returnEntitySet) {
                                    const data = returnEntitySet.mapInstanceSet(req.context, finalResult);
                                    return tryFormat(data, req, res);
                                }
                                return tryFormat(finalResult, req, res);
                            });
                        }
                        else {
                            // otherwise call DataModel.getItem() to get only the first item of the result set
                            return result.getItem().then(finalResult => {
                                return tryFormat(finalResult, req, res);
                            });
                        }
                    }
                    if (typeof result === 'undefined') {
                        // return no content
                        return res.status(204).send();
                    }
                    // return result as native object
                    return tryFormat(result, req, res);
                }).catch(err => {
                    return next(err);
                });
            });



        }
        // there is no action with the given name, continue
        return next();
    };
}


/**
 * Handles incoming GET requests against an entity's function  e.g. GET /api/people/101/lastOrder
 * @param {EntityOptions=} options
 * @returns {Function}
 */
function getEntityFunction(options) {

    // assign defaults
    const opts = Object.assign({
        from: 'id',
        entityFunctionFrom: 'entityFunction',
        navigationPropertyFrom: 'navigationProperty'
    }, options);

    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (req.entitySet == null) {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        /**
         * get current model builder
         * @type {ODataModelBuilder}
         */
        const builder = req.context.getApplication().getStrategy(ODataModelBuilder);
        /**
         * get current data model
         * @type {DataModel}
         */
        const thisModel = req.context.model(req.entitySet.entityType.name);

        if (typeof thisModel === 'undefined') {
            return next();
        }
        if (typeof req.params[opts.entityFunctionFrom] === 'undefined') {
            return next();
        }
        // validate entity type function
        const func = req.entitySet.entityType.hasFunction(req.params[opts.entityFunctionFrom]);
        if (typeof func === 'undefined') {
            return next();
        }
        function tryGetEntity() {
            if (req.entity) {
                const ThisModelDataObjectClass = thisModel.getDataObjectType();
                // data object class is null
                if (ThisModelDataObjectClass == null) {
                    // do nothing
                    return Q.resolve(req.entity);
                }
                // entity is already a typed item
                if (req.entity instanceof  ThisModelDataObjectClass) {
                    // do nothing
                    return Q.resolve(req.entity);
                }
                return Q.resolve(thisModel.convert(req.entity));
            }
            return thisModel.where(thisModel.primaryKey).equal(req.params[opts.from]).select(thisModel.primaryKey).getTypedItem();
        }
        // get typed item
        tryGetEntity().then(obj => {
            if (typeof obj === 'undefined') {
                return res.status(404).send();
            }
            //check if entity set has a function with the same name
            const memberFunc = EdmMapping.hasOwnFunction(obj, func.name);
            if (memberFunc) {
                const returnsCollection = _.isString(func.returnCollectionType);
                let returnEntitySet;
                // if func returns a collection of items
                if (returnsCollection) {
                    // get return entity set
                    returnEntitySet = builder.getEntityTypeEntitySet(func.returnCollectionType);
                }
                let returnModel = req.context.model(func.returnType || func.returnCollectionType);
                const funcParameters = [];
                _.forEach(func.parameters, x => {
                    if (x.name !== 'bindingParameter') {
                        funcParameters.push(LangUtils.parseValue(req.query[x.name]));
                    }
                });
                return Q.resolve(memberFunc.apply(obj, funcParameters)).then(result => {
                    if (func.returnType === 'Edm.Stream') {
                        return tryFormatStream(result, req, res, next);
                    }
                    if (result instanceof DataQueryable) {
                        if (_.isNil(returnModel)) {
                            if (func.returnCollectionType === 'Object') {
                                returnModel = req.context.model(result.model.name);
                            }
                            if (returnModel == null) {
                                return next(new HttpNotFoundError('Result Entity not found'));
                            }
                        }
                        const filter = Q.nbind(returnModel.filter, returnModel);
                        //if the return value is a single instance
                        if (!returnsCollection) {
                            //pass context parameters (only $select and $expand)
                            const params = _.pick(req.query, [
                                '$select',
                                '$expand'
                            ]);
                            //filter with parameters
                            return filter(params).then(q => {
                                // extend data queryable
                                const q1 = extendQueryable(result, q);
                                //get item
                                return q1.getItem().then(result => {
                                    //return result
                                    return tryFormat(result, req, res);
                                });
                            });
                        }
                        //else if the return value is a collection
                        return filter(_.extend({
                            $top: DefaultTopOption
                        }, req.query)).then(q => {
                            const hasCountProperty = Object.prototype.hasOwnProperty.call(req.query, '$count');
                            const count = Object.prototype.hasOwnProperty.call(req.query, '$inlinecount') ? parseBoolean(req.query.$inlinecount) : (hasCountProperty ? parseBoolean(req.query.$count) : false);
                            const q1 = extendQueryable(result, q);
                            if (count) {
                                return q1.getList().then(result => {
                                    //return result
                                    if (returnEntitySet) {
                                        const data = returnEntitySet.mapInstanceSet(req.context, result);
                                        return tryFormat(data, req, res);
                                    }
                                    return tryFormat(result, req, res);
                                });
                            }
                            return q1.getItems().then(result => {
                                //return result
                                if (returnEntitySet) {
                                    const data = returnEntitySet.mapInstanceSet(req.context, result);
                                    return tryFormat(data, req, res);
                                }
                                return tryFormat(result, req, res);
                            });
                        });
                    }
                    return tryFormat(result, req, res);
                });
            }
            // entity type does not have an instance method with the given name, continue
            return next();
        }).catch(err => {
            return next(err);
        });
    };
}

/**
 * @param actionParameters
 * @param {*} options
 * @returns {function(*, *, *): *}
 */
function tryGetActionStream(actionParameters, options) {
    let result = function(req, res, next) {
        return next();
    };
    // validate Stream parameters
    const files = actionParameters.filter( (x) => {
        return x.type === EdmType.EdmStream;
    });
    if (files.length>0) {
        // use multer()
        result = multerInstance(options).fields(files.map((x) => {
            return {
                name: x.name
            }
        }));
    }
    return result;
}

/**
 * Handles incoming GET requests against an entity's function  e.g. GET /api/people/101/lastOrder
 * @param {EntityOptions=} options
 * @returns {Function}
 */
function postEntityAction(options) {

    // assign defaults
    const opts = Object.assign({
        from: 'id',
        entityActionFrom: 'entityAction'
    }, options);

    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next(new Error('Invalid request state. Request context is undefined.'));
        }
        // try to bind current request with the given entity set
        if (opts.entitySet) {
            req.entitySet = tryBindEntitySet(req, opts.entitySet);
            // throw error if the given entity set cannot be found
            if (req.entitySet == null) {
                return next(new HttpNotFoundError('The given entity set cannot be found'));
            }
        }
        if (typeof req.entitySet === 'undefined') {
            return next();
        }
        /**
         * get current data model
         * @type {DataModel}
         */
        const thisModel = req.context.model(req.entitySet.entityType.name);

        if (typeof thisModel === 'undefined') {
            return next();
        }
        if (typeof req.params[opts.entityActionFrom] === 'undefined') {
            return next();
        }
        /**
         * get current model builder
         * @type {ODataModelBuilder}
         */
        const builder = req.context.getApplication().getStrategy(ODataModelBuilder);

        // validate entity type function
        const action = req.entitySet.entityType.hasAction(req.params[opts.entityActionFrom]);
        if (typeof action === 'undefined') {
            return next();
        }
        function tryGetEntity() {
            if (req.entity) {
                const ThisModelDataObjectClass = thisModel.getDataObjectType();
                if (ThisModelDataObjectClass == null) {
                    return Q.resolve(req.entity);
                }
                if (req.entity instanceof  ThisModelDataObjectClass) {
                    return Q.resolve(req.entity);
                }
                return Q.resolve(thisModel.convert(req.entity));
            }
            return thisModel.where(thisModel.primaryKey).equal(req.params[opts.from]).select(thisModel.primaryKey).getTypedItem();
        }
        // get typed item
        tryGetEntity().then(obj => {
            if (typeof obj === 'undefined') {
                return res.status(404).send();
            }
            //check if entity set has a function with the same name
            const memberFunc = EdmMapping.hasOwnAction(obj, action.name);
            if (memberFunc) {
                const actionParameters = [];
                const parameters = _.filter(action.parameters, x => {
                    return x.name !== 'bindingParameter';
                });
                const multerOptions = req.context.getApplication().getConfiguration().getSourceAt('settings/multer');
                let tryGetStream = tryGetActionStream(parameters, multerOptions);
                return tryGetStream(req, res, (err) => {
                    if (err) {
                        return next(err);
                    }
                    // if action has only one parameter and this parameter has fromBody flag
                    if (parameters.length === 1 && parameters[0].fromBody) {
                        actionParameters.push(req.body);
                    }
                    else {
                        // add other parameters by getting request body attributes
                        _.forEach(parameters, x => {
                            if (x.type === EdmType.EdmStream) {
                                let bufferedStream = null;
                                if (req.files && Object.prototype.hasOwnProperty.call(req.files, x.name)) {
                                    const files = req.files[x.name];
                                    // convert file to read stream
                                    if (Array.isArray(files) && files.length) {
                                        // get first file
                                        const file = files[0];
                                        bufferedStream = fs.createReadStream(file.path);
                                        bufferedStream.contentEncoding = file.encoding;
                                        bufferedStream.contentType = file.mimetype;
                                        bufferedStream.contentFileName = Buffer.from(file.originalname, 'latin1').toString('utf-8');
                                        bufferedStream.on('close', () => {
                                            TraceUtils.debug(`(postEntityAction), Closing read stream, ${file.path}`);
                                            try {
                                                if (fs.existsSync(file.path)) {
                                                    fs.unlinkSync(file.path);
                                                }
                                            } catch (error) {
                                                TraceUtils.warn(`(postEntityAction) An error occurred while trying to cleanup user uploaded content ${file.path}`);
                                                TraceUtils.warn(error);
                                            }
                                        });
                                    }
                                }
                                if (bufferedStream == null && x.nullable === false) {
                                    return next(new HttpBadRequestError('File parameter is missing'));
                                }
                                actionParameters.push(bufferedStream);
                            } else {
                                if (x.fromBody) {
                                    actionParameters.push(req.body);
                                } else {
                                    actionParameters.push(req.body[x.name]);
                                }
                            }
                        });
                    }
                    return Q.resolve(memberFunc.apply(obj, actionParameters)).then(result => {
                        if (action.returnType === 'Edm.Stream') {
                            return tryFormatStream(result, req, res, next);
                        }
                        // check if action returns a collection of object
                        const returnsCollection = _.isString(action.returnCollectionType);
                        let returnEntitySet;
                        if (returnsCollection) {
                            returnEntitySet = builder.getEntityTypeEntitySet(action.returnCollectionType);
                        }
                        if (result instanceof DataQueryable) {
                            // todo:: validate return collection type and pass system query options ($filter, $expand, $select etc)
                            if (returnsCollection) {
                                // call DataModel.getItems() instead of DataModel.getList()
                                // an action that returns a collection of objects must always return a native array (without paging parameters)
                                return result.getItems().then(finalResult => {
                                    if (returnEntitySet) {
                                        const data = returnEntitySet.mapInstanceSet(req.context, finalResult);
                                        return tryFormat(data, req, res);
                                    }
                                    return tryFormat(finalResult, req, res);
                                });
                            }
                            else {
                                // otherwise call DataModel.getItem() to get only the first item of the result set
                                return result.getItem().then(finalResult => {
                                    return tryFormat(finalResult, req, res);
                                });
                            }
                        }
                        if (typeof result === 'undefined') {
                            // return no content
                            return res.status(204).send();
                        }
                        // return result as native object
                        if (returnsCollection && returnEntitySet) {
                            const data = returnEntitySet.mapInstanceSet(req.context, result);
                            return tryFormat(data, req, res);
                        }
                        return tryFormat(result, req, res);
                    }).catch(function(err) {
                        return next(err);
                    });
                });
            }
            // entity type does not have an instance method with the given name, continue
            return next();
        }).catch(err => {
            return next(err);
        });
    };
}

/**
 * @returns {Function}
 */
function getEntitySetIndex() {
    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next();
        }
        /**
         * get current model builder
         * @type {ODataModelBuilder|*}
         */
        const builder = req.context.getApplication().getStrategy(ODataModelBuilder);
        // get edm document
        return builder.getEdm().then(result => {
            return res.json({
                value: result.entityContainer.entitySet
            });
        }).catch(err => {
            return next(err);
        });
    };
}

/**
 * @returns {Function}
 */
function getMetadataDocument() {
    return (req, res, next) => {
        if (typeof req.context === 'undefined') {
            return next();
        }
        /**
         * get current model builder
         * @type {ODataModelBuilder}
         */
        const builder = req.context.getApplication().getStrategy(ODataModelBuilder);
        // get edm document
        return builder.getEdmDocument().then(result => {
            res.set('Content-Type', 'application/xml');
            res.set('OData-Version', '4.0');
            return res.send('<?xml version="1.0" encoding="utf-8"?>' + result.outerXML());
        }).catch(err => {
            return next(err);
        });
    };
}

export {getEntitySetIndex};
export {getMetadataDocument};
export {bindEntitySet};
export {getEntitySet};
export {postEntitySet};
export {deleteEntitySet};
export {getEntity};
export {postEntity};
export {deleteEntity};
export {getEntityNavigationProperty};
export {getEntitySetFunction};
export {postEntitySetFunction};
export {postEntitySetAction};
export {getEntityFunction};
export {postEntityAction};
