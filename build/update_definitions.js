var purgeCache = (process.argv.length == 3 && process.argv[2] == "true")

var http = require("http"),
	https = require("https"),
	sqlite3 = require('sqlite3').verbose(),
	fs = require("fs"),
	zip = require('node-zip'),
	_ = require("lodash");

var jsonPath = "../www/data/";
var manifestVersionFile = "manifestVersion";
var definitionPath = jsonPath + "definitions/";
var imgPath = "/common/destiny_content/icons/";
var remoteBungieURL = "www.bungie.net";
var secureBungieURL = "https://" + remoteBungieURL;
var publicBungieURL = "http://" + remoteBungieURL;
var manifestURL = "/Platform/Destiny/Manifest/";
var apikey = '5cae9cdee67a42848025223b4e61f929';
var neededFiles = [
	{ table: "DestinySandboxPerkDefinition", name: "perkDefs", key: "perkHash", reduce: function(item){
		return item;
	}},
	{ table: "DestinyInventoryItemDefinition", name: "itemDefs", key: "itemHash", reduce: function(item){
		var obj = item;
		if ( obj.itemHash == "194424267" ){
			obj.bucketTypeHash = "2973005342";
			obj.itemName = "Barrier Ethos";
			obj.equippable = true;
			obj.itemTypeName = "Armor Shader";
			obj.icon = "/img/misc/missing_icon.png";
			obj.itemDescription = "Equip this shader to change the color of your armor.";
		} else if ( obj.itemHash == "194424268" ){
			obj.bucketTypeHash = "2973005342";
			obj.itemName = "Sparklepony";
			obj.equippable = true;
			obj.itemTypeName = "Armor Shader";
			obj.icon = "/img/misc/missing_icon.png";
			obj.itemDescription = "Equip this shader to change the color of your armor.";
		} else if ( obj.itemHash == "194424269" ){
			obj.bucketTypeHash = "2973005342";
			obj.itemName = "The Ointment";
			obj.equippable = true;
			obj.itemTypeName = "Armor Shader";
			obj.icon = "/img/misc/missing_icon.png";
			obj.itemDescription = "Equip this shader to change the color of your armor.";
		} else if ( obj.itemHash == "1759332263" ){
			obj.bucketTypeHash = "2973005342";
			obj.itemName = "Stolen Chalice";
			obj.equippable = true;
			obj.itemTypeName = "Armor Shader";
			obj.icon = "/img/misc/missing_icon.png";
			obj.itemDescription = "Equip this shader to change the color of your armor.";
		} else if ( obj.itemHash == "1759332262" ){
			obj.bucketTypeHash = "2973005342";
			obj.itemName = "Superblack";
			obj.equippable = true;
			obj.itemTypeName = "Armor Shader";
			obj.icon = "/img/misc/missing_icon.png";
			obj.itemDescription = "Equip this shader to change the color of your armor.";
		} else if ( obj.itemHash == "1458765388" ){
			obj.bucketTypeHash = "434908299";
			obj.itemName = "Classified";
			obj.equippable = true;
			obj.itemTypeName = "Artifact";
			obj.icon = "/img/misc/missing_icon.png";
		} else if ( obj.itemHash == "320629370" ){
			obj.bucketTypeHash = "434908299";
			obj.itemName = "Classified";
			obj.equippable = true;
			obj.itemTypeName = "Artifact";
			obj.icon = "/img/misc/missing_icon.png";
		}
		obj.itemName = encodeURIComponent(obj.itemName);
		obj.tierTypeName = encodeURIComponent(obj.tierTypeName);
		obj.itemDescription = encodeURIComponent(obj.itemDescription);
		obj.itemTypeName = encodeURIComponent(obj.itemTypeName);
		//TODO use the information in obj.stats to supplement missing data in DestinyDB tooltips for min/max
		//STATS is currently being used to provide AA/Equip Speed stats with advanced tooltips enabled
		//delete obj.stats;
		delete obj.hasIcon;
		delete obj.uniquenessHash;
		delete obj.tooltipStyle;
		delete obj.showActiveNodesInTooltip;
		delete obj.questTrackingUnlockValueHash;
		delete obj.bountyResetUnlockHash;
		delete obj.hash;
		delete obj.index;
		delete obj.hasAction;
		delete obj.instanced;
		delete obj.setItemHashes;
		delete obj.questlineItemHash;
		delete obj.objectiveHashes;
		delete obj.needsFullCompletion;
		delete obj.itemCategoryHashes;
		delete obj.itemIndex;
		delete obj.values;
		delete obj.sources;
		delete obj.itemLevels;
		delete obj.perkHashes;
		delete obj.sourceHashes;
		delete obj.equippingBlock;
		delete obj.exclusive;
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
		obj.exclusiveSets = _.flatten(_.map(item.exclusiveSets, function(o){ return o.nodeIndexes }));
		obj.nodes = _.map(item.nodes, function(node){
			return {
				nodeHash: node.nodeHash,
                column: node.column,
				steps: _.map(node.steps, function(step){
					return {
						icon: step.icon,
                        nodeStepHash: step.nodeStepHash,
						nodeStepName: step.nodeStepName,
						nodeStepDescription: step.nodeStepDescription,
						perkHashes: step.perkHashes,
						activationRequirement: step.activationRequirement
					}
				})
			}
		});
		return obj;
	}},
	{ table: "DestinyRaceDefinition", name: "raceDefs", key: "raceHash", reduce: function(item){
		return item;
	}},
	{ table: "DestinyStatDefinition", name: "statDefs", key: "statHash", reduce: function(item){
		delete item.statDescription;
		delete item.icon;
		delete item.statIdentifier;
		delete item.interpolate;
		return item;
	}},
	{ table: "DestinyVendorDefinition", name: "vendorDefs", key: "hash", reduce: function(item){
		delete item.categories;
		delete item.acceptedItems;
		delete item.unlockValueHash;
		delete item.failureStrings;
        delete item.sales;
		return item;
	}},
    { table: "DestinyVendorDefinition", name: "questDefs", key: "hash", reduce: function(item){
		return item.sales;
	}},
	{ table: "DestinyObjectiveDefinition", name: "objectiveDefs", key: "objectiveHash", reduce: function(item){
		var obj = { objectiveHash: item.objectiveHash, completionValue: item.completionValue, displayDescription: item.displayDescription };
		return obj;
	}}
];

