// jshint esversion: 6
var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var bodyParser = require('body-parser');
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// use handlebars
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({
    defaultLayout: "main",
    // define helper function
    helpers: {
        isEqual: function (expectedValue, value) {
            return value === expectedValue;
        }
    }
}));
app.set("view engine", "handlebars");
// static public folder
app.use(express.static("public"));

// configure the app to use bodyParser()
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/newsArticles";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

// Routes

// A GET route for scraping the echoJS website
app.get("/", function(req, res) {
    // First, we grab the body of the html with axios
    axios.get("https://www.bing.com/news").then(function(response) {
        // loading data with cheerio
        var $ = cheerio.load(response.data);
        console.log("got some data");
        let articles = [];
        // on this site, each article is contained in a div with class 'news-card-body'
        $("div.news-card-body").each(function (i, element) {
            // is there anything here?
            if (!element) return;
            // Save an empty result object
            var article = {};

            // gather the relevant data from each card
            article.title = $(this)
                .find("a.title")
                .text();
            article.link = $(this)
                .find("a.title")
                .attr("href");
            article.snippet = $(this)
                .find("div.snippet")
                .text();
            article.id = articles.length;
            articles.push(article);
        });

        // show the articles
        // db.Articles.find({}).then(results => {
        //     console.log(results);
            res.render("index", { articles: articles });
        // });
    });
});

app.post("/api/save", function (req, res) {
    console.log("saving: ", req.body);
    // upsert the requested article
    var query = { 'title': req.body.title };
    if (query.title) {
        console.log("saved.");
        db.Articles.findOneAndUpdate(query, req.body,
            { upsert: true, useFindAndModify: false })
            .catch(function (err) {
                // If an error occurred, log it
                console.log(err);
                res.send(500, { error: err });
            });
    }
    else console.log("failed: empty.");
    res.send(200, 'saved');
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
// TODO: Finish the route so it grabs all of the articles
    db.Articles.find({}).then(function (articles) {
        console.log(articles);
        res.json(articles);
    }).catch(function (err) {
        console.log("error: ", err);
    });
});

// Route for grabbing a specific Article by id, populate it with its note
app.get("/articles/:id", function(req, res) {
    console.log("finding article: ", req.params.id);
    db.Articles.findOne({ _id: mongoose.Types.ObjectId(req.params.id) })
        .populate("note")
        .then(function (articles) {
            res.json(articles);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // TODO
  // ====
  // save the new note that gets posted to the Notes collection
  // then find an article from the req.params.id
  // and update it's "note" property with the _id of the new note
    console.log("adding note to article: ", req.params.id);
    db.Note.create(req.body).then(note => {
        db.Articles.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.params.id) },
            { $push: { "note": note } },
            { new: true, useFindAndModify: false })
            .then(function (results) {
                console.log("found and modified:", results);
                res.json(results);
            });
    });
});

app.get("/", function (req, res) {
    db.articles.find({})
        .then(articles => app.render("index"), articles)
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
