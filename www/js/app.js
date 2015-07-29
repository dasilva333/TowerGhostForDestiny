var app = new(function() {
    var self = this;

	this.bungled = "-";
	
	this.requestCookie = function(callback){
		var event = document.createEvent('CustomEvent');
		event.initCustomEvent("request-cookie-from-ps", true, true, {});
		document.documentElement.dispatchEvent(event);
		self.requestCookieCB = callback;
	}
	
	this.setupFirefox = function(){
		$.ajaxSetup({
			xhr: function(){
				return firefoxXHR();
			},
		});	
		window.addEventListener("response-cookie-from-cs", function(event) {
			console.log("response-cookie-from-cs");
			self.bungled = event.detail;
			$.ajaxSetup({
				headers: {
					'x-csrf': self.bungled
				}
			});
			self.requestCookieCB(self.bungled);
		});
	}
	
    this.init = function() {
		self.setupFirefox();

		$.ajax({
			url: "https://www.bungie.net",
			type: "POST",
			headers: {
				foo: 'bar'
			},
			data: JSON.stringify({
				foo: 'baz'
			}),
			success: function(result){
				console.log("success is called");
				$("#result").html(result);
			}
		});
		/*
		setTimeout(function(){
			$.ajax({
				url: "https://www.bungie.net/en-us/View/Bungie/terms",
				type: "get",
				success: function(result){
					console.log("success is called");
					$("#result").html(result);
				}
			});
		},20000);*/
    }
});

$(document).ready(app.init);