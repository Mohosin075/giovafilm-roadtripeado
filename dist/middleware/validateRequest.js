"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validateRequest = (schema) => async (req, res, next) => {
    try {
        const result = await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
            cookies: req.cookies,
        });
        // Only overwrite request properties when the parsed result contains them.
        // This prevents cases where a schema doesn't declare `params` (or others)
        // and `result.params` becomes undefined, which would clobber `req.params`.
        if (result.body !== undefined)
            req.body = result.body;
        if (result.query !== undefined)
            req.query = result.query;
        if (result.params !== undefined)
            req.params = result.params;
        if (result.cookies !== undefined)
            req.cookies = result.cookies;
        return next();
    }
    catch (error) {
        next(error);
    }
};
exports.default = validateRequest;
