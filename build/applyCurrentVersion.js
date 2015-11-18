
var xmlConfig = grunt.file.read(adobeBuildConfigFile).toString("utf8");
var versionCode = threeDigitVersion.replace(/\./g,'') + '0';
//avoid having to load xml libraries to update it
xmlConfig = xmlConfig.replace(/version="(.*)" xmlns=\"http:\/\/www.w3.org\/ns\/widgets\"/,'version="' + versionInfo + '" xmlns="http://www.w3.org/ns/widgets"');
xmlConfig = xmlConfig.replace(/id=\"com.richardpinedo.towerghostfordestiny\" versionCode="(.*)" version/,'id=\"com.richardpinedo.towerghostfordestiny\" versionCode="' + versionCode + '" version');
grunt.file.write(adobeBuildConfigFile, xmlConfig);