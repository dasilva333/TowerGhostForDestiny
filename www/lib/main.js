var { ActionButton } = require("sdk/ui/button/action");
var tabs = require("sdk/tabs");

var button = ActionButton({
  id: "tgd-link",
  label: "Tower Ghost For Destiny",
  icon: {
    "16": "./assets/icon16.png",
    "32": "./assets/icon32.png",
    "64": "./assets/icon64.png"
  },
  onClick: handleClick
});

var data = require("sdk/self").data;
var pageUrl = data.url("index.html");
var pageMod = require("sdk/page-mod");

function getBungieCookies(){
	var {Cc, Ci} = require("chrome");
	var cookieValue = "", cookieMgr = Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager);
	for (var e = cookieMgr.enumerator; e.hasMoreElements();) {
	  var cookie = e.getNext().QueryInterface(Ci.nsICookie);
	  if (cookie.host.indexOf("bungie.net") > -1){
		if (cookie.name == "bungled"){
			cookieValue = cookie.value;
		}	
	  } 
	}
	return cookieValue;
}

tabs.on('ready', function(tab) {
	if (tab.url == pageUrl){
		var cookieValue = getBungieCookies();
		console.log("cookieValue: " + cookieValue);
		worker = tab.attach({
		    contentScriptFile: data.url("js/firefox.js"),
			contentScriptWhen: "start",
			contentScriptOptions: {"token" : cookieValue } //referenced as self.options.token
		});
		worker.port.on("request-cookie", function(){
			console.log("main.js received request");
			worker.port.emit("response-cookie", getBungieCookies());
		});
	}
});

function handleClick(state) {
 	var tab = tabs.open(pageUrl);
}