(function () {
    'use strict';
    
    // ================================ SETUP =================================
    
    var express = require('express'),
        bodyParser = require('body-parser'),
        db = require('./db'),
        app = express(),
        http = require('http').Server(app),
        io = require('socket.io')(http),
        user = require('./routes/user'),
        todo = require('./routes/todo'),
        middleware = require('./middleware')(db),
        port = process.env.PORT || 3000;
    
    
    // ================================ CONFIG ================================
    
    app.use(bodyParser.json());
    app.use(express.static(__dirname + '/public'));
    
    user(app, db);
    todo(app, middleware, db);
    
    
    // ================================ ROUTES ================================
    
    // what is this route doing here?
    app.get('/me', middleware.requireAuth, function (req, res) {
        if (req.user) {
            res.send(req.user);
        }
    });
    
    
    // ================================ SOCKET ================================
    
    io.on('connection', function () {
        console.log('Todos connected via socket.io!');
    });
    
    
    // ============================= START SERVER =============================
    db.sequelize.sync().then(function () {
        http.listen(port, function () {
            console.log('Server listening on port: ' + port);
        });
    });
    
})();