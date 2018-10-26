
var util = require("util");
var DataObject = require("@themost/data/data-object").DataObject;
var defineDecorator = require("@themost/data/odata").defineDecorator;
var EdmMapping = require("@themost/data/odata").EdmMapping;
var EdmType = require("@themost/data/odata").EdmType;
var Q = require("q");

function Order() {
    Order.super_.bind(this)();
}
util.inherits(Order, DataObject);
Order.getTopProducts = function(context) {
    return context.model('Order')
        .select('orderedItem','count(id) as orderedItemCount')
        .groupBy('orderedItem')
        .orderByDescending('count(id)')
        .take(5);
};
defineDecorator(Order, 'getTopProducts', EdmMapping.func("topProducts", EdmType.CollectionOf("Product")));

module.exports = Order;