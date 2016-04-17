/*
 * /db.js
 *
 * Purpose: return a database connection to server.js upon request.
 *
 * If Node environment variable is production, we use Postgres.
 * Otherwise we use SQLite
 *
 * Call belonsTo and hasMany sequelize methods
*/

(function () {
    'use strict';
    
    var Sequelize = require('sequelize'),
        env = process.env.NODE_ENV || 'development',
        db = {},                        // empty object to receive model
        sequelize;
    
    
    // =============================== CHECK ENV ==============================
    // If running on Heroku, use Postgres, else use SQLite.
    if (env === 'production') {
        sequelize = new Sequelize(process.env.DATABASE_URL, {
            'dialect': 'postgres'
        });
    } else {
        sequelize = new Sequelize('undefined', 'undefined', 'undefined', {
            'dialect': 'sqlite',
            'storage': __dirname + '/data/dev-todo-api-database.sqlite'
        });
    }
    
    
    // ============================ BUILD THE MODEL ===========================
    
    // .import method lets us load in sequalize models from separate files
    db.todo = sequelize.import(__dirname + '/models/todo.js');
    db.user = sequelize.import(__dirname + '/models/user.js');
    db.sequelize = sequelize;           // add sequelize instance to db object
    db.Sequelize = Sequelize;           // add Sequelize library to db object

    // sequelize association methods
    db.todo.belongsTo(db.user);         // todos belong to users
    db.user.hasMany(db.todo);           // each user has many todos

    module.exports = db;                // export whole db object

})();