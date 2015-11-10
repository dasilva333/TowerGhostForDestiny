module.exports = function(grunt) {
	grunt.config.set('generate-version',{
      show: {
        options: {
			cwd: "./",
			showWhatsNew: true,
			versionFile: "package.json",
			chromeConfigFile: "../manifest.json",
			firefoxConfigFile: "../package_firefox.json",
			nwConfigFile: "../package_nw.json",
			indexHomePage: "../www/templates/navbar-template.tmpl.html",
			aboutPage: "../www/templates/about-template.tmpl.html",
			versionScript: "../www/js/tgd/version.js"
        }
      },
	  hide: {
        options: {
			cwd: "./",
			showWhatsNew: true,
			versionFile: "package.json",
			chromeConfigFile: "../manifest.json",
			firefoxConfigFile: "../package_firefox.json",
			nwConfigFile: "../package_nw.json",
			indexHomePage: "../www/templates/navbar-template.tmpl.html",
			aboutPage: "../www/templates/about-template.tmpl.html",
			versionScript: "../www/js/tgd/version.js"
        }
      }
    });

};
	