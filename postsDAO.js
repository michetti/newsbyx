// We will use a hash in redis to store the ids
var IDS_HASH = "ids";
var IDS_HASH_POSTS = "posts";		// To get a new id for a post, use hincrby on ids:posts
var IDS_HASH_COMMENTS = "comments";	// To get a new id for a comment, use hincrby on ids:comments
var IDS_HASH_TAGS = "tags";			// To get a new id for a tag, use hincrby on ids:tags

// Identify posts in redis
var POST_HASH_PREFIX = "post:";				// The post itself will be saved as a hash, ex: post:1 (where 1 is the post id)
var POSTS_LIST = "posts";					// The list of posts will be saved on a list (only the id's)
var POST_COMMENTS_PREFIX = "post:";			// Prefix for post comments list, ex: post:1:comments	
var POST_COMMENTS_SUFIX = ":comments";		// Sufix for post comments list, ex: post:1:comments
var POST_COMMENTS_COUNT = "totalComments"	// Attribute on post hash to store count of comments, ex: post:1:totalComments =
var POST_TAGS_PREFIX = "post:";				// Prefix for post comments list, ex: post:1:comments	
var POST_TAGS_SUFIX = ":tags";				// Sufix for post comments list, ex: post:1:comments
var POST_TAGS_COUNT = "totalTags"		// Attribute on post hash to store count of comments, ex: post:1:totalComments = 


// Identify comments in redis
var COMMENT_HASH_PREFIX = "comment:";	// The comment itself will be saved as a hash, ex: comment:1 (where 1 is the comment id)

// Identify tags in redis
var TAG_HASH_PREFIX = "tag:"			// The tag itself will be saved as a hash, ex: tag:1 (where 1 is the tag id)
var TAGS_SORTED_SET = "tags";			// A sorted set of tags, where the score is the number of posts
var TAGS_HASH_NAME_TO_ID = "allTags";	// A map of tag names to id
var TAG_POSTS_LIST_PREFIX = "tag:";
var TAG_POSTS_LIST_SUFIX = ":posts";
	

exports.savePost = function(rclient, post, successCallback) {
	console.log("Saving post");

	// First, define the new post id
	rclient.hincrby(IDS_HASH, IDS_HASH_POSTS, 1, function(err, postId) {
		if (err) throw err;
		
		// Set some values
		post.id = postId;
		post.totalComments = 0;
		
		// Define the post hash key on redis
		var postKey = POST_HASH_PREFIX + postId;
		console.log("Post Key: " + postKey);
		
		// Save the Post
		rclient.multi()
			.hmset(postKey, post)	// save the post hash (the post itself)
			.lpush(POSTS_LIST, postId)		// add the post id to the posts list
			.exec(function(err, result) {
				if (err) throw err;
				
				console.log("Post saved successfully.")
				
				if (successCallback) {
					successCallback(post);
				}
				
			});
	});	
	
}

exports.getAllPosts = function(rclient, successCallback) {
	console.log("Retrieving all posts");
	
	// Get list of all existing posts
	rclient.lrange(POSTS_LIST, 0, -1, function(err, result) {
		var m = rclient.multi();
		
		// From the posts id's list, retrieve the posts themselves
		for(i in result) {
			var postId = result[i];
			m.hgetall(POST_HASH_PREFIX + postId);
		}
		
		m.exec(function(err, posts) {
			if (err) throw err;
			
			console.log("All posts retrieved sucessfully")
		
			if (successCallback) {
				successCallback(posts);
			}
			
		});
	});	
}

/*** COMMENTS ***/

exports.saveComment = function(rclient, postId, comment, successCallback) {
	console.log("Saving new comment");
	
	// Save new comment
	rclient.hincrby(IDS_HASH, IDS_HASH_COMMENTS, 1, function(err, commentId) {
		if (err) throw err;
		
		// New comment Key
		var commentKey = COMMENT_HASH_PREFIX + commentId;
		console.log("Comment Key: " + commentKey);
		
		// Initialize some values
		comment.id = commentId;
		
		
		var postKey = POST_HASH_PREFIX + postId;
		var postCommentsKey = POST_COMMENTS_PREFIX + postId + POST_COMMENTS_SUFIX;
		
		// Save the comment
		rclient.multi()
			.hmset(commentKey, comment)					//save the comment hash
			.rpush(postCommentsKey, commentId)			// add the comment id to the end of post comments list
			.hincrby(postKey, POST_COMMENTS_COUNT, 1)	// increment the number of comments on this post
			.exec(function(err, result) {
				if (err) throw err;
				
				console.log("Comment saved sucessfully");
				
				if (successCallback) {
					successCallback(comment);
				}				
				
			});
	});	
	
}

exports.getAllComments = function(rclient, postId, successCallback) {
	console.log("Retrieving all comments from post " + postId);
	
	var postCommentsKey = POST_COMMENTS_PREFIX + postId + POST_COMMENTS_SUFIX;
	
	// Get the list of comments id's
	rclient.lrange(postCommentsKey, 0, -1, function(err, result) {
		if (err) throw err;
		
		var m = rclient.multi();
		
		// Get the comments themselves
		for(i in result) {
			var commentId = result[i];
			m.hgetall(COMMENT_HASH_PREFIX + commentId);
		}
		
		m.exec(function(err, comments) {
			if (err) throw err;
			
			console.log("Comments retrieved successfully")
			
			if (successCallback) {
				successCallback(comments);
			}				
		});			
		
	});	
}

