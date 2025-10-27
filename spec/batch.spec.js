import express from 'express';
import {ExpressDataApplication} from '@themost/express';
import path from 'path';
import {dateReviver} from '@themost/express';
import passport from 'passport';
import {serviceRouter} from '@themost/express';
import {TestPassportStrategy} from './passport';
import request from 'supertest';
import { finalizeDataApplication } from './utils';

describe('Batch Processing', () => {
    let app;
    let passportStrategy = new TestPassportStrategy();
    beforeAll(() => {
        app = express();
        // create a new instance of data application
        const dataApplication = new ExpressDataApplication(path.resolve(__dirname, 'test/config'));
        app.use(express.json({
            reviver: dateReviver
        }));
        // hold data application
        app.set('ExpressDataApplication', dataApplication);
        // use data middleware (register req.context)
        app.use(dataApplication.middleware(app));
        // use test passport strategy
        // noinspection JSCheckFunctionSignatures
        passport.use(passportStrategy);
        // set testRouter
        // noinspection JSCheckFunctionSignatures
        app.use('/api/', passport.authenticate('bearer', { session: false }), serviceRouter);
    });

    afterAll(async () => {
        const dataApplication = app.get('ExpressDataApplication');
        await finalizeDataApplication(dataApplication);
    });

    it('should post batch request', async () => {
        const mock = jest.spyOn(passportStrategy, 'getUser');
        mock.mockImplementation(() => {
            return {
                name: 'alexis.rees@example.com'
            };
        });
        let response = await request(app)
            .post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    {
                        id: '1',
                        method: 'GET',
                        url: '/users/me'
                    },
                    {
                        id: '2',
                        method: 'GET',
                        url: '/users/active?name=?'
                    }
                ]
            });
        expect(response.status).toEqual(200);
        expect(response.body).toBeTruthy();
    });


});
