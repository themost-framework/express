import {DataContext} from '@themost/data';
import {RequestHandler} from 'express';

export declare interface CreateContextService {
    createContext(): DataContext;
}

export function setContext(app: CreateContextService): RequestHandler;
export function finalizeContext(): RequestHandler