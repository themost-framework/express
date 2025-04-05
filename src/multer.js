import multer from 'multer';
import path from 'path';
import os from 'os';
/**
 * @params {multer.Options=} options
 * Returns an instance of multer that is configured based on application configuration
 * @returns {multer.Instance}
 */
function multerInstance(options) {
    // set user storage from configuration or use default content folder content/user
    const userContentRoot = path.resolve(os.tmpdir(), 'userContent');
    return multer(Object.assign({ 
        dest: userContentRoot 
    }, options));
}

export {multerInstance}
