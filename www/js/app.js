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
		if (payload)
			self.request.payload = payload;
		var event = document.createEvent('CustomEvent');
		event.initCustomEvent("xhr-request", true, true, self.request);
		document.documentElement.dispatchEvent(event);
	}
	this.onreadystatechange = function(){
		//console.log("state changed");
	}
	window.addEventListener("xhr-reply", function(event) {
		console.log("xhr-reply! " + self.request.url);
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

var app = new(function() {
    var self = this;

    this.init = function() {
		setTimeout(function(){
			$.ajax({
				url: "https://www.bungie.net",
				type: "POST",
				headers: {
					foo: 'bar'
				},
				xhrFields: {
					withCredentials: true
				},
				data: JSON.stringify({
					foo: 'baz'
				}),
				xhr: function(){
					return firefoxXHR();
					return jQuery.ajaxSettings.xhr();
				},
				success: function(result){
					console.log("success is called");
					$("#result").html(result);
				}
			});
		},5000);
    }
});

$(document).ready(app.init);