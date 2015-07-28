var ffXHR = function(){
	var self = this;
	
	this.readyState = 1;
	this.status = 500;
	this.statusText = "";
	
	this.open = function(type, url, async, username, password){
		setTimeout(function(){
			self.readyState = 4;
			self.status = 200;
			self.statusText = "OK";
			self.responseText = "Hello World";
			self.onreadystatechange();
		}, 1000)
	}
	this.abort = function(){
		
	}
	this.setRequestHeader = function(key, name){
		console.log(arguments);
	}
	this.getAllResponseHeaders = function(){
		return "";
	}
	this.send = function(headers, complete){
		console.log(headers);
	}
	this.onreadystatechange = function(){
		console.log("state changed");
	}
	return self;
};

var firefoxXHR = function(){
	return new ffXHR();
}

var app = new(function() {
    var self = this;

    this.init = function() {
		$.ajax({
			url: "https://www.bungie.net",
			headers: {
				foo: 'bar'
			},
			xhrFields: {
				withCredentials: true
			},
			xhr: function(){
				return firefoxXHR();
				return jQuery.ajaxSettings.xhr();
			},
			success: function(result){
				console.log("success is called");
				$("#result").html(result);
			}
		});
    }
});

$(document).ready(app.init);