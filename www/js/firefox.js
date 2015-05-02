
window.addEventListener("request-message", function(event) {
	try {
	  var request = event.detail;
	  //console.log("request id is: " + request.id); 
	  //console.log("request options are " + JSON.stringify(request.opts));
	  var opts = request.opts;
	  var xhr = new XMLHttpRequest();
	  xhr.open(opts.method, opts.route, true);
	  var apiKey = self.options.token;
	  
	  var done = function(){
	  	   console.log("attempting an api call with the following key " + apiKey); 	
		  xhr.setRequestHeader('x-csrf', apiKey);
		 
		  console.log( typeof getFirefoxCookie );
		  xhr.onload = function () {
		    var reply = { id: request.id, "status": xhr.status, "response" : xhr.response, type: "bungie"};
			window.postMessage(reply, "*");
		  };
		  xhr.onerror = function() { 
			var reply = {id: request.id, "status": xhr.status, "response" : xhr.response, type: "bungie"};
			window.postMessage(reply,"*");
		  }
		  //console.log("setting the request header to " + self.options.token);
		  if (opts.payload)
		  	xhr.send(JSON.stringify(opts.payload));
		  else
		  	xhr.send(); 
	  }
	  if (apiKey == "" || apiKey == null || apiKey.length == 0){
	  	var getFirefoxCookie = function(callback){
			console.log('requesting a new cookie'); 
			self.port.emit("get-cookie", function(cookie){
				console.log("response " + cookie);
				callback(cookie);
			});
		}
	  	getFirefoxCookie(function(cookie){
			apiKey = cookie;
			done();
		});
	  }
	  else {
	  	done();
	  }	
	}catch(e){
		console.log(e);
	} 
}, false);

window.addEventListener("api-request-message", function(event) {
	try {
	  var request = event.detail;
	  console.log("request id is: " + request.id); 
	  console.log("request options are " + JSON.stringify(request.opts));
	  var opts = request.opts;
	  var xhr = new XMLHttpRequest();
	  xhr.open(opts.method, opts.route, true);
	  xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
	  xhr.onload = function () {
	  	console.log('got a reply onload');
		console.log(xhr.response);
	    var reply = { id: request.id, "status": xhr.status, "response" : xhr.response, type: "api"};
		window.postMessage(reply, "*");
	  };
	  xhr.send(JSON.stringify(opts.payload));
	}catch(e){
		console.log("try catch error");
		console.log(e.toString());
	}

}, false);