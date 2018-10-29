import {EdmMapping,EdmType} from '@themost/data/odata';
import CreativeWork = require('./creative-work-model');
import Article = require('./article-model');

/**
 * @class
 */
declare class MediaObject extends CreativeWork {

     
     public id: number; 
     
     /**
      * @description A NewsArticle associated with the Media Object.
      */
     public associatedArticle?: Article|any; 
     
     /**
      * @description The bitrate of the media object.
      */
     public bitrate?: string; 
     
     /**
      * @description File size in (mega/kilo) bytes.
      */
     public contentSize?: string; 
     
     /**
      * @description Actual bytes of the media object, for example the image file or video file. (previous spelling: contentURL)
      */
     public contentUrl?: string; 
     
     /**
      * @description mp3, mpeg4, etc.
      */
     public encodingFormat?: string; 
     
     /**
      * @description Date the content expires and is no longer useful or available. Useful for videos.
      */
     public expires?: Date; 
     
     /**
      * @description Indicates if use of the media require a subscription  (either paid or free).
      */
     public requiresSubscription?: boolean; 
     
     /**
      * @description Date when this media object was uploaded to this site.
      */
     public uploadDate?: Date; 

}

export = MediaObject;