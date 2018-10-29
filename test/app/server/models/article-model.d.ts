import {EdmMapping,EdmType} from '@themost/data/odata';
import CreativeWork = require('./creative-work-model');

/**
 * @class
 */
declare class Article extends CreativeWork {

     
     public id: number; 
     
     /**
      * @description The actual body of the article.
      */
     public articleBody?: string; 
     
     /**
      * @description Articles may belong to one or more 'sections' in a magazine or newspaper, such as Sports, Lifestyle, etc.
      */
     public articleSection?: string; 
     
     /**
      * @description The number of words in the text of the Article.
      */
     public wordCount?: number; 

}

export = Article;