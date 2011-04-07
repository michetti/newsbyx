function newReader(socket, jade, postsContainerSelector, commentsContainerSelector, tagsContainerSelector) {
	
	var templates = {};
	
	var handlers = {
		publishPost: function onPublishPost(data) {
			var post = data.post;
			
			if (templates.addPost) {
				console.log("Renderizando add post a partir do cache do template");
				renderPublishPost(templates.addPost, post)
				
			} else {
				console.log("Cache do template nao encontrado... obtendo via ajax");
				
				// Deveria usar jade.renderFile, mas esta bugado por enquanto...
				$.get("/template/post.jade", function(template) {
					console.log("Fazendo cache do template");
					templates.addPost = template; // cache do template
					
					console.log("Renderizando add post a partir do cache do template")
					renderPublishPost(templates.addPost, post);
				});
			}
		},
		
		publishComment: function onPublishComment(data) {
			var comment = data.comment;
			
			if (templates.addComment) {
				console.log("Renderizando add comment a partir do cache do template");
				renderPublishComment(templates.addComment, comment)
				
			} else {
				console.log("Cache do template nao encontrado... obtendo via ajax");
				
				// Deveria usar jade.renderFile, mas esta bugado por enquanto...
				$.get("/template/comment.jade", function(template) {
					console.log("Fazendo cache do template");
					templates.addComment = template; // cache do template
					
					console.log("Renderizando add comment a partir do cache do template")
					renderPublishComment(templates.addComment, comment);
				});
			}
		},
		
		publishTag: function onPublishTag(data) {
			var tag = data.tag;
			var tagsScore = data.tagsScore
			
			if (templates.addTag) {
				console.log("Renderizando add tag a partir do cache do template");
				renderPublishTag(templates.addTag, templates.tagsScore, tag, tagsScore)
				
			} else {
				console.log("Cache do template nao encontrado... obtendo via ajax");
				
				// Deveria usar jade.renderFile, mas esta bugado por enquanto...
				$.get("/template/tag.jade", function(templateTag) {
					console.log("Fazendo cache do template tag");
					templates.addTag = templateTag; // cache do template
					
					$.get("/template/nav.jade", function(templateTagsScore) {
						console.log("Fazendo cache do template tagsScore");
						templates.tagsScore = templateTagsScore; // cache do template
						
						console.log("Renderizando add tag a partir do cache do template")
						renderPublishTag(templates.addTag, templates.tagsScore, tag, tagsScore);
					});
					
				});
			}
		},		
		
		readComments: function onReadComments(data) {
			var comments = data.comments;
			var postId = data.postId;
			
			if (templates.addComment) {
				console.log("Renderizando add comment a partir do cache do template");
				renderPublishComments(templates.addComment, comments, postId)
				
			} else {
				console.log("Cache do template nao encontrado... obtendo via ajax");
				
				// Deveria usar jade.renderFile, mas esta bugado por enquanto...
				$.get("/template/comment.jade", function(template) {
					console.log("Fazendo cache do template");
					templates.addComment = template; // cache do template
					
					console.log("Renderizando add comment a partir do cache do template")
					renderPublishComments(templates.addComment, comments, postId);
				});
			}			
		},
		
		readTags: function onReadTags(data) {
			var tags = data.tags;
			var postId = data.postId;
			
			if (templates.addTag) {
				console.log("Renderizando add tag a partir do cache do template");
				renderPublishTags(templates.addTag, tags, postId)
				
			} else {
				console.log("Cache do template nao encontrado... obtendo via ajax");
				
				// Deveria usar jade.renderFile, mas esta bugado por enquanto...
				$.get("/template/tag.jade", function(template) {
					console.log("Fazendo cache do template tag");
					templates.addTag = template; // cache do template
					
					$.get("/template/nav.jade", function(templateTagsScore) {
						console.log("Fazendo cache do template tagsScore");
						templates.tagsScore = templateTagsScore; // cache do template
						
						console.log("Renderizando add tag a partir do cache do template")
						renderPublishTags(templates.addTag, tags, postId);
					});
						
				});
			}			
		},
		
		readTagPosts: function onReadTagPosts(data) {
			var tag = data.tag;
			var posts = data.posts;
			
			if (templates.addPost) {
				console.log("Renderizando add post a partir do cache do template");
				renderPublishPosts(templates.addPost, posts)
				
			} else {
				console.log("Cache do template nao encontrado... obtendo via ajax");
				
				// Deveria usar jade.renderFile, mas esta bugado por enquanto...
				$.get("/template/post.jade", function(template) {
					console.log("Fazendo cache do template");
					templates.addPost = template; // cache do template
					
					console.log("Renderizando add post a partir do cache do template")
					renderPublishPosts(templates.addPost, posts);
				});
			}			
		}
	}
	
	function renderPublishPost(template, post) {
		var newPost = $(jade.render(template,  {locals: { post: post }}));
		
		newPost.hide(); 
		$(postsContainerSelector).prepend(newPost);
		newPost.slideDown('slow');
	}
	
	function renderPublishPosts(template, posts) {
		$(postsContainerSelector).html("");
		
		var newPosts = "";
		for (i in posts) {
			newPosts += jade.render(template,  {locals: { post: posts[i] }}); 
		}
		
		$(postsContainerSelector).prepend(newPosts);
	}	
	
	function renderPublishComment(template, comment) {
		var countContainer = $("span.postStatusCommentsCount", "#post" + comment.postId);
		var count = Number(countContainer.html());
		countContainer.html(++count);
		
		var newComment = $(jade.render(template,  {locals: { comment: comment }}));
		var gravatarContainer = $("span.commentUserGravatar", newComment);
		var userEmail = gravatarContainer.data("user-email");
		var userEmailHash = hex_md5(userEmail);
		var gravatarUrl = "http://www.gravatar.com/avatar/" + userEmailHash + "?size=20&d=mm";
		gravatarContainer.html("<img src='" + gravatarUrl + "' />")
		
		newComment.hide(); 
		$(commentsContainerSelector , "#post" + comment.postId).append(newComment);	
		newComment.slideDown('slow');
	}
	
	function renderPublishTag(templateTag, templateTagsScore, tag, tagsScore) {
		console.log(tagsScore);
		
		var countContainer = $("span.postStatusTagsCount", "#post" + tag.postId);
		var count = Number(countContainer.html());
		countContainer.html(++count);
		
		var newTag = $(jade.render(templateTag,  {locals: { tag: tag }}));
		newTag.hide(); 
		$(tagsContainerSelector , "#post" + tag.postId).append(newTag);	
		newTag.slideDown('slow');
		
		var tagsScoreHtml = "";
		for (i in tagsScore) {
			tagsScoreHtml += jade.render(templateTagsScore, {locals: { nav: tagsScore[i] }});	
		}
		
		console.log(tagsScoreHtml);
		
		$("nav.appNav").html(tagsScoreHtml);
	}	
	
	function renderPublishComments(template, comments, postId) {
		$(commentsContainerSelector , "#post" + postId).html("");
		
		for(i in comments) {
			var comment = comments[i];
			var newComment = $(jade.render(template,  {locals: { comment: comment }}));
			var gravatarContainer = $("span.commentUserGravatar", newComment);
			var userEmail = gravatarContainer.data("user-email");
			var userEmailHash = hex_md5(userEmail);
			var gravatarUrl = "http://www.gravatar.com/avatar/" + userEmailHash + "?size=20&d=mm";
			gravatarContainer.html("<img src='" + gravatarUrl + "' />")
			
			$(commentsContainerSelector , "#post" + postId).append(newComment);	
		}
	}
	
	function renderPublishTags(template, tags, postId) {
		$(tagsContainerSelector , "#post" + postId).html("");
		
		for(i in tags) {
			var tag = tags[i];
			var newTag = $(jade.render(template,  {locals: { tag: tag }}));
			$(tagsContainerSelector , "#post" + postId).append(newTag);	
		}
	}	
	
	return {
		receive: function onReceive(data) {
			if (data.action && handlers[data.action]) {
				handlers[data.action](data);
			} else {
				console.log("Handler nao encontrado para action " + data.action)
			}
			
		}
	
	}
	
}