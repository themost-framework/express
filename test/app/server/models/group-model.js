import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let Account = require('./account-model');
/**
 * @class
 
 * @property {number} id
 * @property {Array<User|any>} members
 * @property {Array<string>} tags
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