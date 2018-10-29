import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let Thing = require('./thing-model');
/**
 * @class
 
 * @property {number} id
 * @property {string} alternativeHeadline
 * @property {Party} author
 * @property {Array<CreativeWork>} citation
 * @property {Place} contentLocation
 * @property {string} contentRating
 * @property {Party} contributor
 * @property {Party} copyrightHolder
 * @property {number} copyrightYear
 * @property {Date} datePublished
 * @property {string} discussionUrl
 * @property {Party} editor
 * @property {string} genre
 * @property {string} headline
 * @property {string} inLanguage
 * @property {string} keywords
 * @property {Party} publisher
 * @property {Organization} sourceOrganization
 * @property {string} text
 * @property {string} thumbnailUrl
 * @property {string} version
 * @augments {DataObject}
 */
@EdmMapping.entityType('CreativeWork')
class CreativeWork extends Thing {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = CreativeWork;