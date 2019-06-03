// jshint esversion: 6
var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
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

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/newsArticles";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

// Routes

// A GET route for scraping the echoJS website
app.get("/", function(req, res) {
    // First, we grab the body of the html with axios
    axios.get("http://www.echojs.com/").then(function(response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);
        console.log("got some data");
        let results = [];
        // Now, we grab every h2 within an article tag, and do the following:
        $("div.news-card-body").each(function(i, element) {
            // Save an empty result object
            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this)
                .children("a")
                .text();
            result.link = $(this)
                .children("a")
                .attr("href");

            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then(function(dbArticle) {
                    // View the added result in the console
                    console.log(dbArticle);
                })
                .catch(function(err) {
                    // If an error occurred, log it
                    console.log(err);
                });
            results.push(result);
        });

        // Send a message to the client
        res.render("Scrape Complete");
    });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
// TODO: Finish the route so it grabs all of the articles
    db.Article.find({}).then(function (articles) {
        console.log(articles);
        res.json(articles);
    }).catch(function (err) {
        console.log("error: ", err);
    });
});

// Route for grabbing a specific Article by id, populate it with its note
app.get("/articles/:id", function(req, res) {
    // TODO
    // ====
    // Finish the route so it finds one article using the req.params.id,
    // and run the populate method with "note",
    // then responds with the article with the note included
    console.log("finding article: ", req.params.id);
    db.Article.findOne({ _id: mongoose.Types.ObjectId(req.params.id) })
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
        db.Article.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.params.id) },
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
