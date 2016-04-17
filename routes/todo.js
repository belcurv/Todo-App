(function () {
    'use strict';

    var _ = require('underscore');

    module.exports = function (app, middleware, db) {

        // ================= GET -> /todos ==================
        // Gets all todos; querystrings for filtering
        app.get('/todos', middleware.requireAuth, function (req, res) {
            var query = req.query,    // returns an object!
                where = {
                    userId: req.user.get('id')
                };

            // if completed exists & true, set where.compelted to true
            if (query.hasOwnProperty('completed') && query.completed === 'true') {
                where.completed = true;
            } else if (query.hasOwnProperty('completed') && query.completed === 'false') {
                where.completed = false;
            }

            // filter if URL includes querystring & if query.length > zero
            if (query.hasOwnProperty('q') && query.q.length > 0) {
                where.description = {
                    $like: '%' + query.q.toLowerCase() + '%'
                };
            }

            // finally send the todos back res.json(todos)
            db.todo.findAll({
                where: where
            })
                .then(function (todos) {
                    if (todos) {
                        res.json(todos);
                    } else {
                        res.status(404).send();
                    }
                }, function (err) {
                    res.status(500).send();      // handle error
                });
        });


        // ================ GET -> /todos/:id ================
        // Gets a single todo based on ID
        app.get('/todos/:id', middleware.requireAuth, function (req, res) {
            var todoId = parseInt(req.params.id, 10); // req.params returns a
                                                      // string; we need number

            // switch to findOne
            db.todo.findOne({
                where: {
                    id: todoId,
                    userId: req.user.get('id')
                }
            }).then(function (todo) {
                if (!!todo) { // double !! converts object to its 'truthy' boolean
                    res.json(todo.toJSON());
                } else {
                    res.status(404).send();
                }
            }, function (err) {
                res.status(500).send();      // handle error
            });
        });


        // ================= POST -> /todos =================
        // Adds a todo
        app.post('/todos', middleware.requireAuth, function (req, res) {
            var body = _.pick(req.body, 'description', 'completed');

            // call .create on db.todo
            db.todo.create(body).then(function (todo) {
                // create association, update todo item, return new todo item
                // to API call.
                // middleware.js sets a user on the request object: 
                // req.user = user ... so that we have access to that here.
                return req.user.addTodo(todo)
                    .then(function () {
                        // .reload because we've added an association since
                        // the todo was created
                        return todo.reload();
                    }).then(function (todo) {   // receives updated todo
                        res.json(todo.toJSON());
                    });
            }, function (err) {
                res.status(400).json(err);      // handle error
            });
        });


        // =============== DELETE -> /todos/:id ===============
        // Deletes a todo based on ID
        app.delete('/todos/:id', middleware.requireAuth, function (req, res) {
            var todoId = parseInt(req.params.id, 10);

            db.todo.destroy({
                where: {
                    id: todoId,
                    userId: req.user.get('id')
                }
            }).then(function (rowsDeleted) {   // destroy ret # of deleted rows
                if (rowsDeleted === 0) {
                    res.status(404).json({
                        'error': 'No todo with id: ' + todoId
                    });
                } else {
                    res.status(204).send();    // 204 = "all good"
                }
            }, function () {
                res.status(500).send();        // handle error
            });
        });


        // ================ PUT -> /todos/:id ================
        // Update a todo based on ID
        app.put('/todos/:id', middleware.requireAuth, function (req, res) {
            var todoId = parseInt(req.params.id, 10),
                body = _.pick(req.body, 'description', 'completed'),
                attributes = {};

            // check if 'completed' property exists
            if (body.hasOwnProperty('completed')) {
                // change by reference
                attributes.completed = body.completed;
            }

            // check if 'description' exists
            if (body.hasOwnProperty('description')) {
                // trim leading/trailing whitespace from input description
                attributes.description = body.description.trim();
            }

            // find todo where id = todoId && userId = req.user.get('id')
            db.todo.findOne({
                where: {
                    id: todoId,
                    userId: req.user.get('id')
                }
            }).then(function (todo) {
                if (todo) {
                    todo.update(attributes)
                        .then(function (todo) {
                            res.json(todo.toJSON());
                        }, function (err) {
                            res.status(400).json(err);   // invalid syntax
                        });
                } else {
                    res.status(404).send();
                }
            }, function () {   // fires if findById went wrong
                res.status(500).send();
            });
        });

    }; // end module.exports

})();