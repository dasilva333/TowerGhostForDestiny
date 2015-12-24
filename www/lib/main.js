var { ActionButton } = require("sdk/ui/button/action");
var tabs = require("sdk/tabs");
var data = require("sdk/self").data;
var localPath = data.url("");
var pageUrl = "https://towerghostfordestiny.com/firefox/";
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
	var cookieValue = "", cookieMgr = Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager2);
	for (var e = cookieMgr.getCookiesFromHost("bungie.net"); e.hasMoreElements();) {
		var cookie = e.getNext().QueryInterface(Ci.nsICookie);
		if (cookie.name == "bungled"){
			cookieValue = cookie.value;
		}
	}
	return cookieValue;
}

pageMod.PageMod({
  include: [ pageUrl + '*' ],
  contentScriptFile: data.url("resources/firefox.js"),
  contentScriptWhen: "end",
  contentScriptOptions: {
	localPath: localPath
  },
  onAttach: function(worker) {
	worker.port.on("request-cookie-from-cs", function(){
		var cookie = getBungledCookie();
		worker.port.emit("response-cookie-from-as", cookie);
	});
  }
});