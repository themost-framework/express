import {TraceUtils} from '@themost/common';

/**
 * Finalize request context
 * @returns {import('express').RequestHandler}
 */
function finalizeContext() {
    return function(req, res, next) {
        if (req.context) {
            // if db is a disposable adapter
            if (req.context.db && typeof req.context.db.dispose === 'function') {
                // dispose db
                req.context.db.dispose();
            }
            // and finalize data context
            return req.context.finalize((err) => {
                if (err) {
                    TraceUtils.warn('An error occurred while finalizing data context');
                    TraceUtils.warn(err);
                }
                return next();
            });
        }
        return next();
    }
}

function finalizeContextHandler(req, res, next) {
    const finishListener = function() {
        return finalizeContext()(req, res, () => {
        });
    };
    res.once('finish', finishListener);
    const closeListener = function() {
        return finalizeContext()(req, res, () => {
        });
    };
    res.once('close', closeListener);
    return next();
}

/**
 * Sets request context
 * @param {import('./context').CreateContextService} app
 * @returns {import('express').RequestHandler}
 */
function setContext(app) {
    return function(req, res, next) {
        // create router context
        const newContext = app.createContext();
        /**
         * try to find if request has already a data context
         * @type {ExpressDataContext|*}
         */
        const interactiveContext = req.context;
        // finalize already assigned context
        if (interactiveContext) {
            if (typeof interactiveContext.finalize === 'function') {
                // finalize interactive context
                return interactiveContext.finalize(() => {
                    // and assign new context
                    Object.defineProperty(req, 'context', {
                        enumerable: false,
                        configurable: true,
                        get: () => {
                            return newContext
                        }
                    });
                    // exit handler
                    return finalizeContextHandler(req, res, () => {
                        return next();
                    });
                });
            }
        }
        // otherwise assign context
        Object.defineProperty(req, 'context', {
            enumerable: false,
            configurable: true,
            get: () => {
                return newContext
            }
        });
        // and exit handler
        return finalizeContextHandler(req, res, () => {
            return next();
        });
    }
}

export {
    setContext,
    finalizeContext
}