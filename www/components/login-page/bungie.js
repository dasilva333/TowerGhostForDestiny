define(['knockout', "jquery", "underscore", "components/login-page/cookies", "hasher", "Profile", "ProcessItem"], function (ko, $, _, cookies, hasher, Profile, ProcessItem) {
	var Bungie = function() {
		var self = this,
			domain = 'bungie.net',
			apikey = '5cae9cdee67a42848025223b4e61f929', //this one is linked to dasilva333
			remoteURL = 'https://www.' + domain + '/';

		this.users = ko.observableArray();
		this.characters = ko.observableArray();
		this.bungled = ko.observable("");
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
		
		this.activeUser = ko.computed(function(){
			return _.findWhere( self.users(), { type: self.defaultSystem() });
		});
		
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
			else if (isMobile){
				callback( self.bungled() !== "" );
			}
		}
		
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
		
		this.loadProfile = function(){
			self.getMembershipId(function(hasID){
				if (hasID){
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
								items.forEach(ProcessItem(profile));
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
							bucket.items.forEach(ProcessItem(profile));
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
						active.membershipId = resp.Response;
						callback(true);
					}
					else {
						callback(false, resp);
					}
				}
			});
		}
		
		this.checkLogin = function(){
			console.log("checking login");
			self.hasApiKey(function(hasKey){
				console.log("hasKey " + hasKey);
				if (hasKey){
					self.isAuthenticated(function(isAuth){
						console.log("isAuth " + isAuth);
						if (isAuth){
							self.isLoggedIn(true);
							self.loadProfile();
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
		
		this.performLogin = function(username, password, platform){
			$.ajax({
				url: remoteURL + "en/User/SignIn/" + ((platform == 1) ? "Xuid" : "Psnid"),
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
						$.ajax({
							url: "https://auth.api.sonyentertainmentnetwork.com/login.jsp?request_locale=en_US&request_theme=liquid",
							complete: function(resp){
							   console.log("2nd header"); 
							   var auth = resp.getResponseHeader('Set-Cookie');
							   console.log(auth);
							   $.ajax({
									type: "post",
									url: "https://auth.api.sonyentertainmentnetwork.com/login.do",
									data: { 'j_username': username, 'j_password': password },
									headers: { Cookie: "JSESSIONID=57302AD726EAC0A38738A7B455B42737.lvp-p2-npversat01-4809" },
									success: function(resp, statusText){ 
										console.log(resp.status);
										console.log(statusText);
										/* I'm getting a 403 here should be a 302, not sure why. http://bungienetplatform.wikia.com/wiki/Authentication */
										
									},
									complete: function(resp, statusText){
									   console.log("3rd header");
									   console.log(resp.status);
									   console.log(statusText);
									   console.log(resp.responseText);
									   console.log(resp.getResponseHeader('Set-Cookie'));
									}
								});
							}
						});
					}
				}, 
				complete: function(resp){ 
					console.log("first header");
					console.log(resp.getResponseHeader('Set-Cookie')) 
				}
			});
		}
		
		this.directLogin = function(username, password, platform){
			if (self.bungled() == ""){
				$.ajax({ 
					url: remoteURL, 
					complete: function(resp){ 
						var jar = cookies.parse(resp.getResponseHeader('Set-Cookie'), remoteURL);
						var bungled = _.findWhere( jar.toJSON().cookies, { key: "bungled"}).value;;
						self.bungled(bungled);
						self.performLogin(username, password, platform);
					} 
				});
			}
			else {
				self.performLogin(username, password, platform);
			}
		}
		
		hasher.setHash("");
		self.checkLogin();
	}
	
	console.log("new Bungie");
	var bungie = new Bungie();
	return bungie;  
});