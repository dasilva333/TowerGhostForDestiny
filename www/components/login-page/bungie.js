define(['knockout', "jquery", "underscore", "components/login-page/cookies", "hasher", "Profile", "ProcessItem", "tgd"], function (ko, $, _, cookies, hasher, Profile, ProcessItem, tgd) {
	var Bungie = function() {
		var self = this,
			domain = 'bungie.net',
			apikey = '5cae9cdee67a42848025223b4e61f929', //this one is linked to dasilva333
			remoteURL = 'https://www.' + domain + '/';

		this.loggedOut = false;
		this.users = ko.observableArray();
		this.characters = ko.observableArray();
		this.bungled = ko.observable("");
		this.locale = ko.observable("en");
		this.defaultSystem = ko.computed(new tgd.StoreObj("defaultSystem"));
		this.preferredSystem = ko.computed(new tgd.StoreObj("preferredSystem"));
		this.isLoggedIn = ko.observable();
		this.isLoggedIn.subscribe(function(newValue){
			if (newValue == true){
				self.loadProfile();		
				hasher.setHash("home");
			}
			else {
				self.characters.removeAll();				
				hasher.setHash("");
			}
		});
		
		this.activeUser = ko.computed(function(){
			var activeSystem = self.defaultSystem();
			if (self.preferredSystem() != "") activeSystem = self.preferredSystem();
			return _.findWhere( self.users(), { type: parseInt(activeSystem) });
		});		
		
		this.isAuthenticated = function(callback){
			console.log("isAuthenticated");
			$.ajax({
				url: remoteURL  + "Platform/User/GetBungieNetUser/",
				headers: {
					"X-API-Key": apikey,
					"x-csrf": self.bungled()
				},
				success: function(resp){
					if (resp && resp.Message == "Ok"){
						console.log("good response");
						//self.users.removeAll();
						var data = resp.Response;
						if (data.gamerTag){
							self.users.push({id: data.gamerTag, type: 1});
							self.defaultSystem(1);
						}
						if (data.psnId){
							self.users.push({id: data.psnId, type: 2});
							self.defaultSystem(2);
						}
						self.isLoggedIn(true);
						callback(true, null);
					}
					else {
						self.isLoggedIn(false);
						callback(false, "");
					}
				}
			});
		}
		
		this.loadProfile = function(){
			self.getMembershipId(function(hasID){
				if (hasID){
					console.log("hasID " + hasID);
					self.getCharacters();
					self.getVault();
				}
			});
		}
		
		this.getCharacters = function(){
			var active = self.activeUser();
			$.ajax({
				url: remoteURL  + 'Platform/Destiny/Tiger' + (active.type == 1 ? 'Xbox' : 'PSN') + '/Account/' + active.membershipId + '/',
				headers: {
					"X-API-Key": apikey,
					"x-csrf": self.bungled()
				},
				success: function(resp){
					if (resp && resp.Message == "Ok"){
						var avatars = resp.Response.data.characters;
						avatars.forEach(function(character, index) {
							self.inventory(character.characterBase.characterId, function(response) {
								//console.time("new Profile");                  
								var profile = new Profile({
									order: index + 1,
									gender: "", //tgd.DestinyGender[character.characterBase.genderType],
									classType: "", //tgd.DestinyClass[character.characterBase.classType],
									id: character.characterBase.characterId,
									imgIcon: self.getUrl() + character.emblemPath,
									icon: self.makeBackgroundUrl(character.emblemPath),
									background: self.makeBackgroundUrl(character.backgroundPath),
									level: character.characterLevel,
									stats: character.characterBase.stats,
									percentToNextLevel: character.percentToNextLevel,
									race: "" //window._raceDefs[character.characterBase.raceHash].raceName
								});
								var items = [];
								Object.keys(response.data.buckets).forEach(function(bucket) {
									response.data.buckets[bucket].forEach(function(obj) {
										obj.items.forEach(function(item) {
											items.push(item);
										});
									});
								});
								items.forEach(ProcessItem(profile, bungie));
								//self.addWeaponTypes(profile.items());
								self.characters.push(profile);
							});
						});
					}
				}
			});
		}
		
		this.inventory = function(characterId, callback){
			var active = self.activeUser();
			$.ajax({
				url: remoteURL  + 'Platform/Destiny/' + active.type + '/Account/' + 
					active.membershipId + '/Character/' + characterId + '/Inventory/',
				headers: {
					"X-API-Key": apikey,
					"x-csrf": self.bungled()
				},
				success: function(resp){
					window.y = resp;
					if (resp && resp.Message == "Ok"){
						callback(resp.Response);
						window.a = resp;
					}
				}
			});	
		}
		
		this.getUrl = function(){
			return remoteURL;
		}
		
		this.makeBackgroundUrl = function(path, excludeDomain) {
			return 'url("' + (excludeDomain ? "" : remoteURL) + path + '")';
		}
		
		this.getVault = function(){
			var active = self.activeUser();
			$.ajax({
				url: remoteURL  + 'Platform/Destiny/' + active.type + '/MyAccount/Vault/',
				headers: {
					"X-API-Key": apikey,
					"x-csrf": self.bungled()
				},
				success: function(resp){
					if (resp && resp.Message == "Ok"){
						var buckets = resp.Response.data.buckets;
						var profile = new Profile({
							race: "",
							//order: self.vaultPos(),
							order: 0,
							gender: "Tower",
							classType: "Vault",
							id: "Vault",
							level: "",
							imgIcon: "assets/vault_icon.jpg",
							icon: self.makeBackgroundUrl("assets/vault_icon.jpg", true),
							background: self.makeBackgroundUrl("assets/vault_emblem.jpg", true)
						});

						buckets.forEach(function(bucket) {
							bucket.items.forEach(ProcessItem(profile, bungie));
						});
						self.characters.push(profile);
						//self.addTierTypes(profile.items());
						//self.addWeaponTypes(profile.weapons());
					}
				}
			});
		}
		
		this.getMembershipId = function(callback){
			var active = self.activeUser();
			$.ajax({
				url: remoteURL  + 'Platform/Destiny/' + active.type + '/Stats/GetMembershipIdByDisplayName/' + active.id + '/',
				headers: {
					"X-API-Key": apikey,
					"x-csrf": self.bungled()
				},
				success: function(resp){
					if (resp && resp.Message == "Ok"){
						console.log("assigning active user the id of " + resp.Response);
						active.membershipId = resp.Response;
						callback(true);
					}
					else {
						callback(false, resp);
					}
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
		
		this.performLogin = function(username, password, platform, callback){
			console.log("performLogin");
			$.ajax({
				url: remoteURL + "en/User/SignIn/" + ((platform == 1) ? "Xuid" : "Psnid"),
				success: function(r){
					console.log("performLogin:success");
					if ( platform == 1 ){
						var exp_urlpost = /urlPost:\'(https:\/\/.*?)\'/;
						var url_post = r.split(exp_urlpost)[1];
						var ex_ppft = /<input type="hidden" name="PPFT" id=".*" value="(.*?)"\/>/;
						var ppft = r.split(ex_ppft)[1];
						$.ajax({
							type: "post",
							url: url_post,
							data: { 'login': username, 'passwd': password, 'PPFT': ppft },
							success: function(){
								self.isAuthenticated(callback);
							}
						}); 
					}
					else { 
						$.ajax({
							type: "post",
							url: "https://auth.api.sonyentertainmentnetwork.com/login.do",
							data: { 'j_username': username, 'j_password': password },
							//Only Phonegap allows override of the Origin header
							headers: isMobile ? { "Origin": "https://auth.api.sonyentertainmentnetwork.com" } : {},
							success: function(){
								console.log("logindo:success");
								$.ajax({
									url: remoteURL,
									success: function(){
										self.isAuthenticated(callback);
									}
								});	
							}
						});
					}
				}
			});
		}
		
		
		this.checkLogin = function(callback){
			console.log("checking login");
			self.getApiKey(function(hasKey){
				console.log("hasKey " + hasKey);
				if (hasKey){
					self.isAuthenticated(function(isAuth){
						if(callback) callback(isAuth);
						console.log("isAuth " + isAuth);
					});
				}
			});
		}		
		
		this.getApiKey = function(callback){
			if ( isChrome ){
				chrome.cookies.getAll({ domain: '.' + domain }, function(cookies){
					var apiCookie = _.findWhere(cookies, { name: "bungled" });
					if (apiCookie){
						self.bungled( apiCookie.value );
						callback(true);
					}
					else {
						$.ajax({
							url: remoteURL,
							success: function(){
								console.log("we have a bungled? " + self.bungled());
								callback(self.bungled() != "");
							}							
						});						
					}
				});
			}
			else if (isMobile){
				console.log("blank api key");
				if (self.bungled() == ""){
					$.ajax({ 
						url: remoteURL, 
						complete: function(resp){ 
							console.log("hit homepage got new key");
							var header = resp.getResponseHeader('Set-Cookie');
							if (header){
								var jar = cookies.parse(header, remoteURL);
								var bungled = _.findWhere( jar.toJSON().cookies, { key: "bungled"}).value;
								console.log("new key is " + bungled);
								self.bungled(bungled);
								callback(true);
							}
							else {
								callback(false);
							}
						} 
					});
				}
				else {
					callback(true);
				}
			}
		}
		
		this.directLogin = function(username, password, platform, callback){
			self.getApiKey(function(hasKey){
				if (hasKey){
					self.performLogin(username, password, platform, callback);
				}
				else {
					callback(false);
				}				
			});
		}
		
		this.logout = function(){
			$.ajax({
				url: remoteURL + "en/User/SignOut",
				success: function(){
					self.loggedOut = true;
					self.isLoggedIn(false)
				}
			});
		}
		
		this.useXboxAccount = function(){
			self.preferredSystem(1);
			self.characters.removeAll();
			self.loadProfile();
		}
		
		this.usePlaystationAccount = function(){
			self.preferredSystem(2);
			self.characters.removeAll();
			self.loadProfile();
		}
		
		this.hasBothAccounts = ko.computed(function(){
			return self.users().length == 2;
		});
		
		hasher.setHash("");
		if (isChrome){
			/* Sony is blocking requests to their API if it includes an Origin header */
			chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
	           for (var i = 0; i < details.requestHeaders.length; ++i) {
	             if (details.requestHeaders[i].name === 'Origin') {
	               details.requestHeaders.splice(i, 1);
	               break;
	             }
	           }     
	          return {requestHeaders: details.requestHeaders};
	        },
	        {urls: ["https://auth.api.sonyentertainmentnetwork.com/login.do"]},
	        ["blocking", "requestHeaders"]);
			/* Acquire Bungie.net's bungled key on demand */
			chrome.webRequest.onHeadersReceived.addListener(function(details){
				var header = _.pluck(_.where( details.responseHeaders, { name: "set-cookie" }),'value').join(",");
				var jar = cookies.parse(header, remoteURL);
				var bungled = _.findWhere( jar.toJSON().cookies, { key: "bungled"});
				if (bungled && bungled.value){				
					console.log("new key is " + bungled.value);
					self.bungled(bungled.value);
				}
			 },
			{urls: [remoteURL]},["responseHeaders"]) 
		}		
	}
	
	console.log("new Bungie");
	var bungie = new Bungie();
	

	return bungie;  
});