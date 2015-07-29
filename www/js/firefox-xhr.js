
var ffContentScripts = {
	isReady: false,
	queue: []
}

window.addEventListener("cs-ready", function(event) {
	app.requestCookie(function(bungled){
		ffContentScripts.isReady = true;
		ffContentScripts.queue.forEach(function(event){
			event.detail.headers.push({ key: 'x-csrf', value: bungled });
			document.documentElement.dispatchEvent(event);
		});
		ffContentScripts.queue = [];
	});
});

var ffXHR = function(){
	var self = this;
	
	this.readyState = 1;
	this.status = 500;
	this.statusText = "";
	this.request = {};
	
	this.open = function(type, url, async, username, password){
		self.request = {
			type: type,
			url: url,
			async: async,
			username: username,
			password: password,
			headers: []
		};
	}
	this.abort = function(){
		
	}
	this.setRequestHeader = function(key, value){
		self.request.headers.push({ key: key, value: value });
	}
	this.getAllResponseHeaders = function(){
		return "";
	}
	this.send = function(payload){
		//console.log("send request to " + self.request.url);
		if (payload)
			self.request.payload = payload;
		var event = document.createEvent('CustomEvent');
		event.initCustomEvent("xhr-request", true, true, self.request);
		if (ffContentScripts.isReady){
			document.documentElement.dispatchEvent(event);
		}
		else {
			ffContentScripts.queue.push(event);
		}
	}
	this.onreadystatechange = function(){
		//console.log("state changed");
	}
	window.addEventListener("xhr-reply", function(event) {
		//console.log("xhr-reply! " + self.request.url);
		var xhr = event.detail;
		self.readyState = xhr.readyState;
		self.status = xhr.status;
		self.statusText = xhr.statusText;
		self.responseText = xhr.responseText;
		self.onreadystatechange();
	}, false);
	return self;
};

var firefoxXHR = function(){
	return new ffXHR();
}