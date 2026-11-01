import path from 'path';
import {ExpressDataApplication} from '@themost/express';
import {HttpRoute, RouterService} from '@themost/express/controllers';
import {finalizeDataApplication} from '../utils';

describe('HttpRoute', () => {

    it('should create instance', () => {
        const route = new HttpRoute({
            path: '/:controller/:action'
        });
        expect(route).toBeTruthy();
    });

    it('should match route', () => {
        let route = new HttpRoute({
            path: '/:controller/:action'
        });
        let isMatch = route.isMatch('/users/me');
        expect(isMatch).toBeTruthy();
        expect(route.params.controller).toBe('users');
        expect(route.params.action).toBe('me');
        route = new HttpRoute({
            path: '/users/:action',
            controller: 'users'
        });
        isMatch = route.isMatch('/users/me?$top=10');
        expect(isMatch).toBeTruthy();
        expect(route.params.controller).toBe('users');
        expect(route.params.action).toBe('me');
    });

    it('should match /:controller/{id:int}/:action', () => {
        const route = new HttpRoute({
            path: '/:controller/{id:int}/:action'
        });
        let isMatch = route.isMatch('/users/100/groups');
        expect(isMatch).toBeTruthy();
        expect(route.params.controller).toBe('users');
        expect(route.params.id).toBe(100);
        // validate pattern more than once
        isMatch = route.isMatch('/users/101/groups');
        expect(isMatch).toBeTruthy();
        expect(route.params.id).toBe(101);
        isMatch = route.isMatch('/users/abc/groups');
        expect(isMatch).toBeFalsy();
    });

    it('should match /users/123e4567-e89b-12d3-a456-426614174000/groups', () => {
        const route = new HttpRoute({
            path: '/:controller/{id:guid}/:action'
        });
        const isMatch = route.isMatch('/users/123e4567-e89b-12d3-a456-426614174000/groups');
        expect(isMatch).toBeTruthy();
        expect(route.params.controller).toBe('users');
        expect(route.params.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should match /utils/round(12.45)', () => {
        const route = new HttpRoute({
            controller: 'utils',
            action: 'round',
            path: '/utils/round\\({value:decimal}\\)'
        });
        let isMatch = route.isMatch('/utils/round(12.45)');
        expect(isMatch).toBeTruthy();
        expect(route.params.value).toBe(12.45);
        isMatch = route.isMatch('/utils/round(92)');
        expect(isMatch).toBeTruthy();
        expect(route.params.value).toBe(92);
    });

    it('should match /utils/multiply(12.45,1.2)', () => {
        const route = new HttpRoute({
            controller: 'utils',
            action: 'multiply',
            path: '/utils/multiply\\({x:decimal},{y:decimal}\\)'
        });
        const isMatch = route.isMatch('/utils/multiply(12.45,1.2)');
        expect(isMatch).toBeTruthy();
        expect(route.params.x).toBe(12.45);
        expect(route.params.y).toBe(1.2);
    });

    it('should match /utils/send(\'Hello%20World\')', () => {
        const route = new HttpRoute({
            controller: 'utils',
            action: 'send',
            path: '/utils/send\\({message:string}\\)'
        });
        const isMatch = route.isMatch('/utils/send(\'Hello%20World\')');
        expect(isMatch).toBeTruthy();
        expect(route.params.message).toBe('Hello World');
    });

    it('should match /utils/calculateAge(\'2000-04-23\')', () => {
        const route = new HttpRoute({
            controller: 'utils',
            action: 'calculateAge',
            path: '/utils/calculateAge\\({value:date}\\)'
        });
        let isMatch = route.isMatch('/utils/calculateAge(\'2000-04-23\')');
        expect(isMatch).toBeTruthy();
        expect(route.params.value).toEqual(new Date('2000-04-23'));
        isMatch = route.isMatch('/utils/calculateAge(\'2000-04-23T12:00:00Z\')');
        expect(isMatch).toBeTruthy();
        expect(route.params.value).toEqual(new Date('2000-04-23T12:00:00Z'));
        isMatch = route.isMatch('/utils/calculateAge(datetime\'2000-04-23T12:00:00Z\')');
        expect(isMatch).toBeTruthy();
        expect(route.params.value).toEqual(new Date('2000-04-23T12:00:00Z'));
        isMatch = route.isMatch('/utils/calculateAge(\'2000-04-23T12:00:00.000+03:00\')');
        expect(isMatch).toBeTruthy();
        expect(route.params.value).toEqual(new Date('2000-04-23T12:00:00+03:00'));
    });

});

describe('RouterService', () => {

    /**
     * @type {ExpressDataApplication}
     */
    let app;
    beforeAll(() => {
        app = new ExpressDataApplication(path.resolve(__dirname, '../test/config'));
    });
    afterAll(async () => {
        await finalizeDataApplication(app);
    });

    it('should add routes', () => {
        app.useService(RouterService);
        const service = app.getService(RouterService);
        service.add({
            path: '/users/:action',
            controller: 'users'
        });
        expect(service.routes.length).toBe(1);
        service.addRange({
            path: '/groups/:action',
            controller: 'groups'
        }, {
            path: '/products/:action',
            controller: 'products'
        });
        const routeConfig = service.routes.find((item) => item.controller === 'products');
        expect(routeConfig).toBeTruthy();
    });

    it('should use parseUrl', () => {
        app.useService(RouterService);
        const service = app.getService(RouterService);
        service.addRange({
            path: '/users/:action',
            controller: 'users'
        }, {
            path: '/products/:action',
            controller: 'products'
        });
        let route = service.parseUrl('/products/me');
        expect(route).toBeTruthy();
        expect(route.params.controller).toBe('products');
        expect(route.params.action).toBe('me');
        route = service.parseUrl('/orders/me');
        expect(route).toBeFalsy();
    });

});
