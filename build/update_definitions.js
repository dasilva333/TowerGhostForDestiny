var http = require("http"),
	fs = require("fs"),
	_ = require("lodash");
var bungieURL = "http://www.bungie.net";
var manifestURL = bungieURL+ "/Platform/Destiny/Manifest/";
var jsonPath = "../www/data/";
var neededFiles = [
	{ table: "DestinySandboxPerkDefinition", name: "perkDefs", key: "perkHash", reduce: function(item){
		return item;
	}},
	{ table: "DestinyInventoryItemDefinition", name: "itemDefs", key: "itemHash", reduce: function(item){
		var obj = item;
		try {
			obj.itemName = encodeURIComponent(obj.itemName);
		}catch(e){
			console.log(e);
			console.log(obj.itemName);
		}		
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
	}}
];
var queue = [];
var cacheIcons = function(){
	var icon = queue.pop();
	if ( !fs.existsSync(jsonPath + icon) ){
		console.log("downloading icon");
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
	else {
		if (queue.length > 0)
			cacheIcons();
	}
}
if ( fs.existsSync("mobileWorldContent_en.db") ){
	var sqlite3 = require('sqlite3').verbose();
	var dbFiles = fs.readdirSync(".").filter(function(file){
		return file.indexOf("mobileWorldContent") > -1;
	});
	_.each(dbFiles, function(file){
		var locale = file.split("_")[1].split(".")[0];
		var db = new sqlite3.Database(file);
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
				if (locale == "en"){
					console.log('writing file: ' + filename);
					fs.writeFileSync(jsonPath + filename, "_" + set.name + "="+JSON.stringify(obj));
				}
				else {
					var dataPath = "./locale/" + locale + "/";
					console.log('saving file: ' + filename);
					if (!fs.existsSync(dataPath)){
						fs.mkdirSync(dataPath);
					}
					fs.writeFileSync(dataPath + filename, JSON.stringify(obj));
				}
			});
		});	
		db.close();
	});	
	var contents = JSON.parse(fs.readFileSync(jsonPath + "itemDefs.js").toString("utf8").replace("_itemDefs=",""));
	_.each(contents, function(item){
		queue.push(item.icon);
	});
	cacheIcons();
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
			var languages = payload.Response.mobileWorldContentPaths;
			_.each(languages, function(link, locale){
				var mobileWorldContentPath = bungieURL + payload.Response.mobileWorldContentPaths[locale];
				console.log("downloading mwcp in " + locale);
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
						fs.writeFileSync("mobileWorldContent_" +  locale + ".db", unzipped.files[fileName]._data, 'binary');
					});
				})
			});
		});
	})
}
