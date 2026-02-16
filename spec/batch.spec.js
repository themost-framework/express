import express from 'express';
import {ExpressDataApplication, batch} from '@themost/express';
import path from 'path';
import {dateReviver} from '@themost/express';
import passport from 'passport';
import {serviceRouter} from '@themost/express';
import {TestPassportStrategy} from './passport';
import request from 'supertest';
import { finalizeDataApplication } from './utils';

describe('Batch', () => {
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
        // use batch middleware
        app.use('/api/', batch(app));
        // noinspection JSCheckFunctionSignatures
        app.use('/api/', passport.authenticate('bearer', { session: false }), serviceRouter);
    });

    afterAll(async () => {
        const dataApplication = app.get('ExpressDataApplication');
        await finalizeDataApplication(dataApplication);
    });

    it('should execute a batch request', async () => {
        let response = await request(app)
            .post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
        .send({
            requests: [
                {
                    id: '1',
                    method: 'GET',
                    url: '/api/users/me'
                },
                {
                    id: '2',
                    method: 'GET',
                    url: '/api/users/?$filter=groups/name eq \'Administrators\''
                }
            ]
        });
        expect(response.status).toEqual(200);
        const { responses } = response.body;
        expect(responses).toHaveLength(2);
        const userResponse = responses.find(r => r.id === '1');
        expect(userResponse).toBeDefined();
        expect(userResponse.status).toEqual(200);
        expect(userResponse.body).toHaveProperty('name', 'anonymous');
    });


    it('should execute a batch request with a non-existing endpoint', async () => {
        let response = await request(app)
            .post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    {
                        id: '1',
                        method: 'GET',
                        url: '/api/NonExistingEndpoint'
                    }
                ]
            });
        expect(response.status).toEqual(200);
        const { responses } = response.body;
        expect(responses).toHaveLength(1);
        const userResponse = responses.find(r => r.id === '1');
        expect(userResponse).toBeDefined();
        expect(userResponse.status).toEqual(404);
    });

});
