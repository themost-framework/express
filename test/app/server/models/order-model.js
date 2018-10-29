import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';

/**
 * @class
 
 * @property {number} id
 * @property {Offer|any} acceptedOffer
 * @property {PostalAddress|any} billingAddress
 * @property {Person|any} customer
 * @property {number} discount
 * @property {string} discountCode
 * @property {string} discountCurrency
 * @property {boolean} isGift
 * @property {Party|any} merchant
 * @property {Date} orderDate
 * @property {Product|any} orderedItem
 * @property {string} orderNumber
 * @property {OrderStatus|any} orderStatus
 * @property {Date} paymentDue
 * @property {PaymentMethod|any} paymentMethod
 * @property {string} paymentUrl
 * @property {string} additionalType
 * @property {string} description
 * @property {Date} dateCreated
 * @property {Date} dateModified
 * @property {number} createdBy
 * @property {number} modifiedBy
 * @augments {DataObject}
 */
@EdmMapping.entityType('Order')
class Order extends DataObject {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
    
}
module.exports = Order;