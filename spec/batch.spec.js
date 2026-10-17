import express from 'express';
import {ExpressDataApplication, batch} from '@themost/express';
import path from 'path';
import fs from 'fs';
import {dateReviver} from '@themost/express';
import passport from 'passport';
import {serviceRouter} from '@themost/express';
import {TestPassportStrategy} from './passport';
import request from 'supertest';
import {finalizeDataApplication, jsonErrorHandler} from './utils';
import {DataConfigurationStrategy} from '@themost/data';

describe('Batch', () => {
    let app;
    let passportStrategy = new TestPassportStrategy();
    beforeAll(() => {
        app = express();
        // create a new instance of data application
        const dataApplication= new ExpressDataApplication(path.resolve(__dirname, 'test/config'));
        const dataConfiguration = dataApplication.configuration.getStrategy(DataConfigurationStrategy);
        const adapter = dataConfiguration.adapters.find((adapter) => adapter.default);
        if (adapter) {
            // copy test database to a temporary location to avoid conflicts between tests
            fs.copyFileSync(path.resolve(process.cwd(), adapter.options.database), path.resolve(process.cwd(), 'spec/test/db/test.db'));
            // update adapter configuration to use the temporary database
            adapter.options.database = path.resolve(process.cwd(), 'spec/test/db/test.db');
        }
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
        // test routes which do not use res.json()
        app.delete('/api/TestNoContent', (req, res) => res.sendStatus(204));
        app.get('/api/TestText', (req, res) => res.type('text/plain').send('hello'));
        app.get('/api/TestHeaders', (req, res) => res.json({ accept: req.get('accept'), language: req.get('accept-language') }));
        app.get('/api/TestBinary', (req, res) => {
            res.type('application/octet-stream');
            res.write(Buffer.from([1, 2]));
            res.end(Buffer.from([3]));
        });
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
        const testRequest = request(app).post('/api/$batch');
        let response = await testRequest
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
        const testRequest = request(app).post('/api/$batch');
        let response = await testRequest
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
                        url: '/api/groups'
                    }
                ]
            });
        expect(response.status).toEqual(400);
        expect(response.body.name).toEqual('HttpBadRequestError');
    });

    it('should more than one atomicity groups', async () => {
        const mock = jest.spyOn(passportStrategy, 'getUser');
        mock.mockImplementation(() => {
            return {
                name: 'alexis.rees@example.com'
            };
        });
        const testRequest = request(app).post('/api/$batch');
        let response = await testRequest
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
                        url: '/api/groups'
                    },
                    {
                        id: '3',
                        method: 'GET',
                        atomicityGroup: 'group2',
                        url: '/api/orders'
                    }
                ]
            });
        expect(response.status).toEqual(200);
        /**
         * @type {{responses: {status: number, body: *}[]}}
         */
        const { responses } = response.body;
        expect(responses).toHaveLength(3);
        for (const  response of responses) {
            expect(response.status).toEqual(200);
        }
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
                        url: '/api/groups?$select=name,alternateName'
                    }
                ]
            });
        expect(response.status).toEqual(200);
    });

    it('should execute requests and validate absolute urls', async () => {
        const mock = jest.spyOn(passportStrategy, 'getUser');
        mock.mockImplementation(() => {
            return {
                name: 'alexis.rees@example.com'
            };
        });
        const testRequest = request(app).post('/api/$batch');
        let response = await testRequest
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
                        url: '/api/groups?$select=name,alternateName'
                    }
                ]
            });
        expect(response.status).toEqual(200);
        for(const r of response.body.responses) {
            expect(r.body).toBeDefined();
            expect(r.status).toEqual(200);
        }
    });

    it('should rollback transaction for atomicity groups', async () => {
        const mock = jest.spyOn(passportStrategy, 'getUser');
        mock.mockImplementation(() => {
            return {
                name: 'alexis.rees@example.com'
            };
        });
        let response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    {
                        id: '1',
                        method: 'POST',
                        atomicityGroup: 'create-user',
                        url: '/api/users',
                        body: {
                            name: 'Test User',
                            alternateName: 'test100@example.com'
                        }
                    },
                    {
                        id: '2',
                        method: 'GET',
                        atomicityGroup: 'create-user',
                        url: '/api/NonExistingEndpoint'
                    },
                    {
                        id: '3',
                        method: 'GET',
                        atomicityGroup: 'get-user',
                        url: '/api/users?$filter=alternateName eq \'test100@example.com\'',
                    },
                ]
            });
        expect(response.status).toEqual(200);
        const lastResponse = response.body.responses.find(r => r.id === '3');
        expect(lastResponse).toBeDefined();
        expect(lastResponse.status).toEqual(200);
        expect(lastResponse.body.value).toBeInstanceOf(Array);
        expect(lastResponse.body.value.length).toEqual(0);
    });

    it('should commit transaction for atomicity groups', async () => {
        const mock = jest.spyOn(passportStrategy, 'getUser');
        mock.mockImplementation(() => {
            return {
                name: 'alexis.rees@example.com'
            };
        });
        let response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    {
                        id: '1',
                        method: 'POST',
                        atomicityGroup: 'create-customer',
                        url: '/api/people',
                        body: {
                            name: 'Test Customer',
                            givenName: 'Test',
                            familyName: 'Customer',
                        }
                    },
                    {
                        id: '2',
                        method: 'POST',
                        atomicityGroup: 'create-order',
                        url: '/api/orders',
                        body: {
                            orderedItem: {
                                name: 'Apple MacBook Air (13.3-inch, 2013 Version)',
                            },
                            customer: {
                                givenName: 'Test',
                                familyName: 'Customer',
                            }
                        }
                    }
                ]
            });
        expect(response.status).toEqual(200);
        for(const r of response.body.responses) {
            expect(r.body).toBeDefined();
            expect(r.status).toEqual(200);
        }
    });

    it('should use params from a previous request', async () => {
        const mock = jest.spyOn(passportStrategy, 'getUser');
        mock.mockImplementation(() => {
            return {
                name: 'alexis.rees@example.com'
            };
        });
        let response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    {
                        id: '1',
                        method: 'POST',
                        atomicityGroup: 'create-customer',
                        url: '/api/people',
                        body: {
                            name: 'Test Customer',
                            givenName: 'Test',
                            familyName: 'Customer',
                        }
                    },
                    {
                        id: '2',
                        method: 'POST',
                        atomicityGroup: 'create-order',
                        url: '/api/orders',
                        body: {
                            orderedItem: {
                                name: 'Apple MacBook Air (13.3-inch, 2013 Version)',
                            },
                            customer: '$$1.id'
                        }
                    }
                ]
            });
        expect(response.status).toEqual(200);
        for(const r of response.body.responses) {
            expect(r.body).toBeDefined();
            expect(r.status).toEqual(200);
        }
    });

    it('should use property references', async () => {
        const mock = jest.spyOn(passportStrategy, 'getUser');
        mock.mockImplementation(() => {
            return {
                name: 'alexis.rees@example.com'
            };
        });
        let response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    {
                        id: '1',
                        method: 'POST',
                        atomicityGroup: 'create-order',
                        url: '/api/people',
                        body: {
                            name: 'Test Customer',
                            givenName: 'Test',
                            familyName: 'Customer',
                        }
                    },
                    {
                        id: '2',
                        method: 'POST',
                        atomicityGroup: 'create-order',
                        url: '/api/orders',
                        body: {
                            orderedItem: {
                                name: 'Apple MacBook Air (13.3-inch, 2013 Version)',
                            },
                            customer: '$$1.id'
                        }
                    }
                ]
            });
        expect(response.status).toEqual(200);
        for(const r of response.body.responses) {
            expect(r.body).toBeDefined();
            expect(r.status).toEqual(200);
        }
    });


    it('should capture responses which do not use res.json()', async () => {
        jest.spyOn(passportStrategy, 'getUser').mockImplementation(() => {
            return { name: 'alexis.rees@example.com' };
        });
        const response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    { id: '1', method: 'DELETE', url: '/api/TestNoContent' },
                    { id: '2', method: 'GET', url: '/api/TestText' },
                    { id: '3', method: 'GET', url: '/api/TestBinary' }
                ]
            });
        expect(response.status).toEqual(200);
        const [noContent, text, binary] = response.body.responses;
        expect(noContent.status).toEqual(204);
        expect(text.status).toEqual(200);
        expect(text.body).toEqual('hello');
        expect(binary.body).toEqual(Buffer.from([1, 2, 3]).toString('base64'));
    });

    it('should reject nested batch requests', async () => {
        jest.spyOn(passportStrategy, 'getUser').mockImplementation(() => {
            return { name: 'alexis.rees@example.com' };
        });
        const response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    { id: '1', method: 'GET', url: '/api/users/me' },
                    {
                        id: '2',
                        method: 'POST',
                        url: '/api/$batch',
                        body: {
                            requests: [
                                { id: '1', method: 'GET', url: '/api/users/me' },
                                { id: '2', method: 'GET', url: '/api/users/me' }
                            ]
                        }
                    }
                ]
            });
        expect(response.status).toEqual(200);
        const nested = response.body.responses.find(r => r.id === '2');
        expect(nested.status).toEqual(400);
    });

    it('should not include error stack in production', async () => {
        jest.spyOn(passportStrategy, 'getUser').mockImplementation(() => {
            return { name: 'alexis.rees@example.com' };
        });
        const env = app.get('env');
        app.set('env', 'production');
        try {
            const response = await request(app).post('/api/$batch')
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .send({
                    requests: [
                        { id: '1', method: 'GET', url: '/api/users/me' },
                        { id: '2', method: 'GET', url: '/api/NonExistingEndpoint' }
                    ]
                });
            expect(response.status).toEqual(200);
            const failed = response.body.responses.find(r => r.id === '2');
            expect(failed.status).toEqual(404);
            expect(failed.body.stack).toBeUndefined();
        } finally {
            app.set('env', env);
        }
    });

    it('should report invalid property references and clear rolled back responses', async () => {
        jest.spyOn(passportStrategy, 'getUser').mockImplementation(() => {
            return { name: 'alexis.rees@example.com' };
        });
        const response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    {
                        id: '1',
                        method: 'POST',
                        atomicityGroup: 'create-user',
                        url: '/api/users',
                        body: {
                            name: 'Test User 101',
                            alternateName: 'test101@example.com'
                        }
                    },
                    {
                        id: '2',
                        method: 'POST',
                        atomicityGroup: 'create-user',
                        url: '/api/groups',
                        body: {
                            name: '$$missing.name'
                        }
                    }
                ]
            });
        expect(response.status).toEqual(200);
        const [created, failed] = response.body.responses;
        expect(created.status).toEqual(0);
        expect(created.body).toBeUndefined();
        expect(failed.status).toEqual(400);
        expect(failed.body.message).toContain('missing');
    });


    it('should accept content type with charset and reject other content types', async () => {
        jest.spyOn(passportStrategy, 'getUser').mockImplementation(() => {
            return { name: 'alexis.rees@example.com' };
        });
        let response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json; charset=utf-8')
            .set('Accept', 'application/json')
            .send(JSON.stringify({
                requests: [
                    { id: '1', method: 'GET', url: '/api/users/me' },
                    { id: '2', method: 'GET', url: '/api/users/me' }
                ]
            }));
        expect(response.status).toEqual(200);
        response = await request(app).post('/api/$batch')
            .set('Content-Type', 'text/plain')
            .set('Accept', 'application/json')
            .send('requests');
        expect(response.status).toEqual(415);
        response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({ requests: [{ id: '1', method: 'GET', url: '/api/users/me' }] });
        expect(response.status).toEqual(400);
    });

    it('should resolve service root relative urls and validate url', async () => {
        jest.spyOn(passportStrategy, 'getUser').mockImplementation(() => {
            return { name: 'alexis.rees@example.com' };
        });
        let response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    { id: '1', method: 'GET', url: 'users/me' },
                    { id: '2', method: 'GET', url: 'groups?$select=name' }
                ]
            });
        expect(response.status).toEqual(200);
        for (const r of response.body.responses) {
            expect(r.status).toEqual(200);
        }
        response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    { id: '1', method: 'GET' },
                    { id: '2', method: 'GET', url: 'users/me' }
                ]
            });
        expect(response.status).toEqual(400);
    });

    it('should use request headers over inherited headers', async () => {
        jest.spyOn(passportStrategy, 'getUser').mockImplementation(() => {
            return { name: 'alexis.rees@example.com' };
        });
        const response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('Accept-Language', 'en')
            .send({
                requests: [
                    { id: '1', method: 'GET', url: '/api/TestHeaders', headers: { 'Accept-Language': 'el' } },
                    { id: '2', method: 'GET', url: '/api/TestHeaders' }
                ]
            });
        expect(response.status).toEqual(200);
        const [own, inherited] = response.body.responses;
        expect(own.body).toEqual({ accept: 'application/json', language: 'el' });
        expect(inherited.body).toEqual({ accept: 'application/json', language: 'en' });
    });

    it('should accept options without headers', async () => {
        const other = express();
        other.use(express.json());
        other.use('/api/', batch(other, { max: 5 }));
        other.get('/api/TestText', (req, res) => res.type('text/plain').send('hello'));
        const response = await request(other).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .send({
                requests: [
                    { id: '1', method: 'GET', url: 'TestText' },
                    { id: '2', method: 'GET', url: 'TestText' }
                ]
            });
        expect(response.status).toEqual(200);
        expect(response.body.responses.map(r => r.body)).toEqual(['hello', 'hello']);
    });

    it('should not resolve references to requests that have not been executed', async () => {
        jest.spyOn(passportStrategy, 'getUser').mockImplementation(() => {
            return { name: 'alexis.rees@example.com' };
        });
        const response = await request(app).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    { id: '1', method: 'GET', url: '/api/users/me' },
                    { id: '2', method: 'POST', url: '/api/groups', body: { name: '$$3.name' } },
                    { id: '3', method: 'GET', url: '/api/users/me' },
                    { id: '4', method: 'POST', url: '/api/groups', body: { name: '$$5.name' } },
                    { id: '5', method: 'GET', url: '/api/NonExistingEndpoint' },
                    { id: '6', method: 'POST', url: '/api/groups', body: { name: '$$5.name' } }
                ]
            });
        expect(response.status).toEqual(200);
        const byId = (id) => response.body.responses.find(r => r.id === id);
        expect(byId('2').status).toEqual(400);
        expect(byId('3').status).toEqual(200);
        expect(byId('4').status).toEqual(400);
        expect(byId('6').status).toEqual(424);
    });


    it('should prohibit requests outside of the current service', async () => {
        jest.spyOn(passportStrategy, 'getUser').mockImplementation(() => {
            return { name: 'alexis.rees@example.com' };
        });
        const urls = [
            'http://example.com/api/users/me',
            '//example.com/api/users/me',
            '/other/users/me',
            '/api/../other/users/me',
            '../other/users/me',
            '/apiother/users/me'
        ];
        for (const url of urls) {
            const response = await request(app).post('/api/$batch')
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .send({
                    requests: [
                        { id: '1', method: 'GET', url },
                        { id: '2', method: 'GET', url: 'users/me' }
                    ]
                });
            expect(response.status).toEqual(400);
            expect(response.body.message).toContain('outside of the current service');
        }
    });

    it('should allow absolute urls of the current service', async () => {
        jest.spyOn(passportStrategy, 'getUser').mockImplementation(() => {
            return { name: 'alexis.rees@example.com' };
        });
        const testRequest = request(app).post('/api/$batch');
        const response = await testRequest
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                requests: [
                    { id: '1', method: 'GET', url: new URL('/api/users/me', testRequest.url).toString() },
                    { id: '2', method: 'GET', url: '/api/./users/me' }
                ]
            });
        expect(response.status).toEqual(200);
        for (const r of response.body.responses) {
            expect(r.status).toEqual(200);
        }
    });


    it('should prohibit different restricted headers in batch requests', async () => {
        jest.spyOn(passportStrategy, 'getUser').mockImplementation(() => {
            return { name: 'alexis.rees@example.com' };
        });
        for (const header of ['Authorization', 'authorization', 'AUTHORIZATION', 'Cookie', 'cookie']) {
            const response = await request(app).post('/api/$batch')
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .send({
                    requests: [
                        { id: '1', method: 'GET', url: 'users/me', headers: { [header]: 'Bearer another-token' } },
                        { id: '2', method: 'GET', url: 'users/me' }
                    ]
                });
            expect(response.status).toEqual(400);
            expect(response.body.message).toContain(`cannot define a different ${header.toLowerCase()} header`);
        }
    });

    it('should allow restricted headers equal to the original request', async () => {
        const other = express();
        other.use(express.json());
        other.use('/api/', batch(other));
        other.get('/api/TestAuthorization', (req, res) => res.json({ authorization: req.get('authorization'), cookie: req.get('cookie') }));
        const response = await request(other).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Bearer parent-token')
            .set('Cookie', 'sid=parent-session')
            .send({
                requests: [
                    {
                        id: '1',
                        method: 'GET',
                        url: 'TestAuthorization',
                        headers: { Authorization: 'Bearer parent-token', Cookie: 'sid=parent-session' }
                    },
                    { id: '2', method: 'GET', url: 'TestAuthorization' }
                ]
            });
        expect(response.status).toEqual(200);
        for (const r of response.body.responses) {
            expect(r.body).toEqual({ authorization: 'Bearer parent-token', cookie: 'sid=parent-session' });
        }
    });

    it('should always inherit restricted headers', async () => {
        const other = express();
        other.use(express.json());
        // authorization is not included in the inherited headers
        other.use('/api/', batch(other, { headers: ['accept'] }));
        other.get('/api/TestAuthorization', (req, res) => res.json({ authorization: req.get('authorization'), cookie: req.get('cookie') }));
        const response = await request(other).post('/api/$batch')
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Bearer parent-token')
            .set('Cookie', 'sid=parent-session')
            .send({
                requests: [
                    { id: '1', method: 'GET', url: 'TestAuthorization' },
                    { id: '2', method: 'GET', url: 'TestAuthorization' }
                ]
            });
        expect(response.status).toEqual(200);
        for (const r of response.body.responses) {
            expect(r.body).toEqual({ authorization: 'Bearer parent-token', cookie: 'sid=parent-session' });
        }
    });

});
