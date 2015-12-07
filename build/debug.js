var fs = require("fs"), _ = require("lodash");

var arrLines = fs.readFileSync("./ga.log.3.6.x").toString().split("\n");

var arrDebug = [], stDebug = {}, stDebug2 = {};

_.each(arrLines, function(line){
	var values = line.split("&");
	var tmp = {};
	_.each(values, function(value){
		var tokens = value.split("=");
		tmp[tokens[0]] = tokens[1];
	});
	arrDebug.push(tmp);
});

_.each(arrDebug, function(record){
	if (record && record.av && record.exd && record.av.indexOf("3.6.7") > -1 && record.t == "exception"){
		var error = unescape(record.exd);
		var value = ( record && record.an ) ? unescape(record.an) : unescape(record.dl);
		var key = error + value;
		var version = record.av;
		//console.log(record.av,key,value);
		if ( !(key in stDebug) )
			stDebug[key] = 0;
			
		if ( !(version in stDebug2) )
			stDebug2[version] = {}
		if ( !(error in stDebug2[version]) && value.indexOf("libraries") == -1 )
			stDebug2[version][error] = value;
		
		if ( error.indexOf("isStaticBrowser") > -1 ){
			console.log(record);
		}
		stDebug[key]++;
	}
});

console.log(JSON.stringify(stDebug2,null,4));