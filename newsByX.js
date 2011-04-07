var express = require('express');
var jade = require('jade');
var io = require('socket.io');
var redis = require('redis');

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
	
	// Get list of existing posts
	rclient.lrange("posts", 0, -1, function(err, result) {
		var m = rclient.multi();
		
		for(i in result) {
			var postId = result[i];
			m.hgetall("post:" + postId);
		}
		
		m.exec(function(err, posts) {
			if (err) throw err;
		
			// Get list of tags, ordered by rank
			rclient.zrevrange("tags", 0, 7, function(err, tags) {
				
				var m = rclient.multi();
				
				for(i in tags) {
					var tag = tags[i];
					m.zscore("tags", tag);
				}
				
				m.exec(function(err, scores) {
					
					if (err) throw err;
					
					var tagsScore = [];
					for(i in scores) {
						tagsScore.push({tag: tags[i], score: scores[i]});
					}
					
					res.render('index', {
						layout: 'layout',
						title: 'News By Michetti',
						data: {posts: posts, tagsScore: tagsScore}
					});
				})
			});
			
		});
	});
	
	
});

// Express - Listem
app.listen(8080);


// Socket.IO
var socket = io.listen(app);

//Socket.IO Handlers
var messageHandlers = {
		
	publishPost: function(client, data) {
		// Save new post
		rclient.hincrby("ids", "posts", 1, function(err, postId) {
			if (err) throw err;
			
			// New Post Key
			console.log("New Post Id: " + postId);
			
			// Initialize some values
			data.post.id = postId;
			data.post.totalComments = 0;
			
			var postKey = "post:" + postId;
			
			// Save the Post
			rclient.multi()
				.hmset(postKey, data.post)
				.lpush("posts", postId)
				.exec(function(err, replies) {
					if (err) throw err;
					
					console.log("Post salvo com sucesso. Enviando aos usuarios.")
		    		client.send(data);
		    		client.broadcast(data);
				});
		});
	},

	publishComment: function(client, data) {
		var postId = data.comment.postId;
		
		// Save new comment
		rclient.hincrby("ids", "comments", 1, function(err, commentId) {
			if (err) throw err;
			
			// New comment Key
			console.log("New Comment Id: " + commentId);
			
			// Initialize some values
			data.comment.id = commentId;
			
			var commentKey = "comment:" + commentId;
			var postKey = "post:" + postId;
			var postCommentsKey = "post:" + postId + ":comments";
			
			// Save the comment
			rclient.multi()
				.hmset(commentKey, data.comment)
				.rpush(postCommentsKey, commentId)
				.hincrby(postKey, "totalComments", 1)
				.exec(function(err, replies) {
					if (err) throw err;
					
					console.log("Comment salvo com sucesso. Enviando aos usuarios.")
		    		client.send(data);
		    		client.broadcast(data);
				});
		});
		
	},
	
	publishTag: function(client, data) {
		var postId = data.tag.postId;
		var postTagsKey = "post:" + postId + ":tags";
		
		// Check if the tag already exists
		rclient.hget("allTags", data.tag.tag, function(err, tagId) {
			if (err) throw err;
			
			var doItAll = function() {
				rclient.hincrby("ids", "tags", 1, function(err, tagId) {
					if (err) throw err;
					
					// New tag Key
					console.log("New Tag Id: " + tagId);
					
					// Initialize some values
					data.tag.id = tagId;
					
					var tagKey = "tag:" + tagId;
					var postKey = "post:" + postId;
					
					// Save the comment
					var m = rclient.multi();
					m.hmset(tagKey, data.tag) // salva a tag (ou sobrescreve)
					m.sadd(postTagsKey, tagId) //
					m.hincrby(postKey, "totalTags", 1)
					m.zincrby("tags", 1, data.tag.tag)
					m.hset("allTags", data.tag.tag, tagId)
					m.rpush("tag:" + data.tag.tag + ":posts", postId)
					m.exec(function(err, replies) {
						if (err) throw err;
						
						// Get list of tags, ordered by rank
						rclient.zrevrange("tags", 0, 7, function(err, tags) {
							
							var m = rclient.multi();
							
							for(i in tags) {
								var tag = tags[i];
								m.zscore("tags", tag);
							}
							
							m.exec(function(err, scores) {
								
								if (err) throw err;
								
								var tagsScore = [];
								for(i in scores) {
									tagsScore.push({tag: tags[i], score: scores[i]});
								}
								
								data.tagsScore = tagsScore;
								
								console.log("Tag salva com sucesso. Enviando aos usuarios.")
					    		client.send(data);
					    		client.broadcast(data);
								
							});
						});
					});
				});
			}
			
			if (tagId) {
				
				rclient.sismember(postTagsKey, tagId, function(err, tagIsMember) {
					if (tagIsMember === 1) {
						return
					} else {
						// cria tudo
						doItAll();
					}
				});
				
			} else {
				// cria tudo
				doItAll();
			}
			
		});
		
	},	
	
	readComments: function(client, data) {
		var postCommentsKey = "post:" + data.postId + ":comments";
		
		rclient.lrange(postCommentsKey, 0, -1, function(err, result) {
			if (err) throw err;
			
			var m = rclient.multi();
			
			for(i in result) {
				var commentId = result[i];
				m.hgetall("comment:" + commentId);
			}
			
			m.exec(function(err, result) {
				console.log(result);
				
				data.comments = result
				client.send(data);
			});			
			
		});
	},
	
	readTags: function(client, data) {
		var postTagsKey = "post:" + data.postId + ":tags";
		
		rclient.smembers(postTagsKey, function(err, result) {
			if (err) throw err;
			
			var m = rclient.multi();
			
			for(i in result) {
				var tagId = result[i];
				m.hgetall("tag:" + tagId);
			}
			
			m.exec(function(err, result) {
				if (err) throw err;
				console.log(result);
				
				data.tags = result
				client.send(data);
			});			
			
		});
	},
	
	readTagPosts: function(client, data) {
		var tagPostsKey = "tag:" + data.tag + ":posts"
		if (data.tag === 'all') {
			tagPostsKey = "posts";
		}
		
		rclient.lrange(tagPostsKey, 0, -1, function(err, postsIds) {
			if (err) throw err;
			
			var m = rclient.multi();
			
			for(i in postsIds) {
				m.hgetall("post:" + postsIds[i]);
			}
			
			m.exec(function(err, posts) {
				if (err) throw err;
				console.log(posts)
				
				data.posts = posts;
				client.send(data)
			});
			
		});
	}
	
}

socket.on('connection', function(client) {
	console.log('Cliente conectado');
	
	client.on('message', function(data) {
		console.log('Mensagem recebida');
		console.log(data);
		
		// Call handler
		if (data.action && messageHandlers[data.action]) {
			messageHandlers[data.action](client, data);	
		} else {
			console.log("Action " + data.action + " nao definida")
		}
		
	});
	
	client.on('disconnect', function() {
		console.log('Cliente desconectado');
	});
});
