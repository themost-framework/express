import {ApplicationService} from '@themost/common';

export declare class ODataEntityId extends ApplicationService {
    constructor(app: ApplicationService);

    /**
     * Gets a string which represents an entity id for the specified entity set and the given entity.
     * The entity id is used by OData protocol to identify an entity in the context of an entity set. The default implementation returns a string which represents the value of the primary key property of the given entity.
     * @param {string} entitySet
     * @param {*} entity
     */
    get(entitySet: string, entity: any): string;
}