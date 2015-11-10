module.exports = function (grunt) {	
	grunt.registerMultiTask('generate-version', 'Generate updated files with the new version number', function () {
		
		var _ = require("lodash");
		var options = this.options({ platforms: [ "ios", "android", "windows-phone" ], showWhatsNew: "false" });
		var done = this.async();
		
		grunt.file.setBase(options.cwd);
		
		var builderInfo = JSON.parse(grunt.file.read(options.versionFile));
		var versionInfo = builderInfo.version;
		
		console.log("Applying version: " + versionInfo + " to files available");
		
		var chromeConfig = JSON.parse(grunt.file.read(options.chromeConfigFile));
		chromeConfig.version = versionInfo;
		grunt.file.write(options.chromeConfigFile, JSON.stringify(chromeConfig, null, 2));
		
		
		var firefoxConfig = JSON.parse(grunt.file.read(options.firefoxConfigFile));
		firefoxConfig.version = versionInfo;
		grunt.file.write(options.firefoxConfigFile, JSON.stringify(firefoxConfig, null, 2));

		var nwConfig = JSON.parse(grunt.file.read(options.nwConfigFile));
		nwConfig.version = versionInfo;
		grunt.file.write(options.nwConfigFile, JSON.stringify(nwConfig, null, 2));
		
		_.each(options.platforms, function(platform){
			var adobeBuildConfigFile = "../www/config_" + platform + ".xml";
			var xmlConfig = grunt.file.read(adobeBuildConfigFile).toString("utf8");
			//avoid having to load xml libraries to update it
			xmlConfig = xmlConfig.replace(/version="(.*)" xmlns=\"http:\/\/www.w3.org\/ns\/widgets\"/,'version="' + versionInfo + '" xmlns="http://www.w3.org/ns/widgets"');
			xmlConfig = xmlConfig.replace(/id=\"com.richardpinedo.towerghostfordestiny\" versionCode="(.*)" version/,'id=\"com.richardpinedo.towerghostfordestiny\" versionCode="' + versionInfo.replace(/\./g,'') + '" version');
			grunt.file.write(adobeBuildConfigFile, xmlConfig);
		});

		var indexContent = grunt.file.read(options.indexHomePage).toString("utf8");
		indexContent = indexContent.replace(/<span class=\"version\">(.*)<\/span>/g,'<span class=\"version\">' + versionInfo + '</span>');
		indexContent = indexContent.replace(/<div id=\"showwhatsnew\" style=\"display:none;\">(.*)<\/div>/g,'<div id=\"showwhatsnew\" style=\"display:none;\">' + options.showWhatsNew + '</div>');
		grunt.file.write(options.indexHomePage, indexContent);
		
		var aboutContent = grunt.file.read(options.aboutPage).toString("utf8");
		aboutContent = aboutContent.replace(/<span class=\"version\">(.*)<\/span>/g,'<span class=\"version\">' + versionInfo + '</span>');
		grunt.file.write(options.aboutPage, aboutContent);

		var versionContent = grunt.file.read(options.versionScript).toString("utf8");
		versionContent = versionContent.replace(/tgd.version = \"(.*)\";/g,'tgd.version = \"' + versionInfo + '\";');
		grunt.file.write(options.versionScript, versionContent);
		
		done();

	});
}