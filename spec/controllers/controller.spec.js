import path from 'path';
import express from 'express';
import request from 'supertest';
import {ExpressDataApplication, ExpressDataContext} from '@themost/express';
import {
    RouterService,
    HttpController,
    HttpConsumer,
    HttpNextResult,
    controllerRouter,
    httpController,
    httpGet,
    httpPost,
    httpAny,
    httpAction,
    httpRoute,
    httpParam,
    httpParamAlias,
    httpAuthorize,
    httpActionConsumer
} from '@themost/express/controllers';
import {finalizeDataApplication} from '../utils';

@httpController('hello')
class HelloController extends HttpController {
    constructor() {
        super();
    }

    @httpGet({
        name: 'index',
        params: [
            {
                name: 'message',
                maxLength: 12
            }
        ]
    })
    index(message) {
        return this.content(message || 'Hello World');
    }

    @httpGet()
    @httpAction('me')
    getMe() {
        return this.json({
            name: this.context.user ? this.context.user.name : 'anonymous'
        });
    }

    @httpGet()
    @httpParam({
        name: 'value',
        type: 'Integer',
        required: true
    })
    square(value) {
        return {
            value: value * value
        };
    }

    @httpPost()
    @httpParamAlias('body', 'text')
    echo(body) {
        return this.json({
            text: body
        });
    }

    @httpGet()
    @httpAuthorize()
    secret() {
        return 'Secret';
    }

    @httpGet()
    @httpActionConsumer('custom', (context) => {
        context.customConsumer = true;
        return Promise.resolve();
    })
    custom() {
        return this.content(String(this.context.customConsumer));
    }

    @httpGet()
    skip() {
        return new HttpNextResult();
    }

    @httpGet()
    async later() {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return this.json({
            later: true
        });
    }

    @httpGet()
    @httpRoute('/greet/{name:string}')
    greet(name) {
        return this.content(`Hello ${name}`);
    }

    @httpAny()
    @httpRoute('/any')
    anyMethod() {
        return this.content(this.context.request.method);
    }

    @httpGet()
    @httpRoute('/go')
    go() {
        return this.redirect('/hello/index');
    }

    notAnAction() {
        return 'Not an action';
    }
}

describe('HttpController', () => {

    /**
     * @type {ExpressDataApplication}
     */
    let app;
    /**
     * @type {import('express').Express}
     */
    let container;
    beforeAll(() => {
        app = new ExpressDataApplication(path.resolve(__dirname, '../test/config'));
        app.useService(RouterService);
        const routerService = app.getService(RouterService);
        routerService.useController(HelloController);
        routerService.add({
            path: '/:controller/:action'
        });
        container = express();
        container.use(express.json());
        container.use(app.middleware(container));
        container.use(controllerRouter(app));
        container.use((req, res) => {
            return res.status(404).send('Not Found');
        });
        // eslint-disable-next-line no-unused-vars
        container.use((err, req, res, next) => {
            return res.status(err.status || err.statusCode || 500).json({
                message: err.message
            });
        });
    });

    afterAll(async () => {
        await finalizeDataApplication(app);
    });

    it('should have controller decorator', () => {
        expect(HelloController.httpController).toEqual({ name: 'hello' });
    });

    it('should have method decorators', () => {
        const controller = new HelloController();
        expect(controller.index.httpGet).toBeTruthy();
        expect(controller.index.httpAction).toBe('index');
        expect(controller.index.httpParams.message).toBeTruthy();
        expect(controller.index.httpParam).toBeInstanceOf(HttpConsumer);
        expect(controller.getMe.httpAction).toBe('me');
        expect(controller.anyMethod.httpPatch).toBeTruthy();
        expect(controller.secret.authorize).toBeInstanceOf(HttpConsumer);
    });

    it('should register controller', () => {
        const routerService = app.getService(RouterService);
        expect(routerService.getController('hello')).toBe(HelloController);
        expect(routerService.getController('Hello')).toBe(HelloController);
        const route = routerService.routes.find((item) => item.path === '/greet/{name:string}');
        expect(route).toBeTruthy();
        expect(route.controller).toBe(HelloController);
        expect(route.action).toBe('greet');
    });

    it('should run HttpConsumer', async () => {
        const consumer = new HttpConsumer((context, value) => {
            expect(context).toBeInstanceOf(ExpressDataContext);
            return Promise.resolve(value);
        });
        const context = app.createContext();
        const res = await consumer.run(context, true);
        expect(res).toBe(true);
        await new Promise((resolve) => context.finalize(resolve));
    });

    it('should execute action', async () => {
        let response = await request(container).get('/hello/index');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello World');
        response = await request(container).get('/hello/index?message=Hey');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hey');
    });

    it('should validate parameters', async () => {
        let response = await request(container).get('/hello/index?message=A%20very%20long%20message');
        expect(response.status).toBe(400);
        response = await request(container).get('/hello/square?value=4');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ value: 16 });
        response = await request(container).get('/hello/square');
        expect(response.status).toBe(400);
        response = await request(container).get('/hello/square?value=abc');
        expect(response.status).toBe(400);
    });

    it('should use action name', async () => {
        let response = await request(container).get('/hello/me');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ name: 'anonymous' });
        response = await request(container).get('/hello/getMe');
        expect(response.status).toBe(404);
    });

    it('should validate http method', async () => {
        let response = await request(container).post('/hello/index');
        expect(response.status).toBe(404);
        response = await request(container).post('/hello/echo').send({ text: 'Hello' });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ text: 'Hello' });
    });

    it('should ignore methods without annotation', async () => {
        const response = await request(container).get('/hello/notAnAction');
        expect(response.status).toBe(404);
    });

    it('should use httpAuthorize', async () => {
        const response = await request(container).get('/hello/secret');
        expect(response.status).toBe(401);
    });

    it('should use httpActionConsumer', async () => {
        const response = await request(container).get('/hello/custom');
        expect(response.status).toBe(200);
        expect(response.text).toBe('true');
    });

    it('should use HttpNextResult', async () => {
        const response = await request(container).get('/hello/skip');
        expect(response.status).toBe(404);
    });

    it('should use async actions', async () => {
        const response = await request(container).get('/hello/later');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ later: true });
    });

    it('should use httpRoute', async () => {
        let response = await request(container).get('/greet/\'John%20Doe\'');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello John Doe');
        response = await request(container).delete('/any');
        expect(response.status).toBe(200);
        expect(response.text).toBe('DELETE');
        response = await request(container).get('/go');
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/hello/index');
    });

    it('should use controllerRouter under a path', async () => {
        const app1 = express();
        app1.use(app.middleware(app1));
        app1.use('/api', controllerRouter(app));
        const response = await request(app1).get('/api/hello/index');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello World');
    });
});
