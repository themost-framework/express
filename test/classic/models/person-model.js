var util = require("util");
var DataObject = require("@themost/data/data-object").DataObject;
var defineDecorator = require("@themost/data/odata").defineDecorator;
var EdmMapping = require("@themost/data/odata").EdmMapping;
var Q = require("q");

function Person() {
    Person.super_.bind(this)();
}
util.inherits(Person, DataObject);
Person.getMe = function(context) {
    return context.model('Person').filter('user/id eq me()').then(function(q) {
        return Q.resolve(q.prepare());
    });
};
defineDecorator(Person, 'getMe', EdmMapping.func("Me", Person));

module.exports = Person;