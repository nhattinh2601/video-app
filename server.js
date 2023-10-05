var express = require("express");
const ffmpeg = require('fluent-ffmpeg')
var app = express();
var http = require("http").createServer(app);
var socketIO = require("socket.io")(http);
var formidable = require("formidable");
var fileSystem = require("fs");
var mongoClient = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectId;
var bodyParser = require("body-parser");
var expressSession = require("express-session");
var bcrypt = require("bcryptjs");
const { getVideoDurationInSeconds } = require('get-video-duration');
const fs = require('fs');
var nodemailer = require("nodemailer");

var mainURL = "http://localhost:3000";



// upload video 
const multer = require('multer');
const { time } = require("console");
const userModule = require("./user-module");
const videoModule = require("./video-module");

// app.use(express.static('uploads'))

// const storage = multer.diskStorage({
// 	destination: (req, file, cb) => {
// 		cb(null, 'uploads')
// 	},
// 	filename: (req, file, cb) => {
// 		cb(null, file.originalname)
// 	}
// })

// let upload = multer({
// 	storage: storage
// })

app.use(function (req, res, next) {
	res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
	res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
	next();
})


app.use(bodyParser.json({ limit: "10000mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10000mb", parameterLimit: 1000000 }));

app.use(expressSession({
	"key": "user_id",
	"secret": "User secret object ID",
	"resave": true,
	"saveUninitialized": true
}));

app.use("/uploads", express.static(__dirname + "/uploads"));
app.use("/public", express.static(__dirname + "/public"));
app.set("view engine", "ejs");

var database = null;



http.listen(3000, function () {
	console.log("Server started at http://localhost:3000/");

	socketIO.on("connection", function (socket) {
		//
	});
	const DB_URL = "mongodb://127.0.0.1:27017";
	mongoClient.connect(DB_URL, { useUnifiedTopology: true }, function (error, client) {
		if (error) {
			console.log(error);
			return;
		}
		database = client.db("youtube");						
		userModule.setDatabase(database);
		videoModule.setDatabase(database);
	});

	
	app.get("/register", userModule.registerGet);
	app.post("/register", userModule.registerPost);

	app.get("/login", userModule.loginGet);
	app.post("/login", userModule.loginPost);

	app.get("/logout", userModule.logout);

	app.get("/upload", videoModule.uploadGet);
	app.post("/upload-video", videoModule.uploadPost);

	app.get("/search", videoModule.searchVideo);
	app.get("/edit", videoModule.editGet);
	app.post("/edit", videoModule.editPost);
	app.get("/delete-video", videoModule.delete);
	app.post("/save-video", videoModule.saveVideo);
	app.get("/watch", videoModule.watchVideo);

	app.get("/channel", userModule.channel);
	app.get("/my_channel", userModule.myChannel);
	
	app.get("/my_settings", userModule.mySettings);
	app.post("/save_settings", userModule.saveSettings);

	app.post("/do-comment", videoModule.comment);
	app.post("/do-reply", videoModule.reply);

	app.get("/", function (request, result) {
        database.collection("videos").find({}).sort({ "createdAt": -1 }).toArray(function (error1, videos) {
			result.render("index", {
				"isLogin": request.session.user_id ? true : false,
				"videos": videos,
				"url": request.url,
			});
		});				
	});	
	
});
