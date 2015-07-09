define(["./toughCookie"], function (toughCookie) {
	var Cookies = function() {
		var self = this;
		var cookieGroups = /(.*?),(?! \d\d-) ?|(.+)/
		
		this.parse = function(header, domain){
			var cookiejar = new toughCookie.CookieJar();
			header.split(cookieGroups).forEach(function(c){
				if (c){
					var cookie = toughCookie.Cookie.parse(c);
					cookiejar.setCookieSync(cookie, domain);
				}
			});
			return cookiejar;
		}
	};
	
	var cookies = new Cookies();
	return cookies;  
}); 			