import { DataCacheStrategy } from '@themost/data';
/**
 *
 * @param {import('@themost/express').ExpressDataApplication} dataApplication
 * @returns {Promise<void>}
 */
async function finalizeDataApplication(dataApplication) {
    if (dataApplication) {
      const service = dataApplication.getConfiguration().getStrategy(DataCacheStrategy);
      if (typeof service.finalize === 'function') {
        await service.finalize();
      }
    }
  }

function jsonErrorHandler() {
    return (err, req, res, next) => {
        if (res.headersSent) {
            return next(err)
        }
        const isDevOrTest = req.app.get('env') === 'development' || req.app.get('env') === 'test';
        if (req.get('accept') === 'application/json') {
            // get error object
            const error = Object.getOwnPropertyNames(err).filter((key) => {
                return key !== 'stack' || (key === 'stack' && isDevOrTest);
            }).reduce((acc, key) => {
                acc[key] = err[key];
                return acc;
            }, {});
            const proto = Object.getPrototypeOf(err);
            if (proto && proto.constructor && proto.constructor.name) {
                error.name = proto.constructor.name;
            }
            // return error as json
            return res.status(err.status || err.statusCode || 500).json(error);
        }
        return next(err);
    }
}

export {
    finalizeDataApplication,
    jsonErrorHandler
}