// jshint esversion: 6
var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var bodyParser = require('body-parser');
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3001;

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
        res.render("latest", { view: "latest", articles: articles });
    });
});

// view saved articles
app.get("/articles/saved", function (req, res) {
    // populate the notes in reverse order
    db.Articles.find({}).populate("notes").then(articles => {
        // console.log(articles);
        // articles.forEach(article => {
        //     // sort the notes in reverse
        //     console.log(article.notes);
        //     article.notes = article.notes.sort((a, b) => (a.id < b.id ? 1 : -1) );
        // });
        // show them, most recent first
        res.render("saved", { view: "saved", articles: articles.reverse() });
    });
});

// move an article from "latest" to "saved" sections
app.post("/api/save", function (req, res) {
    console.log("saving: ", req.body);
    // upsert the requested article
    var query = { 'title': req.body.title };
    if (query.title) {
        console.log("saved.");
        db.Articles.findOneAndUpdate(query, req.body,
            { upsert: true, useFindAndModify: false })
            .then(
                // success code
                res.send(200, 'saved'))
            .catch(function (err) {
                // If an error occurred, log it
                console.log(err);
                res.send(500, { error: err });
            });
    }
    else {
        console.log("failed: empty title.");
        res.send(500, "invalid request: " + JSON.stringify(req.body));
    }
});

// move an article from "latest" to "saved" sections
app.post("/api/remove", function (req, res) {
    console.log("removing: ", req.body);
    // delete the requested article from database
    var query = { 'title': req.body.title };
    if (query.title) {
        console.log("saved.");
        db.Articles.deleteOne(query)
            .then(function (data) {
                // send back success code
                res.status(200).json(data);
            })
            .catch(function (err) {
                // If an error occurred, log it
                console.log(err);
                res.send(500, { error: err });
            });
    }
    else {
        console.log("failed: empty title.");
        res.send(500, "invalid request: " + JSON.stringify(req.body));
    }
});


// post a note to the specified article
app.post("/articles/:id", function(req, res) {
    console.log("adding note", req.body.text, "to article: ", req.params.id);
    db.Note.create(req.body).then(note => {
        db.Articles.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.params.id) },
            { $push: { "notes": note } },
            { new: true, useFindAndModify: false })
            .then(function (results) {
                console.log("found and modified:", results.title, "with", note);
                // send back just the note
                res.json(note);
            });
    });
});

app.delete("/api/:articleId/notes/:noteId", function (req, res) {
    console.log("deleting note:", req.params.noteId, "from", req.params.articleId);
    db.Articles.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.params.articleId) },
        { $pull: { "notes": mongoose.Types.ObjectId(req.params.noteId) } },
        { useFindAndModify: false })
        .then(function (results) {
            console.log("found and modified:", results);
            // send back results... curious to see what that will be
            res.json(results);
        });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
