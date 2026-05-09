import {Router } from 'express';

declare global {
    namespace http {
        interface IncomingMessage {
            batchReq?: BatchRequestMessage
            parentReq?: IncomingMessage;
        }
    }
    namespace Express {
        interface Request {
            batchReq?: BatchRequestMessage
            parentReq?: Request;
        }
    }
}

export declare function batch(routerOrApplication: Router, options?: { headers: string[], min?: number, max?: number }): Router;

export interface BatchRequestMessage {
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    atomicityGroup?: string;
    dependsOn?: string[];
}