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

export {
    finalizeDataApplication
}