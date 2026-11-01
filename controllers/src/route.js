import {ApplicationService, Args} from '@themost/common';
import {getControllerActions} from './controller';

const HTTP_ROUTE_PATTERNS = new Map([
    ['int', () => {
        return '^[1-9]([0-9]*)$';
    }],
    ['boolean', () => {
        return '^true|false$';
    }],
    ['decimal', () => {
        return '^[+-]?[0-9]*\\.?[0-9]*$';
    }],
    ['float', () => {
        return '^[+-]?[0-9]*\\.?[0-9]*$';
    }],
    ['guid', () => {
        return '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$';
    }],
    ['string', () => {
        return '^\'(.*)\'$';
    }],
    ['date', () => {
        return '^(datetime)?\'\\d{4}-([0]\\d|1[0-2])-([0-2]\\d|3[01])(?:[T ](\\d+):(\\d+)(?::(\\d+)(?:\\.(\\d+))?)?)?(?:Z(-?\\d*))?([+-](\\d+):(\\d+))?\'$';
    }]
]);

const HTTP_ROUTE_PARSERS = new Map([
    ['int', (value) => {
        return parseInt(value, 10);
    }],
    ['boolean', (value) => {
        return /^true$/ig.test(value);
    }],
    ['decimal', (value) => {
        return parseFloat(value);
    }],
    ['float', (value) => {
        return parseFloat(value);
    }],
    ['string', (value) => {
        return value.replace(/^'/, '').replace(/'$/, '');
    }],
    ['date', (value) => {
        return new Date(Date.parse(value.replace(/^(datetime)?'/, '').replace(/'$/, '')));
    }]
]);

/**
 * Defines an HTTP route which may be matched against a request URL
 * e.g. /:controller/:action, /users/{id:int}/groups, /utils/round\\({value:decimal}\\)
 */
class HttpRoute {
    /**
     * @param {import('./route').HttpRouteConfig=} routeConfig
     */
    constructor(routeConfig) {
        this.routeConfig = routeConfig;
        this.params = {};
    }

    /**
     * Returns true if the given URL matches the current route. Matched parameters are assigned to params property.
     * @param {string} urlToMatch
     * @returns {boolean}
     */
    isMatch(urlToMatch) {
        if (this.routeConfig == null) {
            throw new Error('Route may not be null');
        }
        if (typeof urlToMatch !== 'string') {
            return false;
        }
        if (urlToMatch.length === 0) {
            return false;
        }
        let str1 = urlToMatch;
        let patternMatch;
        let parser;
        const k = urlToMatch.indexOf('?');
        if (k >= 0) {
            str1 = urlToMatch.substring(0, k);
        }
        const re = /({([\w[\]]+)(?::\s*((?:[^{}\\]+|\\.|{(?:[^{}\\]+|\\.)*})+))?})|((:)([\w[\]]+))/ig;
        let match = re.exec(this.routeConfig.path);
        const routeParams = [];
        while (match) {
            if (typeof match[2] === 'undefined') {
                // parameter with colon (e.g. :id)
                routeParams.push({
                    name: match[6]
                });
            } else if (typeof match[3] !== 'undefined') {
                // common expressions
                patternMatch = match[3];
                parser = null;
                if (HTTP_ROUTE_PATTERNS.has(match[3])) {
                    patternMatch = HTTP_ROUTE_PATTERNS.get(match[3])();
                    if (HTTP_ROUTE_PARSERS.has(match[3])) {
                        parser = HTTP_ROUTE_PARSERS.get(match[3]);
                    }
                }
                routeParams.push({
                    name: match[2],
                    pattern: new RegExp(patternMatch, 'i'),
                    parser
                });
            } else {
                routeParams.push({
                    name: match[2]
                });
            }
            match = re.exec(this.routeConfig.path);
        }
        const str = this.routeConfig.path.replace(re, '([\\$_\\-.:\',+=%0-9\\w-]+)');
        const matcher = new RegExp('^' + str + '$', 'i');
        match = matcher.exec(str1);
        if (match == null) {
            return false;
        }
        let decodedMatch;
        for (let i = 0; i < routeParams.length; i++) {
            const param = routeParams[i];
            try {
                decodedMatch = decodeURIComponent(match[i + 1]);
            } catch {
                // malformed URI sequence
                return false;
            }
            if (param.pattern != null) {
                if (!param.pattern.test(decodedMatch)) {
                    return false;
                }
            }
            if (typeof param.parser === 'function') {
                param.value = param.parser(decodedMatch);
            } else {
                param.value = decodedMatch;
            }
        }
        // reset and set route data
        this.params = {};
        routeParams.forEach((x) => {
            this.params[x.name] = x.value;
        });
        // set controller
        if (Object.prototype.hasOwnProperty.call(this.routeConfig, 'controller')) {
            this.params.controller = this.routeConfig.controller;
        }
        // set action
        if (Object.prototype.hasOwnProperty.call(this.routeConfig, 'action')) {
            this.params.action = this.routeConfig.action;
        }
        return true;
    }
}

