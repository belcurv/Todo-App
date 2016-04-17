/*
 * /models/user.js
 *
 * Our 'user' database model, used by db.js.
 * The sequelize.import method inside db.js expects the specific format below:
 * a function taking 2 arguments: the sequelize instance ('sequelize') and data types
*/

(function () {
    'use strict';
    
    var bcrypt   = require('bcrypt'),
        CryptoJS = require('crypto-js'),
        jwt      = require('jsonwebtoken'),
        _        = require('underscore');
    
    module.exports = function (sequelize, DataTypes) {
        
        return sequelize.define('user', {
            email: {
                type: DataTypes.STRING,
                unique: true,      // makes sure no other record has this value
                allowNull: false,
                validate: {
                    isEmail: true      // email validation built into sequelize
                }
            },
            salt: {
                type: DataTypes.STRING
            },
            password_hash: {
                type: DataTypes.STRING
            },
            password: {
                type: DataTypes.VIRTUAL,        // not stored but IS accessible
                allowNull: false,
                validate: {
                    len: [8, 100]
                },
                set: function (value) {
                    var salt = bcrypt.genSaltSync(10),
                        hash = bcrypt.hashSync(value, salt);
                    
                    // set the data values or password won't be validated
                    this.setDataValue('password', value);
                    this.setDataValue('salt', salt);
                    this.setDataValue('password_hash', hash);
                }
            }
        }, {
            hooks: {
                beforeValidate: function (user, options) {
                    // convert user.email to all-lowercase before validation
                    // to avoid dupe emails because of capitalization.
                    if (typeof user.email === 'string') {
                        user.email = user.email.toLowerCase();
                    }
                }
            },
            classMethods: {
                authentication: function (body) {
                    var self = this;
                    return new Promise(function (resolve, reject) {
                        // reject if either email or password are not strings
                        if (!_.isString(body.email) || !_.isString(body.password)) {
                            return reject();
                        }

                        self.findOne({
                            where: {
                                email: body.email
                            }
                        }).then(function (user) {
                            // reject if either:
                            // 1. email doesn't exist,
                            // 2. password hash doesn't match
                            if (!user || !bcrypt.compareSync(body.password, user.get('password_hash'))) {
                                return reject();
                            }

                            // if all went well we resolve
                            resolve(user);

                        }, function (err) {
                            reject();
                        });
                    });
                },
                findByToken: function (token) {
                    var self = this;
                    return new Promise(function (resolve, reject) {
                        // decode token and decrypt our data
                        try {
                            // .verify method confirms token validity and
                            // fidelity. It takes the token and the JWT
                            // password from generateToken.
                            var decodedJWT = jwt.verify(token, 'qwerty098'),
                                bytes = CryptoJS.AES.decrypt(decodedJWT.token, 'abc123!@#!'),
                                tokenData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

                            self.findById(tokenData.id).then(function (user) {
                                if (user) {
                                    resolve(user);
                                } else {
                                    reject();  // reject if ID not found in database
                                }
                            }, function (err) {
                                reject();      // reject if findById fails b/c
                                               // maybe no db connection.
                            });
                        
                        } catch (err) {
                            reject();          // reject if token isn't a valid
                                               // format.
                        }
                    });
                }
            },
            instanceMethods: {
                toPublicJSON: function () {
                    // only return our public properties
                    var json = this.toJSON();
                    return _.pick(json, 'id', 'email', 'createdAt', 'updatedAt');
                },
                generateToken: function (type) {
                    // if type doesn't exist
                    if (!_.isString(type)) {
                        return undefined;
                    }

                    // if everything goes well, try & catch
                    try {
                        var stringData = JSON.stringify({ id: this.get('id'), type: type }),
                            encryptedData = CryptoJS.AES.encrypt(stringData, 'abc123!@#!').toString(),
                            token = jwt.sign({             // jwt.sign takes 2 arguments:
                                token: encryptedData       // the body
                            }, 'qwerty098');               // the jwt password

                        return token;
                    } catch (err) {
                        console.error(err);
                        return undefined;
                    }
                }
            }
        });
        
    };   // ends module.exports
    
})();