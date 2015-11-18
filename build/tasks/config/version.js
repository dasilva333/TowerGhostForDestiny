module.exports = function(grunt) {
	grunt.config.set('generate-version',{
      show: {
        options: {
			cwd: "./",
			showWhatsNew: true,
			versionFile: "version.txt",
			chromeConfigFile: "../manifest.json",
			firefoxConfigFile: "package_firefox.json",
			nwConfigFile: "package_nw.json",
			versionScript: "../www/js/tgd/version.js"
        }
      }
    });

};
	