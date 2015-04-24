var http = require("http"),
	fs = require("fs"),
	_ = require("lodash");
var bungieURL = "http://www.bungie.net";
var manifestURL = bungieURL+ "/Platform/Destiny/Manifest/";
var dbPath = "mobileWorldContent.db";
var jsonPath = "../www/data/";
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
		delete obj.exclusive;
		delete obj.maxStackSize;
		delete obj.actionName;
		delete obj.hasGeometry;
		delete obj.rewardItemHash;
		delete obj.primaryBaseStatHash;
		delete obj.nonTransferrable;
		delete obj.statGroupHash;
		delete obj.qualityLevel;
		delete obj.specialItemType;
		return obj;
	}},
	{ table: "DestinyTalentGridDefinition", name: "talentGridDefs", key: "gridHash", reduce: function(item){
		return item;
		var obj = {};
		obj.nodes = _.where( item.nodes, { column: 5 });
		return obj;
	}},
	{ table: "DestinyRaceDefinition", name: "raceDefs", key: "raceHash", reduce: function(item){
		return item;
	}},
	{ table: "DestinyStatDefinition", name: "statDefs", key: "statHash", reduce: function(item){
		delete item.statDescription;
		delete item.icon;
		return item;
	}},
	{ table: "DestinyProgressionDefinition", name: "progressionDefs", key: "progressionHash", reduce: function(item){
		delete item.icon;
		return item;
	}},
];
var queue = [];
var cacheIcons = function(){
	var icon = queue.pop();
	http.get(bungieURL + icon, function(res) {
		var data = []; // List of Buffer objects
		res.on("data", function(chunk) {
			data.push(chunk); // Append Buffer object
		});
		res.on("end", function() {
			fs.writeFileSync(jsonPath + icon, Buffer.concat(data));
			if (queue.length > 0)
				cacheIcons();
		});
	});	
}
if ( fs.existsSync(dbPath) ){
	var sqlite3 = require('sqlite3').verbose();  
	var db = new sqlite3.Database(dbPath);
	neededFiles.forEach(function(set){
		db.all("SELECT * FROM " + set.table, function(err, rows) {
			if (err) return; 
			var filename = set.name + ".js";
			var patchFile = set.name + ".patch";
			var obj = {};
	        rows.forEach(function (row) {  
				var entry = JSON.parse(row.json);
	            obj[entry[set.key]] = set.reduce(entry);
	        });
			if (fs.existsSync(patchFile)){
				console.log("found patch file " + patchFile);
				var patchData = JSON.parse(fs.readFileSync(patchFile));
				_.extend(obj, patchData);
			}
			fs.writeFileSync(jsonPath + filename, "_" + set.name + "="+JSON.stringify(obj));
	    });
	});	
	db.close();
	var contents = JSON.parse(fs.readFileSync(jsonPath + "itemDefs.js").toString("utf8").replace("_itemDefs=",""));
	_.each(contents, function(item){
		queue.push(item.icon);
	});
	// cacheIcons();
}
else {
	var zip = require('node-zip');
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
