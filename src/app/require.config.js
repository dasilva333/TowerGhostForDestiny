// require.js looks for the following global when initializing
var require = {
    baseUrl: ".",
    paths: {
        "bootstrap":            "bower_modules/components-bootstrap/js/bootstrap.min",
        "crossroads":           "bower_modules/crossroads/dist/crossroads.min",
        "hasher":               "bower_modules/hasher/dist/js/hasher.min",
        "jquery":               "bower_modules/jquery/dist/jquery",
		"underscore":           "bower_modules/underscore/underscore",
        "knockout":             "bower_modules/knockout/dist/knockout",
        "knockout-projections": "bower_modules/knockout-projections/dist/knockout-projections",
        "signals":              "bower_modules/js-signals/dist/signals.min",
        "text":                 "bower_modules/requirejs-text/text",
		"json":                 "bower_modules/requirejs-json/json",
		"dash":                 "components/nav-bar/dash",
		"tk_i18n": 				"components/locale/tk_i18n",
		"tgd_strings": 			"components/locale/strings",
		"fastclick": 			"components/template/fastclick-ko",
		"fastclick-lib":		"components/template/fastclick-lib",
		"bungie":				"components/login-page/bungie",
		"Profile":				"components/home-page/Profile",
		"Item":					"components/home-page/Item",
		"ProcessItem":			"components/home-page/ProcessItem",
		"tgd":					"components/home-page/tgd"
    },
    shim: {
        "bootstrap": { deps: ["jquery"] },
		"dash": { deps: ["jquery"] }
    },
	callback: function(){
		require.config({
			i18n: {
				locale: "fr"
			}
		});
	}
};
