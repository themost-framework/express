import { ODataModelBuilder } from '@themost/data';

/**
 * @abstract
 */
class AppendAttribute {
    constructor() {
        this.name = 'responseFormatter';
    }
    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @returns {*}
     */
    // eslint-disable-next-line no-unused-vars
    append(req, res) {
        return {};
    }
    
}

class AppendContextAttribute extends AppendAttribute  {
    constructor() {
        super();
        this.name = 'contextUrl';
    }

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @returns {*}
     */
    // eslint-disable-next-line no-unused-vars
    append(req, res) {
        /**
         * @type {import('./app').ExpressDataContext}
         */
        const context = req.context;
        // if entity set is not defined
        if (req.entitySet == null) {
            // do nothing and exit
            return {};
        }
        // add odata attributes
        // @odata.context
        let serviceRoot = context.getConfiguration().getSourceAt('settings/builder/serviceRoot');
        if (serviceRoot == null) {
            // try to get service root from request
            const host = req.get('x-forwarded-host') || req.get('host');
            const protocol = req.get('x-forwarded-proto') || req.protocol;
            /**
             * @type {string}
             */
            let baseUrl = req.baseUrl || req.path;
            if (baseUrl.endsWith('/') === false) {
                baseUrl += '/';
            }
            serviceRoot = new URL(baseUrl, `${protocol}://${host}`).toString();
        }
        const builder = context.application.getStrategy(ODataModelBuilder);
        /**
         * @type {URL}
         */
        const metadataUrl = new URL('./$metadata', serviceRoot);
        // entity set
        if (req.route && req.route.path === '/:entitySet/:id') {
            metadataUrl.hash = `${req.params.entitySet}/entity`;
        // entity
        } else if (req.route && req.route.path === '/:entitySet') {
            metadataUrl.hash = `${req.params.entitySet}`;
        // navigation property
        } else if (req.entitySet && req.route && req.route.path === '/:entitySet/:id/:navigationProperty') {
            const navigationProperty = builder.getEntitySet(req.entitySet.name).getEntityTypeNavigationProperty(req.params.navigationProperty);
            if (navigationProperty) {
                const navigationEntitySet = builder.getEntityTypeEntitySet(navigationProperty.type);
                metadataUrl.hash = navigationEntitySet ? `${navigationEntitySet.name}/entity` : `${req.params.entitySet}/${req.params.id}/${req.params.navigationProperty}`;
            } else {
                metadataUrl.hash = `${req.params.entitySet}/${req.params.id}/${req.params.navigationProperty}`;
            }
        // entity set function
        } else if (req.route && req.route.path === '/:entitySet/:entitySetFunction') {
            const entitySet = builder.getEntitySet(req.params.entitySet);
            const collection = entitySet && entitySet.entityType && entitySet.entityType.collection;
            if (collection) {
                /**
                 * get action
                 * @type {import('@themost/data').FunctionConfiguration}
                 */
                const entitySetFunction = collection.hasFunction(req.params.entitySetFunction);
                // if action returns only one item
                if (entitySetFunction && entitySetFunction.returnType) {
                    // try to find entity set of that item
                    const entitySetActionReturnSet = builder.getEntityTypeEntitySet(entitySetFunction.returnType);
                    // and format metadata url hash
                    if (entitySetActionReturnSet) {
                        metadataUrl.hash = `${entitySetActionReturnSet.name}/entity`; // e.g. $metadata#People/entity
                    } else {
                        metadataUrl.hash = `${entitySetFunction.returnType}`; // e.g. $metadata#String
                    }
                } else if (entitySetFunction && entitySetFunction.returnCollectionType) { // if function returns a collection
                    // try to find entity set of that collection
                    const entitySetActionReturnSet = builder.getEntityTypeEntitySet(entitySetFunction.returnCollectionType);
                    // and format metadata url hash
                    if (entitySetActionReturnSet) {
                        metadataUrl.hash = `${entitySetActionReturnSet.name}`; // e.g. $metadata#People
                    } else {
                        metadataUrl.hash = `Collection(${entitySetFunction.returnCollectionType})`; // e.g. $metadata#Collection(String)
                    }
                }
            }
            if (typeof metadataUrl.hash === 'undefined') {
                metadataUrl.hash = `${req.params.entitySet}${req.params.entitySetFunction}`;
            }
        // entity set action
        } else if (req.route && req.route.path === '/:entitySet/:entitySetAction') {
            // get current entity set
            const entitySet = builder.getEntitySet(req.params.entitySet);
            // get current entity set collection
            const collection = entitySet && entitySet.entityType && entitySet.entityType.collection;
            if (collection) {
                /**
                 * get action
                 * @type {import('@themost/data').ActionConfiguration}
                 */
                const entitySetAction = collection.hasAction(req.params.entitySetAction);
                // if action returns only one item
                if (entitySetAction && entitySetAction.returnType) {
                    // try to find entity set of that item
                    const entitySetActionReturnSet = builder.getEntityTypeEntitySet(entitySetAction.returnType);
                    // and format metadata url hash
                    if (entitySetActionReturnSet) {
                        metadataUrl.hash = `${entitySetActionReturnSet.name}/entity`; // e.g. $metadata#People/entity
                    } else {
                        metadataUrl.hash = `${entitySetAction.returnType}`; // e.g. $metadata#String
                    }
                }
                // if action returns a collection
                else
                if (entitySetAction && entitySetAction.returnCollectionType) {
                    // try to find entity set of that collection
                    const entitySetActionReturnSet = builder.getEntityTypeEntitySet(entitySetAction.returnCollectionType);
                    // and format metadata url hash
                    if (entitySetActionReturnSet) {
                        metadataUrl.hash = `${entitySetActionReturnSet.name}`; // e.g. $metadata#People
                    } else {
                        metadataUrl.hash = `Collection(${entitySetAction.returnCollectionType})`; // e.g. $metadata#Collection(String)
                    }
                }
            }
            if (typeof metadataUrl.hash === 'undefined') {
                metadataUrl.hash = `${req.params.entitySet}/${req.params.entitySetAction}`;
            }
        } 
        return {
            '@odata.context': metadataUrl.toString(),
        }
    }
}

export {
    AppendAttribute,
    AppendContextAttribute
}