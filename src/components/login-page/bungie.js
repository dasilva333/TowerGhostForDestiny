define(['knockout', "jquery", "underscore", "hasher"], function (ko, $, _, hasher) {
	var Bungie = function() {
		var self = this,
			domain = 'bungie.net',
			apikey = '5cae9cdee67a42848025223b4e61f929', //this one is linked to dasilva333
			remoteURL = 'https://www.' + domain + '/';

		this.users = ko.observableArray();
		this.locale = ko.observable("en");
		this.defaultSystem = ko.observable(1);
		this.isLoggedIn = ko.observable();
		this.isLoggedIn.subscribe(function(newValue){
			console.log("isLoggedIn " + newValue);
			if (newValue == true){
				hasher.setHash("home");
			}
			else {
				hasher.setHash("");
			}
		});
		this.bungled = ko.observable("");
		
		this.hasApiKey = function(callback){
			console.log("getApiKey");
			if ( isChrome ){
				chrome.cookies.getAll({ domain: '.' + domain }, function(cookies){
					console.log("cookies.getAll");
					var apiCookie = _.findWhere(cookies, { name: "bungled" });
					if (apiCookie){
						self.bungled( apiCookie.value );
						callback(true);
					}
					else {
						callback(false);
					}
				});
			}
		}
		
		this.activeUser = ko.computed(function(){
			return _.findWhere( self.users(), { type: self.defaultSystem() });
		});
		
		this.isAuthenticated = function(callback){
			$.ajax({
				url: remoteURL  + "Platform/User/GetBungieNetUser/",
				headers: {
					"X-API-Key": apikey,
					"x-csrf": self.bungled()
				},
				success: function(resp){
					if (resp && resp.Message == "Ok"){
						console.log("good response");
						var data = resp.Response;
						if (data.gamerTag){
							self.users.push({id: data.gamerTag, type: 1});
							self.defaultSystem(1);
						}
						if (data.psnId){
							self.users.push({id: data.psnId, type: 2});
							self.defaultSystem(2);
						}
						callback(true, null);
					}
					else {
						callback(false, resp);
					}
				}
			});
		}
		
		this.checkLogin = function(){
			self.hasApiKey(function(hasKey){
				if (hasKey){
					self.isAuthenticated(function(isAuth){
						if (isAuth){
							self.isLoggedIn(true);
						}
						else {
							self.isLoggedIn(false);
						}
					});
				}
			});
		}
		
		this.openWindow = function(type){
			return function(){
				var loop;
				
				window.bungie_window = window.open('https://www.bungie.net/en/User/SignIn/' + type + "?bru=%252Fen%252FUser%252FProfile", '_blank', 'toolbar=0,location=0,menubar=0');
				
				if (isChrome){
					clearInterval(loop);
					loop = setInterval(function() {
						if (window.bungie_window && window.bungie_window.closed) {
							clearInterval(loop);
							self.checkLogin();
						}
					}, 100);
				}
			}
		}
		
		hasher.setHash("");
		self.checkLogin();
	}
	
	console.log("new Bungie");
	var bungie = new Bungie();
	return bungie;  
}); 