/**
 * An application service which holds a collection of HTTP routes and HTTP controllers
 */
class RouterService extends ApplicationService {
    constructor(app) {
        super(app);
        /**
         * @type {Array<import('./route').HttpRouteConfig>}
         */
        this.routes = [];
        Object.defineProperty(this, 'controllers', {
            enumerable: false,
            configurable: false,
            writable: false,
            value: new Map()
        });
    }

    /**
     * Appends a route to routes collection
     * @param {import('./route').HttpRouteConfig} item
     * @returns {this}
     */
    add(item) {
        this.routes.push(item);
        return this;
    }

    /**
     * Appends a collection of routes
     * @param {...import('./route').HttpRouteConfig} items
     * @returns {this}
     */
    addRange(...items) {
        this.routes.push(...items);
        return this;
    }

    /**
     * Registers an HTTP controller. The controller is going to be available by its name (see httpController() decorator)
     * and every method decorated with httpRoute() is going to be appended to routes collection.
     * @param {Function} controllerCtor
     * @returns {this}
     */
    useController(controllerCtor) {
        Args.notFunction(controllerCtor, 'Controller constructor');
        const name = (controllerCtor.httpController && controllerCtor.httpController.name) || controllerCtor.name;
        this.controllers.set(name, controllerCtor);
        // collect routes defined by httpRoute() decorator
        const routes = [];
        getControllerActions(controllerCtor).forEach(({action, method}) => {
            if (Array.isArray(method.httpRoutes)) {
                method.httpRoutes.forEach((httpRoute) => {
                    routes.push(Object.assign({}, httpRoute, {
                        controller: controllerCtor,
                        action
                    }));
                });
            }
        });
        // sort routes by index (keep insertion order for routes with the same index)
        routes.sort((a, b) => (a.index || 0) - (b.index || 0));
        return this.addRange(...routes);
    }

    /**
     * Gets a registered controller by name
     * @param {string} name
     * @returns {Function|undefined}
     */
    getController(name) {
        if (this.controllers.has(name)) {
            return this.controllers.get(name);
        }
        // try case-insensitive search
        const lowerName = String(name).toLowerCase();
        for (const [key, value] of this.controllers) {
            if (key.toLowerCase() === lowerName) {
                return value;
            }
        }
    }

    /**
     * Returns the first route which matches the given URL
     * @param {string} url
     * @param {number=} startIndex
     * @returns {HttpRoute|undefined}
     */
    parseUrl(url, startIndex = 0) {
        for (let i = startIndex; i < this.routes.length; i++) {
            const route = new HttpRoute(this.routes[i]);
            if (route.isMatch(url)) {
                return route;
            }
        }
    }
}

export {
    HTTP_ROUTE_PATTERNS,
    HTTP_ROUTE_PARSERS,
    HttpRoute,
    RouterService
}
