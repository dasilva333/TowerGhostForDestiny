define(['knockout', "underscore"], function (ko, _) {
	var Login = function() {
		var self = this;
		var domain = 'bungie.net'
		
		self.isLoggedIn = ko.observable(false);
		
		self.getApiKey = function(){
			
			chrome.cookies.getAll({ domain: '.' + domain }, function(cookies){
			  var apiCookie = _.findWhere(cookies, { name: "bungled" });
			  if (apiCookie){
			  	self.isLoggedIn(true);
			  }
			});
		}
		self.isLoggedIn.subscribe(function(newValue){
			if (newValue == true){
				location.href = "#home";
			}
		});
		self.getApiKey();
	}
	
	var login = new Login();
	return login;  
}); 