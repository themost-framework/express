import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let Thing = require('./thing-model');
/**
 * @class
 
 * @property {number} id
 * @property {Place} containedIn
 * @property {GeoCoordinates|any} geo
 * @property {string} map
 * @property {Array<ImageObject|any>} photos
 * @augments {DataObject}
 */
@EdmMapping.entityType('Place')
class Place extends Thing {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = Place;