var downloadDatabase = function(callback){
	var count = 0;
	var options = { method: 'GET', hostname: 'www.bungie.net', path: manifestURL, headers: { 'X-API-Key':  apikey } };
	console.log('making request ' + JSON.stringify(options));
	if (!fs.existsSync(manifestVersionFile)){
		fs.writeFileSync(manifestVersionFile, "");
	}
	var req = https.request(options, function(res) {
		console.log("querying manifest");
		var data = []; // List of Buffer objects
		res.on("data", function(chunk) {
			data.push(chunk); // Append Buffer object
		});
		res.on("end", function() {
			var manifest = JSON.parse(Buffer.concat(data));
			var currentVersion = fs.readFileSync(manifestVersionFile).toString();
			if ( manifest.Response.version == currentVersion ){
				console.log("Manifest version NOT changed", manifest.Response.version);
				return callback();
			}
			else {
				console.log("Manifest version changed from ", currentVersion, " to ",manifest.Response.version);
			}
			var languages = manifest.Response.mobileWorldContentPaths;
			_.each(languages, function(link, locale){
				var mobileWorldContentPath = secureBungieURL + manifest.Response.mobileWorldContentPaths[locale];
				count++;
				console.log("downloading mwcp in " + locale);
				https.get(mobileWorldContentPath, function(res) {
					var data = []; // List of Buffer objects
					res.on("data", function(chunk) {
						data.push(chunk); // Append Buffer object
					});
					res.on("end", function() {
						count--;
						if ( res.statusCode == 200 ){
							console.log("going to unzip file");
							var payload = Buffer.concat(data);
							var unzipped = new zip(payload, {base64: false, compression:'DEFLATE', checkCRC32: true});
							var fileName = Object.keys(unzipped.files)[0];
							console.log("unzipping " + fileName);
							fs.writeFileSync("mobileWorldContent_" +  locale + ".db", unzipped.files[fileName]._data, 'binary');
							if (count == 0){
								fs.writeFileSync(manifestVersionFile, manifest.Response.version);
								callback();
							}						
						}
						else {
							console.log(res.statusCode + ":" + res.statusMessage + " ERROR for " + locale);
						}
					});
				})
			});
		});
	});
	req.end();
}

