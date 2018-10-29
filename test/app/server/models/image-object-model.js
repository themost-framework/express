import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let MediaObject = require('./media-object-model');
/**
 * @class
 
 * @property {number} id
 * @augments {DataObject}
 */
@EdmMapping.entityType('ImageObject')
class ImageObject extends MediaObject {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = ImageObject;