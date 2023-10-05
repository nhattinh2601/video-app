
const userModule = require('./user-module');
var fileSystem = require("fs");
const { getVideoDurationInSeconds } = require('get-video-duration');
var ObjectId = require("mongodb").ObjectId;
var formidable = require("formidable");


let database; 

module.exports = {

    setDatabase: function (db) {
        database = db;
    },

    uploadPost: function(request, result) {
        if (request.session.user_id) {
            var formData = new formidable.IncomingForm();
            formData.maxFileSize = 1000 * 1024 * 1204;
            formData.parse(request, function (error1, fields, files) {
                var oldPath = files.video.path;
                var newPath = "uploads/videos/" + new Date().getTime() + "-" + files.video.name;

                var title = fields.title;
                var description = fields.description;
                var tags = fields.tags;
                var videoId = fields.videoId;
                var thumbnail = fields.thumbnailPath;

                var oldPathThumbnail = files.thumbnail.path;
                var thumbnail = "uploads/thumbnails/" + new Date().getTime() + "-" + files.thumbnail.name;

                fileSystem.rename(oldPathThumbnail, thumbnail, function (error2) {
                    console.log("thumbnail upload error = ", error2);
                });

                fileSystem.rename(oldPath, newPath, function (error2) {
                    userModule.getUser(request.session.user_id, function (user) {

                        delete user.password;
                        var currentTime = new Date().getTime();

                        getVideoDurationInSeconds(newPath).then((duration) => {

                            var hours = Math.floor(duration / 60 / 60);
                            var minutes = Math.floor(duration / 60) - (hours * 60);
                            var seconds = Math.floor(duration % 60);

                            database.collection("videos").insertOne({
                                "user": {
                                    "_id": user._id,
                                    "first_name": user.first_name,
                                    "last_name": user.last_name,
                                    "image": user.image,
                                    "subscribers": user.subscribers
                                },
                                "filePath": newPath,
                                "createdAt": currentTime,
                                "views": 0,
                                "watch": currentTime,
                                "minutes": minutes,
                                "seconds": seconds,
                                "hours": hours,
                                "title": title,
                                "description": description,
                                "tags": tags,
                                "category": fields.category,
                                "thumbnail": thumbnail
                            }, function (error3, data) {

                                database.collection("users").updateOne({
                                    "_id": ObjectId(request.session.user_id)
                                }, {
                                    $push: {
                                        "videos": {
                                            "_id": data.insertedId,
                                            "filePath": newPath,
                                            "createdAt": currentTime,
                                            "views": 0,
                                            "watch": currentTime,
                                            "minutes": minutes,
                                            "seconds": seconds,
                                            "hours": hours,
                                            "title": title,
                                            "description": description,
                                            "tags": tags,
                                            "category": fields.category,
                                            "thumbnail": thumbnail
                                        }
                                    }
                                }, function (error4, data1) {
                                    result.redirect("/edit?v=" + currentTime);
                                });
                            });
                        });
                    });
                });
            });
        } else {
            result.json({
                "status": "error",
                "message": "Please login to perform this action."
            });
        }
    },
    
    uploadGet: function(request, result) {
        if (request.session.user_id) {
            userModule.getUser(request.session.user_id, function (user) {
                result.render("upload", {
                    "isLogin": true,
                    "user": user,
                    "url": request.url
                });
            });
        } else {
            result.redirect("/login");
        }
    },

    editPost: function(request, result) {
        if (request.session.user_id) {

            var formData = new formidable.IncomingForm();
            formData.parse(request, function (error1, fields, files) {
                var title = fields.title;
                var description = fields.description;
                var tags = fields.tags;
                var videoId = fields.videoId;
                var thumbnail = fields.thumbnailPath;

                if (files.thumbnail.size > 0) {

                    if (typeof fields.thumbnailPath !== "undefined" && fields.thumbnailPath != "") {
                        fileSystem.unlink(fields.thumbnailPath, function (error3) {
                            //
                        });
                    }

                    var oldPath = files.thumbnail.path;
                    var newPath = "uploads/thumbnails/" + new Date().getTime() + "-" + files.thumbnail.name;
                    thumbnail = newPath;

                    fileSystem.rename(oldPath, newPath, function (error2) {
                        //
                    });
                }

                database.collection("users").findOne({
                    "_id": ObjectId(request.session.user_id),
                    "videos._id": ObjectId(videoId)
                }, function (error1, video) {
                    if (video == null) {
                        result.send("Sorry you do not own this video");
                    } else {
                        database.collection("videos").findOneAndUpdate({
                            "_id": ObjectId(videoId)
                        }, {
                            $set: {
                                "title": title,
                                "description": description,
                                "tags": tags,
                                "category": fields.category,
                                "thumbnail": thumbnail
                            }
                        }, function (error1, data) {

                            database.collection("users").findOneAndUpdate({
                                $and: [{
                                    "_id": ObjectId(request.session.user_id)
                                }, {
                                    "videos._id": ObjectId(videoId)
                                }]
                            }, {
                                $set: {
                                    "videos.$.title": title,
                                    "videos.$.description": description,
                                    "videos.$.tags": tags,
                                    "videos.$.category": fields.category,
                                    "videos.$.thumbnail": thumbnail
                                }
                            }, function (error2, data1) {
                                userModule.getUser(request.session.user_id, function (user) {
                                    var video = data.value;
                                    video.thumbnail = thumbnail;

                                    result.render("edit-video", {
                                        "isLogin": true,
                                        "video": video,
                                        "user": user,
                                        "url": request.url,
                                        "message": "Video has been saved"
                                    });
                                });
                            });
                        });
                    }
                });
            });
        } else {
            result.redirect("/login");
        }
    },

    editGet: function(request, result) {
        if (request.session.user_id) {
            database.collection("videos").findOne({
                "watch": parseInt(request.query.v)
            }, function (error1, video) {
                if (video == null) {
                    result.render("404", {
                        "isLogin": true,
                        "message": "This video does not exist.",
                        "url": request.url
                    });
                } else {
                    if (video.user._id != request.session.user_id) {
                        result.send("Sorry you do not own this video.");
                    } else {
                        userModule.getUser(request.session.user_id, function (user) {
                            result.render("edit-video", {
                                "isLogin": true,
                                "video": video,
                                "user": user,
                                "url": request.url
                            });
                        });
                    }
                }
            });
        } else {
            result.redirect("/login");
        }
    },

    saveVideo: function(request, result) {
        if (request.session.user_id) {
            var title = request.body.title;
            var description = request.body.description;
            var tags = request.body.tags;
            var videoId = request.body.videoId;

            database.collection("users").findOne({
                "_id": ObjectId(request.session.user_id),
                "videos._id": ObjectId(videoId)
            }, function (error1, video) {
                if (video == null) {
                    result.send("Sorry you do not own this video");
                } else {
                    database.collection("videos").updateOne({
                        "_id": ObjectId(videoId)
                    }, {
                        $set: {
                            "title": title,
                            "description": description,
                            "tags": tags,
                            "category": request.body.category,
                            "minutes": request.body.minutes,
                            "seconds": request.body.seconds
                        }
                    }, function (error1, data) {

                        database.collection("users").findOneAndUpdate({
                            $and: [{
                                "_id": ObjectId(request.session.user_id)
                            }, {
                                "videos._id": ObjectId(videoId)
                            }]
                        }, {
                            $set: {
                                "videos.$.title": title,
                                "videos.$.description": description,
                                "videos.$.tags": tags,
                                "videos.$.category": request.body.category,
                                "videos.$.minutes": request.body.minutes,
                                "videos.$.seconds": request.body.seconds
                            }
                        }, function (error2, data1) {
                            result.json({
                                "status": "success",
                                "message": "Video has been published"
                            });
                        });
                    });
                }
            });
        } else {
            result.json({
                "status": "danger",
                "message": "Please login to perform this action."
            });
        }
    },

    watchVideo: function(request, result) {
        database.collection("videos").findOne({
            "watch": parseInt(request.query.v)
        }, function (error1, video) {
            if (video == null) {
                result.render("404", {
                    "isLogin": request.session.user_id ? true : false,
                    "message": "Video does not exist.",
                    "url": request.url
                });
            } else {

                database.collection("videos").updateOne({
                    "_id": ObjectId(video._id)
                }, {
                    $inc: {
                        "views": 1
                    }
                });

                database.collection("users").updateOne({
                    $and: [{
                        "_id": ObjectId(video.user._id)
                    }, {
                        "videos._id": ObjectId(video._id)
                    }]
                }, {
                    $inc: {
                        "videos.$.views": 1
                    }
                });

                userModule.getUser(video.user._id, function (user) {
                    result.render("video-page", {
                        "isLogin": request.session.user_id ? true : false,
                        "video": video,
                        "user": user,
                        "url": request.url
                    });
                });
            }
        });
    },

    searchVideo: function(request, result) {
        database.collection("videos").find({
            "title": {
                $regex: request.query.search_query,
                $options: "i"
            }
        }).toArray(function (error1, videos) {
            result.render("search-query", {
                "isLogin": request.session.user_id ? true : false,
                "videos": videos,
                "query": request.query.search_query,
                "url": request.url
            });
        });
    },

    delete: function(request, result) {
        if (request.session.user_id) {
            database.collection("videos").findOne({
                $and: [{
                    "user._id": ObjectId(request.session.user_id)
                }, {
                    "watch": parseInt(request.query.v)
                }]
            }, function (error1, video) {
                if (video == null) {
                    result.render("404", {
                        "isLogin": true,
                        "message": "Sorry, you do not own this video."
                    });
                } else {
                    database.collection("videos").findOne({
                        "_id": ObjectId(video._id)
                    }, function (error3, videoData) {
                        fileSystem.unlink(videoData.filePath, function (errorUnlink) {
                            if (errorUnlink) {
                                console.log(errorUnlink);
                            }

                            database.collection("videos").remove({
                                $and: [{
                                    "_id": ObjectId(video._id)
                                }, {
                                    "user._id": ObjectId(request.session.user_id)
                                }]
                            });
                        });
                    });

                    database.collection("users").findOneAndUpdate({
                        "_id": ObjectId(request.session.user_id)
                    }, {
                        $pull: {
                            "videos": {
                                "_id": ObjectId(video._id)
                            }
                        }
                    }, function (error2, data) {
                        result.redirect("/my_channel?message=Video+has+been+deleted");
                    });
                }
            });
        } else {
            result.redirect("/login");
        }
    },

    comment: function(request, result) {
        if (request.session.user_id) {
            var comment = request.body.comment;
            var videoId = request.body.videoId;

            userModule.getUser(request.session.user_id, function (user) {
                delete user.password;
                
                database.collection("videos").findOneAndUpdate({
                    "_id": ObjectId(videoId)
                }, {
                    $push: {
                        "comments": {
                            "_id": ObjectId(),
                            "user": {
                                "_id": user._id,
                                "first_name": user.first_name,
                                "last_name": user.last_name,
                                "image": user.image
                            },
                            "comment": comment,
                            "createdAt": new Date().getTime()
                        }
                    }
                }, function (error1, data) {
                    result.json({
                        "status": "success",
                        "message": "Comment has been posted",
                        "user": {
                            "_id": user._id,
                            "first_name": user.first_name,
                            "last_name": user.last_name,
                            "image": user.image
                        },
                        "comment": comment
                    });
                });
            });
        } else {
            result.json({
                "status": "danger",
                "message": "Please login to perform this action."
            });
        }
    },

    reply: function(request, result) {
        if (request.session.user_id) {
            var reply = request.body.reply;
            var commentId = request.body.commentId;

            userModule.getUser(request.session.user_id, function (user) {
                delete user.password;

                var replyObject = {
                    "_id": ObjectId(),
                    "user": {
                        "_id": user._id,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "image": user.image
                    },
                    "reply": reply,
                    "createdAt": new Date().getTime()
                };

                database.collection("videos").findOneAndUpdate({
                    "comments._id": ObjectId(commentId)
                }, {
                    $push: {
                        "comments.$.replies": replyObject
                    }
                }, function (error1, data) {
                    result.json({
                        "status": "success",
                        "message": "Reply has been posted",
                        "user": {
                            "_id": user._id,
                            "first_name": user.first_name,
                            "last_name": user.last_name,
                            "image": user.image
                        },
                        "reply": reply
                    });
                });
            });
        } else {
            result.json({
                "status": "danger",
                "message": "Please login to perform this action."
            });
        }
    }


};