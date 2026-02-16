import {Router } from 'express';
import {Subject} from 'rxjs';
import {ServerResponse, IncomingMessage} from 'http';

declare global {
    namespace http {
        interface IncomingMessage {
            parentReq?: IncomingMessage;
        }
    }
    namespace Express {
        interface ServerResponse {
            //
        }
    }
}

export declare function batch(routerOrApplication: Router, options?: { headers: string[] }): Router;

export interface BatchRequestMessage {
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    atomicityGroup?: string;
    dependsOn?: string[];
}