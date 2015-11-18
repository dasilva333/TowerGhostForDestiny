module.exports = function (grunt) {	
	grunt.registerMultiTask('generate-version', 'Generate updated files with the new version number', function () {
		
		var _ = require("lodash");
		var options = this.options({ platforms: [ "ios", "android", "windows-phone" ], showWhatsNew: "false" });
		var done = this.async();
		
		grunt.file.setBase(options.cwd);
		
		var versionInfo = grunt.file.read(options.versionFile);
		var threeDigitVersion = versionInfo.substr(0,5);
		
		console.log("Applying 4 digit version: " + versionInfo + ", 3 digit version: " + threeDigitVersion);
		
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
			var adobeBuildConfigFile = "config_" + platform + ".xml";
			var xmlConfig = grunt.file.read(adobeBuildConfigFile).toString("utf8");
			var versionCode = versionInfo.replace(/\./g,'');
			//avoid having to load xml libraries to update it
			xmlConfig = xmlConfig.replace(/version="(.*)" xmlns=\"http:\/\/www.w3.org\/ns\/widgets\"/,'version="' + versionInfo + '" xmlns="http://www.w3.org/ns/widgets"');
			xmlConfig = xmlConfig.replace(/id=\"com.richardpinedo.towerghostfordestiny\" versionCode="(.*)" version/,'id=\"com.richardpinedo.towerghostfordestiny\" versionCode="' + versionCode + '" version');
			grunt.file.write(adobeBuildConfigFile, xmlConfig);
		});

		var versionContent = grunt.file.read(options.versionScript).toString("utf8");
		versionContent = versionContent.replace(/tgd.version = \"(.*)\";/g,'tgd.version = \"' + versionInfo + '\";');
		grunt.file.write(options.versionScript, versionContent);
		
		done();

	});
}