/**
 * @param {import('Express').Router} router
 * @returns {import('express').RequestHandler}
 */
function batch(router) {
    return async function(req, res, next) {
        try {
            /**
             * @type {Array<import('./batch').BatchRequestMessage>}
             */
            const requests = (req.body && req.body.requests) || [];
            for (const request of requests) {
                request.headers = request.headers || {};
                const authorization = req.headers['authorization'];
                Object.assign(request.headers, {
                    authorization
                });
                const uri = new URL(request.url, req.protocol + '://' + req.get('host'));
                const subReq = req.clone();
            }

        } catch (e) {
            next(e);
        }
    }
}

export {
    batch
}