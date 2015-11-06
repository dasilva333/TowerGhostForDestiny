var builderInfo = require("./package.json"),
	fs = require("fs");

var versionInfo = builderInfo.version;

var chromeConfigFile = "../manifest.json";
var chromeConfig = require(chromeConfigFile);
chromeConfig.version = versionInfo;
fs.writeFileSync(chromeConfigFile, JSON.stringify(chromeConfig, null, 2));

var firefoxConfigFile = "../package_firefox.json";
var firefoxConfig = require(firefoxConfigFile);
firefoxConfig.version = versionInfo;
fs.writeFileSync(firefoxConfigFile, JSON.stringify(firefoxConfig, null, 2));

var nwConfigFile = "../package_nw.json";
var nwConfig = require(nwConfigFile);
nwConfig.version = versionInfo;
fs.writeFileSync(nwConfigFile, JSON.stringify(nwConfig, null, 2));

var adobeBuildConfigFile = "../www/config.xml";
var xmlConfig = fs.readFileSync(adobeBuildConfigFile).toString("utf8");
//avoid having to load xml libraries to update it
xmlConfig = xmlConfig.replace(/version="(.*)" xmlns=\"http:\/\/www.w3.org\/ns\/widgets\"/,'version="' + versionInfo + '" xmlns="http://www.w3.org/ns/widgets"');
xmlConfig = xmlConfig.replace(/id=\"com.richardpinedo.towerghostfordestiny\" versionCode="(.*)" version/,'id=\"com.richardpinedo.towerghostfordestiny\" versionCode="' + versionInfo.replace(/\./g,'') + '0" version');

fs.writeFileSync(adobeBuildConfigFile, xmlConfig);

var indexHomePage = "../www/index.html";
var indexContent = fs.readFileSync(indexHomePage).toString("utf8");
indexContent = indexContent.replace(/<span class=\"version\">(.*)<\/span>/g,'<span class=\"version\">' + versionInfo + '</span>');

var versionScript = "../www/js/tgd/version.js";
var versionContent = fs.readFileSync(versionScript).toString("utf8");
versionContent = versionContent.replace(/tgd.version = \"(.*)\";/g,'tgd.version = \"' + versionInfo + '\";');
fs.writeFileSync(versionScript, versionContent);


//show the whatsnew in the next version number
var whatsNew = {
	doShow: "false"/*,
	content: fs.readFileSync("../www/whatsnew.html").toString("utf8")*/
}
if ( process.argv[2] ){
	whatsNew.doShow = "true";
}
//indexContent = indexContent.replace(/<div id=\"whatsnew\" style=\"display:none;\">(.*)<\/div>/g,'<div id="whatsnew" style="display:none;">' + escape(JSON.stringify(whatsNew)) + '</div>');
indexContent = indexContent.replace(/<div id=\"showwhatsnew\" style=\"display:none;\">(.*)<\/div>/g,'<div id=\"showwhatsnew\" style=\"display:none;\">' + whatsNew.doShow + '</div>');

fs.writeFileSync(indexHomePage, indexContent);

require("./code_format");