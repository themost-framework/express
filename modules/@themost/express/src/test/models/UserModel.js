const {DataObject, EdmMapping, EdmType} = require('@themost/data');
import fs from 'fs';
import path from 'path';
@EdmMapping.entityType('User')
class User extends DataObject {
    constructor() {
        super();
    }
    @EdmMapping.func('me', 'User')
    static getMe(context) {
        return context.model('User').where('name').equal(context.user.name).getItem();
    }

    @EdmMapping.func('avatar', EdmType.EdmStream)
    getAvatar() {
        const stream = fs.createReadStream(path.resolve(__dirname, 'avatars/avatar1.png'));
        stream.contentType = 'image/png';
        return stream;
    }
    @EdmMapping.action('anotherAvatar', EdmType.EdmStream)
    getAnotherAvatar() {
        const stream = fs.createReadStream(path.resolve(__dirname, 'avatars/avatar1.png'));
        stream.contentLocation = '/another/avatar/location';
        return stream;
    }
}
module.exports = User;
