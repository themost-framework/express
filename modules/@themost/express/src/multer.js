import multer from "multer";
import path from 'path';
import os from 'os';
/**
 * Returns an instance of multer that is configured based on application configuration
 * @returns {multer.Instance}
 */
function multerInstance() {
    // set user storage from configuration or use default content folder content/user
    const userContentRoot = path.resolve(os.tmpdir(), 'userContent');
    return multer({ dest: userContentRoot });
}

export {multerInstance}
