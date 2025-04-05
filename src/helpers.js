// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2019-2023, THEMOST LP All rights reserved
const DateTimeRegex = /^\d{4}-([0]\d|1[0-2])-([0-2]\d|3[01])(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?([+-](\d+):(\d+))?$/;
/**
 * Helper function for converting a formatted date time string to Date object while parsing a JSON document
 */
function dateReviver(key, value) {
    if (typeof value === 'string' && DateTimeRegex.test(value)) {
        return new Date(value);
    }
    return value;
}

export {dateReviver};
