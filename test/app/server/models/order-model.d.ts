import {EdmMapping,EdmType} from '@themost/data/odata';

import {DataObject} from '@themost/data/data-object';import Offer = require('./offer-model');
import PostalAddress = require('./postal-address-model');
import Person = require('./person-model');
import Party = require('./party-model');
import Product = require('./product-model');
import OrderStatus = require('./order-status-model');
import PaymentMethod = require('./payment-method-model');

/**
 * @class
 */
declare class Order extends DataObject {

     
     public id: number; 
     
     /**
      * @description The offer e.g. product included in the order.
      */
     public acceptedOffer?: Offer|any; 
     
     /**
      * @description The billing address for the order.
      */
     public billingAddress?: PostalAddress|any; 
     
     /**
      * @description Party placing the order.
      */
     public customer?: Person|any; 
     
     /**
      * @description Any discount applied (to an Order).
      */
     public discount?: number; 
     
     /**
      * @description Code used to redeem a discount.
      */
     public discountCode?: string; 
     
     /**
      * @description The currency (in 3-letter ISO 4217 format) of the discount.
      */
     public discountCurrency?: string; 
     
     /**
      * @description Was the offer accepted as a gift for someone other than the buyer.
      */
     public isGift?: boolean; 
     
     /**
      * @description The party taking the order (e.g. Amazon.com is a merchant for many sellers).
      */
     public merchant?: Party|any; 
     
     /**
      * @description Date order was placed.
      */
     public orderDate?: Date; 
     
     /**
      * @description The item ordered.
      */
     public orderedItem?: Product|any; 
     
     /**
      * @description The identifier of the transaction.
      */
     public orderNumber?: string; 
     
     /**
      * @description The current status of the order.
      */
     public orderStatus?: OrderStatus|any; 
     
     /**
      * @description The date that payment is due.
      */
     public paymentDue?: Date; 
     
     /**
      * @description The name of the credit card or other method of payment for the order.
      */
     public paymentMethod?: PaymentMethod|any; 
     
     /**
      * @description The URL for sending a payment.
      */
     public paymentUrl?: string; 
     
     /**
      * @description An additional type for the item, typically used for adding more specific types from external vocabularies in microdata syntax. This is a relationship between something and a class that the thing is in. In RDFa syntax, it is better to use the native RDFa syntax - the 'typeof' attribute - for multiple types. Schema.org tools may have only weaker understanding of extra types, in particular those defined externally.
      */
     public additionalType?: string; 
     
     /**
      * @description A short description of the item.
      */
     public description?: string; 
     
     /**
      * @description The date on which this item was created.
      */
     public dateCreated?: Date; 
     
     /**
      * @description The date on which this item was most recently modified.
      */
     public dateModified?: Date; 
     
     /**
      * @description Created by user.
      */
     public createdBy?: number; 
     
     /**
      * @description Modified by user.
      */
     public modifiedBy?: number; 

}

export = Order;