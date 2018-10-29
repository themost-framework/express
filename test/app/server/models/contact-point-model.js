import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';

/**
 * @class
 
 * @property {number} id
 * @property {*} additionalType
 * @property {string} contactType
 * @property {string} email
 * @property {string} telephone
 * @property {string} faxNumber
 * @augments {DataObject}
 */
@EdmMapping.entityType('ContactPoint')
class ContactPoint extends DataObject {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = ContactPoint;