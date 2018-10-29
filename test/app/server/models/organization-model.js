import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let Party = require('./party-model');
/**
 * @class
 
 * @property {number} id
 * @property {Array<Person|any>} employees
 * @property {Array<Person|any>} founders
 * @property {Date} foundingDate
 * @property {string} legalName
 * @property {Array<Organization>} members
 * @augments {DataObject}
 */
@EdmMapping.entityType('Organization')
class Organization extends Party {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = Organization;