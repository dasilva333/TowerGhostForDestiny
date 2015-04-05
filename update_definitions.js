var fs = require("fs"),
	_ = require("lodash");
var bungieURL = "http://www.bungie.net";
var manifestURL = bungieURL+ "/Platform/Destiny/Manifest/";
var dbPath = "mobileWorldContent.db";
var jsonPath = "www/data/";
var neededFiles = [
	{ table: "DestinySandboxPerkDefinition", name: "perkDefs", key: "perkHash", reduce: function(item){
		return item;
	}},
	{ table: "DestinyInventoryItemDefinition", name: "itemDefs", key: "itemHash", reduce: function(item){
		var obj = item;
		delete obj.stats;
		delete obj.values;
		delete obj.sources;
		delete obj.itemLevels;
		delete obj.perkHashes;
		delete obj.sourceHashes;
		delete obj.equippingBlock;
		return obj;
	}},
	{ table: "DestinyTalentGridDefinition", name: "talentGridDefs", key: "gridHash", reduce: function(item){
		var obj = {};
		obj.nodes = _.where( item.nodes, { column: 5 });
		return obj;
	}},
	{ table: "DestinyRaceDefinition", name: "raceDefs", key: "raceHash", reduce: function(item){
		return item;
	}}
];
if ( fs.existsSync(dbPath) ){
	var sqlite3 = require('sqlite3').verbose();  
	var db = new sqlite3.Database(dbPath);
	neededFiles.forEach(function(set){
		db.all("SELECT * FROM " + set.table, function(err, rows) {
			if (err) return; 
			var filename = set.name + ".json";
			var obj = {};
	        rows.forEach(function (row) {  
				var entry = JSON.parse(row.json);
	            obj[entry[set.key]] = set.reduce(entry);
	        });
			fs.writeFileSync(jsonPath + filename, "_" + set.name + "="+JSON.stringify(obj));
	    });
	});	
	db.close(); 
}
else {
	var http = require("http"),
		zip = require('node-zip');
	http.get(manifestURL, function(res) {
		console.log("querying manifest");
		var data = []; // List of Buffer objects
		res.on("data", function(chunk) {
			data.push(chunk); // Append Buffer object
		});
		res.on("end", function() {
			var payload = JSON.parse(Buffer.concat(data));
			var mobileWorldContentPath = bungieURL + payload.Response.mobileWorldContentPaths.en;
			console.log("downloading mwcp");
			http.get(mobileWorldContentPath, function(res) {
				var data = []; // List of Buffer objects
				res.on("data", function(chunk) {
					data.push(chunk); // Append Buffer object
				});
				res.on("end", function() {
					console.log("going to unzip file");
					var payload = Buffer.concat(data);
					var unzipped = new zip(payload, {base64: false, compression:'DEFLATE', checkCRC32: true});
					var fileName = Object.keys(unzipped.files)[0];
					console.log("unzipping " + fileName);
					fs.writeFileSync(dbPath, unzipped.files[fileName]._data, 'binary');
				});
			})
		});
	})
}
