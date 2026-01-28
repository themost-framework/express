import {setContext, ExpressDataApplication, ExpressDataContext} from '@themost/express';
import express from 'express';
import path from 'path';
import request from 'supertest';
import {finalizeDataApplication} from './utils';


describe('setContext middleware', () => {
    function createReq() {
        const listeners = {};
        return {
            once: (ev, cb) => {
                listeners[ev] = listeners[ev] || [];
                listeners[ev].push(cb);
            },
            emit: (ev) => {
                (listeners[ev] || []).forEach(cb => cb());
            },
            removeListener: (ev, cb) => {
                if (listeners[ev]) {
                    listeners[ev] = listeners[ev].filter(x => x !== cb);
                }
            }
        };
    }

    function createRes() {
        const listeners = {};
        return {
            once: (ev, cb) => {
                listeners[ev] = listeners[ev] || [];
                listeners[ev].push(cb);
            },
            emit: (ev) => {
                (listeners[ev] || []).forEach(cb => cb());
            },
            removeListener: (ev, cb) => {
                if (listeners[ev]) {
                    listeners[ev] = listeners[ev].filter(x => x !== cb);
                }
            }
        };
    }

    it('assigns new context when none exists and finalizes on end', done => {
        const req = createReq();
        const res = createRes();
        const newContext = { finalize: jest.fn(cb => cb()) };
        const app = { createContext: jest.fn(() => newContext) };

        const mw = setContext(app);
        mw(req, res, () => {
            expect(req.context).toBe(newContext);

            // trigger end -> should call newContext.finalize
            res.emit('close');
            expect(newContext.finalize).toHaveBeenCalled();
            done();
        });
    });

    it('finalizes existing context then assigns new one and finalizes it on end', done => {
        const req = createReq();
        const res = createRes();
        const oldContext = { finalize: jest.fn(cb => cb()) };
        Object.defineProperty(req, 'context', {
            enumerable: false,
            configurable: true,
            get: () => oldContext
        });

        const newContext = { finalize: jest.fn(cb => cb()) };
        const app = { createContext: jest.fn(() => newContext) };

        const mw = setContext(app);
        mw(req, res, () => {
            // old context should have been finalized first
            expect(oldContext.finalize).toHaveBeenCalled();

            // context should be replaced with newContext
            expect(req.context).toBe(newContext);

            // trigger end -> should call newContext.finalize
            res.emit('finish');
            expect(newContext.finalize).toHaveBeenCalled();
            done();
        });
    });

    it('should use setContext with express app', async () => {
       const app = express();
       const service = new ExpressDataApplication(path.resolve(__dirname, 'test/config'));
       app.use(setContext(service));
       app.get('/services/products', (req, res) => {
          return req.context.model('Product').getItems().then(items => {
                res.json(items);
          });
       });
       const spy = jest.spyOn(ExpressDataContext.prototype, 'finalize');
       const response = await request(app)
            .get('/services/products')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        await finalizeDataApplication(service);
        expect(spy).toHaveBeenCalled();
        expect(response.status).toBe(200);
    });

});