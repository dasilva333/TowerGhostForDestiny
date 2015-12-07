var fs = require("fs");

if ( process.argv.length < 2 ){
	console.log("requires platform param");	
	return process.exit(0);
}
var platform = process.argv[2];

var adobeBuildConfigFile = __dirname +  "/config_" + platform + ".xml";
var adobeBuildOutputConfigFile = __dirname + "/config_" + platform + "_versioned.xml";
var versionInfo = fs.readFileSync(__dirname + "/version.txt").toString("utf8");
var xmlConfig = fs.readFileSync(adobeBuildConfigFile).toString("utf8");
var versionCode = versionInfo.replace(/\./g,'');
if ( platform == "ios" ){
	versionInfo = versionInfo.substring(0,5);
}
//avoid having to load xml libraries to update it
xmlConfig = xmlConfig.replace(/version="(.*)" xmlns=\"http:\/\/www.w3.org\/ns\/widgets\"/,'version="' + versionInfo + '" xmlns="http://www.w3.org/ns/widgets"');
xmlConfig = xmlConfig.replace(/id=\"com.richardpinedo.towerghostfordestiny\" versionCode="(.*)" version/,'id=\"com.richardpinedo.towerghostfordestiny\" versionCode="' + versionCode + '" version');
fs.writeFileSync(adobeBuildOutputConfigFile, xmlConfig);