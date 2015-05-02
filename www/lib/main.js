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

var getFirefoxCookie = function(){
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
	console.log("result: " + cookieValue);
	return cookieValue;
}

var data = require("sdk/self").data;
var pageUrl = data.url("index.html");
var pageMod = require("sdk/page-mod");

tabs.on('ready', function(tab) {
	if (tab.url == pageUrl){
		var cookieValue = getFirefoxCookie();
		//console.log("cookieValue: " + cookieValue);
		tab.attach({
		    contentScriptFile: data.url("js/firefox.js"),
			contentScriptOptions: {"token" : cookieValue } //referenced as self.options.token
		});	
	}
});

function handleClick(state) {
 	var tab = tabs.open({
		url: pageUrl,
		onOpen: function(tab){
			var cookieValue = getFirefoxCookie();
			console.log("cookieValue: " + cookieValue);
			var worker = tab.attach({
			    contentScriptFile: data.url("js/firefox.js"),
				contentScriptWhen: "start",
				contentScriptOptions: {"token" : cookieValue } //referenced as self.options.token
			});	
			console.log(worker);
			worker.port.on("get-cookie", function(){
				console.log("get-cookie request received");
				worker.port.emit("cookie", getFirefoxCookie);
			});
		}
	});
}