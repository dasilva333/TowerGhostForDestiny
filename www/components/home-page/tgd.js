define(['knockout', "underscore"], function(ko, _){
	var tgd = {};
	tgd.getStoredValue = function(key) {
		var saved = "";
		if (window.localStorage && window.localStorage.getItem)
			saved = window.localStorage.getItem(key);
		if (_.isEmpty(saved)) {
			return tgd.defaults[key];
		} else {
			return saved
		}
	}

	tgd.StoreObj = function(key, compare, writeCallback) {
		var value = ko.observable(compare ? tgd.getStoredValue(key) == compare : tgd.getStoredValue(key));
		this.read = function() {
			return value();
		}
		this.write = function(newValue) {
			window.localStorage.setItem(key, newValue);
			value(newValue);
			if (writeCallback) writeCallback(newValue);
		}
	}

	tgd.defaults = {
		searchKeyword: "",
		doRefresh: isMobile ? false : "true",
		refreshSeconds: 300,
		tierFilter: 0,
		typeFilter: 0,
		dmgFilter: [],
		activeView: 0,
		progressFilter: 0,
		showDuplicate: false,
		setFilter: [],
		shareView: false,
		shareUrl: "",
		showMissing: false,
		tooltipsEnabled: isMobile ? false : "true",
		autoTransferStacks: false,
		padBucketHeight: false,
		xsColumn: 12,
		smColumn: 6,
		mdColumn: 4,
		lgColumn: 3,
		//device and bungie locale
		locale: "en",
		//user interface set locale
		appLocale: "",
		//internally cached version of the itemDefs
		defsLocale: "en",
		//as of 2.7.0 I added versioning to itemDefs so the default would be this for everyone
		defLocaleVersion: "2.7.0",
		vaultPos: 0,
		itemDefs: "",
		preferredSystem: "PSN"
	};
	
	return tgd;
});