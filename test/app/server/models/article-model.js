import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let CreativeWork = require('./creative-work-model');
/**
 * @class
 
 * @property {number} id
 * @property {string} articleBody
 * @property {string} articleSection
 * @property {number} wordCount
 * @augments {DataObject}
 */
@EdmMapping.entityType('Article')
class Article extends CreativeWork {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = Article;