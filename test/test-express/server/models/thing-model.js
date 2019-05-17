import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';

/**
 * @class
 
 * @property {string} sameAs
 * @property {string} url
 * @property {string} image
 * @property {string} additionalType
 * @property {string} name
 * @property {string} identifier
 * @property {string} description
 * @property {string} disambiguatingDescription
 * @property {string} alternateName
 * @property {number} id
 * @property {Date} dateCreated
 * @property {Date} dateModified
 * @property {number} createdBy
 * @property {number} modifiedBy
 * @augments {DataObject}
 */
@EdmMapping.entityType('Thing')
class Thing extends DataObject {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = Thing;