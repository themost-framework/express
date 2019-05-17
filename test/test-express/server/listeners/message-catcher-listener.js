/**
 * @param {DataEventArgs} event
 * @param {Function} callback
 */
export function beforeSave(event, callback) {
    return callback();
}

/**
 * @param {DataEventArgs} event
 * @param {Function} callback
 */
export function afterSave(event, callback) {
    const context = event.model.context;
    if (event.state !== 1) {
        return callback();
    }
    if (event.target.$receiving) {
        return callback();
    }
    /**
     *
     * @type {UserMessage|*}
     */
    const target = event.target;
    //update other mailboxes (to,cc,bcc)
    const recipients = [];
    if (target.recipient) {
        target.recipient.split(';').forEach(function (x) {
            if (x.length > 0) {
                if (recipients.indexOf(x) < 0) {
                    recipients.push(x);
                }
            }
        });
    }
    if (target.cc) {
        target.cc.split(';').forEach(function (x) {
            if (x.length > 0) {
                if (recipients.indexOf(x) < 0) {
                    recipients.push(x);
                }
            }
        });
    }
    if (target.bcc) {
        target.bcc.split(';').forEach(function (x) {
            if (x.length > 0) {
                if (recipients.indexOf(x) < 0) {
                    recipients.push(x);
                }
            }
        });
    }
    return context.model('Person').where('email').in(recipients)
        .select('user')
        .flatten()
        .silent().getAllItems().then(users => {
            const messages = users.map(user => {
                const message = Object.assign({}, event.target);
                // remove id
                delete message.id;
                // remove bcc
                delete message.bcc;
                // set owner
                message.owner = user;
                // set receiving flag
                message.$receiving = true;
            });
            return context.model('UserMessage').silent().save(messages);
        }).then( () => {
            return callback();
        }).catch(err => {
            return callback(err);
        });
}
