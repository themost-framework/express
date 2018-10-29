import {EdmMapping,EdmType} from '@themost/data/odata';
import Thing = require('./thing-model');
import Party = require('./party-model');
import Place = require('./place-model');
import Organization = require('./organization-model');

/**
 * @class
 */
declare class CreativeWork extends Thing {

     
     public id: number; 
     
     /**
      * @description A secondary title of the CreativeWork.
      */
     public alternativeHeadline?: string; 
     
     /**
      * @description The author of this content.
      */
     public author?: Party; 
     
     /**
      * @description A citation or reference to another creative work, such as another publication, web page, scholarly article, etc. NOTE: Candidate for promotion to ScholarlyArticle.
      */
     public citation?: Array<CreativeWork>; 
     
     /**
      * @description The location of the content.
      */
     public contentLocation?: Place; 
     
     /**
      * @description Official rating of a piece of content—for example,'MPAA PG-13'.
      */
     public contentRating?: string; 
     
     /**
      * @description A secondary contributor to the CreativeWork.
      */
     public contributor?: Party; 
     
     /**
      * @description The party holding the legal copyright to the CreativeWork.
      */
     public copyrightHolder?: Party; 
     
     /**
      * @description The year during which the claimed copyright for the CreativeWork was first asserted.
      */
     public copyrightYear?: number; 
     
     /**
      * @description Date of first broadcast/publication.
      */
     public datePublished?: Date; 
     
     /**
      * @description A link to the page containing the comments of the CreativeWork.
      */
     public discussionUrl?: string; 
     
     /**
      * @description Specifies the Person who edited the CreativeWork.
      */
     public editor?: Party; 
     
     /**
      * @description Genre of the creative work
      */
     public genre?: string; 
     
     /**
      * @description Headline of the article
      */
     public headline?: string; 
     
     /**
      * @description The language of the content. please use one of the language codes from the <a href="http://tools.ietf.org/html/bcp47">IETF BCP 47 standard.</a>
      */
     public inLanguage?: string; 
     
     /**
      * @description The keywords/tags used to describe this content.
      */
     public keywords?: string; 
     
     /**
      * @description The publisher of the creative work.
      */
     public publisher?: Party; 
     
     /**
      * @description The Organization on whose behalf the creator was working.
      */
     public sourceOrganization?: Organization; 
     
     /**
      * @description The textual content of this CreativeWork.
      */
     public text?: string; 
     
     /**
      * @description A thumbnail image relevant to the Thing.
      */
     public thumbnailUrl?: string; 
     
     /**
      * @description The version of the CreativeWork embodied by a specified resource.
      */
     public version?: string; 

}

export = CreativeWork;