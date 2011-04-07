function newPublisher(socket) {
	
	return {
		publish: function onPublish(title, url, source, postDate, user, comment, callback) {
		    var message = {};
		    message.action = "publishPost";
		    message.post = {};
		    message.post.title = title;
		    message.post.url = url;
		    message.post.source = source;
		    message.post.postDate = postDate;
		    message.post.user = user;
		    message.post.comment = comment;
		    message.post.date = dateFormat(new Date(), "dd/mm/yyyy HH:mm:ss");
		    
		    socket.send(message);
		    
		    if (callback) {
		    	callback();
		    }
		},
	
		comment: function onComment(postId, user, comment, callback) {
			var message = {};
			message.action = "publishComment";
			message.comment = {};
			message.comment.postId = postId;
			message.comment.user = user;
			message.comment.comment = comment;
			message.comment.date = dateFormat(new Date(), "dd/MM/yyyy HH:mm:ss");
			
			socket.send(message);
			
			if (callback) {
				callback();
			}
		},
		
		tag: function onTag(postId, tag, callback) {
			var message = {};
			message.action = "publishTag";
			message.tag = {};
			message.tag.postId = postId;
			message.tag.tag = tag;
			
			socket.send(message);
			
			if (callback) {
				callback();
			}
		},		
		
		readComments: function onReadComments(postId, callback) {
			var message = {};
			message.action = "readComments";
			message.postId = postId;
			
			socket.send(message);
			
			if (callback) {
				callback();
			}
		},
		
		readTags: function onReadComments(postId, callback) {
			var message = {};
			message.action = "readTags";
			message.postId = postId;
			
			socket.send(message);
			
			if (callback) {
				callback();
			}
		},
		
		readTagPosts: function onReadTagPosts(tag, callback) {
			var message = {};
			message.action = "readTagPosts";
			message.tag = tag;
			
			socket.send(message);
			
			if (callback) {
				callback();
			}
		}
		
	}
	
}