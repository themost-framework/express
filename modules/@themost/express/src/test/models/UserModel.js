const {DataObject, EdmMapping, EdmType} = require('@themost/data');
import fs from 'fs';
import path from 'path';

function readStream(stream) {
    // eslint-disable-next-line no-undef
    return new Promise((resolve, reject) => {
        let buffers = [];
        stream.on('data', (d) => {
            buffers.push(d);
        });
        stream.on('end', () => {
            return resolve(Buffer.concat(buffers));
        });
        stream.on('error', (err) => {
            return reject(err);
        });
    });
}

@EdmMapping.entityType('User')
class User extends DataObject {
    constructor() {
        super();
    }
    @EdmMapping.func('me', 'User')
    static getMe(context) {
        return context.model('User').where('name').equal(context.user.name).getItem();
    }

    @EdmMapping.param('name', EdmType.EdmString, false)
    @EdmMapping.func('active', 'User')
    static getActiveUser(context, name) {
        return context.model('User').where('name').equal(name).getItem();
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

    /**
     *
     * @param {ReadStream} file
     * @returns {{dateCreated: Date}}
     */
    @EdmMapping.param('attributes', 'Object', true, true)
    @EdmMapping.param('file', EdmType.EdmStream, false)
    @EdmMapping.action('uploadAvatar', 'Object')
    async uploadAvatar(file, attributes) {
        const blob = await readStream(file);
        console.log('Content-Type', file.contentType);
        return Object.assign({}, attributes, {
            dateCreated: new Date()
        });
    }

    /**
     * @param {DataContext} context
     * @param {ReadableStream} file
     * @param {*} attributes
     * @returns {{dateCreated: Date}}
     */
    @EdmMapping.param('attributes', 'Object', true, true)
    @EdmMapping.param('file', EdmType.EdmStream, false)
    @EdmMapping.action('uploadTestAvatar', 'Object')
    static async uploadTestAvatar(context, file, attributes) {
        const blob = await readStream(file);
        return Object.assign({}, attributes, {
            dateCreated: new Date()
        });
    }

}
module.exports = User;