/*** TAGS ***/

exports.saveTag = function(rclient, postId, tag, successCallback) {
	console.log("Saving new tag");
	
	var postTagsKey = POST_TAGS_PREFIX + postId + POST_TAGS_SUFIX;
	
	// Check if the tag already exists
	rclient.hget(TAGS_HASH_NAME_TO_ID, tag.tag, function(err, tagId) {
		if (err) throw err;
		
		// Closure with saveTag logic
		var doSavegTag = function() {
			rclient.hincrby(IDS_HASH, IDS_HASH_TAGS, 1, function(err, tagId) {
				if (err) throw err;
				
				// New Tag Key
				var tagKey = TAG_HASH_PREFIX + tagId;
				console.log("Tag Id: " + tagId);
				
				// Initialize some values
				tag.id = tagId;
				
				var postKey = POST_HASH_PREFIX + postId;
				
				// Save the tag
				var m = rclient.multi();
				m.hmset(tagKey, tag) // save the tag hash itselft
				m.sadd(postTagsKey, tagId) // add the tag to the post tags set
				m.hincrby(postKey, POST_TAGS_COUNT, 1) // increment the number of tags on the post
				m.zincrby(TAGS_SORTED_SET, 1, tag.tag) // increment the score of the tag
				m.hset(TAGS_HASH_NAME_TO_ID, tag.tag, tagId) // map the tag name to the tag id
				m.rpush(TAG_POSTS_LIST_PREFIX + tag.tag + TAG_POSTS_LIST_SUFIX, postId) // add this post, to the list os posts tagged with this tag
				m.exec(function(err, replies) {
					if (err) throw err;
					
					console.log("Tag saved successfully");
					
					if (successCallback) {
						successCallback(tag);
					}

				});
			});
		}
		
		// If the tagId was found...
		if (tagId) {
			
			// Check if the tag was already specified for this post...
			rclient.sismember(postTagsKey, tagId, function(err, tagIsMember) {
				
				if (tagIsMember === 1) {
					// ... if it was, just return
					return
				} else {
					// ... if it wasn't, execute the closure
					doSavegTag();
				}
			});
			
		} else {
			// ... it it was not found, execute the clouse
			doSavegTag();
		}
		
	});	
	
}

exports.getAllTags = function(rclient, postId, successCallback) {
	console.log("Retrieving all tags from post " + postId);
	
	var postTagsKey = POST_TAGS_PREFIX + postId + POST_TAGS_SUFIX;
	
	// Retrieve the tags id's
	rclient.smembers(postTagsKey, function(err, result) {
		if (err) throw err;
		
		var m = rclient.multi();
		
		// Retrieve the tags themselves
		for(i in result) {
			var tagId = result[i];
			m.hgetall(TAG_HASH_PREFIX + tagId);
		}
		
		m.exec(function(err, tags) {
			if (err) throw err;
			
			console.log("Tags retrieved successfully");
			
			if (successCallback) {
				successCallback(tags);
			}			
			
		});			
		
	});	
}

exports.getMostUsedTags = function(rclient, maxTags, successCallback) {
	console.log("Retrieving list of most used tags");
	
	// Get list of tags, ordered by rank
	rclient.zrevrange(TAGS_SORTED_SET, 0, maxTags - 1, function(err, tags) {
		
		var m = rclient.multi();
		
		// From the list of tags id's, retrieve the tags scores
		for(i in tags) {
			var tag = tags[i];
			m.zscore(TAGS_SORTED_SET, tag);
		}
		
		m.exec(function(err, scores) {
			
			if (err) throw err;
			
			// Create a map where the key is the tag name and the value is the number of posts
			// tagged with it
			var tagsScore = [];
			for(i in scores) {
				tagsScore.push({tag: tags[i], score: scores[i]});
			}
			
			console.log("Most used tags retrieved successfully");
			
			if (successCallback) {
				successCallback(tagsScore);
			}

		})
	});	
	
}

exports.getAllTagPosts = function(rclient, tag, successCallback) {
	console.log("Retrieving posts tagged with tag " + tag);
	
	var tagPostsKey = TAG_POSTS_LIST_PREFIX + tag + TAG_POSTS_LIST_SUFIX;
	
	if (tag === 'all') {
		tagPostsKey = POSTS_LIST;
	}
	
	// Get list of posts id's tagged with this tag
	rclient.lrange(tagPostsKey, 0, -1, function(err, postsIds) {
		if (err) throw err;
		
		var m = rclient.multi();
		
		// Get the post's themselves
		for(i in postsIds) {
			m.hgetall(POST_HASH_PREFIX + postsIds[i]);
		}
		
		m.exec(function(err, posts) {
			if (err) throw err;
			
			console.log("Posts with this tag retrieved successfully");
			
			if (successCallback) {
				successCallback(posts);
			}

		});
		
	});	
}