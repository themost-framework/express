import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let Account = require('./account-model');
/**
 * @class
 
 * @property {Array<Account|any>} members
 * @property {number} id
 * @augments {DataObject}
 */
@EdmMapping.entityType('Group')
class Group extends Account {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = Group;