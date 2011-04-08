var express = require('express');
var jade = require('jade');
var io = require('socket.io');
var redis = require('redis');

// App modules
var postsDAO = require('./postsDAO.js');

// Express - Configure App
var app = express.createServer();

app.configure(function() {
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.set('view engine', 'jade');
});

//Redis
var rclient = redis.createClient();

rclient.on("error", function(err) {
	console.log("Redis Error: " + err);
});

// Express - Routes
app.get('/', function(req, res) {
	
	postsDAO.getAllPosts(rclient, function(posts) {
		postsDAO.getMostUsedTags(rclient, 8, function(tagsScore) {
			
			console.log("Rendering view");
			
			res.render('index', {
				layout: 'layout',
				title: 'News By Michetti',
				data: {posts: posts, tagsScore: tagsScore}
			});			
		});
		
	});
	
});

// Express - Listem
app.listen(8080);


// Socket.IO
var socket = io.listen(app);

// Handlers for Socket.IO events
var messageHandlers = {
		
	publishPost: function(client, data) {
		
		postsDAO.savePost(rclient, data.post, function(post) {
			
			// Set the updated post on data
			data.post = post;
			
			console.log("Broadcasting new post");
    		client.send(data);		// send to the current user
    		client.broadcast(data);	// send to all other users
		})
		
	},

	publishComment: function(client, data) {
		
		var postId = data.comment.postId;
		
		postsDAO.saveComment(rclient, postId, data.comment, function(comment) {
			// Set the new comment on data
			data.comment = comment;
			
			console.log("Broadcasting new comment");
    		client.send(data);
    		client.broadcast(data);			
		});
		
	},
	
	publishTag: function(client, data) {
		
		var postId = data.tag.postId;
		
		postsDAO.saveTag(rclient, postId, data.tag, function(tag) {
			
			postsDAO.getMostUsedTags(rclient, 8, function(tagsScore) {
				
				// Set the new tag on data
				data.tag = tag;
				
				// Set the tagsScore on data
				data.tagsScore = tagsScore;
				
				console.log("Broadcasting new tag and new tagsScore");
	    		client.send(data);
	    		client.broadcast(data);	
			});
			
		});
		
	},	
	
	readComments: function(client, data) {
		
		var postId = data.postId;
		
		postsDAO.getAllComments(rclient, data.postId, function(comments) {
			
			// Set the comments on data
			data.comments = comments;
			
			console.log("Sending comments to the user");
			client.send(data);
		});

	},
	
	readTags: function(client, data) {
		
		var postId = data.postId;
		
		postsDAO.getAllTags(rclient, postId, function(tags) {
			
			// Set the tags on data
			data.tags = tags;
			
			console.log("Sending tags to the user");
			client.send(data);
			
		});

	},
	
	readTagPosts: function(client, data) {
		
		var tag = data.tag;
		
		postsDAO.getAllTagPosts(rclient, tag, function(posts) {

			// Set the posts on data
			data.posts = posts;
			
			console.log("Seding posts with this tag to the user");
			client.send(data)
			
		});
		
	}
	
}

socket.on('connection', function(client) {
	console.log('Client connected');
	
	client.on('message', function(data) {
		console.log('Message received');
		console.log(data);
		
		// Call handler
		if (data.action && messageHandlers[data.action]) {
			messageHandlers[data.action](client, data);	
		} else {
			console.log("Action " + data.action + " undefined... ignoring.")
		}
		
	});
	
	client.on('disconnect', function() {
		console.log('Client disconnected');
	});
});
