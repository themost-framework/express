"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.beforeSave = beforeSave;exports.afterSave = afterSave; /**
                                                                                                                                           * @param {DataEventArgs} event
                                                                                                                                           * @param {Function} callback
                                                                                                                                           */
function beforeSave(event, callback) {
  return callback();
}

/**
   * @param {DataEventArgs} event
   * @param {Function} callback
   */
function afterSave(event, callback) {
  if (event.state === 1 && event.target && event.target.hasOwnProperty('userCredentials')) {
    return event.model.context.model('UserCredential').
    silent().
    insert(Object.assign(event.target.userCredentials, {
      id: event.target.id })).

    then(() => {
      return callback();
    }).
    catch(err => {
      return callback(err);
    });
  }
  return callback();
}
//# sourceMappingURL=set-user-credentials-listener.js.map