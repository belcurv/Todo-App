(function () {
    'use strict';
    
    var app = angular.module('todoApp', ['btford.socket-io', 'ui.router']);
    
    // OG Author injects 'matchMedia' module above. Provides
    // the 'screenSize' service to controllers.
    // https://github.com/jacopotarantino/angular-match-media
    
    
    // ============================ CONFIGURATION =============================
    
    app.config(function config($httpProvider, $stateProvider, $urlRouterProvider) {
        
        $httpProvider.interceptors.push('AuthInterceptor');
        
        $urlRouterProvider.otherwise('/login');
        
        $stateProvider
            .state('login', {
                url         : '/login',
                templateUrl : 'partials/login.html',
                authenticate: false
            })
            .state('register', {
                url         : '/register',
                templateUrl : 'partials/register.html',
                authenticate: false
            })
            .state('list', {
                url         : '/list',
                templateUrl : 'partials/list.html',
                authenticate: true
            });
    });
    
    
    // ============================== RUN BLOCK ===============================
    
    app.run(function run($rootScope, $state, AuthTokenFactory) {
            
        $rootScope.$on('StateChangeStart', function (event, toState, toParams, fromState, fromParams) {
            if (toState.authenticate && !AuthTokenFactory.getToken()) {
                $state.go('login');
                event.preventDefault();
            }
        });
    });
    
    
    // =============================== SERVICES ===============================
    
    app.factory('TodosFactory', function TodosFactory($http) {
        
        function getTodos() {
            return $http.get('/todos');
        }
        
        function insert(newTodo) {
            return $http.post('/todos', newTodo);
        }
        
        function delTodos(todo) {
            return $http.delete('/todos/' + todo.id);
        }
        
        function editCompleted(todo) {
            return $http.put('/todos/' + todo.id, {
                description: todo.description,
                completed  : todo.completed
            });
        }
        
        return {
            getTodos : getTodos,
            insert   : insert,
            delTodos : delTodos,
            editCompleted: editCompleted
        };
        
    });
    
    app.factory('UserFactory', function UserFactory($http, AuthTokenFactory, $q) {
        
        function login(email, password) {
            return $http.post('/users/login', {
                email    : email,
                password : password
            }).then(function success(res) {
                AuthTokenFactory.setToken(res.data.token);
                return res;
            });
        }
        
        function logout() {
            AuthTokenFactory.setToken();
        }
        
        function getUser(vmUser) {
            if (!vmUser || AuthTokenFactory.getToken()) {
                return $http.get('/me');
            } else {
                $q.reject({data: 'No Authorized Token'});
            }
        }
        
        function register(email, password) {
            return $http.post('/users', {
                email    : email,
                password : password
            });
        }
        
        return {
            login    : login,
            logout   : logout,
            getUser  : getUser,
            register : register
        };
    });
    
    app.factory('AuthTokenFactory', function AuthTokenFactory($window) {
        
        var store = $window.localStorage,
            key = 'Auth';
        
        function getToken() {
            return store.getItem(key);
        }
        
        function setToken(token) {
            if (token) {
                store.setItem(key, token);
            } else {
                store.removeItem(key);
            }
        }
        
        return {
            getToken : getToken,
            setToken : setToken
        };
    });
    
    app.factory('AuthInterceptor', function AuthInterceptor(AuthTokenFactory, $location, $q) {
        
        function addToken(config) {
            var token = AuthTokenFactory.getToken();
            if (token) {
                config.headers = config.headers || {};
                config.headers.Auth = token;
            }
            
            return config;
        }
        
        return {
            request: addToken
        };
    });
    
    app.factory('socket', function socketFactory(socketFactory) {
        return socketFactory();
    });
    
    
    // ============================= CONTROLLERS ==============================
    
    app.controller('TodoCtrl', function TodoCtrl(TodosFactory, UserFactory, $filter, socket, $state) {
        
        // OG Author also injects a 'screenSize' service.
        // Appears to come from "angular-media-queries".
        // And calls associated screenSize methods below.
        // Attempting this without at first...
        
        
        socket.on('connect', function () {
            console.log('Connected to socket.io server');
        });
        
        // Exports to view
        var vm = this;
        
        vm.description = '';
        vm.editedTodo = null;
        
        vm.login    = login;
        vm.logout   = logout;
        vm.register = register;
        vm.checkSomething = checkSomething;
        vm.addTodo    = addTodo;
        vm.removeTodo = removeTodo;
        vm.toggleCompleted = toggleCompleted;
        vm.editTodo  = editTodo;
        vm.saveEdits = saveEdits;
        vm.markAll   = markAll;
        vm.revertEdits = revertEdits;
        vm.currentPage = 0;
        vm.pageSize = 10;
        vm.numberOfPages = numberOfPages;
        vm.getData = getData;
        
        // == Disabled because not using 'matchMedia' module ==

        // vm.desktop = screenSize.on('md, lg', function(match){
        //     vm.desktop = match;
        // });
        //
        // vm.mobile = screenSize.on('xs, sm', function(match){
        //     vm.mobile = match;
        // });

        // invocation / Initializations for authorized user. for fix refresh (?)
        UserFactory.getUser(vm.user).then(function success(res) {
            vm.user = res.data;
            getTodos();
        });
        
        function getTodos() {
            TodosFactory.getTodos().then(function success(res) {
                vm.todos = res.data;
            }, handleError);
        }
        
        function numberOfPages() {
            if (vm.todos) {
                return Math.ceil(vm.todos.length / vm.pageSize);
            }
        }
        
        function getData() {
            if (vm.todos) {
                return $filter('filter')(vm.todos);  // ???
            }
        }
        
        function login(email, password) {
            UserFactory.login(email, password)
                .then(function success(res) {
                    vm.user = res.data.user;
                    $state.go('list');
                    getTodos();
                }, handleError);
        }
        
        function logout() {
            UserFactory.logout();
            vm.email = null;
            vm.password = null;
            vm.user = null;
            vm.registered = null;
            $state.go('login');
        }
        
        function register(email, password) {
            UserFactory.register(email, password)
                .then(function success(res) {
                    vm.registered = res.data;
                    swal('Registered', 'You can login!', 'success'); // swal = sweet alert
                    $state.go('login');
                }, function (res) {
                    if (res.status === 500) {
                        handleError(res);
                        return;
                    }
                    swal('Error', res.status + ' status ' + res.data.errors[0].message, 'error');
                })
                .finally(function () {
                    vm.email = null;
                    vm.password = null;
                });
        }
        
        function checkSomething() {
            if (vm.registered || vm.user) {
                return true;
            }
        }
        
        function addTodo() {
            var newTodo = {
                description: vm.description.trim()
            };
            
            if (!newTodo.description) {
                return;
            }
            
            vm.saving = true;
            
            TodosFactory.insert(newTodo)
                .then(function success(res) {
                    vm.description = '';
                }, function () {
                    swal('Error', res.status + ' status ' + res.data.errors[0].message, 'error');
                })
                .finally(function () {
                    vm.saving = false; //set false, for fix hanging in browser
                    getTodos();
                });
        }
        
        function removeTodo(todo) {
            TodosFactory.delTodos(todo)
                .then(function success(res) {
                    console.log(res.status);
                })
                .finally(function () {
                    getTodos();
                });
        }
        
        function toggleCompleted(todo, completed) {
            if (angular.isDefined(completed)) {
                todo.completed = completed;
            }
            TodosFactory.editCompleted(todo)
                .then(function success() {}.handleError);
        }
        
        function editTodo(todo) {
            vm.editedTodo = todo;
            // Clone original todo for 'undo': click mouse in any spot of page
            // or press escape button
            vm.originalTodo = angular.extend({}, todo);
        }
        
        function saveEdits(todo, event) {
            if (event === 'blur' && vm.saveEvent === 'submit') {
                vm.saveEvent = null;
                return;
            }
            
            vm.saveEvent = event;
            
            todo.description = todo.description.trim();
            
            if (todo.description === vm.originalTodo.description) {
                vm.editedTodo = null;
                return;
            }
            
            TodosFactory[todo.description ? 'editCompleted' : 'delTodos'](todo)
                .then(function success() {}, function (err) {
                    todo.description = vm.originalTodo.description;
                })
                .finally(function () {
                    vm.editedTodo = null;
                    getTodos();
                });
        }
        
        function markAll(completed) {
            vm.todos.forEach(function (todo) {
                if (todo.completed !== completed) {
                    toggleCompleted(todo, completed);
                }
            });
        }
        
        function revertEdits(todo) {
            // restore original todo after clicking escape button
            vm.todos[vm.todos.indexOf(todo)] = vm.originalTodo;
            vm.editedTodo = null;
            vm.originalTodo = null;
        }
        
        function handleError(res) {
            swal('Error ', res.status + ' status ' + res.statusText, 'error');
        }
        
    });
    
    
    // ============================== DIRECTIVES ==============================
    
    app.directive('todoFocus', function todoFocus($timeout) {
        return function (scope, elem, attrs) {
            scope.$watch(attrs.todoFocus, function (newVal) {
                if (newVal) {
                    $timeout(function () {
                        elem[0].focus();
                    }, 0, false);
                }
            });
        };
    });
    
    app.directive('todoEscape', function todoEscape() {
        var ESCAPE_KEY = 27;
        
        return function (scope, elem, attrs) {
            elem.bind('keydown', function (event) {
                if (event.keyCode === ESCAPE_KEY) {
                    scope.$apply(attrs.todoEscape);
                }
            });
            
            scope.$on('$destroy', function () {
                elem.unbind('keydown');
            });
        };
    });
    
    app.directive('iosDblclick', function () {
        
        var DblClickInterval = 300,   // miliseconds
            firstClickTime,
            waitingSecondClick = false;
        
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.bind('click', function (e) {
                    
                    if (!waitingSecondClick) {
                        firstClickTime = (new Date()).getTime();
                        waitingSecondClick = true;
                        
                        setTimeout(function () {
                            waitingSecondClick = false;
                        }, DblClickInterval);
                    } else {
                        waitingSecondClick = false;
                        
                        var time = (new Date()).getTime();
						if (time - firstClickTime < DblClickInterval) {
							scope.$apply(attrs.iosDblclick);
						}
					}
				});
			}
		};
	});
    
    
    // =============================== FILTERS ================================
    
    app.filter('startFrom', function () {
        return function (input, start) {
            start = +start; // parse to int ?
            if (input) {
                return input.slice(start);
            }
        };
    });
    
})();