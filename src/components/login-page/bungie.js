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
							//at this point load the rest of the data into this viewModel
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
				
				window.bungie_window = window.open(remoteURL + 'en/User/SignIn/' + type + "?bru=%252Fen%252FUser%252FProfile", '_blank', 'toolbar=0,location=0,menubar=0');
				
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
		
		this.directLogin = function(username, password, platform){
			if (self.bungled() == ""){
				
			}
			else {
				$.ajax({
					//url: remoteURL + "en/User/SignIn/" + ((platform == 1) ? "Xuid" : "Psnid"),
					url: "https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/authorize?response_type=code&client_id=78420c74-1fdf-4575-b43f-eb94c7d770bf&redirect_uri=https%3a%2f%2fwww.bungie.net%2fen%2fUser%2fSignIn%2fPsnid&scope=psn:s2s&request_locale=en",
					success: function(r){
						if ( platform == 1 ){
							var exp_urlpost = /urlPost:\'(https:\/\/.*?)\'/;
							var url_post = r.split(exp_urlpost)[1];
							var ex_ppft = /<input type="hidden" name="PPFT" id=".*" value="(.*?)"\/>/;
							var ppft = r.split(ex_ppft)[1];
							$.ajax({
								type: "post",
								url: url_post,
								data: { 'login': username, 'passwd': password, 'PPFT': ppft },
								success: self.checkLogin
							});
						}
						else { 
							var ex_params = /<input id="brandingParams" type="hidden" name="params" value="(.*?)" \/>/
							var params = r.split(ex_params)[1];
							console.log(params);
							$.ajax({
								type: "post",
								url: "https://auth.api.sonyentertainmentnetwork.com/login.do",
								data: { params: params, 'j_username': username, 'j_password': password },
								success: function(resp){
									console.log(resp);
									/* I'm getting a 403 here should be a 302, not sure why. http://bungienetplatform.wikia.com/wiki/Authentication */
									
								},
								complete: function(resp){
								   console.log("sign in header");
								   console.log(resp.getAllResponseHeaders());
								}
							});
							
						}
						
					}
				});
			}
		}
		
		hasher.setHash("");
		self.checkLogin();
	}
	
	console.log("new Bungie");
	var bungie = new Bungie();
	return bungie;  
}); 