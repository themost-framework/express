import express from 'express';
import {ExpressDataApplication, batch} from '@themost/express';
import path from 'path';
import {dateReviver} from '@themost/express';
import passport from 'passport';
import {serviceRouter} from '@themost/express';
import {TestPassportStrategy} from './passport';
import request from 'supertest';
import {finalizeDataApplication, jsonErrorHandler} from './utils';

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
        // noinspection JSCheckFunctionSignatures
        app.use('/api/', passport.authenticate('bearer', { session: false }), batch(app), serviceRouter);
        app.use(jsonErrorHandler())
    });

    afterAll(async () => {
        const dataApplication = app.get('ExpressDataApplication');
        await finalizeDataApplication(dataApplication);
    });

    it('should execute a batch request', async () => {
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
        expect(userResponse.body).toHaveProperty('name', 'alexis.rees@example.com');
        const usersResponse = responses.find(r => r.id === '2');
        expect(usersResponse).toBeDefined();
        expect(usersResponse.status).toEqual(200);
        expect(usersResponse.body).toHaveProperty('value');
        expect(usersResponse.body.value).toBeInstanceOf(Array);
        expect(usersResponse.body.value.length).toBeGreaterThan(0);
        const user = usersResponse.body.value.find(u => u.name === 'alexis.rees@example.com');
        expect(user).toBeDefined();
    });

    it('should execute a batch request with error', async () => {
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
                        url: '/api/users/me'
                    },
                    {
                        id: '2',
                        method: 'GET',
                        url: '/api/users/me/status'
                    }
                ]
            });
        expect(response.status).toEqual(200);
        const { responses } = response.body;
        expect(responses).toBeDefined();
        expect(responses).toHaveLength(2);
        const userResponse = responses.find(r => r.id === '1');
        expect(userResponse).toBeDefined();
        expect(userResponse.status).toEqual(200);
        const errorResponse = responses.find(r => r.id === '2');
        expect(errorResponse).toBeDefined();
        expect(errorResponse.status).toEqual(500);
        expect(errorResponse.body.message).toEqual('This is a status error');
        expect(errorResponse.body.name).toEqual('Error');

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
                    },
                    {
                        id: '2',
                        method: 'GET',
                        url: '/api/NonExistingEndpoint'
                    }
                ]
            });
        expect(response.status).toEqual(200);
        const { responses } = response.body;
        expect(responses).toHaveLength(2);
        const userResponse = responses.find(r => r.id === '1');
        expect(userResponse).toBeDefined();
        expect(userResponse.status).toEqual(404);
    });

    it('should validate atomicity group', async () => {
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
                        url: '/api/users/me'
                    },
                    {
                        id: '2',
                        method: 'GET',
                        atomicityGroup: 'group1',
                        url: '/api/group'
                    }
                ]
            });
        expect(response.status).toEqual(400);
        expect(response.body.name).toEqual('HttpBadRequestError');
    });

    it('should execute requests with atomicity group', async () => {
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
                        atomicityGroup: 'group1',
                        url: '/api/users/me'
                    },
                    {
                        id: '2',
                        method: 'GET',
                        atomicityGroup: 'group1',
                        url: '/api/group?$select=name,alternateName'
                    }
                ]
            });
        expect(response.status).toEqual(200);
    });

    it('should execute requests and validate relative urls', async () => {
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
                        atomicityGroup: 'group1',
                        url: '/api/users/me'
                    },
                    {
                        id: '2',
                        method: 'GET',
                        atomicityGroup: 'group1',
                        url: 'https://localhost/api/group?$select=name,alternateName'
                    }
                ]
            });
        expect(response.status).toEqual(400);
    });

});
