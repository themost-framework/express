var util = require("util");
var DataObject = require("@themost/data/data-object").DataObject;
var defineDecorator = require("@themost/data/odata").defineDecorator;
var EdmMapping = require("@themost/data/odata").EdmMapping;
var Q = require("q");

function User() {
    User.super_.bind(this)();
}
util.inherits(User, DataObject);
User.getMe = function(context) {
    return context.model('User').filter('id eq me()').then(function(q) {
        return Q.resolve(q.prepare());
    });
};
defineDecorator(User, 'getMe', EdmMapping.func("Me", "User"));

module.exports = User;