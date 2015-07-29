var { ActionButton } = require("sdk/ui/button/action");
var tabs = require("sdk/tabs");
var data = require("sdk/self").data;
var pageUrl = data.url("index.html");
var pageMod = require("sdk/page-mod");

var button = ActionButton({
  id: "tgd-link",
  label: "Tower Ghost For Destiny",
  icon: {
    "16": "./assets/icon16.png",
    "32": "./assets/icon32.png",
    "64": "./assets/icon64.png"
  },
  onClick: function handleClick(state) {
		tabs.open(pageUrl);
	}
});

function getBungledCookie(){
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
		worker = tab.attach({
		    contentScriptFile: data.url("js/firefox.js")
		});
		worker.port.on("request-cookie-from-cs", function(){
			console.log("request-cookie-from-cs");
			worker.port.emit("response-cookie-from-as", getBungledCookie());
		});
	}
});

