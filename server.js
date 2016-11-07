// dependencies
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var request = require('request'); 
var cheerio = require('cheerio');
var path = require('path');

app.use(logger('dev'));
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// app.use(express.static('public'));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'handlebars');
//set up handlebars
var exphbs = require('express-handlebars');
app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));


mongoose.connect('mongodb://localhost/articles');
var db = mongoose.connection;

// moongoose error handler
db.on('error', function(err) {
  console.log('Mongoose Error: ', err);
});

// successful login
db.once('open', function() {
  console.log('Mongoose connection successful.');
});

// models
var Note = require('./models/Note.js');
var Article = require('./models/Article.js');


// Routes

app.get('/', function(req, res) {
  	Article.find({}, function(err, doc){
		if (err){
			console.log(err);
		} 
		else {
			res.render('index', {articles: doc});
		}
	});
});

app.get('/scrape', function(req, res) {

  request('http://www.nba.com/news', function(error, response, html) {

    var $ = cheerio.load(html);

    $('section.video-related').each(function(i, element) {

		var result = {};

		result.title = $(this).find('img').attr('title');
		result.link = $(this).children('a').attr('href');

		var entry = new Article (result);

		// now, save that entry to the db
		entry.save(function(err, doc) {
			// log any errors
		  if (err) {
		    console.log(err);
		  } 
		  // or log the doc
		  else {
		    console.log(doc);
		  }
		});
    });
  });

  res.send("Scrape Complete");
});

// list of articles in json
app.get('/articles', function(req, res){

	Article.find({}, function(err, doc){
		if (err){
			console.log(err);
		} 
		else {
			res.json(doc);
		}
	});
});

// grab certain article
app.get('/articles/:id', function(req, res){

	Article.findOne({'_id': req.params.id})
	.populate('note')
	.exec(function(err, doc){
		if (err){
			console.log(err);
		} 
		else {
			res.json(doc);
		}
	});
});


// replace the existing note of an article with a new one
// or if no note exists for an article, make the posted note it's note.
app.post('/articles/:id', function(req, res){
	// create a new note and pass the req.body to the entry.
	var newNote = new Note(req.body);

	// and save the new note the db
	newNote.save(function(err, doc){
		// log any errors
		if(err){
			console.log(err);
		} 
		// otherwise
		else {
			// using the Article id passed in the id parameter of our url, 
			// prepare a query that finds the matching Article in our db
			// and update it to make it's lone note the one we just saved
			Article.findOneAndUpdate({'_id': req.params.id}, {'note':doc._id})
			// execute the above query
			.exec(function(err, doc){
				// log any errors
				if (err){
					console.log(err);
				} else {
					// or send the document to the browser
					res.send(doc);
				}
			});
		}
	});
});







// listen on port 3000
app.listen(3000, function() {
  console.log('App running on port 3000!');
});
