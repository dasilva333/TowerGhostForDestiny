var jsDir = "../www/js/";
var fs = require("fs");
var _ = require("lodash");
var crypto = require("crypto");
var http = require("http");
var https = require("https");
var files = [];
var verification = {};

// List all files in a directory in Node.js recursively in a synchronous fashion
var walkSync = function(dir, filelist) {
  var fs = fs || require('fs'),
      files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      filelist = walkSync(dir + '/' + file, filelist);
    }
    else {
      filelist.push(dir + '/' + file);
    }
  });
  return filelist;
};


var files = walkSync(jsDir);

var sources = require(jsDir + "sources.js");

var count = 0;
var finish = function(){
	count++;
	if (count == sources.length){
		fs.writeFileSync(jsDir +  "sources.txt", JSON.stringify(verification,null,4));
	}
}
var StringDecoder = require('string_decoder').StringDecoder;
_.each(sources, function(file){
	var fileName = Object.keys(file)[0];
	var link = file[fileName];
	var currentFile = _.filter(files, function(localFile){
		return localFile.indexOf('/' + fileName) > -1;
	})[0];
	if (!currentFile) console.log("NOT FOUND: " + fileName);
	var localHash = crypto.createHash('sha256').update(fs.readFileSync(currentFile)).digest("hex");
	(link.indexOf("https") > -1 ? https : http).get(link, function(res){
		var data = [];
		res.on("data", function(chunk){
			data.push(chunk);
		});
		res.on("end", function(){
			var buffer = Buffer.concat(data);
			var remoteHash = crypto.createHash('sha256').update(buffer).digest("hex");		
			tmp = verification[fileName] = { currentFile: currentFile, fileName: fileName, link: link, localHash: localHash, remoteHash: remoteHash };
			/*if ( fileName == "jquery-idletimer.js" ){
				console.log(fs.readFileSync(currentFile).length);
				console.log(buffer.length);
				//console.log(data);
				//console.log(res);
				console.log(tmp);
				abort;
			}*/
			if (tmp.localHash != tmp.remoteHash){
				console.log("FAILED Verification for: " + tmp.fileName);
				console.log(tmp);
				if ( buffer.length > 0 )
					fs.writeFileSync(currentFile, buffer);
			}
			finish();
		});
	});
	
});