var extractData = function(callback){
	var dbFiles = fs.readdirSync(".").filter(function(file){
		return file.indexOf("mobileWorldContent") > -1;
	});
	var count = 0;
	_.each(dbFiles, function(file){
		var locale = file.split("_")[1].split(".")[0];
		var db = new sqlite3.Database(file);
		neededFiles.forEach(function(set){
			count++;
			//console.log("1.count " + count);
			db.all("SELECT * FROM " + set.table, function(err, rows) {
				count--;
				if (err){
					console.log(file);
					console.log(err);
					return; 
				}
				var filename = set.name + ".json";
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
				var dataPath = definitionPath + locale + '/';
				if (!fs.existsSync(dataPath)){
					console.log(fs.existsSync(dataPath) + " creating new path: " + dataPath);
					fs.mkdirSync(dataPath);
				}
                global[set.name] = obj;
                if ( set.name == "questDefs"){
                    obj = _.reduce(obj, function(memo, entries){
                            _.each(entries, function(q){
                                if ( !_.has(global.itemDefs, q.itemHash) ){
                                   memo[q.itemHash] = q.bucketHash;
                                }
                            });
                        return memo;
                    }, {});
                }
				fs.writeFileSync(dataPath + filename, "_" + set.name + "=" + JSON.stringify(obj) + ";");
				//console.log("2.count " + count);
				if (count == 0){
					callback();
				}
			});
		});	
		db.close();
	});
}
var queue = [];

var removeOrphans = function(callback){
	var files = fs.readdirSync(jsonPath + imgPath);
	var orphans = _.difference( files, queue );
	
	console.log("queue length: " + queue.length);
	console.log("orphans length: " + orphans.length);
	console.log("files length: " + files.length);
	
	_.each( orphans, function(file){
		fs.unlinkSync(jsonPath + imgPath + file);
	});
	callback();
}

var queueImages = function(callback){
	console.log("first queue");
	var contents = eval(fs.readFileSync(definitionPath + "en/itemDefs.json").toString("utf8"));
	_.each(contents, function(item){
        if ( item && item.icon ){
            var icon = item.icon.replace(imgPath,'');
            if (icon != "") queue.push(icon);
            if (item.itemTypeName == "Emblem"){
                queue.push(item.secondaryIcon.replace(imgPath,''));
            }        
        }
	});
	console.log("2nd queue");
	contents = eval(fs.readFileSync(definitionPath + "en/perkDefs.json").toString("utf8"));
	_.each(contents, function(item){
		queue.push(item.displayIcon.replace(imgPath,''));
	});
	console.log("3rd queue");
	contents = eval(fs.readFileSync(definitionPath + "en/talentGridDefs.json").toString("utf8"));
	_.each(contents , function(tg){
		_.each(tg.nodes, function(node){
			_.each( node.steps, function(step){
				queue.push(step.icon.replace(imgPath,''));
			});
		});
	});
	console.log("callback queue: " + queue.length);
	queue = _.uniq(queue);
	console.log("callback queue: " + queue.length);
	callback();
}


var cacheIcons = function(){
	var icon = queue.pop();
	//console.log("check if icon exists " + icon);
	var iconPath = (icon.indexOf("/") > -1 ? icon : (imgPath + icon));
	var physicalPath = jsonPath + iconPath;
	if ( !fs.existsSync(physicalPath) ){
		var dlPath = secureBungieURL + iconPath;
		//console.log("downloading icon " + dlPath);
		https.get(dlPath, function(res) {
			if (res.statusCode != 200){
				console.log(res.statusCode + " status code for icon " + icon);
				if (queue.length > 0)
					cacheIcons();
				return;
			}
			else {
				var data = []; // List of Buffer objects
				res.on("data", function(chunk) {
					data.push(chunk); // Append Buffer object
				});
				res.on("end", function() {
					fs.writeFileSync(physicalPath, Buffer.concat(data));
					console.log("icon downloaded at ", physicalPath);
					if (queue.length > 0)
						cacheIcons();
				});			
			}
		});
	}
	else if (queue.length > 0){
		cacheIcons();
	}
}

downloadDatabase(function(){
	console.log("extracting data");
	extractData(function(){
		console.log("queuing images");
		queueImages(function(){
			console.log("removing orphans");
			removeOrphans(function(){
				console.log("caching icons");
				cacheIcons();
				require("./make_setDefs.js");
			});
		});
	});
});

