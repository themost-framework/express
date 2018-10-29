import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let CreativeWork = require('./creative-work-model');
/**
 * @class
 
 * @property {number} id
 * @property {Article|any} associatedArticle
 * @property {string} bitrate
 * @property {string} contentSize
 * @property {string} contentUrl
 * @property {string} encodingFormat
 * @property {Date} expires
 * @property {boolean} requiresSubscription
 * @property {Date} uploadDate
 * @augments {DataObject}
 */
@EdmMapping.entityType('MediaObject')
class MediaObject extends CreativeWork {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = MediaObject;