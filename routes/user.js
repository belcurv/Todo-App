(function () {
    'use strict';
    
    var _ = require('underscore');
    
    module.exports = function (app, db) {

        // ================= POST -> /users =================
        // Register a user
        app.post('/users', function (req, res) {
            var body = _.pick(req.body, 'email', 'password');

            // call .create on db.todo
            db.user.create(body)
                .then(function (user) {
                    res.json(user.toPublicJSON());   // success
                },
                function (err) {
                    res.status(400).json(err);         // error
                });
        });
        
        
        // =============== POST -> /users/login ==============
        // User login
        app.post('/users/login', function (req, res) {
            var body = _.pick(req.body, 'email', 'password');

            // authentication via custom sequelize Class Method
            // on success, returns a token in header
            db.user.authentication(body)
                .then(function (user) {
                    var userToken = user.generateToken('authentication');
                
                    if (userToken) {
                        res.header('Auth', userToken).send({
                            token: userToken,
                            user : user.toPublicJSON()
                        });
                    } else {
                        res.status(401).send();
                    }
                },
                function (err) {
                    res.status(401).send();
                });
        });
        
    }; // end module.exports

})();