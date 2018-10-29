import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let Account = require('./account-model');
/**
 * @class
 
 * @property {number} id
 * @property {Date} lockoutTime
 * @property {number} logonCount
 * @property {boolean} enabled
 * @property {Date} lastLogon
 * @property {Array<Group|any>} groups
 * @augments {DataObject}
 */
@EdmMapping.entityType('User')
class User extends Account {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = User;