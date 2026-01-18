const {DataObject, EdmMapping, EdmType} = require('@themost/data');
import fs from 'fs';
import path from 'path';
import os from 'os';

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
        // eslint-disable-next-line no-unused-vars
        const blob = await readStream(file);
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
    @EdmMapping.param('file', EdmType.EdmStream, true)
    @EdmMapping.action('uploadTestAvatar', 'Object')
    static async uploadTestAvatar(context, file, attributes) {
        // eslint-disable-next-line no-unused-vars
        const blob = await readStream(file);
        return Object.assign({}, attributes, {
            dateCreated: new Date()
        });
    }

    @EdmMapping.func('emptyContent', 'Object')
    getEmptyContent() {
        return null;
    }

    @EdmMapping.func('emptyPerson', 'Person')
    async getEmptyPerson() {
        return this.context.model('Person').where('id').equal(0).getItem();
    }

    @EdmMapping.func('queryEmptyPerson', 'Person')
    async getQueryEmptyPerson() {
        return this.context.model('Person').where('id').equal(0);
    }

    @EdmMapping.func('staticEmptyContent', 'Object')
    // eslint-disable-next-line no-unused-vars
    static getStaticEmptyContent(context) {
        return null;
    }

    @EdmMapping.func('staticEmptyPerson', 'Person')
    static getStaticEmptyPerson(context) {
        return context.model('Person').where('id').equal(0).getItem();
    }

    @EdmMapping.func('staticQueryEmptyPerson', 'Person')
    static getStaticQueryEmptyPerson(context) {
        return context.model('Person').where('id').equal(0);
    }

    @EdmMapping.param('message', EdmType.EdmString, false)
    @EdmMapping.action('emptyContent', 'Object')
    // eslint-disable-next-line no-unused-vars
    postEmptyContent(message) {
        return null;
    }

    @EdmMapping.param('message', EdmType.EdmString, false)
    @EdmMapping.action('staticEmptyContent', 'Object')
    // eslint-disable-next-line no-unused-vars
    static staticPostEmptyContent(context, message) {
        return null;
    }

}
module.exports = User;
