/*
 * middleware.js
 *
 * module.exports = a function (vs an object), because we can have other files
 * pass in configuration data.  In our case, we need to pass in the database.
 *
 * Middleware is a little different in Express. Not only does it get passed the
 * req and res, it gets a 3rd argument called next.
 *
 * Middleware runs before your regular route handler, so without next the
 * private code will never run.
*/

(function () {
    'use strict';
    
    function middleware(db) {
        var middleware = {
            requireAuth: function (req, res, next) {
                var token = req.get('Auth');
                
                db.user.findByToken(token).then(function (user) {
                    req.user = user;
                    next();
                },
                function () {
                    res.status(401).send();
                });
            },
            logger: function (req, res, next) {
                var date = new Date().toString();
                console.log('Request: ' + date + ' ' + req.method + ' ' +
                            req.originalUrl);
                next();
            }
        };
        
        return middleware;
        
    }
    
    module.exports = middleware;
    
})();