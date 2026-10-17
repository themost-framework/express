import {ApplicationService} from '@themost/common';
import {ODataModelBuilder} from '@themost/data';
import { get as getProperty, template } from 'lodash';
import {OpenDataQueryFormatter} from '@themost/query';

class ODataEntityId extends ApplicationService {
    constructor(app) {
        super(app);
        this.formatter = new OpenDataQueryFormatter();
        this.template = template('${entitySet}/${key}')
    }

    /**
     *
     * @param {string} entitySet
     * @param {*} entity
     */
    get(entitySet, entity) {
       const builder = this.getApplication().getService(ODataModelBuilder);
       if (builder == null) {
           throw new Error('ODataModelBuilder strategy is not defined in configuration');
       }
       const entitySetObject = builder.getEntitySet(entitySet);
       if (entitySetObject) {
           let entityType = entitySetObject.entityType;
           // noinspection JSUnresolvedReference
           while(entityType.baseType) {
               entityType = builder.getEntity(entityType.baseType);
           }
           // noinspection JSUnresolvedReference
           if (entityType.key && entityType.key.propertyRef && entityType.key.propertyRef.length === 1) {
               // noinspection JSUnresolvedReference
               const [propertyRef] = entityType.key.propertyRef;
               const key = getProperty(entity, propertyRef.name);
               if (typeof key !== 'undefined') {
                   const value = this.formatter.escape(key);
                   return  this.template({
                       entitySet: entitySetObject.name,
                       key: value,
                   });
               }
           }
       }
    }
}

export {
    ODataEntityId
}