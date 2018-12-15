// Server
var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// MIDDLEWARE CONFIG:

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public folder static
app.use(express.static("public"));

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/hardTimes";

mongoose.connect(MONGODB_URI);

// ROUTES:

// A GET route for scraping from The Hard Times
app.get("/api/scrape", function (req, res) {
    // Grab html body with axios
    axios.get("https://thehardtimes.net/").then(function (response) {
        // Load html body into cheerio, save as shorthand selector
        var $ = cheerio.load(response.data);

        // Get h2 elements
        $("h2").each(function (i, element) {
            // Declare empty "result" object, add article titles/links
            var result = {};

            result.title = $(this)
                .children("a")
                .text();

            result.link = $(this)
                .children("a")
                .attr("href");

            // Create new article in DB using "result" object
            db.Article.create(result)
                .then(function (dbArticle) {
                    console.log(dbArticle);
                })
                .catch(function (err) {
                    console.log(err);
                });
        });

        // Send message to the client
        res.send("Scraping Sucess!");
    });
});

// Route for getting all articles from the db
app.get("/api/articles", function (req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for getting all Articles from the db
app.get("/api/comments", function (req, res) {
    // Grab every document in the Articles collection
    db.Comment.find({})
        .then(function (dbComment) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(dbComment);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for grabbing a specific Article by id and populating it with its note
app.get("/api/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
        // ..and populate all of the notes associated with it
        .then(function (dbArticle) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});
// Route for grabbing a specific Article by id, populating it with its note
app.get("/api/comments/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Comment.find({ articleId: req.params.id })
        // ..and populate all of the notes associated with it
        .then(function (dbComment) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbComment);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Comment
app.post("/api/comments/:id", function (req, res) {
    // Create a new comment and pass the req.body to the entry
    db.Comment.create(req.body)
        .then(function (dbComment) {
            // If a Comment was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Comment
            // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
            // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
            return db.Article.findOneAndUpdate({ "_id": req.params.id }, { commentId: dbComment._id }, { new: true })
                .then(function (dbArticle) {
                    // If we were able to successfully update an Article, send it back to the client
                    console.log(dbArticle);
                    res.json(dbArticle);
                })
                .catch(function (err) {
                    // If an error occurred, send it to the client
                    res.json(err);
                });
        });
});

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + ", ya punk!");
});