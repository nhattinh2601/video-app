// user-module.js
var bcrypt = require("bcryptjs");

let database; // Khai báo biến database ở đây
var ObjectId = require("mongodb").ObjectId;
module.exports = {

    setDatabase: function (db) {
        database = db; // Gán biến database từ server.js vào biến ở đây
    },

    registerGet: function (request, result) {
      if (request.session.user_id) {
        result.redirect("/");
        return;
      }
      result.render("register", {
        "error": "",
        "message": ""
      });
    },
        
    registerPost: function (request, result) {
        var first_name = request.body.first_name;
        var last_name = request.body.last_name;
        var email = request.body.email;
        var password = request.body.password;
        var role = 1;
        if (first_name == "" || last_name == "" || email == "" || password == "") {
            result.render("register", {
                "error": "Please fill all fields",
                "message": ""
            });
            return;
        }

        database.collection("users").findOne({
            "email": email
        }, function (error1, user) {
            if (error1) {
                console.log(error1);
                return;
            }

            if (user == null) {
                bcrypt.genSalt(10, function (err, salt) {
                    bcrypt.hash(password, salt, async function (err, hash) {
                        database.collection("users").insertOne({
                            "first_name": first_name,
                            "last_name": last_name,
                            "email": email,
                            "role": role,
                            "password": hash,
                            "subscribers": []
                        }, function (error2, data) {
                            if (error2) {
                                console.log(error2);
                                return;
                            }

                            result.render("register", {

                                "message": "Signed up successfully. You can login now."
                            });
                        });
                    })
                })
            } else {
                result.render("register", {
                    "error": "Email already exists",
                    "message": ""
                });
            }
        });
    },

    loginGet: function (request, result) {
        if (request.session.user_id) {
            result.redirect("/");
            return;
        }
        result.render("login", {
            "error": "",
            "message": ""
        });
    },

    loginPost: function (request, result) {
        var email = request.body.email;
			var password = request.body.password;

			if (email == "" || password == "") {
				result.render("login", {
					"error": "Please fill all fields",
					"message": ""
				});
				return;
			}

			database.collection("users").findOne({
				"email": email
			}, function (error1, user) {
				if (error1) {
					console.log(error1);
					return;
				}

				if (user == null) {
					result.render("login", {
						"error": "Email does not exist",
						"message": ""
					});
				} else {
					bcrypt.compare(password, user.password, function (error2, res) {
						if (res === true) {
							request.session.user_id = user._id;
							result.redirect("/");
						} else {
							result.render("login", {
								"error": "Password is not correct",
								"message": ""
							});
						}
					});
				}
			});
    },

    logout: function (request, result) {
        request.session.destroy();
        result.redirect("/login");
    },

    getUser: function (userId, callBack) {
        database.collection("users").findOne({
            "_id": ObjectId(userId)
        }, function (error, result) {
            if (error) {
                console.log(error);
                return;
            }
            if (callBack != null) {
                callBack(result);
            }
        });
    },
    

    getInfoUser: function (request, result) {
        if (request.session.user_id) {            
            getUser(request.session.user_id, function (user) {
                if (user == null) {
                    result.json({
                        "status": "error",
                        "message": "User not found"
                    });
                } else {
                    delete user.password;

                    result.json({
                        "status": "success",
                        "message": "Record has been fetched",
                        "user": user
                    });
                }
            });
        } else {
            result.json({
                "status": "error",
                "message": "Please login to perform this action."
            });
        }
    },

    // truy cập vào 1 chanel bất kỳ
    channel: function(request, result){
        database.collection("users").findOne({
            "_id": ObjectId(request.query.c)
        }, function (error1, user) {
            if (user == null) {
                result.render("404", {
                    "isLogin": request.session.user_id ? true : false,
                    "message": "Channel not found",
                    "url": request.url
                });
            } else {
                result.render("single-channel", {
                    "isLogin": request.session.user_id ? true : false,
                    "user": user,
                    "headerClass": "single-channel-page",
                    "footerClass": "ml-0",
                    "isMyChannel": request.session.user_id == request.query.c,
                    "error": request.query.error ? request.query.error : "",
                    "url": request.url,
                    "message": request.query.message ? request.query.message : "",
                    "error": ""
                });
            }
        });
    },

    // truy cập vào chanel của tk đang đăng nhập
    myChannel: function(request, result){
        if (request.session.user_id) {
            database.collection("users").findOne({
                "_id": ObjectId(request.session.user_id)
            }, function (error1, user) {
                result.render("single-channel", {
                    "isLogin": true,
                    "user": user,
                    "headerClass": "single-channel-page",
                    "footerClass": "ml-0",
                    "isMyChannel": true,
                    "message": request.query.message ? request.query.message : "",
                    "error": request.query.error ? request.query.error : "",
                    "url": request.url
                });
            });
        } else {
            result.redirect("/login");
        }
    },

    mySettings: function(request, result){
        if (request.session.user_id) {                        
            database.collection("users").findOne({
                "_id": ObjectId(request.session.user_id)
            }, function (error, user) {
                result.render("settings", {
                    "isLogin": true,
                    "user": user,
                    "message": request.query.message ? "Settings has been saved" : "",
                    "error": request.query.error ? "Please fill all fields" : "",
                    "url": request.url
                });
            });
        } else {
            result.redirect("/login");
        }
    },

    saveSettings: function(request, result) {
        if (request.session.user_id) {
            var password = request.body.password;

            if (request.body.first_name == "" || request.body.last_name == "") {
                result.redirect("/my_settings?error=1");
                return;
            }

            if (password == "") {
                database.collection("users").updateOne({
                    "_id": ObjectId(request.session.user_id)
                }, {
                    $set: {
                        "first_name": request.body.first_name,
                        "last_name": request.body.last_name
                    }
                });
            } else {
                bcrypt.genSalt(10, function (err, salt) {
                    bcrypt.hash(password, salt, async function (err, hash) {
                        database.collection("users").updateOne({
                            "_id": ObjectId(request.session.user_id)
                        }, {
                            $set: {
                                "first_name": request.body.first_name,
                                "last_name": request.body.last_name,
                                "password": hash
                            }
                        })
                    })
                })
            }

            database.collection("users").updateOne({
                "subscriptions.channelId": ObjectId(request.session.user_id)
            }, {
                $set: {
                    "subscriptions.$.channelName": request.body.first_name + " " + request.body.last_name
                }
            });

            database.collection("users").updateOne({
                "subscriptions.subscribers.userId": ObjectId(request.session.user_id)
            }, {
                $set: {
                    "subscriptions.subscribers.$.channelName": request.body.first_name + " " + request.body.last_name
                }
            });

            database.collection("users").updateOne({
                "subscribers.userId": ObjectId(request.session.user_id)
            }, {
                $set: {
                    "subscribers.$.channelName": request.body.first_name + " " + request.body.last_name
                }
            });

            database.collection("videos").updateOne({
                "user._id": ObjectId(request.session.user_id)
            }, {
                $set: {
                    "user.first_name": request.body.first_name,
                    "user.last_name": request.body.last_name
                }
            });

            result.redirect("/my_settings?message=1");
        } else {
            result.redirect("/login");
        }
    }
};
  
