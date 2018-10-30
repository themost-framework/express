import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let Party = require('./party-model');
let Order = require('./order-model');
/**
 * @class
 
 * @property {number} id
 * @property {User|any} user
 * @property {string} additionalName
 * @property {Organization|any} affiliation
 * @property {Date} birthDate
 * @property {Array<Person>} children
 * @property {PostalAddress|any} address
 * @property {Array<Person>} colleagues
 * @property {string} familyName
 * @property {Array<Person>} follows
 * @property {string} gender
 * @property {string} givenName
 * @property {string} jobTitle
 * @property {string} email
 * @property {Array<Person>} knows
 * @property {Array<Organization|any>} memberOf
 * @property {Country|any} nationality
 * @property {Array<Person>} parents
 * @property {Array<Person>} relatedTo
 * @property {Person} spouse
 * @property {Array<Organization|any>} worksFor
 * @augments {DataObject}
 */
@EdmMapping.entityType('Person')
class Person extends Party {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
    
    @EdmMapping.func("Me", "Person")
    static getMe(context) {
        return context.model('Person').filter('user eq me()').then(q => {
           return Promise.resolve(q); 
        });
    }
    
    @EdmMapping.func("LastOrder", Order)
    getLastOrder() {
        return this.context.model('Order')
            .where('customer').equal(this.id)
            .orderByDescending('orderDate');
    }
    
    @EdmMapping.param('order', Order, false, true)
    @EdmMapping.action("LastOrder", Order)
    setLastOrder(order) {
        //do nothing
        return this.context.model('Order')
            .where('customer').equal(this.id)
            .orderByDescending('orderDate');
    }
    
}
module.exports = Person;