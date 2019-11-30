const {DataObject, EdmMapping, EdmType} = require('@themost/data');
@EdmMapping.entityType('User')
class User extends DataObject {
    constructor() {
        super();
    }
    @EdmMapping.func('me', 'User')
    static getMe(context) {
        return context.model('User').where('name').equal(context.user.name).getItem();
    }
}
module.exports = User;
