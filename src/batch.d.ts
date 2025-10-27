import {RequestHandler, Router} from 'express';

export declare interface BatchRequestMessage {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Headers;
    body?: unknown;
    atomicityGroup?: string;
    dependsOn?: string[];
}

export declare interface BatchRequestBody {
    requests: BatchRequestMessage[];
}


export declare function batch(router: Router): RequestHandler;