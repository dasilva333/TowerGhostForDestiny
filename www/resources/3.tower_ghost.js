tgd.armorItemCreate = function(character) {
    var self = this;

    self.character = character;
    self.bucketType = ko.observable();
    self.selectedItem = ko.observable();
    self.lightLevel = ko.observable(tgd.DestinyLightCap);
    self.selectedStats = _.map(tgd.DestinyArmorStats, function(stat) {
        var tmp = {
            name: stat.statName,
            value: ko.observable(0)
        };
        return tmp;
    });
    self.availableItems = ko.computed(function() {
        var characterClass = self.character.classType();
        var bucketType = self.bucketType();
        var items = _.sortBy(_.map(_.filter(_itemDefs, function(item) {
            return tgd.DestinyBucketTypes[item.bucketTypeHash] == bucketType && item.itemName !== "" && (tgd.DestinyClass[item.classType] == characterClass || bucketType == "Ghost");
        }), function(item) {
            item.itemName = decodeURIComponent(item.itemName);
            return item;
        }), 'itemName');
        return items;
    });
    self.activeItem = ko.computed(function() {
        if (!self.selectedItem()) return;
        var itm = _.clone(self.selectedItem());
        itm.id = true;
        itm.itemInstanceId = itm.itemHash.toString();
        itm.perks = _.reduce(self.selectedStats, function(memo, stat) {
            if (stat.value() > 0) {
                memo.push({
                    isStat: true,
                    active: memo.length === 0,
                    name: stat.name
                });
            }
            return memo;
        }, []);
        itm.primaryStat = {
            value: self.lightLevel()
        };
        itm.stats = _.object(_.map(self.selectedStats, function(stat) {
            return [stat.name, parseInt(stat.value())];
        }));
        return new Item(itm, self.character);
    });
};
tgd.calculateLoadoutName = function(combo) {
    var loaderType = _.intersection(tgd.weaponTypes, _.flatten(_.map(_.pluck(_.findWhere(combo.set, {
        bucketType: "Gauntlet"
    }).perks, 'name'), function(name) {
        return name.split(" ");
    })));
    loaderType = loaderType.length > 0 ? loaderType[0] : "";
    var classType = _.findWhere(combo.set, {
        bucketType: "Helmet"
    }).character.classType();
    return "T" + Math.floor(combo.score) + " " + combo.statTierValues + " " + classType + " " + loaderType;
};

tgd.calculatePerkStats = function(combo) {
    combo.perks = _.filter(
        _.flatten(
            _.map(combo.set, function(item) {
                return _.map(item.perks, function(perk) {
                    perk.bucketType = item.bucketType;
                    return perk;
                });
            })
        ),
        function(perk) {
            return (perk.active === true && perk.bucketType != "Class Items" && _.intersection(tgd.weaponTypes, perk.name.split(" ")).length > 0) || (perk.active === true && perk.bucketType == "Helmet" && perk.isExclusive == -1 && perk.isInherent === false);
        }
    );
    combo.similarityScore = _.values(_.countBy(_.map(_.filter(combo.perks, function(perk) {
        return perk.bucketType != "Class Items" && perk.bucketType != "Helmet";
    }), function(perk) {
        return _.intersection(tgd.weaponTypes, perk.name.split(" "))[0];
    })));
    combo.similarityScore = (3 / combo.similarityScore.length) + tgd.sum(combo.similarityScore);
    return combo;
};

tgd.calculateBestSets = function(items, rollType) {
    var combos = _.map(items, function(selection) {
        var choices = selection[rollType] ? [selection] : selection;
        var x = _.flatten(_.map(choices, function(item) {
            return _.map(item[rollType], function(roll) {
                var itemClone = _.clone(item);
                itemClone.activeRoll = roll;
                return itemClone;
            });
        }));
        return x;
    });
    combos = tgd.cartesianProductOf(combos);
    var scoredCombos = _.map(combos, function(items) {
        var tmp = tgd.joinStats(items);
        delete tmp["bonusOn"];
        var sortedKeys = _.pluck(tgd.DestinyArmorStats, 'statName');
        var statTiers = _.map(sortedKeys, function(name) {
            return name.substring(0, 3) + " T" + Math.floor(tmp[name] / tgd.DestinySkillTier);
        }).join("<br>");
        var score = parseFloat((tgd.sum(_.map(tmp, function(value, key) {
            var result = Math.floor(value / tgd.DestinySkillTier);
            return result > 5 ? 5 : result;
        })) + (tgd.sum(_.values(tmp)) / 1000)).toFixed(3));
        var statTierValues = _.map(sortedKeys, function(name) {
            return Math.floor(tmp[name] / tgd.DestinySkillTier);
        }).join("/");
        var combo = {
            set: items,
            id: Math.floor(tgd.hashCode(statTiers)),
            stats: tmp,
            statValues: _.map(sortedKeys, function(name) {
                return tmp[name];
            }).join("<br>"),
            statTierValues: statTierValues,
            statTiers: statTiers,
            score: score
        };
        return combo;
    });
    var highestScore = Math.floor(_.max(_.pluck(scoredCombos, 'score')));
    //
    var bestSets = _.uniq(_.filter(scoredCombos, function(combo) {
        return combo.score >= highestScore && combo.statTierValues.indexOf("6") == -1;
    }), false, function(combo) {
        return combo.statTiers;
    });
    return bestSets;
};

tgd.armorSelectionFields = {
    "Current": {
        rollType: "rolls",
        valueType: "All"
    },
    "Future": {
        rollType: "futureRolls",
        valueType: "MaxLightCSP"
    }
};

tgd.armorSelection = function(type, groups, character) {
    var self = this;

    self.character = character;
    self.groups = groups;
    self.type = type;

    self.vendorArmorQueried = ko.observable(false);
    self.foundFirstSet = ko.observableArray();
    self.armorGroups = ko.observableArray();
    self.mostPoints = ko.observableArray();
    self.activeView = ko.observable(type == "Custom" ? "Current" : "Future");

    self.selectedItems = ko.pureComputed(function() {
        return _.map(self.armorGroups(), function(group) {
            return group.selectedItem() || group.items();
        });
    });

    self.bestSets = ko.pureComputed(function() {
        var bestSets = _.map(tgd.calculateBestSets(self.selectedItems(), tgd.armorSelectionFields[self.activeView()].rollType), function(combo) {
            return tgd.calculatePerkStats(combo);
        });
        return bestSets;
    });

    self.firstSet = ko.pureComputed(function() {
        var firstSet = _.clone(_.first(self.mostPoints()));
        if (firstSet && firstSet.set) {
            firstSet.avgRoll = Math.floor(tgd.average(_.map(firstSet.set, function(item) {
                return item.getValue('MaxLightPercent');
            })));
            firstSet.statTiers = firstSet.statTiers.replace(/<br>/g, " ");
            firstSet.statValues = firstSet.statValues.replace(/<br>/g, " ");
        }
        return firstSet;
    });

    self.maxSets = ko.pureComputed(function() {
        return _.filter(self.bestSets(), function(combo) {
            return (type == "MaxLight" && Math.floor(combo.score) >= tgd.maxTierPossible) || type == "Custom";
        });
    });

    //
    self.armorGroups(_.sortBy(_.map(groups, function(items, bucketType) {
        var selectedId = self.foundFirstSet().length > 0 ? _.findWhere(self.foundFirstSet(), {
            bucketType: bucketType
        })._id : "";
        return new tgd.armorGroup(bucketType, items, self.armorGroups, self.maxSets, selectedId, type);
    }), function(armorGroup) {
        return tgd.DestinyArmorPieces.indexOf(armorGroup.bucketType);
    }));

    self.unleveledBucketTypes = ko.pureComputed(function() {
        return _.pluck(_.filter(self.selectedItems(), function(item) {
            return item && item.getValue && item.getValue("Light") != tgd.DestinyLightCap;
        }), 'bucketType').join(", ");
    });
    self.saveSelectedCombo = function(combo) {
        if (confirm("Are you sure you want to save this loadout? Doing so will close this pop up dialog")) {
            app.createLoadout();
            var loadoutName = tgd.calculateLoadoutName(combo);
            app.activeLoadout().name(loadoutName);
            _.each(combo.set, function(item) {
                app.activeLoadout().addUniqueItem({
                    id: item._id,
                    bucketType: item.bucketType,
                    doEquip: true,
                    bonusOn: item.activeRoll.bonusOn
                });
            });
            self.dialog.close();
        }
    };
    self.equipSelectedCombo = function(combo) {
        if (confirm("Are you sure you want to equip this loadout? Doing so will close this pop up dialog")) {
            self.character.equipAction("Max Light Max Tier", combo.score, combo.set);
            self.dialog.close();
        }
    };
    self.setDialog = function(dialog) {
        self.dialog = dialog;
    };

    self.addCustomItem = function() {
        var viewModel = new tgd.armorItemCreate(self.character);
        
        var defaultAction = function(dialogItself) {
            var hasValidStats = _.reduce(viewModel.selectedStats, function(memo, stat) {
                if (!$.isNumeric(stat.value()) && memo === true) memo = false;
                return memo;
            }, true);
            var hasValidLight = $.isNumeric(viewModel.lightLevel());
            if (!hasValidStats) {
                BootstrapDialog.alert("Invalid stats entered, please ensure only numbers are used");
            } else if (!hasValidLight) {
                BootstrapDialog.alert("Invalid light leveled entered, please ensure only numbers are used");
            } else {
                /* add the item to the right armorGroups */
                var group = _.findWhere(self.armorGroups(), {
                    bucketType: viewModel.activeItem().bucketType
                });
                var armorItem = new tgd.armorItem(viewModel.activeItem(), group.selectedItem, group.groups, group.bestSets, group.type);
                group.items.push(armorItem);
                dialogItself.close();
            }
        };
        (new tgd.koDialog({
            templateName: 'armorItemCreateTemplate',
            viewModel: viewModel,
            onFinish: defaultAction,
            buttons: [{
                label: 'Add',
                cssClass: 'btn-primary',
                action: defaultAction
            }, {
                label: app.activeText().close_msg,
                action: function(dialogItself) {
                    dialogItself.close();
                }
            }]
        })).title("Add Custom Item").show(true);
    }

    self.addVendorArmor = function() {
        self.vendorArmorQueried(true);
        tgd.showLoading(function() {
            var valueType = tgd.armorSelectionFields[self.activeView()].valueType;
            self.character.queryVendorArmor(function(items) {
                _.each(self.armorGroups(), function(group) {
                    var bucketItems = _.filter(items, function(item) {
                        return item.bucketType == group.bucketType && item.tierType >= 5;
                    });
                    _.each(bucketItems, function(item) {
                        group.items.push(new tgd.armorItem(item, group.selectedItem, group.groups, group.bestSets, group.type));
                    });
                    group.items(_.sortBy(group.items(), function(item) {
                        return item.getValue(valueType) * -1;
                    }));
                });
            });
        });
    }

    self.setOtherArmor = function(model, event) {
        tgd.showLoading(function() {
            var selectionType = event.target.value;
            _.each(self.armorGroups(), function(group) {
                if (tgd.DestinyOtherArmor.indexOf(group.bucketType) > -1) {
                    var selectedItem = null;
                    if (selectionType == "Points") {
                        selectedItem = _.reduce(group.items(), function(memo, item) {
                            var isMaxCSP = (memo && item.getValue("All") > memo.getValue("All") || !memo);
                            if (isMaxCSP) memo = item;
                            return memo;
                        });
                    }
                    group.selectedItem(selectedItem);
                }
            });
        });
    };

    self.setSelection = function(model, event) {
        var selectionType = event.target.value;
        _.each(self.armorGroups(), function(group) {
            var selectedItem = _.reduce(group.items(), function(memo, item) {
                var isEquipped = selectionType == "Equipped" && item.isEquipped();
                var isMaxCSP = selectionType == "Points" && (memo && item.getValue("All") > memo.getValue("All") || !memo);
                if (isEquipped || isMaxCSP) memo = item;
                return memo;
            });
            group.selectedItem(selectedItem);
        });
    };

    self.setView = function(model, event) {
        tgd.showLoading(function() {
            self.activeView(event.target.value);
        });
    };

    self.setupView = function(activeView) {
        var armorGroups = _.values(groups),
            rollType = tgd.armorSelectionFields[activeView].rollType,
            valueType = tgd.armorSelectionFields[activeView].valueType,
            mostPoints = _.map(armorGroups, function(items) {
                var top2Items = _.first(_.sortBy(items, function(item) {
                    return item.getValue(valueType) * -1;
                }), 2);
                
                return top2Items;
            });
        
        self.mostPoints(tgd.calculateBestSets(mostPoints, rollType));
        var combos = _.sortBy(_.filter(self.mostPoints(), function(combo) {
            return (type == "MaxLight" && Math.floor(combo.score) >= tgd.maxTierPossible) || type == "Custom";
        }), 'score');

        if (combos.length > 0) {
            
            self.foundFirstSet(combos[0].set);
        } else {
            var helmets = armorGroups.shift();
            
            _.each(helmets, function(helmet, index) {
                if (self.foundFirstSet().length === 0) {
                    var set = _.map(_.clone(armorGroups), function(items) {
                        return _.first(_.sortBy(items, function(item) {
                            return item.getValue(valueType) * -1;
                        }), 4);
                    });
                    set.unshift([helmet]);
                    
                    
                    var combos = _.filter(tgd.calculateBestSets(set, rollType), function(combo) {
                        return Math.floor(combo.score) >= tgd.maxTierPossible;
                    });
                    
                    
                    
                    if (combos.length > 0) {
                        
                        self.foundFirstSet(combos[0].set);
                    }
                }
            });
        }

        if (self.foundFirstSet().length > 0) {
            
            _.each(self.armorGroups(), function(group) {
                var uniqueItem = _.findWhere(self.foundFirstSet(), {
                    bucketType: group.bucketType
                });
                var selectedItem = _.findWhere(group.items(), {
                    _id: uniqueItem._id
                });
                group.selectedItem(selectedItem);
            });
        }
    };
    self.activeView.subscribe(function(newValue) {
        self.setupView(newValue);
    });

    self.setupView(self.activeView());
};

tgd.armorGroup = function(bucketType, items, groups, bestSets, instanceId, type) {
    var self = this;

    self.bucketType = bucketType;
    self.groups = groups;
    self.bestSets = bestSets;
    self.type = type;
    self.selectedItem = ko.observable();

    self.items = ko.observableArray(_.sortBy(_.map(items, function(item, index) {
        return new tgd.armorItem(item, self.selectedItem, groups, bestSets, type);
    }), function(item) {
        return item.getValue("All") * -1;
    }));

    if (instanceId === "") {
        self.selectedItem(_.first(self.items()));
    } else {
        self.selectedItem(_.findWhere(self.items(), {
            _id: instanceId
        }));
    }
};

tgd.armorItem = function(item, selectedItem, groups, bestSets, type) {
    var self = this;
    _.extend(self, item);
    var isSelected = ko.pureComputed(function() {
        return self == selectedItem();
    });
    var isDisabled = ko.pureComputed(function() {
        if (type == "MaxLight") {
            /* this filter will get an array of selectedItems, concat self, calculate the best statTiers given all the futureRolls available, determine if that fits the maxTierPointsPossible */
            var items = _.map(groups(), function(group) {
                return group.bucketType == self.bucketType ? self : (group.selectedItem() ? group.selectedItem() : group.items());
            });
            var validSets = tgd.calculateBestSets(items, 'futureRolls');
            return _.filter(validSets, function(combo) {
                return Math.floor(combo.score) >= tgd.maxTierPossible;
            }).length === 0;
        } else {
            return false;
        }
    });
    var isInBestSets = ko.pureComputed(function() {
        return _.filter(bestSets(), function(combo) {
            return _.pluck(combo.set, '_id').indexOf(self._id) > -1;
        }).length > 0;
    });
    self.activeStatText = ko.pureComputed(function() {
        return _.sortBy(_.reduce(self.stats, function(memo, stat, key) {
            if (stat > 0) {
                memo.push(key.substring(0, 3) + " " + stat);
            }
            return memo;
        }, [])).join("/");
    });
    /* if the item is in bestSets then color it blue to denote its the found item */
    self.css = ko.pureComputed(function() {
        /* allowable combinations: green, yellow, red, blue */
        var css = "";
        if (isSelected()) {
            css = "selected";
        } else if (!isSelected() && isInBestSets()) {
            css = "candidate";
        } else if (isDisabled()) {
            css = "disabled";
        } else {
            css = "not-selected";
        }
        return css;
    });
    this.select = function() {
        if (isDisabled()) {
            BootstrapDialog.alert("This item cannot be selected to maintain the max tier: " + tgd.maxTierPossible);
        } else {
            if (selectedItem() == self && confirm("Warning: Unselecting an item will analyze all the same armor pieces, this will increase processing time and might make the app unresponsive, are you sure you want to unselect an item?")) {
                selectedItem(null);
            } else {
                selectedItem(self);
            }
        }
    };
};window.ua = navigator.userAgent;
window.isNWJS = (typeof require != "undefined");
window.isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor) && typeof chrome != "undefined";
window.isFirefox = (/firefox/i.test(ua));
window.isIOS = (/ios|iphone|ipod|ipad/i.test(ua));
window.isiPad = (/ipad/i.test(ua));
window.isAndroid = (/android/i.test(ua));
window.isWindowsPhone = (/iemobile/i.test(ua));
window.isMobile = (window.isIOS || window.isAndroid || window.isWindowsPhone);
window.isKindle = /Kindle/i.test(ua) || /Silk/i.test(ua) || /KFTT/i.test(ua) || /KFOT/i.test(ua) || /KFJWA/i.test(ua) || /KFJWI/i.test(ua) || /KFSOWI/i.test(ua) || /KFTHWA/i.test(ua) || /KFTHWI/i.test(ua) || /KFAPWA/i.test(ua) || /KFAPWI/i.test(ua);
window.isStaticBrowser = location.protocol.indexOf("http") > -1 && location.href.indexOf("towerghostfordestiny.com/firefox") == -1;
if (window.isStaticBrowser) {
    window.isMobile = window.isWindowsPhone = window.isAndroid = window.isIOS = window.isFirefox = window.isChrome = window.isNWJS = false;
}
if (typeof window.tgd == "undefined") window.tgd = {};
if (typeof tgd.dataDir == "undefined") tgd.dataDir = "data";
if (isWindowsPhone) {
    window.requestFileSystem = function() {};
}
tgd.localLogging = location.href.indexOf("debug") > -1;
tgd.localLog = function(msg) {
    if (tgd.localLogging) {
        
    }
};//TODO find all the remote http variables and have them use a single variable
tgd.remoteServer = "https://towerghostfordestiny.com";
tgd.remoteImagePath = tgd.remoteServer + "/www/";
tgd.openTabAs = window.isMobile ? "_system" : "_blank";
tgd.bootstrapGridColumns = 24;
tgd.autoTransferStacks = false;
tgd.DestinySkillCap = 300;
tgd.DestinyLightCap = 335;
tgd.DestinySkillTier = 60;
tgd.DestinyY1Cap = 170;
tgd.activeElement = null;
tgd.DestinyUnwantedNodes = ["Infuse", "Upgrade Damage", "Upgrade Defense", "Arc Damage", "Void Damage", "Solar Damage", "Kinetic Damage", "Ascend", "Reforge Ready", "Twist Fate", "Scabbard", "Increase Intellect", "Increase Strength", "Increase Discipline"];
tgd.DestinyGeneralItems = {
    "Glimmer Credit": [3632619276, 269776572, 2904517731, 1932910919], //Network Keys, Axiomatic Beads, House Banners, Silken Codex
    "Glimmer Buffs": [3446457162, 1043138475, 1772853454, 3783295803], //Resupply Codes, Black Wax Idol, Blue Polyphage, Ether Seeds
    "Synths": [211861343, 928169143, 2180254632],
    "Parts": [1898539128],
    "Motes": [937555249],
    "Coins": [417308266, 1738186005, 605475555], //Passage Coins, Strange Coins, 3 of Coins
    "Runes": [1565194903, 2620224196, 1556533319, 1314217221, 2906158273], //Argonarch Rune, Stolen Rune, Wormsinger Rune, Wormfeeder Rune, Antiquated Rune can be xfered
    "Planetary Resources": [2254123540, 2882093969, 3164836592, 3242866270, 1797491610], //Spirit Bloom, Spin Metal, Wormspore, Relic Iron, Helium Filaments    
    "Telemetries": [4159731660, 729893597, 3371478409, 927802664, 4141501356, 323927027, 3036931873, 2610276738, 705234570, 1485751393, 2929837733, 846470091]
};
tgd.lostItemsHelper = [420519466, 1322081400, 2551875383, 398517733, 583698483, 937555249];
tgd.invisibleItemsHelper = [2910404660, 2537120989];
//This is a list of items not indexed by DestinyDB
tgd.itemsNotIndexed = [];
tgd.DestinyGeneralSearches = ["Synths", "Parts", "Motes", "Coins", "Runes", "Planetary Resources", "Glimmer Buffs", "Glimmer Credit", "Telemetries", "Engrams"];
tgd.DestinyArmorPieces = ["Helmet", "Gauntlet", "Chest", "Boots", "Class Items", "Artifact", "Ghost"];
tgd.DestinyArmorStats = [144602215, 1735777505, 4244567218];
// Cooldowns
tgd.cooldownsSuperA = ['5:00', '4:46', '4:31', '4:15', '3:58', '3:40'];
tgd.cooldownsSuperB = ['5:30', '5:14', '4:57', '4:39', '4:20', '4:00'];
tgd.cooldownsGrenade = ['1:00', '0:55', '0:49', '0:42', '0:34', '0:25'];
tgd.cooldownsMelee = ['1:10', '1:04', '0:57', '0:49', '0:40', '0:29'];
/* Defender, Nightstalker, Striker, Sunsinger */
tgd.subclassesSuperA = [2007186000, 4143670656, 2455559914, 3658182170];
/* Nightstalker, Gunslinger */
tgd.subclassesStrengthA = [4143670656, 1716862031];
tgd.DestinyWeaponPieces = ["Primary", "Special", "Heavy"];
tgd.DestinyGeneralExceptions = ["Ghost", "Artifact"];
tgd.DestinyOtherArmor = ["Ghost", "Class Items", "Artifact"];
tgd.DestinyNonUniqueBuckets = ["Consumables", "Materials"];
tgd.DestinyFiveRowBuckets = ["Materials", "Consumables", "Invisible", "Messages", "Lost"];
tgd.DestinyLayout = [{
    name: "Weapons",
    array: 'weapons',
    counts: [108, 30],
    bucketTypes: tgd.DestinyWeaponPieces,
    extras: [],
    view: 1,
    headerText: 'inventory_weapons'
}, {
    name: "Armor",
    array: 'armor',
    counts: [108, 50],
    bucketTypes: tgd.DestinyArmorPieces,
    extras: tgd.DestinyGeneralExceptions,
    view: 2,
    headerText: 'inventory_armor'
}, {
    name: "Sub Classes",
    array: '',
    counts: [0, 0],
    bucketTypes: ['Subclasses'],
    extras: [],
    view: 3,
    headerText: 'inventory_subclasses'
}, {
    name: "General",
    array: 'general',
    counts: [72, 80],
    bucketTypes: ['Consumables', 'Materials', 'Shader', 'Emblem', 'Ship', 'Sparrow', 'Horn', 'Emote'],
    extras: tgd.DestinyGeneralExceptions,
    view: 3,
    headerText: 'inventory_general'
}, {
    name: "Post Master",
    array: 'postmaster',
    counts: [60, 60],
    bucketTypes: ['Messages', 'Invisible', 'Lost Items', 'Bounties', 'Quests', 'Mission'],
    extras: [],
    view: 3,
    headerText: 'inventory_postmaster'
}];
tgd.DestinyViews = {
    "0": "All",
    "1": "Weapons",
    "2": "Armor",
    "3": "General"
};
tgd.DestinyGender = {
    "0": "Male",
    "1": "Female"
};
tgd.DestinyClass = {
    "0": "Titan",
    "1": "Hunter",
    "2": "Warlock"
};
tgd.DestinyClassNames = {};
Object.keys(tgd.DestinyClass).forEach(function(key, index) {
    tgd.DestinyClassNames[tgd.DestinyClass[index]] = key;
});
tgd.DestinyDamageTypes = {
    "0": "None",
    "1": "Kinetic",
    "2": "Arc",
    "3": "Solar",
    "4": "Void",
    "5": "Raid"
};
tgd.DestinyBucketSizes = {
    "Materials": 20,
    "Consumables": 20
};
tgd.DestinyBucketTypes = {
    "1498876634": "Primary",
    "2465295065": "Special",
    "953998645": "Heavy",
    "3448274439": "Helmet",
    "3551918588": "Gauntlet",
    "14239492": "Chest",
    "20886954": "Boots",
    "2973005342": "Shader",
    "4274335291": "Emblem",
    "2025709351": "Sparrow",
    "284967655": "Ship",
    "3865314626": "Materials",
    "1469714392": "Consumables",
    "1585787867": "Class Items",
    "3284755031": "Subclasses",
    "375726501": "Mission",
    "2197472680": "Bounties",
    "12345": "Post Master",
    "2422292810": "Post Master",
    "1367666825": "Invisible",
    "4023194814": "Ghost",
    "434908299": "Artifact",
    "3054419239": "Emote",
    "1801258597": "Quests",
    "3796357825": "Horn"
};
tgd.DestinyBucketColumns = {
    "Chest": 3,
    "Boots": 3,
    "Ship": 3,
    "Heavy": 3,
    "Consumables": 4,
    "Primary": 3,
    "Class": 3,
    "Class Items": 3,
    "Sparrow": 3,
    "Special": 3,
    "Shader": 3,
    "Subclasses": 3,
    "Helmet": 3,
    "Gauntlet": 3,
    "Materials": 4,
    "Emblem": 3,
    "Bounties": 4,
    //TODO: Improve this so I don't need two records
    "Post": 4,
    "Post Master": 4,
    "Messages": 4,
    "Lost": 4,
    "Lost Items": 4,
    "Mission": 4,
    "Invisible": 4,
    "Ghost": 3,
    "Artifact": 3,
    "Quests": 4,
    "Emote": 3,
    "Horn": 3
};
tgd.DestinyMaxCSP = {
    "Artifact": 131,
    "Boots": 135,
    "Chest": 147,
    "Class Items": 60,
    "Gauntlet": 99,
    "Ghost": 60,
    "Helmet": 111
};
tgd.DestinyInfusionRates = {
    "Helmet": (1 / 6),
    "Gauntlet": (1 / 6),
    "Chest": (1 / 5),
    "Boots": (1 / 5),
    "Ghost": (1 / 10),
    "Artifact": (1 / 10),
    "Class Items": (1 / 10)
};
//tgd.DestinyMaxCSP = {"Helmet":108,"Gauntlet":97,"Chest":143,"Boots":133,"Class Items":60,"Artifact":128,"Ghost":60};
tgd.DestinyBucketWeights = [{
    "Primary": 13.04,
    "Special": 13.04,
    "Heavy": 13.04,
    "Helmet": 10.87,
    "Gauntlet": 10.87,
    "Chest": 10.87,
    "Boots": 10.87,
    "Class Items": 8.7,
    "Ghost": 8.7
}, {
    "Primary": 12,
    "Special": 12,
    "Heavy": 12,
    "Helmet": 10,
    "Gauntlet": 10,
    "Chest": 10,
    "Boots": 10,
    "Class Items": 8,
    "Ghost": 8,
    "Artifact": 8
}];
tgd.languages = [{
    code: "en",
    description: "English",
    bungie_code: "en"
}, {
    code: "es",
    description: "Spanish",
    bungie_code: "es"
}, {
    code: "it",
    description: "Italian",
    bungie_code: "it"
}, {
    code: "de",
    description: "German",
    bungie_code: "de"
}, {
    code: "ja",
    description: "Japanese",
    bungie_code: "ja"
}, {
    code: "pt",
    description: "Portuguese",
    bungie_code: "pt-br"
}, {
    code: "fr",
    description: "French",
    bungie_code: "fr"
}, {
    code: "tr",
    description: "Turkish",
    bungie_code: "en"
}];
tgd.defaults = {
    searchKeyword: "",
    doRefresh: isMobile ? false : "true",
    refreshSeconds: 300,
    tierFilter: 0,
    weaponFilter: 0,
    armorFilter: 0,
    generalFilter: 0,
    dmgFilter: [],
    activeView: 0,
    activeSort: 0,
    progressFilter: 0,
    showDuplicate: false,
    setFilter: [],
    activeClasses: [],
    activeStats: [],
    shareView: false,
    shareUrl: "",
    showMissing: false,
    showArmorPerks: false,
    showArmorSC: false,
    customFilter: false,
    tooltipsEnabled: isMobile ? false : "true",
    advancedTooltips: "true",
    autoXferStacks: false,
    padBucketHeight: isMobile && !isStaticBrowser ? false : "true",
    dragAndDrop: false,
    xsColumn: tgd.bootstrapGridColumns,
    smColumn: tgd.bootstrapGridColumns / 2,
    mdColumn: tgd.bootstrapGridColumns / 3,
    lgColumn: tgd.bootstrapGridColumns / 4,
    vaultColumns: tgd.bootstrapGridColumns / 4,
    vaultWidth: tgd.bootstrapGridColumns / 4,
    //device and bungie locale
    locale: "en",
    //user interface set locale
    appLocale: "",
    vaultPos: 0,
    itemDefs: "",
    preferredSystem: "PSN",
    ccWidth: "",
    layoutMode: "even",
    autoUpdates: (isFirefox || isIOS || isAndroid || isChrome) ? "true" : false,
    toastTimeout: 2600,
    armorViewBy: "Light",
    sectionsTemplate: "image-grid-template",
    farmMode: false,
    farmViewEnabled: false,
    farmItems: ["Engrams", "Glimmer", "Rare", "Uncommon"],
    farmTarget: "Vault"
};
tgd.farmItemFilters = {
    "Engrams": function(item) {
        return item.description.indexOf("Engram") > -1 && item.bucketType != "Lost Items" && item.isEquipment === false;
    },
    "Glimmer": function(item) {
        return tgd.DestinyGeneralItems["Glimmer Credit"].indexOf(item.id) > -1;
    },
    "Rare": function(item) {
        return item.tierType == 4 && item.locked() === false && (item.armorIndex > -1 || item.weaponIndex > -1) && item.transferStatus < 2;
    },
    "Uncommon": function(item) {
        return item.tierType == 3 && item.locked() === false && (item.armorIndex > -1 || item.weaponIndex > -1) && item.transferStatus < 2;
    }
};

/*
	WARNING:
	This needs to be the first call prior to any notif, failure to do so results in a #toaster element created with improper settings, 
	attempting to change notif settings on the fly requires manual removal of html element
*/
$.toaster({
    settings: {
        toaster: {
            css: {
                top: "55px"
            }
        },
        timeout: tgd.defaults.toastTimeout
    }
});tgd.imageErrorHandler = function(src, element) {
    return function() {
        if (element && element.src && element.src !== "") {
            var source = element.src;
            if (source.indexOf(tgd.remoteImagePath) == -1) {
                element.src = tgd.remoteImagePath + src.replace(tgd.dataDir, 'data/');
            }
        }
    };
};

tgd.getEventDelegate = function(target, selector) {
    var delegate;
    while (target && target != this.el) {
        delegate = $(target).filter(selector)[0];
        if (delegate) {
            return delegate;
        }
        target = target.parentNode;
    }
    return undefined;
};

window.ko.bindingHandlers.tooltip = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        $(element).tooltip({
            container: "body",
            html: true
        });
    }
};

window.ko.bindingHandlers.itemImageHandler = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var icon = ko.unwrap(valueAccessor());
        element.src = icon;
        element.onerror = tgd.imageErrorHandler(icon, element);
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var icon = ko.unwrap(valueAccessor());
        element.src = icon;
        element.onerror = tgd.imageErrorHandler(icon, element);
    }
};

window.ko.bindingHandlers.refreshableSection = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        //
        //event: { mouseenter: $root.toggleSectionRefresh, mouseleave: $root.toggleSectionRefresh }, css: { titleHover: $root.showSectionRefresh }
        if (isMobile) {
            return;
        }
        $(element)
            .bind("mouseenter", function() {
                $(this).addClass("titleHover");
                $(this).find(".titleRefresh").show();
            })
            .bind("mouseleave", function() {
                $(this).removeClass("titleHover");
                $(this).find(".titleRefresh").hide();
            });
    }
};

window.ko.bindingHandlers.refreshableEmblem = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        if (isMobile) {
            return;
        }
        $(element)
            .bind("mouseenter", function() {
                $(this).addClass("emblemHover");
                //$(this).find(".emblemRefresh").show();
            })
            .bind("mouseleave", function() {
                $(this).removeClass("emblemHover");
                //$(this).find(".emblemRefresh").hide();
            });
    }
};

window.ko.bindingHandlers.scrollToView = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        Hammer(element, {
                time: 2000
            })
            .on("tap", function(ev) {
                var target = tgd.getEventDelegate(ev.target, ".mobile-characters");
                var index = $(target).index(),
                    distance = $(".profile:eq(" + index + ")");
                if (distance.length > 0) {
                    distance = distance.position().top - 50;
                    app.scrollTo(distance);
                }
            })
            .on("press", function(ev) {
                var target = tgd.getEventDelegate(ev.target, ".mobile-characters-image");
                var item = ko.contextFor(target).$data;
                $.toaster({
                    priority: 'info',
                    title: 'Info',
                    message: app.activeText().this_icon + item.uniqueName(),
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            });
    }
};

window.ko.bindingHandlers.fastclick = {
    init: function(element, valueAccessor) {
        FastClick.attach(element);
        return ko.bindingHandlers.click.init.apply(this, arguments);
    }
};

window.ko.bindingHandlers.moveItem = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        Hammer(element, {
                time: 2000
            })
            .on("tap", function(ev) {
                
                var target = tgd.getEventDelegate(ev.target, ".itemLink");
                if (target) {
                    var item = ko.contextFor(target).$data;
                    tgd.moveItemPositionHandler(target, item);
                }
            })
            .on("doubletap", function(ev) {
                
                var target = tgd.getEventDelegate(ev.target, ".itemLink");
                if (target) {
                    var context = ko.contextFor(target);
                    if (context && "$data" in context) {
                        var item = context.$data;
                        if (item.transferStatus < 2 || item.bucketType == "Subclasses") {
                            if (app.dynamicMode() === false) {
                                app.dynamicMode(true);
                                app.createLoadout();
                            }
                            
                            if (item._id > 0) {
                                app.activeLoadout().addUniqueItem({
                                    id: item._id,
                                    bucketType: item.bucketType,
                                    doEquip: false
                                });
                            } else {
                                var payload = {
                                    hash: item.id,
                                    bucketType: item.bucketType,
                                    characterId: item.characterId()
                                };
                                app.activeLoadout().addGenericItem(payload);
                            }
                        } else {
                            $.toaster({
                                priority: 'danger',
                                title: 'Warning',
                                message: app.activeText().unable_create_loadout_for_type,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                    }
                }
            })
            // press is actually hold 
            .on("press", function(ev) {
                
                var target = tgd.getEventDelegate(ev.target, ".itemLink");
                if (target) {
                    var context = ko.contextFor(target);
                    if (context && "$data" in context) {
                        var item = context.$data;
                        if (item && item.doEquip && app.loadoutMode() === true) {
                            item.doEquip(!item.doEquip());
                            item.markAsEquip(item, {
                                target: target
                            });
                        } else if (!isMobile) {
                            tgd.moveItemPositionHandler(target, item);
                        } else {
                            $ZamTooltips.lastElement = target;
                            $ZamTooltips.show("destinydb", "items", item.id, target);
                        }
                    }
                }
            });
    }
};tgd.calculateStatRoll = function(item, targetLight, withBonus) {
    var currentLight = item.primaryValues.Default;
    var isItemLeveled = item.hasUnlockedStats;
    //
    var currentBonus = tgd.bonusStatPoints(item.armorIndex, currentLight);
    var targetBonus = tgd.bonusStatPoints(item.armorIndex, targetLight);
    //
    //
    //this has been proven to be too inaccurate over a large different in light value with an error margin of up to 8 points
    //var newStats = (item.getValue("All") - (isItemLeveled ? currentBonus : 0)) * targetLight / currentLight;
    var newStats = (item.getValue("All") - (isItemLeveled ? currentBonus : 0)) + (((targetLight - currentLight) * tgd.DestinyInfusionRates[item.bucketType]) * 2);
    //
    var finalStat = newStats + (withBonus ? targetBonus : 0);
    //
    return finalStat;
};

tgd.bonusStatPoints = function(armorIndex, light) {
    if (armorIndex === 0) { //Helmet
        if (light < 291) {
            return 15;
        } else if (light < 307) {
            return 16;
        } else if (light < 319) {
            return 17;
        } else if (light < 332) {
            return 18;
        } else {
            return 19;
        }
    } else if (armorIndex === 1) { //Gauntlet
        if (light < 287) {
            return 13;
        } else if (light < 305) {
            return 14;
        } else if (light < 319) {
            return 15;
        } else if (light < 333) {
            return 16;
        } else {
            return 17;
        }
    } else if (armorIndex === 2) { //Chest
        if (light < 287) {
            return 20;
        } else if (light < 299) {
            return 21;
        } else if (light < 310) {
            return 22;
        } else if (light < 319) {
            return 23;
        } else if (light < 328) {
            return 24;
        } else {
            return 25;
        }
    } else if (armorIndex === 3) { //Boots
        if (light < 284) {
            return 18;
        } else if (light < 298) {
            return 19;
        } else if (light < 309) {
            return 20;
        } else if (light < 319) {
            return 21;
        } else if (light < 329) {
            return 22;
        } else {
            return 23;
        }
    } else if (armorIndex === 4) { //Class Items
        if (light < 295) {
            return 8;
        } else if (light < 319) {
            return 9;
        } else {
            return 10;
        }
    } else if (armorIndex === 5) { //Artifact
        if (light < 287) {
            return 34;
        } else if (light < 295) {
            return 35;
        } else if (light < 302) {
            return 36;
        } else if (light < 308) {
            return 37;
        } else if (light < 314) {
            return 38;
        } else if (light < 319) {
            return 39;
        } else if (light < 325) {
            return 40;
        } else if (light < 330) {
            return 41;
        } else {
            return 42;
        }
    } else if (armorIndex === 6) { //Ghost
        if (light < 295) {
            return 8;
        } else if (light < 319) {
            return 9;
        } else {
            return 10;
        }
    }
};tgd.bungie = (function(cookieString, complete) {
    var self = this;

    var _token,
        id = 0,
        active,
        domain = 'bungie.net',
        url = 'https://www.' + domain + '/',
        apikey = '5cae9cdee67a42848025223b4e61f929'; //this one is linked to dasilva333

    this.bungled = "";
    this.systemIds = {};
    this.requests = {};

    // private methods
    function _getAllCookies(callback) {
        if (chrome && chrome.cookies && chrome.cookies.getAll) {
            chrome.cookies.getAll({
                domain: '.' + domain
            }, function() {
                callback.apply(null, arguments);
            });
        } else if (isNWJS) {
            require("nw.gui").Window.get().cookies.getAll({}, function(a, b) {
                callback.apply(null, arguments);
            });
        } else {
            callback([]);
            return BootstrapDialog.alert("You must enable cookie permissions in Chrome before loading TGD");
        }
    }

    function readCookie(cname) {
        //
        var name = cname + "=";
        var ca = (cookieString || "").toString().split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1);
            if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
        }
        //
        return "";
    }

    this.requestCookie = function(callback) {
        
        var event = new CustomEvent("request-cookie-from-ps", {});
        window.dispatchEvent(event);
        self.requestCookieCB = callback;
    };

    this.getCookie = function(name, callback) {
        if (isChrome) {
            _getAllCookies(function(cookies) {
                var c = null;
                for (var i = 0, l = cookies.length; i < l; ++i) {
                    if (cookies[i].name === name) {
                        c = cookies[i];
                        break;
                    }
                }
                callback(c ? c.value : null);
            });
        } else if (isFirefox) {
            self.requestCookie(callback);
        } else {
            callback(readCookie('bungled'));
        }
    };

    this.retryRequest = function(opts) {
        if (opts.retries) {
            if (opts.retries > 3) {
                opts.complete({
                    error: 'network error:' + this.status
                }, response);
            } else {
                opts.retries++;
                setTimeout(function() {
                    self.request(opts);
                }, 1000 * opts.retries);
            }
        } else {
            opts.retries = 0;
            setTimeout(function() {
                self.request(opts);
            }, 2000);
        }
    };

    this.request = function(opts) {
        if (opts.route.indexOf("http") == -1)
            opts.route = url + "Platform" + opts.route;

        var data;
        if (opts.payload) {
            data = JSON.stringify(opts.payload);
        }

        $.ajax({
            url: opts.route,
            type: opts.method,
            headers: {
                'X-API-Key': apikey,
                'x-csrf': self.bungled
            },
            beforeSend: function(xhr) {
                /* this cookie needs to be trimmed in order to work properly on iPad (https://forum.ionicframework.com/t/solved-ios9-fails-with-setrequestheader-native-with-custom-headers-in-http-service/32399)*/
                if (isMobile && typeof cookieString == "string") {
                    _.each(cookieString.split(";"), function(cookie) {
                        try {
                            var trimCookie = $.trim(cookie);
                            xhr.setRequestHeader('Cookie', trimCookie);
                        } catch (e) {}
                    });
                }
            },
            data: data,
            complete: function(xhr, status) {
                
                var response;
                if (xhr.status >= 200 && xhr.status <= 409) {
                    try {
                        response = JSON.parse(xhr.responseText);
                    } catch (e) {
                        //
                    }
                    if (response && response.ErrorCode && (response.ErrorCode == 36 || response.ErrorCode == 1652 || response.ErrorCode == 1651)) {
                        self.retryRequest(opts);
                    } else {
                        var obj = response;
                        if (typeof obj == "object" && "Response" in obj)
                            obj = response.Response;
                        opts.complete(obj, response);
                    }
                } else {
                    self.retryRequest(opts);
                }
            }
        });
    };

    this.getVendorData = function(characterId, vendorId, callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/MyAccount/' +
                '/Character/' + characterId +
                '/Vendor/' + vendorId + '/Metadata/',
            method: 'GET',
            complete: callback
        });
    };

    this.vault = function(callback) {
        self.request({
            route: '/Destiny/' + active.type + '/MyAccount/Vault/',
            method: 'GET',
            complete: callback
        });
    };

    this.logout = function(callback) {
        self.request({
            route: url + 'en/User/SignOut',
            method: 'GET',
            complete: callback
        });
    };

    this.login = function(callback) {
        
        self.request({
            route: url,
            method: "GET",
            complete: callback
        });
    };

    this.getUrl = function() {
        return url;
    };

    this.setsystem = function(type) {
        active = self.systemIds.xbl;
        if (type === 'PSN')
            active = self.systemIds.psn;
    };

    this.getMemberId = function() {
        return membershipId;
    };

    this.gamertag = function() {
        return active ? active.id : null;
    };

    this.system = function() {
        return systemIds;
    };

    this.user = function(callback) {
        self.request({
            route: '/User/GetBungieNetUser/',
            method: 'GET',
            complete: function(res, response) {
                if (response && response.ErrorCode && response.ErrorCode > 1) {
                    callback({
                        error: response.Message,
                        code: response.ErrorCode
                    });
                    return;
                } else if (typeof res == "undefined") {
                    callback({
                        error: 'no response'
                    });
                    return;
                }

                self.systemIds.xbl = {
                    id: res.gamerTag,
                    type: 1
                };
                self.systemIds.psn = {
                    id: res.psnId,
                    type: 2
                };

                active = self.systemIds.xbl;

                if (res.psnId)
                    active = self.systemIds.psn;

                callback(res);
            }
        });
    };

    this.account = function(callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/',
            method: 'GET',
            complete: callback
        });
    };

    this.setlockstate = function(characterId, itemId, state, callback) {
        self.request({
            route: '/Destiny/SetLockState/',
            method: 'POST',
            payload: {
                membershipType: active.type,
                characterId: characterId,
                itemId: itemId,
                state: state
            },
            complete: callback
        });
    };

    this.transfer = function(characterId, itemId, itemHash, amount, toVault, callback) {
        self.request({
            route: '/Destiny/TransferItem/',
            method: 'POST',
            payload: {
                characterId: characterId,
                membershipType: active.type,
                itemId: itemId,
                itemReferenceHash: itemHash,
                stackSize: amount,
                transferToVault: toVault
            },
            complete: callback
        });
    };

    this.equip = function(characterId, itemId, callback) {
        self.request({
            route: '/Destiny/EquipItem/',
            method: 'POST',
            payload: {
                membershipType: active.type,
                characterId: characterId,
                itemId: itemId
            },
            complete: callback
        });
    };

    this.getAccountSummary = function(callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/Summary/',
            method: 'GET',
            complete: callback
        });
    };

    this.getItemDetail = function(characterId, instanceId, callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/Character/' + characterId +
                '/Inventory/' + instanceId + '/',
            method: 'GET',
            complete: callback
        });
    };

    this.inventory = function(characterId, callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/Character/' + characterId +
                '/Inventory/',
            method: 'GET',
            complete: callback
        });
    };

    this.character = function(characterId, callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/Character/' + characterId + '/',
            method: 'GET',
            complete: callback
        });
    };

    this.search = function(activeSystem, callback) {
        this.setsystem(activeSystem);
        if (active && active.type) {
            if (typeof active.membership == "undefined") {
                self.request({
                    route: '/Destiny/' + active.type + '/Stats/GetMembershipIdByDisplayName/' + active.id + '/',
                    method: 'GET',
                    complete: function(membership) {
                        if (membership > 0) {
                            //
                            active.membership = membership;
                            self.account(callback);
                        } else {
                            callback({
                                error: true
                            });
                            return;
                        }

                    }
                });
            } else {
                self.account(callback);
            }
        }
    };

    this.account = function(callback) {
        
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership + '/',
            method: 'GET',
            complete: callback
        });
    };

    this.flattenItemArray = function(buckets) {
        var items = [];
        if (_.isArray(buckets)) {
            buckets.forEach(function(bucket) {
                bucket.items.forEach(function(item) {
                    items.push(item);
                });
            });
        } else {
            Object.keys(buckets).forEach(function(bucketName) {
                buckets[bucketName].forEach(function(bucket) {
                    bucket.items.forEach(function(item) {
                        item.bucketName = bucketName;
                        items.push(item);
                    });
                });
            });
        }
        return items;
    };

    this.init = function() {
        if (isFirefox) {
            window.addEventListener("response-cookie-from-cs", function(event) {
                
                self.requestCookieCB(event.detail);
            });
        }
        
        if (isStaticBrowser) {
            complete("");
        } else {
            self.login(function() {
                
                self.getCookie('bungled', function(token) {
                    
                    self.bungled = token;
                    complete(token);
                });
            });
        }
    };


    this.init();
});tgd.koDialog = function(options) {
    var dialog = new tgd.dialog(options);
    var id = new Date().getTime();
    var mdl = dialog.modal;
    var hasTemplate = options.templateName && options.templateName !== "";
    if (hasTemplate) {
        var template = tgd[options.templateName]({
            id: id
        });
        mdl.setMessage(template);
    }
    mdl.onHide(function() {
        if (options.onFinish) {
            $(document).unbind("keyup.dialog");
        }
        if (hasTemplate) {
            ko.cleanNode(document.getElementById('container_' + id));
        }
    });
    mdl.onShow(function(instance) {
        var activeModal = instance.getModal();
        activeModal.on("shown.bs.modal", function() {
            if (options.viewModel && options.viewModel.setDialog) {
                options.viewModel.setDialog(mdl);
            }
            if (options.onFinish) {
                $(document).unbind("keyup.dialog").bind("keyup.dialog", function(e) {
                    var code = e.which;
                    if (code == 13) {
                        options.onFinish(mdl);
                        $(document).unbind("keyup.dialog");
                    }
                });
            }
            if (hasTemplate) {
                ko.applyBindings(options.viewModel, document.getElementById('container_' + id));
            }
        });
    });
    return dialog;
};

tgd.dialog = (function(options) {
    var self = this;

    this.modal = new BootstrapDialog(options);
    this.modal.setSize(BootstrapDialog.SIZE_WIDE);
    this.options = options;

    return self;
});

tgd.dialog.prototype = {
    title: function(title) {
        this.modal.setTitle(title);
        return this;
    },

    content: function(content) {
        this.modal.setMessage(content);
        return this;
    },

    buttons: function(buttons) {
        this.modal.setClosable(true).enableButtons(true).setData("buttons", buttons);
        return this;
    },

    show: function(excludeClick, onHide, onShown) {
        var self = this;
        self.modal.open();
        var mdl = self.modal.getModal();
        if (!excludeClick) {
            mdl.bind("click", function() {
                self.modal.close();
            });
        }
        mdl.on("hide.bs.modal", onHide);
        mdl.on("shown.bs.modal", onShown);
        return self;
    }
};tgd.extrasPopup = function(item) {
    var self = this;

    self.item = item;
    self.characters = app.orderedCharacters;

    var selectedStatus = ko.observable(_.reduce(self.characters(), function(memo, character) {
        memo[character.id] = (character.id !== "Vault");
        return memo;
    }, {}));

    self.total = ko.computed(function() {
        return _.reduce(self.characters(), function(memo, character) {
            var items = _.where(character.items(), {
                description: self.item.description
            });
            memo = memo + _.reduce(items, function(memo, i) {
                return memo + i.primaryStat();
            }, 0);
            return memo;
        }, 0);
    });

    self.selectedCharacters = ko.computed(function() {
        return _.filter(self.characters(), function(c) {
            return selectedStatus()[c.id] === true;
        });
    });

    self.setSelectedCharacter = function() {
        var ss = selectedStatus();
        ss[this.id] = !ss[this.id];
        selectedStatus(ss);
    };

    self.setDialog = function(dialog) {
        self.dialog = dialog;
    };
};tgd.Layout = function(layout) {
    var self = this;

    self.name = layout.name;
    self.id = layout.view;
    self.bucketTypes = layout.bucketTypes;
    self.extras = layout.extras;
    self.headerText = layout.headerText;
    self.array = layout.array;
    self.counts = layout.counts;

    self.activeBucketTypes = ko.computed(self._activeBucketTypes, self);
};

tgd.Layout.prototype = {
    _activeBucketTypes: function() {
        var self = this;
        var bucketTypes = self.bucketTypes;
        if (app.activeView() == "3") {
            bucketTypes = bucketTypes.concat(self.extras);
        }
        return bucketTypes;
    },
    countText: function(character) {
        var self = this;
        return ko.pureComputed(function() {
            var text = "";
            if (self.array !== "" && character.id == 'Vault') {
                var currentAmount = character[self.array]().length;
                var totalAmount = character.id == 'Vault' ? self.counts[0] : self.counts[1];
                text = "(" + currentAmount + "/" + totalAmount + ")";
                if (currentAmount == totalAmount) {
                    text = "<label class='label label-danger'>" + text + "</label>";
                }
            }
            return text;
        });
    },
    titleText: function(character) {
        var self = this;
        return ko.pureComputed(function() {
            return (character.id == 'Vault' && self.name == 'Sub Classes' ? 'Vault Sub Classes' : app.activeText()[self.headerText]);
        });
    },
    isVisible: function(character) {
        var self = this;
        return ko.pureComputed(function() {
            return (character.id == "Vault" && self.name !== "Post Master") || character.id !== "Vault";
        });
    }
};tgd.loadoutActionStates = {
    0: {
        actionIcon: "assets/no-transfer.png"
    },
    1: {
        actionIcon: "assets/to-transfer.png"
    },
    2: {
        actionIcon: "assets/to-equip.png"
    },
    3: {
        actionIcon: "assets/swap.png"
    }
};
tgd.loadoutPair = function(pair, targetCharacter) {
    var self = this;
    _.extend(self, pair);
    var compiledTemplate = _.template(pair.description);

    this.swapItem = ko.observable(self.swapItem);

    this.actionIcon = tgd.loadoutActionStates[pair.actionState].actionIcon;

    this.description = ko.computed(function() {
        var templateData = {
            item: self.targetItem,
            swapItem: self.swapItem(),
            targetCharacter: targetCharacter
        };
        return compiledTemplate(templateData);
    });

    this.activeTargetIcon = ko.computed(function() {
        return (self.targetItem && self.targetItem.icon) || self.targetIcon;
    });

    this.activeSwapIcon = ko.computed(function() {
        return (self.swapItem() && self.swapItem().icon) || self.swapIcon;
    });
};

/*this.options = {
	keepOpenSlots: false,
	transferLockedItems: true,
	transferTaggedItems: true,
	transferClassItems: false
}*/

tgd.loadoutsTransferConfirm = function(masterSwapArray, targetCharacter) {
    var self = this;

    self.swapArray = _.map(masterSwapArray, function(pair) {
        return new tgd.loadoutPair(pair, targetCharacter);
    });
    
    // When a swap item is clicked a few steps must be performed:
    //	-determine bucket type
    //	-determine items in that bucket
    //	-exclude items already in masterSwapArray or items not transferable
    //	-determine the index of those candidates, increment the index, make sure index doesnt exceed bounds
    //	
    self.changeSwapItem = function(pair) {
        if (pair && pair.swapItem) {
            var items = targetCharacter.all(pair.swapItem().bucketType);
            var swapIds = _.pluck(_.map(self.swapArray, function(pair) {
                return pair.swapItem();
            }), '_id');
            var candidates = _.filter(items, function(candidate) {
                return (swapIds.indexOf(candidate._id) == -1 || candidate._id == pair.swapItem()._id) && candidate.transferStatus < 2;
            });
            var index = candidates.indexOf(pair.swapItem()) + 1;
            if (index > candidates.length - 1) {
                index = 0;
            }
            pair.swapItem(candidates[index]);
        }
    };

    self.getSwapArray = function() {
        return _.map(self.swapArray, function(pair) {
            pair.swapItem = ko.unwrap(pair.swapItem);
            return pair;
        });
    };
};

tgd.loadoutManager = function(loadouts, dialog) {
    var self = this;

    self.loadouts = loadouts;

    self.setDialog = function(dialog) {
        self.dialog = dialog;
    };

    self.equip = function() {
        if (confirm("Are you sure you want to close this dialog and open the Loadouts panel to equip this set?")) {
            this.setActive();
            self.dialog.close();
        }
    };
};

tgd.loadoutId = 0;

tgd.LoadoutItem = function(model) {
    var self = this;

    _.each(model, function(value, key) {
        self[key] = value;
    });
    var _doEquip = (model && typeof model.hash == "undefined") ? ((self.doEquip && self.doEquip.toString() == "true") || false) : false;
    self.doEquip = ko.observable(_doEquip);
};

tgd.Loadout = function(model, isItems) {
    var self = this;

    _.each(model, function(value, key) {
        self[key] = value;
    });
    this.loadoutId = tgd.loadoutId++;
    this.name = ko.observable(self.name || "");
    this.ids = ko.observableArray();
    this.generics = ko.observableArray();
    this.items = ko.pureComputed(function() {
        var _items = [];
        _.each(self.ids(), function(equip) {
            if (equip) {
                var itemFound = self.findItemById(equip.id);
                if (itemFound) {
                    itemFound.doEquip = equip.doEquip;
                    itemFound.markAsEquip = self.markAsEquip;
                    if (equip && equip.bonusOn) {
                        itemFound.bonusOn = equip.bonusOn;
                    }
                    _items.push(itemFound);
                }
            }
        });
        _.each(self.generics(), function(item) {
            if (item && item.hash) {
                var itemFound = self.findItemByHash(item.hash, item.characterId);
                if (itemFound) {
                    itemFound.doEquip = item.doEquip;
                    itemFound.markAsEquip = self.markAsEquip;
                    _items.push(itemFound);
                }
            }
        });
        return _items.sort(function(a, b) {
            if (a.armorIndex > -1) {
                return a.armorIndex - b.armorIndex;
            } else if (a.weaponIndex > -1) {
                return a.weaponIndex - b.weaponIndex;
            } else {
                return -1;
            }
        });
    });
    this.editing = ko.observable(false);
    /*this.sortUp = function() {
        var currentIndex = app.loadouts.indexOf(self);
        var nextIndex = currentIndex - 1;
        
        
        
        }));
        //add the item to the right position in the array
        app.loadouts.splice(nextIndex, 0, self);
        //remove item from the array
        currentIndex = app.loadouts.indexOf(self);
        
    }
    this.sortDown = function() {
        var currentIndex = app.loadouts.indexOf(self);
        var nextIndex = currentIndex + 1;
        
        
        
        //add the item to the right position in the array
        app.loadouts.splice(nextIndex, 0, self);
        //remove item from the array
        //currentIndex = app.loadouts.indexOf(self)+1;
        
    }*/
    this.rename = function() {
        self.editing(!self.editing());
    };
    this.markAsEquip = function(item, event) {
        var existingItems = _.where(self.ids(), {
            bucketType: item.bucketType
        }).filter(function(loadoutItem) {
            var foundItem = _.find(self.items(), {
                _id: loadoutItem.id
            });
            //sometimes an item is not found due to it being deleted or reforged, at this point filter it out of the list, issue #135
            if (!foundItem) return false;

            if (item.bucketType == "Subclasses" || foundItem.armorIndex != -1) {
                return item.doEquip() === true && item._id != loadoutItem.id && item.character.classType() == foundItem.character.classType();
            }
            return item.doEquip() === true && item._id != loadoutItem.id;
        });
        /* if the item being equipped is an exotic then the other exotics become unequipped */
        if (item.tierType == 6 && item.hasLifeExotic === false && item.doEquip()) {
            _.each(self.ids(), function(equip) {
                var itemFound = self.findItemById(equip.id);
                if (itemFound && itemFound.tierType && itemFound.tierType == 6 && itemFound.hasLifeExotic === false && equip.doEquip() && equip.id != item._id && (
                        (item.weaponIndex > -1 && itemFound.weaponIndex > -1) || (item.armorIndex > -1 && itemFound.armorIndex > -1)
                    )) {
                    existingItems.push(equip);
                }
            });
        }
        if (existingItems.length > 0) {
            _.each(existingItems, function(loadoutItem) {
                loadoutItem.doEquip(false);
            });
        }
        if (item.doEquip()) {
            //TODO: TypeError: undefined is not an object (evaluating '_.findWhere(self.ids(), { id: item._id }).doEquip')
            _.findWhere(self.ids(), {
                id: item._id
            }).doEquip(true);
        }
        return true;
    };

    /* inits a Loadouts object with an Items array */
    if (isItems) {
        _.each(model, function(item) {
            if (item._id > 0) {
                self.addUniqueItem({
                    id: item._id,
                    bucketType: item.bucketType,
                    doEquip: false
                });
            } else {
                self.addGenericItem({
                    hash: item.id,
                    bucketType: item.bucketType,
                    characterId: item.characterId()
                });
            }
        });
    }
    /* loader/migrate code */
    else if (model && model.ids && model.ids.length > 0) {
        var firstItem = model.ids[0];
        if (firstItem && _.isString(firstItem)) {
            //
            var _ids = [];
            _.each(model.ids, function(id) {
                var equipDef = _.findWhere(model.equipIds, {
                    _id: id
                });
                var item = self.findItemById(id);
                if (item)
                    _ids.push(new tgd.LoadoutItem({
                        id: id,
                        bucketType: equipDef ? equipDef.bucketType : item.bucketType,
                        doEquip: equipDef ? true : false
                    }));
            });
            self.ids(_ids);
        } else {
            //
            self.ids(_.map(model.ids, function(obj) {
                //
                return new tgd.LoadoutItem(obj);
            }));
        }
    }

};

tgd.Loadout.prototype = {
    /* this function is meant to normalize the difference between having ghost/artifacts in armor and it existing under general */
    normalize: function(bucketTypes, extras) {
        var arrUnion = _.difference(extras, bucketTypes),
            arr = [];
        if (arrUnion.length == extras.length) {
            arr = _.union(bucketTypes, extras);
        } else {
            arr = _.difference(bucketTypes, extras);
        }
        return arr;
    },
    toJSON: function() {
        var copy = ko.toJS(this); //easy way to get a clean copy
        //copy.items = _.pluck(copy.items, '_id'); //strip out items metadata
        delete copy.items;
        return copy;
    },
    compareLoadout: function() {
        var ids = _.pluck(this.items(), 'id').join(",");
        window.open("http://db.destinytracker.com/compare/" + ids, tgd.openTabAs);
    },
    setActive: function() {
        app.loadoutMode(true);
        app.dynamicMode(false);
        app.activeLoadout(_.clone(this));
    },
    remove: function() {
        if (confirm("Are you sure you want to remove this loadout? This action cannot be undone")) {
            var ref = _.findWhere(app.loadouts(), {
                loadoutId: this.loadoutId
            });
            app.loadouts.remove(ref);
            app.createLoadout();
            app.saveLoadouts();
            app.loadoutMode(false);
        }
    },
    save: function() {
        //this is a reference to the cloned Loadout object while in use
        //ref is a reference to the Loadout object this came from
        //the reason for making a clone is to make sure the original isn't modified
        var ref = _.findWhere(app.loadouts(), {
            loadoutId: this.loadoutId
        });
        //When saving there should always be the parent object that gets deleted in favor of this one
        if (ref) {
            app.loadouts.splice(app.loadouts().indexOf(ref), 1);
        }
        //Pushing the reference to the new object to the array
        app.loadouts.push(this);
        app.saveLoadouts();
    },
    saveNew: function() {
        //There's no need to find a reference to the parent to delete it if this is Save as New
        app.loadouts.push(this);
        app.saveLoadouts();
    },
    addUniqueItem: function(obj) {
        this.ids.push(new tgd.LoadoutItem(obj));
    },
    addGenericItem: function(obj) {
        this.generics.push(new tgd.LoadoutItem(obj));
    },
    findItemByHash: function(hash, characterId) {
        var itemFound;
        app.characters().forEach(function(character) {
            var match = _.filter(character.items(), function(item) {
                if (characterId)
                    return item.id == hash && item.characterId() == characterId;
                else
                    return item.id == hash;
            })[0];
            if (match) itemFound = _.clone(match);
        });
        return itemFound;
    },
    findItemById: function(id) {
        var itemFound;
        app.characters().forEach(function(character) {
            var match = _.findWhere(character.items(), {
                _id: id
            });
            if (match) itemFound = _.clone(match);
        });
        return itemFound;
    },
    swapItems: function(swapArray, targetCharacterId, callback) {
        var self = this;
        tgd.autoTransferStacks = true;
        var itemIndex = -1,
            increments = parseInt(Math.round(95 / (1.0 * swapArray.length))),
            progressValue = 5;
        var loader = $(".bootstrap-dialog-message .progress").show().find(".progress-bar").width(progressValue + "%");
        var transferNextItem = function() {
            
            var pair = swapArray[++itemIndex],
                targetItem, swapItem, action, targetOwner;
            progressValue = progressValue + increments;
            loader.width(progressValue + "%");
            //now that they are both in the vault transfer them to their respective location
            var transferTargetItemToVault = function(complete) {
                targetItem = pair.targetItem;
                if (typeof targetItem != "undefined") {
                    targetOwner = targetItem.character.id;
                    
                    if (targetOwner == "Vault") {
                        complete();
                    } else {
                        var originalCharacterId = targetItem.character.id;
                        targetItem.store("Vault", function(profile) {
                            if (profile.id == originalCharacterId) {
                                $.toaster({
                                    priority: 'danger',
                                    title: 'Error',
                                    message: "Unable to unequip " + targetItem.description + " while playing in game"
                                });
                                complete();
                            } else {
                                complete();
                            }
                        });
                    }
                } else {
                    complete();
                }
            };
            var transferSwapItemToVault = function(complete) {
                swapItem = pair.swapItem;
                
                if (swapItem.character.id == "Vault") {
                    complete();
                } else {
                    var originalCharacterId = swapItem.character.id;
                    swapItem.store("Vault", function(profile) {
                        
                        /* unequip failed, pick another swapItem not used in the swapArray */
                        if (profile.id == originalCharacterId) {
                            var equippedItem = swapItem;
                            
                            
                            var swapAndTargetIDs = _.flatten(_.map(swapArray, function(pair) {
                                var tmp = [];
                                if (pair.swapItem)
                                    tmp.push(pair.swapItem._id);
                                if (pair.targetItem)
                                    tmp.push(pair.targetItem._id);
                                return tmp;
                            }));
                            
                            
                            var candidates = _.filter(swapItem.character.get(swapItem.bucketType), function(item) {
                                var isCandidate = swapAndTargetIDs.indexOf(item._id) == -1;
                                
                                return isCandidate;
                            });
                            
                            if (candidates.length > 0) {
                                swapItem = candidates[0];
                                
                                swapItem.store("Vault", function() {
                                    
                                    complete();
                                });
                            } else {
                                $.toaster({
                                    priority: 'danger',
                                    title: 'Error',
                                    message: "Unable to unequip " + equippedItem.description + " while playing in game"
                                });
                                pair.swapItem = pair.targetItem = targetItem = swapItem = null;
                                
                                complete();
                            }
                        } else {
                            complete();
                        }
                    });
                }
            };
            var transferTargetItemToDestination = function(complete) {
                if (typeof targetItem == "undefined" && pair.targetItem)
                    targetItem = pair.targetItem;
                if (targetItem) {
                    var action = (_.where(self.ids(), {
                        id: targetItem._id
                    }).filter(function(item) {
                        return item.doEquip() === true;
                    }).length === 0) ? "store" : "equip";
                    
                    if (targetCharacterId == "Vault" && targetItem.character.id == "Vault") {
                        
                        complete();
                    } else {
                        var originalCharacterId = targetItem.character.id;
                        targetItem[action](targetCharacterId, function(profile) {
                            if (profile.id == originalCharacterId) {
                                $.toaster({
                                    priority: 'danger',
                                    title: 'Error',
                                    message: "Unable to unequip " + targetItem.description + " while playing in game"
                                });
                                complete();
                            } else {
                                complete();
                            }
                        });
                    }
                } else {
                    complete();
                }
            };
            var transferSwapItemToDestination = function(complete) {
                if (typeof swapItem == "undefined" && pair.swapItem)
                    swapItem = pair.swapItem;
                if (swapItem) {
                    
                    if (targetOwner == "Vault" && swapItem.character.id == "Vault") {
                        
                        complete();
                    } else {
                        swapItem.store(targetOwner, complete);
                    }
                } else {
                    complete();
                }
            };
            /* this assumes there is a swap item and a target item*/
            var startSwapping = function(finish) {
                
                transferTargetItemToVault(function() {
                    
                    transferSwapItemToVault(function() {
                        
                        transferTargetItemToDestination(function() {
                            
                            transferSwapItemToDestination(function() {
                                
                                if (finish) finish();
                                else transferNextItem();
                            });
                        });
                    });
                });
            };
            /* this assumes there is a swap item and a target item*/
            var checkAndMakeFreeSpace = function(ref, spaceNeeded, fnHasFreeSpace) {
                var item = ref;
                if (typeof item == "undefined") {
                    return BootstrapDialog.alert(self.description + ": Item not found while attempting to transfer the item " + ref.description);
                } else if (ref.bucketType == "Subclasses") {
                    return fnHasFreeSpace();
                }
                var vault = _.findWhere(app.characters(), {
                    id: "Vault"
                });
                var bucketType = item.bucketType,
                    otherBucketTypes;
                var layout = _.filter(tgd.DestinyLayout, function(layout) {
                    return (layout.bucketTypes.indexOf(bucketType) > -1 && layout.extras.indexOf(bucketType) == -1) || (layout.bucketTypes.indexOf(bucketType) == -1 && layout.extras.indexOf(bucketType) > -1);
                })[0];
                var actualBucketTypes = self.normalize(layout.bucketTypes, layout.extras);
                var spaceNeededInVault = layout.counts[0] - spaceNeeded;
                //TODO: TypeError: undefined is not an object (evaluating 'vault.items')
                
                var spaceUsedInVault = _.filter(vault.items(), function(otherItem) {
                    return otherItem.actualBucketType == item.actualBucketType;
                }).length;

                
                

                if (spaceUsedInVault <= spaceNeededInVault) { // || targetCharacterId == "Vault"
                    
                    fnHasFreeSpace();
                } else {
                    //
                    //abort;
                    var maxFreeSpace = 9, //not counting the equipped
                        tmpItems = [],
                        tmpIds = [];
                    var freeSpaceNeeded = spaceUsedInVault - spaceNeededInVault;
                    
                    otherBucketTypes = [].concat(actualBucketTypes);
                    otherBucketTypes.splice(otherBucketTypes.indexOf(bucketType), 1);
                    
                    
                    _.each(otherBucketTypes, function(bucketType) {
                        if (tgd.DestinyNonUniqueBuckets.indexOf(bucketType) == -1) {
                            _.each(app.characters(), function(character) {
                                if (freeSpaceNeeded > 0 && character.id != "Vault") {
                                    
                                    var freeSpace = maxFreeSpace - character.get(bucketType).length;
                                    if (freeSpace > 0) {
                                        
                                        var itemsToMove = vault.get(bucketType);
                                        
                                        _.each(itemsToMove, function(item) {
                                            if (freeSpaceNeeded > 0 && freeSpace > 0 && tmpIds.indexOf(item._id) == -1) {
                                                tmpItems.push({
                                                    item: item,
                                                    character: character
                                                });
                                                tmpIds.push(item._id);
                                                freeSpaceNeeded = freeSpaceNeeded - 1;
                                                freeSpace = freeSpace - 1;
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    });
                    
                    
                    var preCount = 0,
                        postCount = 0;
                    var finish = function() {
                        postCount++;
                        if (postCount == tmpItems.length) {
                            
                            transferNextItem();
                        }
                    };
                    var done = function() {
                        preCount++;
                        
                        if (preCount == tmpItems.length) {
                            
                            fnHasFreeSpace(function() {
                                //
                                _.each(tmpItems, function(pair) {
                                    pair.item.store("Vault", finish);
                                });
                            });
                        }
                    };
                    _.each(tmpItems, function(pair) {
                        pair.item.store(pair.character.id, done);
                    });
                }
            };
            if (pair) {
                if (typeof pair.swapItem !== "undefined") {
                    checkAndMakeFreeSpace(pair.swapItem, 2, startSwapping);
                } else if (typeof pair.targetItem !== "undefined" && pair.actionState > 0) {
                    
                    checkAndMakeFreeSpace(pair.targetItem, 1, function(callback) {
                        transferTargetItemToDestination(function() {
                            if (callback) callback();
                            else transferNextItem();
                        });
                    });
                } else {
                    
                    transferNextItem();
                }
            } else {
                
                tgd.autoTransferStacks = false;
                if (callback)
                    callback();
            }
        };
        app.activeLoadout(new tgd.Loadout());
        app.loadoutMode(false);
        transferNextItem();
    },
    /* before starting the transfer we need to decide what strategy we are going to use */
    /* strategy one involves simply moving the items across assuming enough space to fit in both without having to move other things */
    /* strategy two involves looking into the target bucket and creating pairs for an item that will be removed for it */
    /* strategy three is the same as strategy one except nothing will be moved bc it's already at the destination */
    transfer: function(targetCharacterId, callback) {
        var self = this;
        var targetCharacter = _.findWhere(app.characters(), {
            id: targetCharacterId
        });
        if (typeof targetCharacter == "undefined") {
            return BootstrapDialog.alert("Target character not found");
        }
        var targetCharacterIcon = targetCharacter.icon();
        var getFirstItem = function(sourceBucketIds, itemFound) {
            //
            return function(otherItem) {
                /* if the otherItem is not part of the sourceBucket then it can go */
                //
                if (sourceBucketIds.indexOf(otherItem._id) == -1 && itemFound === false) {
                    itemFound = true;
                    sourceBucketIds.push(otherItem._id);
                    return otherItem;
                }
            };
        };
        var masterSwapArray = [],
            swapItem,
            sourceItems = self.items();
        if (sourceItems.length > 0) {
            var targetList = targetCharacter.items();
            var sourceGroups = _.groupBy(sourceItems, 'bucketType');
            var targetGroups = _.groupBy(targetList, 'bucketType');
            masterSwapArray = _.flatten(_.map(sourceGroups, function(group, key) {
                var sourceBucket = sourceGroups[key];
                var targetBucket = targetGroups[key] || [];
                var swapArray = [];
                if (sourceBucket && targetBucket) {
                    if (tgd.DestinyNonUniqueBuckets.indexOf(key) == -1) {
                        var maxBucketSize = 10;
                        var targetBucketSize = targetBucket.length;
                        if (targetCharacter.id == "Vault") {
                            var layout = _.filter(tgd.DestinyLayout, function(layout) {
                                return (layout.bucketTypes.indexOf(key) > -1 && layout.extras.indexOf(key) == -1) ||
                                    (layout.bucketTypes.indexOf(key) == -1 && layout.extras.indexOf(key) > -1);
                            })[0];
                            var actualBucketTypes = self.normalize(layout.bucketTypes, layout.extras);
                            targetBucketSize = _.filter(targetCharacter.items(), function(item) {
                                return actualBucketTypes.indexOf(item.bucketType) > -1;
                            }).length;
                            maxBucketSize = layout.counts[0];
                        }
                        //
                        var targetMaxed = (targetBucketSize == maxBucketSize);
                        
                        
                        /* use the swap item strategy */
                        /* by finding a random item in the targetBucket that isnt part of sourceBucket */
                        if (sourceBucket.length + targetBucketSize > maxBucketSize) {
                            
                            var sourceBucketIds = _.pluck(sourceBucket, "_id");
                            swapArray = _.map(sourceBucket, function(item) {
                                var ownerIcon = item.character.icon();
                                /* if the item is already in the targetBucket */
                                if (_.findWhere(targetBucket, {
                                        _id: item._id
                                    })) {
                                    /* if the item is currently part of the character but it's marked as to be equipped than return the targetItem */
                                    if (item.doEquip() === true) {
                                        return {
                                            targetItem: item,
                                            actionState: 2,
                                            description: "<%= item.description %> <%= app.activeText().loadouts_to_equip %>",
                                            swapIcon: targetCharacterIcon
                                        };
                                    }
                                    /* then return an object indicating to do nothing */
                                    else {
                                        return {
                                            targetItem: item,
                                            actionState: 0,
                                            description: "<%= item.description %> <%= app.activeText().loadouts_alreadythere_pt1 %> <%= targetCharacter.classType() %> <%= app.activeText().loadouts_alreadythere_pt2 %> <%= item.bucketType %>",
                                            targetIcon: item.icon,
                                            swapIcon: ownerIcon
                                        };
                                    }
                                } else {
                                    var itemFound = false;
                                    if (item.bucketType == "Shader") {
                                        swapItem = _.filter(targetBucket, function(otherItem) {
                                            return otherItem.bucketType == item.bucketType && otherItem.description != "Default Shader" && sourceBucketIds.indexOf(otherItem._id) == -1;
                                        })[0];
                                    } else {
                                        /* This will ensure that an item of the same itemHash will not be used as a candidate for swapping 
												e.g. if you have a Thorn on two characters, you want to send any hand cannon between them and never swap the Thorn
											*/
                                        
                                        var sourceBucketHashes = _.pluck(_.where(item.character.items(), {
                                            bucketType: item.bucketType
                                        }), 'id');
                                        
                                        
                                        var candidates = _.filter(targetBucket, function(otherItem) {
                                            var index = sourceBucketHashes.indexOf(otherItem.id);
                                            
                                            return index == -1 && otherItem.transferStatus < 2; // && otherItem.isEquipped() === false
                                        });
                                        
                                        swapItem = _.filter(_.where(candidates, {
                                            type: item.type
                                        }), getFirstItem(sourceBucketIds, itemFound));
                                        
                                        if (swapItem.length === 0) {
                                            //
                                            
                                        }
                                        swapItem = (swapItem.length > 0) ? swapItem[0] : _.filter(candidates, getFirstItem(sourceBucketIds, itemFound))[0];
                                        /* if there is still no swapItem at this point I have to break the original rule the prevents duplicates*/
                                        if (!swapItem) {
                                            swapItem = _.filter(targetBucket, getFirstItem(sourceBucketIds, itemFound))[0];
                                        }
                                    }
                                    if (swapItem) {
                                        
                                        targetBucket.splice(targetBucket.indexOf(swapItem), 1);
                                        //
                                        if (swapItem.armorIndex != -1 && item.character.id != "Vault" && item.character.classType() != targetCharacter.classType()) {
                                            return {
                                                targetItem: item,
                                                actionState: 0,
                                                description: "<%= item.description %> <%= app.activeText().loadouts_no_transfer %>",
                                                targetIcon: item.icon,
                                                swapIcon: ownerIcon
                                            };
                                        }
                                        return {
                                            targetItem: item,
                                            swapItem: swapItem,
                                            actionState: 3,
                                            description: "<%= item.description %> <%= app.activeText().loadouts_swap %> <%= swapItem.description %>"
                                        };
                                    } else {
                                        
                                        return {
                                            targetItem: item,
                                            actionState: 1,
                                            description: "<%= item.description %> <%= app.activeText().loadouts_to_transfer %>",
                                            swapIcon: targetCharacterIcon,
                                            actionIcon: "assets/to-transfer.png"
                                        };
                                    }
                                }
                            });
                        } else {
                            /* do a clean move by returning a swap object without a swapItem */
                            swapArray = _.map(sourceBucket, function(item) {
                                var ownerIcon = item.character.icon();
                                /* if the item is already in the targetBucket */
                                if (_.findWhere(targetBucket, {
                                        _id: item._id
                                    })) {
                                    /* if the item is currently part of the character but it's marked as to be equipped than return the targetItem */
                                    
                                    if (item.doEquip() === true) {
                                        return {
                                            targetItem: item,
                                            actionState: 2,
                                            description: "<%= item.description %> <%= app.activeText().loadouts_to_equip %>",
                                            actionIcon: "assets/to-equip.png",
                                            swapIcon: targetCharacterIcon
                                        };
                                    }
                                    /* then return an object indicating to do nothing */
                                    else {
                                        return {
                                            targetItem: item,
                                            actionState: 0,
                                            description: "<%= item.description %> <%= app.activeText().loadouts_alreadythere_pt1 %> <%= targetCharacter.classType() %>  <%= app.activeText().loadouts_alreadythere_pt2 %> <%= item.bucketType %>",
                                            targetIcon: item.icon,
                                            actionIcon: "assets/no-transfer.png",
                                            swapIcon: ownerIcon
                                        };
                                    }
                                }
                                //this condition is supposed to supress subclases 
                                else if (item.bucketType == "Subclasses") {
                                    
                                    return {
                                        targetItem: item,
                                        actionState: 0,
                                        description: "<%= item.description %> <%= app.activeText().loadouts_no_transfer %>",
                                        targetIcon: item.icon,
                                        swapIcon: ownerIcon
                                    };
                                } else {
                                    if (item.doEquip() === true) {
                                        return {
                                            targetItem: item,
                                            actionState: 2,
                                            description: "<%= item.description %> <%= app.activeText().loadouts_to_moveequip %>",
                                            swapIcon: targetCharacterIcon
                                        };
                                    } else {
                                        
                                        return {
                                            targetItem: item,
                                            actionState: 1,
                                            description: "<%= item.description %> <%= app.activeText().loadouts_to_transfer %>",
                                            swapIcon: targetCharacterIcon
                                        };
                                    }
                                }
                            });
                        }
                    } else {
                        swapArray = _.map(sourceBucket, function(item) {
                            return {
                                targetItem: item,
                                actionState: 1,
                                description: "<%= item.description %> <%= app.activeText().loadouts_to_transfer %>",
                                swapIcon: targetCharacterIcon
                            };
                        });
                    }
                }
                return swapArray;
            }));
        }
        if (callback) {
            if (_.isFunction(callback)) callback(masterSwapArray);
            else return masterSwapArray;
        } else {
            self.promptUserConfirm(masterSwapArray, targetCharacterId);
        }
    },
    promptUserConfirm: function(masterSwapArray, targetCharacterId, callback) {
        if (masterSwapArray.length > 0) {
            var self = this;
            var targetCharacter = _.findWhere(app.characters(), {
                id: targetCharacterId
            });
            var ltc = new tgd.loadoutsTransferConfirm(masterSwapArray, targetCharacter);
            
            var transfer = function(dialog) {
                self.swapItems(ltc.getSwapArray(), targetCharacterId, function() {
                    $.toaster({
                        settings: {
                            timeout: 15 * 1000
                        },
                        priority: 'success',
                        title: 'Success',
                        message: app.activeText().loadouts_transferred
                    });
                    setTimeout(function() {
                        $(".donateLink").click(app.showDonate);
                    }, 1000);
                    app.dynamicMode(false);
                    dialog.close();
                    if (callback) {
                        callback(targetCharacter);
                    }
                });
            };
            (new tgd.koDialog({
                templateName: "swapTemplate",
                viewModel: ltc,
                onFinish: transfer,
                buttons: [{
                    label: app.activeText().loadouts_transfer,
                    action: transfer
                }, {
                    label: app.activeText().cancel,
                    action: function(dialog) {
                        dialog.close();
                    }
                }]
            })).title(app.activeText().loadouts_transfer_confirm).show(true);
        }
    }
};tgd.locale = {
    en: {
        agility: "Agility",
        armor: "Armor",
        best_combo: "Best Combo",
        cancel: "Cancel",
        cannot_equip: "Unknown error trying to equip ",
        cannot_unequip: "No more items to try to unequip the ",
        close_msg: "Close",
        ok_msg: "OK",
        disc: "Disc",
        discipline: "Discipline",
        donation_instructions: "This is a non-commercial project dedicated to Destiny. If you like this app provide a donation to keep this project alive and support the maintenance costs.",
        donation_title: "Donations for Tower Ghost for Destiny!",
        error_loading_inventory: "Error loading inventory ",
        gear_with_highest: "Equip Gear With Highest:",
        inte: "Int",
        intellect: "Intellect",
        invalid_transfer_amount: "Invalid amount entered: ",
        inventory_armor: "Armor",
        inventory_general: "General",
        inventory_postmaster: "Post Master",
        inventory_postmaster_messages: "Messages",
        inventory_postmaster_lost_items: "Lost Items",
        inventory_subclasses: "Sub Classes",
        inventory_weapons: "Weapons",
        itemDefs_undefined: "Could not load item definitions, please report the issue to my Github including the version number being used.",
        language_pack_downloaded: "Language Pack downloaded, please refresh to see the changes",
        language_text: "This will change the language for all items and the interface for some languages, more languages will be added in the future.",
        light: "Light",
        loadouts_alreadythere_pt1: " is already in the ",
        loadouts_alreadythere_pt2: "'s bucket of ",
        loadouts_delete: "Delete",
        loadouts_desktop: "check",
        loadouts_instructions: "No items in loadout, click items to add, ",
        loadouts_instructions_contd: " to equip.",
        loadouts_invalidbucket: " will not be moved. Because of this bucket: ",
        loadouts_mobile: "hold",
        loadouts_no_replacement: " will not be moved. There is no item to replace it.",
        loadouts_no_transfer: " will not be moved",
        loadouts_outofspace: " will not be moved, there is no space in ",
        loadouts_save: "Save",
        loadouts_save_new: "Save As",
        loadouts_swap: " will be swapped with ",
        loadouts_to_equip: " will be equipped.",
        loadouts_to_moveequip: " will be moved and equipped.",
        loadouts_to_transfer: " will be moved",
        loadouts_transfer: "Transfer",
        loadouts_transfer_confirm: "Transfer Confirm",
        loadouts_transferred: "<strong>Item(s) Transferred!</strong><br>If you like this app remember to <a style=\"color:#3080CF; cursor:pointer;\" class=\"donateLink\" target=\"_system\">buy me a beer</a>.",
        login_authenticating_pt1: "Logging into Bungie... Please be patient.",
        login_authenticating_pt2: "If log in screen remains for 2+ minutes, use these links for",
        login_authenticating_pt3: "to retry login. If the problem persists, reinstall the app.",
        login_help: "Please wait for the login window to auto close as TGD prepares your information.",
        login_instructions: "To get started you'll need to log in to your Bungie.net account via:",
        login_loading_updates: "Please wait, downloading auto updates",
        login_loading_inventory: "Please wait, loading arsenal from Bungie",
        login_title: "Welcome to Tower Ghost for Destiny!",
        menu_viewformat: "View Format",
        menu_viewimagegrid: "Image Grid",
        menu_viewitemlist: "Items List",
        menu_about: "About",
        menu_advancedtooltips: "Advanced Tooltips",
        menu_all: "All",
        menu_autorefresh: "Auto Refresh (5 min)",
        menu_autotransfer: "Auto Transfer Stacks",
        menu_clear: "Clear Filters",
        menu_destinydbtooltips: "DestinyDB Tooltips",
        menu_destinydbmode: "DestinyDB Mode",
        menu_destinystatus: "DestinyStatus Report",
        menu_destinytrials: "DestinyTrials Report",
        menu_destinytracker: "DestinyTracker Report",
        menu_destinyguardiangg: "Guardian.GG Report",
        menu_damage: "Damage",
        menu_donate: "Donate",
        menu_filter_by: "Filter By",
        menu_filter_by_subclass_eq: "Subclass Equipped",
        menu_filter_by_weapon_eq: "Weapons Equipped",
        menu_filter_for_class: "Filter for Class",
        menu_help: "Help",
        menu_language: "Language",
        menu_loadouts: "Loadouts",
        menu_loadouts_create: "Create",
        menu_loadouts_manage: "Manage",
        menu_padheight: "Auto Pad Height",
        menu_progress: "Progress",
        menu_progress_1: "Missing Perks",
        menu_progress_2: "Missing Border",
        menu_progress_3: "Maxed",
        menu_refresh: "Refresh (secs)",
        menu_set: "Set",
        menu_set_showmissing: "Show Missing Items",
        menu_set_showduplicates: "Show Duplicate Items",
        menu_settings: "Settings",
        menu_options: "More",
        menu_shareurl: "Share URL with friends",
        menu_sortby: "Sort By",
        menu_sortby_lightlvl: "Light Level",
        menu_sortby_name: "Name",
        menu_sortby_type: "Type",
        menu_sortby_tier_type: "Tier, Type",
        menu_sortby_tier_light: "Tier, Light",
        menu_sortby_tier_name: "Tier, Name",
        menu_sortby_type_light: "Type, Light",
        menu_tier: "Tier",
        menu_usexbox: "Use Xbox Account",
        menu_useps: "Use Playstation Account",
        menu_view: "View",
        menu_view_armor: "Armor",
        menu_view_by: "View By",
        menu_view_by_lightlvl: "Light Level",
        menu_view_by_stat_points: "Combined Stat Points",
        menu_view_general: "General",
        menu_view_options: "View Options",
        menu_view_weapons: "Weapons",
        missing_items: "Missing Items",
        most_points: "Points",
        movepopup_move: "Move",
        movepopup_store: "store",
        movepopup_equip: "equip",
        movepopup_vault: "vault",
        movepopup_extras: "extras",
        normalize: "Normalize",
        normalize_title: "Normalize - equally distribute item across your characters",
        paypal_code: "EN",
        pick_a_set: "Please pick a Set before selecting this option",
        strength: "Strength",
        recovery: "Recovery",
        str: "Str",
        text_shareurl: "Your inventory is updated by clicking on Share URL from the menu again.",
        this_icon: "This icon is ",
        tier_common: "Common",
        tier_exotic: "Exotic",
        tier_legendary: "Legendary",
        tier_rare: "Rare",
        tier_uncommon: "Uncommon",
        transfer: "Transfer",
        transfer_all: "All",
        transfer_amount: "Transfer Amount",
        transfer_ask: "Don\'t ask in the future",
        consolidate: "Consolidate",
        transfer_consolidate: "Consolidate (pull from all characters",
        transfer_one: "One",
        unable_create_loadout_for_type: "Currently unable to create loadouts with this item type.",
        unable_unequip: "Unable to unequip ",
        unable_to_create_loadout_for_bucket: "You cannot create a loadout with more than 10 items in this slot: ",
        unable_to_move_bucketitems: "This item cannot be transferred with the API.",
        vo_container_width: "Container Width",
        vo_layout_mode: "Vault Mode",
        vo_layout_mode_cust: "Custom",
        vo_layout_mode_def: "Default",
        vo_number_of_columns: "Number of Columns",
        vo_vault_columns: "Vault Columns",
        vo_vault_first: "First/Left",
        vo_vault_last: "Last/Right",
        vo_vault_position: "Vault Position",
        vo_vault_width: "Vault Width",
        whats_new_title: "Tower Ghost for Destiny Updates"
    },
    de: {
        agility: "Agil",
        armor: "Rstg",
        best_combo: "Beste Komb.",
        cancel: "Abbrechen",
        cannot_equip: "Unbekannter Fehler beim Ausrüsten von ",
        cannot_unequip: "Keine Gegenstände mehr zum Ablegen von ",
        close_msg: "Schließen",
        ok_msg: "OK",
        disc: "Dis",
        discipline: "Dis",
        donation_instructions: "Dies ist ein nicht-kommerzielles Projekt, das Destiny gewidmet ist. Wenn dir diese App gefällt, denke doch über eine Spende nach um das Projekt am Leben zu halten.",
        donation_title: "Spenden an Tower Ghost für Destiny!",
        error_loading_inventory: "Fehler beim Laden des Inventars ",
        gear_with_highest: "Ausrüstung mit höchstem:",
        inte: "Int",
        intellect: "Int",
        invalid_transfer_amount: "Ungültige Menge eingegeben: ",
        inventory_armor: "Rüstung",
        inventory_general: "Allgemein",
        inventory_postmaster: "Post",
        inventory_postmaster_lost_items: "Verlorene Gegenstände",
        inventory_postmaster_messages: "Nachrichten",
        inventory_subclasses: "Fokusse",
        inventory_weapons: "Waffen",
        itemDefs_undefined: "Konnte Gegenstandsinformationen nicht laden, bitte melde dieses Problem bei meinem GitHub und stelle sicher, dass deine Schrift auf Englisch gestellt ist.",
        language_pack_downloaded: "Sprachpaket heruntergeladen, bitte aktualisiere um die Änderungen anzuzeigen",
        language_text: "Dies wird die Sprache für alle Gegnstände und bei manchen Sprachen das Interface verändern, weitere Sprachen werden in der Zukunft hinzugefügt.",
        light: "Licht",
        loadouts_alreadythere_pt1: " ist bereits im ",
        loadouts_alreadythere_pt2: "'s Bucket von ",
        loadouts_delete: "Löschen",
        loadouts_desktop: "prüfen",
        loadouts_instructions: "Keine Gegenstände in der Ausrüstung, klicke Gegenstände um sie hinzuzufügen, ",
        loadouts_instructions_contd: " zum Ausrüsten.",
        loadouts_invalidbucket: " wird nicht verschoben. Wegen diesem Bucket: ",
        loadouts_mobile: "halten",
        loadouts_no_replacement: " wird nicht verschoben. Es gibt keinen Gegenstand als Ersatz.",
        loadouts_no_transfer: " wird nicht verschoben",
        loadouts_outofspace: " wird nicht verschoben, es ist kein Platz in ",
        loadouts_save: "Speichern",
        loadouts_save_new: "Speichern Als",
        loadouts_swap: " wird ausgetauscht mit ",
        loadouts_to_equip: " wird ausgerüstet.",
        loadouts_to_moveequip: " wird verschoben und ausgerüstet.",
        loadouts_to_transfer: " wird verschoben",
        loadouts_transfer: "Übertragen",
        loadouts_transfer_confirm: "Übertragungsbestätigung",
        loadouts_transferred: "<strong>Gegenstände erfolgreich übertragen</strong><br> Wenn dir diese App gefällt, vergiss nicht <a style=\"color:#3080CF; cursor:pointer;\" class=\"donateLink\" target=\"_system\">mir ein Bier zu kaufen</a>",
        login_authenticating_pt1: "Bei Bungie einloggen... Bitte habe ein wenig Geduld.",
        login_authenticating_pt2: "Wenn der Login Bildschirm für länger als 2 Minuten bleibt, nutze diese Links für",
        login_authenticating_pt3: "um das Einloggen erneut zu versuchen. Wenn das Problem weiterhin besteht, installiere die App erneut.",
        login_help: "Bitte warte bis sich das Loginfenster von selbst schließt, während TGD deine Daten vorbereitet.",
        login_instructions: "Zu Beginn musst du dich bei deinem Bungie.net Account einloggen via:",
        login_loading_inventory: "Bitte warten, lade Arsenal von Bungie",
        login_loading_updates: "Bitte warten, lade automatische Updates",
        login_title: "Willkommen bei Tower Ghost für Destiny!",
        menu_viewformat: "View Format",
        menu_viewimagegrid: "Image Grid",
        menu_viewitemlist: "Items List",
        menu_about: "Über",
        menu_advancedtooltips: "Erweiterte Tooltips",
        menu_all: "Alle",
        menu_autorefresh: "Automatisch Aktualiseren (5 min)",
        menu_autotransfer: "Stacks Automatisch Übertragen",
        menu_clear: "Filter Zurücksetzen",
        menu_damage: "Schaden",
        menu_destinydbmode: "DestinyDB Modus",
        menu_destinydbtooltips: "DestinyDB Tooltips",
        menu_destinystatus: "DestinyStatus Bericht",
        menu_destinytrials: "DestinyTrials Bericht",
        menu_destinytracker: "DestinyTracker Bericht",
        menu_destinyguardiangg: "Guardian.GG Bericht",
        menu_donate: "Spenden",
        menu_filter_by: "Filtern",
        menu_filter_by_subclass_eq: "Unterklasse ausgerüstet",
        menu_filter_by_weapon_eq: "Waffen ausgerüstet",
        menu_filter_for_class: "Filter nach Klasse",
        menu_help: "Hilfe",
        menu_language: "Sprache",
        menu_loadouts: "Ausrüstungen",
        menu_loadouts_create: "Erstellen",
        menu_loadouts_manage: "Manage",
        menu_padheight: "Automatische Feldhöhe",
        menu_progress: "Fortschritt",
        menu_progress_1: "Fehlende Perks",
        menu_progress_2: "Volle Perks",
        menu_progress_3: "Voll",
        menu_refresh: "Aktualisieren",
        menu_set: "Setzen",
        menu_set_showduplicates: "Doppelte anzeigen",
        menu_set_showmissing: "Fehlende anzeigen",
        menu_settings: "Einstellungen",
        menu_options: "More",
        menu_shareurl: "URL mit Freunden teilen",
        menu_sortby: "Sortieren",
        menu_sortby_lightlvl: "Licht Level",
        menu_sortby_name: "Name",
        menu_sortby_type: "Typ",
        menu_sortby_tier_type: "Seltenheit, Typ",
        menu_sortby_tier_light: "Seltenheit, Licht",
        menu_sortby_tier_name: "Seltenheit, Name",
        menu_sortby_type_light: "Typ, Licht",
        menu_tier: "Seltenheit",
        menu_useps: "Playstation Account Verwenden",
        menu_usexbox: "Xbox Account Verwenden",
        menu_view: "Anzeige",
        menu_view_armor: "Rüstung",
        menu_view_by: "Anzeigen nach",
        menu_view_by_lightlvl: "Licht Level",
        menu_view_by_stat_points: "Komb Stat Pkte",
        menu_view_general: "Allgemein",
        menu_view_options: "Optionen Anzeigen",
        menu_view_weapons: "Waffen",
        missing_items: "Fehlende Gegenstände",
        most_points: "Punkte",
        movepopup_equip: "Ausrüsten",
        movepopup_extras: "Extras",
        movepopup_move: "Verschieben",
        movepopup_store: "Lagern",
        movepopup_vault: "Tresor",
        normalize: "Normalisieren",
        normalize_title: "Normalisieren - Gegenstände gleichmäßig über deine Charaktere verteilen",
        paypal_code: "DE",
        pick_a_set: "Bitte wähle ein Set bevor du diese Option auswählst",
        recovery: "Erhlg",
        str: "Stä",
        strength: "Stä",
        text_shareurl: "Dein Inventar wird aktualisiert, indem du erneut auf URL teilen im Menü klickst.",
        this_icon: "Das Icon ist",
        tier_common: "Gewöhnlich",
        tier_exotic: "Exotisch",
        tier_legendary: "Legendär",
        tier_rare: "Selten",
        tier_uncommon: "Ungewöhnlich",
        transfer: "Übertrage",
        transfer_all: "Alle",
        transfer_amount: "Menge Übertragen",
        transfer_ask: "Nicht erneut fragen",
        consolidate: "Zusammenlegen",
        transfer_consolidate: "Zusammenlegen (von allen Charakteren",
        transfer_one: "Eins",
        unable_create_loadout_for_type: "Es ist aktuell nicht möglich Ausrüstungen mit diesem Gegenstand zu erstellen.",
        unable_to_create_loadout_for_bucket: "Du kannst keine Ausrüstung mit mehr als 10 Gegenständen in diesem Platz erstellen: ",
        unable_to_move_bucketitems: "Gegenstände in diesem Bucket können nicht mit dem API übertragen werden.",
        unable_unequip: "Ablegen unmöglich von ",
        vo_container_width: "Container Breite",
        vo_layout_mode: "Layout Modus",
        vo_layout_mode_cust: "Angepasst",
        vo_layout_mode_def: "Standard",
        vo_number_of_columns: "Spalten",
        vo_vault_columns: "Tresor Spalten",
        vo_vault_first: "Erste/Links",
        vo_vault_last: "Letzte/Rechts",
        vo_vault_position: "Tresor Position",
        vo_vault_width: "Tresor Breite",
        whats_new_title: "Tower Ghost für Destiny Updates"
    },
    es: {
        agility: "Agility",
        armor: "Armor",
        best_combo: "Best Combo",
        cancel: "Cancelar",
        cannot_equip: "Error desconocido tratando de equipar ",
        cannot_unequip: "No mas elementos para tratar de unequip la ",
        close_msg: "Cerrar",
        ok_msg: "OK",
        disc: "Disc",
        discipline: "Discipline",
        donation_instructions: "Este es un projecto non-commercial dedicado para Destiny. Si usted disfurat esta aplicacion proveve una donacion para supportar los gastos.",
        donation_title: "Donaciones para Tower Ghost for Destiny!",
        error_loading_inventory: "Error cargando inventario",
        gear_with_highest: "Equip Gear With Highest:",
        inte: "Int",
        intellect: "Intellect",
        invalid_transfer_amount: "Cantidad no valida entrada: ",
        inventory_armor: "Armadura",
        inventory_general: "General",
        inventory_postmaster: "Post Master",
        inventory_postmaster_lost_items: "Lost Items",
        inventory_postmaster_messages: "Messages",
        inventory_subclasses: "Subclases",
        inventory_weapons: "Armas",
        itemDefs_undefined: "Por favor informar el asunto a mi Github y asegurese de que su fuente se establece en Ingles.",
        language_pack_downloaded: "Language Pack downloaded, please refresh to see the changes",
        language_text: "Esto cambiara el lenguage de la aplicacion y de los articulos.",
        light: "Light",
        loadouts_alreadythere_pt1: " ya esta en el ",
        loadouts_alreadythere_pt2: "'s cubo de ",
        loadouts_delete: "Borrar",
        loadouts_desktop: "cheque",
        loadouts_instructions: "No hay articulos en loadout, haga clic en los articulos a anadir, ",
        loadouts_instructions_contd: " para equipar.",
        loadouts_invalidbucket: " no sera trasladado, Debido a este cubo: ",
        loadouts_mobile: "sostener",
        loadouts_no_replacement: " no sera trasladado. No hay otro para reemplazarlo.",
        loadouts_no_transfer: " no sera trasladado",
        loadouts_outofspace: " no sera trasladado, no hay espacio en ",
        loadouts_save: "Guardar",
        loadouts_save_new: "Guardar Como",
        loadouts_swap: " sera intercambiado con ",
        loadouts_to_equip: " sera equipado.",
        loadouts_to_moveequip: " sera trasladado y equipado.",
        loadouts_to_transfer: " sera trasladado",
        loadouts_transfer: "Transferir",
        loadouts_transfer_confirm: "Confirmar Transferencia",
        loadouts_transferred: "<strong>Articulo(s) transferido con exito</strong><br> Si te gusta esta aplicacion, puedes <a style=\"color:#3080CF; cursor:pointer;\" class=\"donateLink\" target=\"_system\">comprarme una cervezita.</a>",
        login_authenticating_pt1: "Logging into Bungie... Please be patient.",
        login_authenticating_pt2: "If log in screen remains for 2+ minutes, use these links for",
        login_authenticating_pt3: "to retry login. If the problem persists, reinstall the app.",
        login_help: "Por favor, espere a que la ventana se cerra. TGD han preparado su informacion.",
        login_instructions: "Para empezar tendras que acceder a su cuenta a traves de Bungie.net:",
        login_loading_inventory: "Por favor espere, cargando arsenal de Bungie",
        login_loading_updates: "Please wait, downloading auto updates",
        login_title: "Bienvenido a Tower Ghost para Destiny!",
        menu_viewformat: "View Format",
        menu_viewimagegrid: "Image Grid",
        menu_viewitemlist: "Items List",
        menu_about: "Acerca De",
        menu_advancedtooltips: "Advanced Tooltips",
        menu_all: "Todo",
        menu_autorefresh: "Auto Refrescar (5 min)",
        menu_autotransfer: "Auto Mover Pilas",
        menu_clear: "Aclaro Filtro",
        menu_damage: "Da\xF1o",
        menu_destinydbmode: "DestinyDB Modo",
        menu_destinydbtooltips: "DestinyDB Tooltips",
        menu_destinystatus: "DestinyStatus Reporte",
        menu_destinytrials: "DestinyTrials Reporte",
        menu_destinytracker: "DestinyTracker Reporte",
        menu_destinyguardiangg: "Guardian.GG Reporte",
        menu_donate: "Donar",
        menu_filter_by: "Filter By",
        menu_filter_by_subclass_eq: "Subclass Equipped",
        menu_filter_by_weapon_eq: "Weapons Equipped",
        menu_filter_for_class: "Filter for Class",
        menu_help: "Ayuda",
        menu_language: "Language",
        menu_loadouts: "Loadouts",
        menu_loadouts_create: "Crear",
        menu_loadouts_manage: "Manage",
        menu_padheight: "Auto Adjusto Altura",
        menu_progress: "Progreso",
        menu_progress_1: "Falta Perks",
        menu_progress_2: "Completo Perks",
        menu_progress_3: "Al Maxmimo",
        menu_refresh: "Refrescar (seg.)",
        menu_set: "Conjunto",
        menu_set_showduplicates: "Monstrar articulos duplicados",
        menu_set_showmissing: "Monstrar articulos que faltan",
        menu_settings: "Ajustes",
        menu_options: "More",
        menu_shareurl: "Compartir Con Amigos",
        menu_sortby: "Sort By",
        menu_sortby_lightlvl: "Light Level",
        menu_sortby_name: "Name",
        menu_sortby_type: "Type",
        menu_sortby_tier_type: "Tier, Type",
        menu_sortby_tier_light: "Tier, Light",
        menu_sortby_tier_name: "Tier, Name",
        menu_sortby_type_light: "Type, Light",
        menu_tier: "Nivel",
        menu_useps: "Usa Playstation Cuenta",
        menu_usexbox: "Usa Xbox Cuenta",
        menu_view: "Vista",
        menu_view_armor: "Armaduras",
        menu_view_by: "View By",
        menu_view_by_lightlvl: "Light Level",
        menu_view_by_stat_points: "Combined Stat Points",
        menu_view_general: "General",
        menu_view_options: "Opciones de Vista",
        menu_view_weapons: "Armas",
        missing_items: "Articulos que faltan",
        most_points: "Points",
        movepopup_equip: "equipar",
        movepopup_extras: "extras",
        movepopup_move: "Mover a",
        movepopup_store: "almacenar",
        movepopup_vault: "bodega",
        normalize: "Normalizar",
        normalize_title: "Normalizar - igualmente distribuir tema a traves de sus personajes",
        paypal_code: "ES",
        pick_a_set: "Por favor elija un Set antes de seleccionar esta opcion",
        recovery: "Recovery",
        str: "Str",
        strength: "Strength",
        text_shareurl: "Tu iventoria es actualizado cuando hagas click a Compartir URL denuevo.",
        this_icon: "Este icono es ",
        tier_common: "Com\xFAn",
        tier_exotic: "Ex\xF3tico",
        tier_legendary: "Legendario",
        tier_rare: "Raro",
        tier_uncommon: "Poco com\xFAn",
        transfer: "Transfer",
        transfer_all: "Todos",
        transfer_amount: "Transferencia monto",
        transfer_ask: "Don\'t ask in the future",
        consolidate: "Consolidate",
        transfer_consolidate: "Consolidate (pull from all characters",
        transfer_one: "Uno",
        unable_create_loadout_for_type: "Actualmente no se puede crear loadouts con este tipo de elemento.",
        unable_to_create_loadout_for_bucket: "No se puede crear un loadout con mas de 10 articulos en esta ranura: ",
        unable_to_move_bucketitems: "Post Master no pueden ser transferidos con el programa.",
        unable_unequip: "Incapaz de inequippar ",
        vo_container_width: "Container Width",
        vo_layout_mode: "Layout Mode",
        vo_layout_mode_cust: "Custom",
        vo_layout_mode_def: "Default",
        vo_number_of_columns: "# de Columnas",
        vo_vault_columns: "Vault Columns",
        vo_vault_first: "Primero/Izquierda",
        vo_vault_last: "Ultimo/Derecha",
        vo_vault_position: "Position de Bodega",
        vo_vault_width: "Vault Width",
        whats_new_title: "Tower Ghost for Destiny Noticias"
    },
    fr: {
        agility: "Agility",
        armor: "Armor",
        best_combo: "Best Combo",
        cancel: "Cancel",
        cannot_equip: "Erreur inconnue essayant d'quiper ",
        cannot_unequip: "Peu plus d'lments pour tenter de dsquiper le ",
        close_msg: "Fermer",
        ok_msg: "OK",
        disc: "Disc",
        discipline: "Discipline",
        donation_instructions: "Ceci est un projet non commercial dédié au Destiny. Si vous aimez ce soft fournir un don de garder ce projet en vie et soutenir les coûts de maintenance.",
        donation_title: "Dons pour Tower Ghost for Destiny!",
        error_loading_inventory: "Erreur inventaire de chargement",
        gear_with_highest: "Equip Gear With Highest:",
        inte: "Int",
        intellect: "Intellect",
        invalid_transfer_amount: "Le montant indiqu est incorrect: ",
        inventory_armor: "Armure",
        inventory_general: "General",
        inventory_postmaster: "Commis des postes",
        inventory_postmaster_lost_items: "Objets Perdus",
        inventory_postmaster_messages: "Messages",
        inventory_subclasses: "Sous Classes",
        inventory_weapons: "Armes",
        itemDefs_undefined: "S'il vous plat signaler le problme  mon Github et assurez-vous que votre police est l'anglais.",
        language_pack_downloaded: "Language Pack téléchargé, s'il vous plaît rafraîchir pour voir les changements",
        language_text: "Cela va changer la langue pour tous les articles et l'interface pour certaines langues, d'autres langues seront ajoutées dans le futur.",
        light: "Light",
        loadouts_alreadythere_pt1: " is already in the ",
        loadouts_alreadythere_pt2: "'s bucket of ",
        loadouts_delete: "Rayer",
        loadouts_desktop: "check",
        loadouts_instructions: "No items in loadout, click items to add, ",
        loadouts_instructions_contd: " to equip.",
        loadouts_invalidbucket: " will not be moved. Because of this bucket: ",
        loadouts_mobile: "hold",
        loadouts_no_replacement: " will not be moved. There is no item to replace it.",
        loadouts_no_transfer: " will not be moved",
        loadouts_outofspace: " will not be moved, there is no space in ",
        loadouts_save: "Sauver",
        loadouts_save_new: "Sauver As",
        loadouts_swap: " will be swapped with ",
        loadouts_to_equip: " will be equipped.",
        loadouts_to_moveequip: " will be moved and equipped.",
        loadouts_to_transfer: " will be moved",
        loadouts_transfer: "Transfert",
        loadouts_transfer_confirm: "Transfer Confirm",
        loadouts_transferred: "<strong>Articles transféré avec succès</strong><br> Si vous aimez ce soft pensez à <a style=\"color:#3080CF; cursor:pointer;\" class=\"donateLink\" target=\"_system\">achetez-moi une bière</a>",
        login_authenticating_pt1: "Logging into Bungie... Please be patient.",
        login_authenticating_pt2: "If log in screen remains for 2+ minutes, use these links for",
        login_authenticating_pt3: "to retry login. If the problem persists, reinstall the app.",
        login_help: "S'il vous plaît attendre la fenêtre de connexion à proximité de l'automobile comme TGD prépare vos informations.",
        login_instructions: "Pour commencer, vous aurez besoin pour vous connecter à votre compte Bungie.net via:",
        login_loading_inventory: "Please wait, loading arsenal from Bungie",
        login_loading_updates: "Please wait, downloading auto updates",
        login_title: "Bienvenue à Tower Ghost for Destiny!",
        menu_viewformat: "View Format",
        menu_viewimagegrid: "Image Grid",
        menu_viewitemlist: "Items List",
        menu_about: "Propos",
        menu_advancedtooltips: "Advanced Tooltips",
        menu_view_by: "View By",
        menu_view_by_lightlvl: "Light Level",
        menu_view_by_stat_points: "Combined Stat Points",
        menu_all: "Tout",
        menu_autorefresh: "Auto Actualiser (5 min)",
        menu_autotransfer: "Auto transfert s'entasser",
        menu_clear: "Filtres effacer",
        menu_damage: "Dommages",
        menu_destinydbmode: "DestinyDB Mode",
        menu_destinydbtooltips: "DestinyDB infobulles",
        menu_destinystatus: "DestinyStatus Report",
        menu_destinytrials: "DestinyTrials Report",
        menu_destinytracker: "DestinyTracker Report",
        menu_destinyguardiangg: "Guardian.GG Report",
        menu_donate: "Don",
        menu_filter_by: "Filter By",
        menu_filter_by_subclass_eq: "Subclass Equipped",
        menu_filter_by_weapon_eq: "Weapons Equipped",
        menu_filter_for_class: "Filter for Class",
        menu_help: "Aide",
        menu_language: "Language",
        menu_loadouts: "Loadouts",
        menu_loadouts_create: "Crer",
        menu_loadouts_manage: "Manage",
        menu_padheight: "Auto Pad Hauteur",
        menu_progress: "Progrs",
        menu_progress_1: "Missing Perks",
        menu_progress_2: "Missing Border",
        menu_progress_3: "Maxed",
        menu_refresh: "Actualisez (segundos)",
        menu_set: "Ensemble",
        menu_set_showduplicates: "Afficher les doublons d'objets",
        menu_set_showmissing: "Afficher les lments manquants",
        menu_settings: "Paramètres",
        menu_options: "More",
        menu_shareurl: "Partager URL",
        menu_sortby: "Sort By",
        menu_sortby_lightlvl: "Light Level",
        menu_sortby_name: "Name",
        menu_sortby_type: "Type",
        menu_sortby_tier_type: "Tier, Type",
        menu_sortby_tier_light: "Tier, Light",
        menu_sortby_tier_name: "Tier, Name",
        menu_sortby_type_light: "Type, Light",
        menu_tier: "chelon",
        menu_useps: "Utiliser Playstation un compte",
        menu_usexbox: "Utiliser Xbox un compte",
        menu_view: "Voir",
        menu_view_armor: "Armure",
        menu_view_general: "General",
        menu_view_options: "Options d'affichage",
        menu_view_weapons: "Armes",
        missing_items: "Articles manquant",
        most_points: "Points",
        movepopup_equip: "équiper",
        movepopup_extras: "extras",
        movepopup_move: "Bouger",
        movepopup_store: "dépôt",
        movepopup_vault: "voûte",
        normalize: "Normalizar",
        normalize_title: "Normalizar - igualmente distribuir tema a travs de sus personajes",
        paypal_code: "FR",
        pick_a_set: "S'il vous plat choisir un ensemble avant de choisir cette option",
        recovery: "Recovery",
        str: "Str",
        strength: "Strength",
        text_shareurl: "Votre inventaire est mis à jour en cliquant sur Partager URL dans le menu à nouveau.",
        this_icon: "Cette icne est ",
        tier_common: "Common",
        tier_exotic: "Exotic",
        tier_legendary: "Legendary",
        tier_rare: "Rare",
        tier_uncommon: "Uncommon",
        transfer: "Transfer",
        transfer_all: "Tous",
        transfer_amount: "Transferencia monto",
        transfer_ask: "Don\'t ask in the future",
        consolidate: "Consolidate",
        transfer_consolidate: "Consolidate (pull from all characters",
        transfer_one: "Un",
        unable_create_loadout_for_type: "Actuellement incapable de crer loadouts avec ce type d'article",
        unable_to_create_loadout_for_bucket: "Vous ne pouvez pas crer un loadout avec plus de 10 articles dans cette fente: ",
        unable_to_move_bucketitems: "Articles matre de poste ne peuvent tre transfrs avec l'API.",
        unable_unequip: "Impossible de dsquiper ",
        vo_container_width: "Container Width",
        vo_layout_mode: "Layout Mode",
        vo_layout_mode_cust: "Custom",
        vo_layout_mode_def: "Default",
        vo_number_of_columns: "Number of Columns",
        vo_vault_columns: "Vault Columns",
        vo_vault_first: "First/Left",
        vo_vault_last: "Last/Right",
        vo_vault_position: "Vault Position",
        vo_vault_width: "Vault Width",
        whats_new_title: "Tower Ghost for Destiny Nouvelles"
    },
    it: {
        agility: "Agility",
        armor: "Armor",
        best_combo: "Best Combo",
        cancel: "Cancel",
        cannot_equip: "Unknown error trying to equip ",
        cannot_unequip: "No more items to try to unequip the ",
        close_msg: "Close",
        ok_msg: "OK",
        disc: "Disc",
        discipline: "Discipline",
        donation_instructions: "This is a non-commercial project dedicated to Destiny. If you like this app provide a donation to keep this project alive and support the maintenance costs.",
        donation_title: "Donations for Tower Ghost for Destiny!",
        error_loading_inventory: "Error loading inventory ",
        gear_with_highest: "Equip Gear With Highest:",
        inte: "Int",
        intellect: "Intellect",
        invalid_transfer_amount: "Invalid amount entered: ",
        inventory_armor: "Armor",
        inventory_general: "General",
        inventory_postmaster: "Post Master",
        inventory_postmaster_messages: "Messages",
        inventory_postmaster_lost_items: "Lost Items",
        inventory_subclasses: "Sub Classes",
        inventory_weapons: "Weapons",
        itemDefs_undefined: "Could not load item definitions, please report the issue to my Github including the version number being used.",
        language_pack_downloaded: "Language Pack downloaded, please refresh to see the changes",
        language_text: "This will change the language for all items and the interface for some languages, more languages will be added in the future.",
        light: "Light",
        loadouts_alreadythere_pt1: " is already in the ",
        loadouts_alreadythere_pt2: "'s bucket of ",
        loadouts_delete: "Delete",
        loadouts_desktop: "check",
        loadouts_instructions: "No items in loadout, click items to add, ",
        loadouts_instructions_contd: " to equip.",
        loadouts_invalidbucket: " will not be moved. Because of this bucket: ",
        loadouts_mobile: "hold",
        loadouts_no_replacement: " will not be moved. There is no item to replace it.",
        loadouts_no_transfer: " will not be moved",
        loadouts_outofspace: " will not be moved, there is no space in ",
        loadouts_save: "Save",
        loadouts_save_new: "Save As",
        loadouts_swap: " will be swapped with ",
        loadouts_to_equip: " will be equipped.",
        loadouts_to_moveequip: " will be moved and equipped.",
        loadouts_to_transfer: " will be moved",
        loadouts_transfer: "Transfer",
        loadouts_transfer_confirm: "Transfer Confirm",
        loadouts_transferred: "<strong>Item(s) Transferred!</strong><br>If you like this app remember to <a style=\"color:#3080CF; cursor:pointer;\" class=\"donateLink\" target=\"_system\">buy me a beer</a>.",
        login_authenticating_pt1: "Logging into Bungie... Please be patient.",
        login_authenticating_pt2: "If log in screen remains for 2+ minutes, use these links for",
        login_authenticating_pt3: "to retry login. If the problem persists, reinstall the app.",
        login_help: "Please wait for the login window to auto close as TGD prepares your information.",
        login_instructions: "To get started you'll need to log in to your Bungie.net account via:",
        login_loading_inventory: "Please wait, loading arsenal from Bungie",
        login_loading_updates: "Please wait, downloading auto updates",
        login_title: "Welcome to Tower Ghost for Destiny!",
        menu_viewformat: "View Format",
        menu_viewimagegrid: "Image Grid",
        menu_viewitemlist: "Items List",
        menu_about: "About",
        menu_advancedtooltips: "Advanced Tooltips",
        menu_all: "All",
        menu_autorefresh: "Auto Refresh (5 min)",
        menu_autotransfer: "Auto Transfer Stacks",
        menu_clear: "Clear Filters",
        menu_destinydbtooltips: "DestinyDB Tooltips",
        menu_destinydbmode: "DestinyDB Mode",
        menu_destinystatus: "DestinyStatus Report",
        menu_destinytrials: "DestinyTrials Report",
        menu_destinytracker: "DestinyTracker Report",
        menu_destinyguardiangg: "Guardian.GG Report",
        menu_damage: "Damage",
        menu_donate: "Donate",
        menu_filter_by: "Filter By",
        menu_filter_by_subclass_eq: "Subclass Equipped",
        menu_filter_by_weapon_eq: "Weapons Equipped",
        menu_filter_for_class: "Filter for Class",
        menu_help: "Help",
        menu_language: "Language",
        menu_loadouts: "Loadouts",
        menu_loadouts_create: "Create",
        menu_loadouts_manage: "Manage",
        menu_padheight: "Auto Pad Height",
        menu_progress: "Progress",
        menu_progress_1: "Missing Perks",
        menu_progress_2: "Missing Border",
        menu_progress_3: "Maxed",
        menu_refresh: "Refresh (secs)",
        menu_set: "Set",
        menu_set_showmissing: "Show Missing Items",
        menu_set_showduplicates: "Show Duplicate Items",
        menu_settings: "Settings",
        menu_options: "More",
        menu_shareurl: "Share URL with friends",
        menu_sortby: "Sort By",
        menu_sortby_lightlvl: "Light Level",
        menu_sortby_name: "Name",
        menu_sortby_type: "Type",
        menu_sortby_tier_type: "Tier, Type",
        menu_sortby_tier_light: "Tier, Light",
        menu_sortby_tier_name: "Tier, Name",
        menu_sortby_type_light: "Type, Light",
        menu_tier: "Tier",
        menu_usexbox: "Use Xbox Account",
        menu_useps: "Use Playstation Account",
        menu_view: "View",
        menu_view_armor: "Armor",
        menu_view_by: "View By",
        menu_view_by_lightlvl: "Light Level",
        menu_view_by_stat_points: "Combined Stat Points",
        menu_view_general: "General",
        menu_view_options: "View Options",
        menu_view_weapons: "Weapons",
        missing_items: "Missing Items",
        most_points: "Points",
        movepopup_move: "Move",
        movepopup_store: "store",
        movepopup_equip: "equip",
        movepopup_vault: "vault",
        movepopup_extras: "extras",
        normalize: "Normalize",
        normalize_title: "Normalize - equally distribute item across your characters",
        paypal_code: "EN",
        pick_a_set: "Please pick a Set before selecting this option",
        recovery: "Recovery",
        str: "Str",
        strength: "Strength",
        text_shareurl: "Your inventory is updated by clicking on Share URL from the menu again.",
        this_icon: "This icon is ",
        tier_common: "Common",
        tier_exotic: "Exotic",
        tier_legendary: "Legendary",
        tier_rare: "Rare",
        tier_uncommon: "Uncommon",
        transfer: "Transfer",
        transfer_all: "All",
        transfer_amount: "Transfer Amount",
        transfer_ask: "Don\'t ask in the future",
        consolidate: "Consolidate",
        transfer_consolidate: "Consolidate (pull from all characters",
        transfer_one: "One",
        unable_create_loadout_for_type: "Currently unable to create loadouts with this item type.",
        unable_unequip: "Unable to unequip ",
        unable_to_create_loadout_for_bucket: "You cannot create a loadout with more than 10 items in this slot: ",
        unable_to_move_bucketitems: "This item cannot be transferred with the API.",
        vo_container_width: "Container Width",
        vo_layout_mode: "Vault Mode",
        vo_layout_mode_cust: "Custom",
        vo_layout_mode_def: "Default",
        vo_number_of_columns: "Number of Columns",
        vo_vault_columns: "Vault Columns",
        vo_vault_first: "First/Left",
        vo_vault_last: "Last/Right",
        vo_vault_position: "Vault Position",
        vo_vault_width: "Vault Width",
        whats_new_title: "Tower Ghost for Destiny Updates"
    },
    ja: {
        agility: "Agility",
        armor: "Armor",
        best_combo: "Best Combo",
        cancel: "Cancel",
        cannot_equip: "Unknown error trying to equip ",
        cannot_unequip: "No more items to try to unequip the ",
        close_msg: "Close",
        ok_msg: "OK",
        disc: "Disc",
        discipline: "Discipline",
        donation_instructions: "This is a non-commercial project dedicated to Destiny. If you like this app provide a donation to keep this project alive and support the maintenance costs.",
        donation_title: "Donations for Tower Ghost for Destiny!",
        error_loading_inventory: "Error loading inventory ",
        gear_with_highest: "Equip Gear With Highest:",
        inte: "Int",
        intellect: "Intellect",
        invalid_transfer_amount: "Invalid amount entered: ",
        inventory_armor: "Armor",
        inventory_general: "General",
        inventory_postmaster: "Post Master",
        inventory_postmaster_messages: "Messages",
        inventory_postmaster_lost_items: "Lost Items",
        inventory_subclasses: "Sub Classes",
        inventory_weapons: "Weapons",
        itemDefs_undefined: "Could not load item definitions, please report the issue to my Github including the version number being used.",
        language_pack_downloaded: "Language Pack downloaded, please refresh to see the changes",
        language_text: "This will change the language for all items and the interface for some languages, more languages will be added in the future.",
        light: "Light",
        loadouts_alreadythere_pt1: " is already in the ",
        loadouts_alreadythere_pt2: "'s bucket of ",
        loadouts_delete: "Delete",
        loadouts_desktop: "check",
        loadouts_instructions: "No items in loadout, click items to add, ",
        loadouts_instructions_contd: " to equip.",
        loadouts_invalidbucket: " will not be moved. Because of this bucket: ",
        loadouts_mobile: "hold",
        loadouts_no_replacement: " will not be moved. There is no item to replace it.",
        loadouts_no_transfer: " will not be moved",
        loadouts_outofspace: " will not be moved, there is no space in ",
        loadouts_save: "Save",
        loadouts_save_new: "Save As",
        loadouts_swap: " will be swapped with ",
        loadouts_to_equip: " will be equipped.",
        loadouts_to_moveequip: " will be moved and equipped.",
        loadouts_to_transfer: " will be moved",
        loadouts_transfer: "Transfer",
        loadouts_transfer_confirm: "Transfer Confirm",
        loadouts_transferred: "<strong>Item(s) Transferred!</strong><br>If you like this app remember to <a style=\"color:#3080CF; cursor:pointer;\" class=\"donateLink\" target=\"_system\">buy me a beer</a>.",
        login_authenticating_pt1: "Logging into Bungie... Please be patient.",
        login_authenticating_pt2: "If log in screen remains for 2+ minutes, use these links for",
        login_authenticating_pt3: "to retry login. If the problem persists, reinstall the app.",
        login_help: "Please wait for the login window to auto close as TGD prepares your information.",
        login_instructions: "To get started you'll need to log in to your Bungie.net account via:",
        login_loading_inventory: "Please wait, loading arsenal from Bungie",
        login_loading_updates: "Please wait, downloading auto updates",
        login_title: "Welcome to Tower Ghost for Destiny!",
        menu_viewformat: "View Format",
        menu_viewimagegrid: "Image Grid",
        menu_viewitemlist: "Items List",
        menu_about: "About",
        menu_advancedtooltips: "Advanced Tooltips",
        menu_all: "All",
        menu_autorefresh: "Auto Refresh (5 min)",
        menu_autotransfer: "Auto Transfer Stacks",
        menu_clear: "Clear Filters",
        menu_destinydbtooltips: "DestinyDB Tooltips",
        menu_destinydbmode: "DestinyDB Mode",
        menu_destinystatus: "DestinyStatus Report",
        menu_destinytrials: "DestinyTrials Report",
        menu_destinytracker: "DestinyTracker Report",
        menu_destinyguardiangg: "Guardian.GG Report",
        menu_damage: "Damage",
        menu_donate: "Donate",
        menu_filter_by: "Filter By",
        menu_filter_by_subclass_eq: "Subclass Equipped",
        menu_filter_by_weapon_eq: "Weapons Equipped",
        menu_filter_for_class: "Filter for Class",
        menu_help: "Help",
        menu_language: "Language",
        menu_loadouts: "Loadouts",
        menu_loadouts_create: "Create",
        menu_loadouts_manage: "Manage",
        menu_padheight: "Auto Pad Height",
        menu_progress: "Progress",
        menu_progress_1: "Missing Perks",
        menu_progress_2: "Missing Border",
        menu_progress_3: "Maxed",
        menu_refresh: "Refresh (secs)",
        menu_set: "Set",
        menu_set_showmissing: "Show Missing Items",
        menu_set_showduplicates: "Show Duplicate Items",
        menu_settings: "Settings",
        menu_options: "More",
        menu_shareurl: "Share URL with friends",
        menu_sortby: "Sort By",
        menu_sortby_lightlvl: "Light Level",
        menu_sortby_name: "Name",
        menu_sortby_type: "Type",
        menu_sortby_tier_type: "Tier, Type",
        menu_sortby_tier_light: "Tier, Light",
        menu_sortby_tier_name: "Tier, Name",
        menu_tier: "Tier",
        menu_usexbox: "Use Xbox Account",
        menu_useps: "Use Playstation Account",
        menu_view: "View",
        menu_view_armor: "Armor",
        menu_view_by: "View By",
        menu_view_by_lightlvl: "Light Level",
        menu_view_by_stat_points: "Combined Stat Points",
        menu_view_general: "General",
        menu_view_options: "View Options",
        menu_view_weapons: "Weapons",
        missing_items: "Missing Items",
        most_points: "Points",
        movepopup_move: "Move",
        movepopup_store: "store",
        movepopup_equip: "equip",
        movepopup_vault: "vault",
        movepopup_extras: "extras",
        normalize: "Normalize",
        normalize_title: "Normalize - equally distribute item across your characters",
        paypal_code: "EN",
        pick_a_set: "Please pick a Set before selecting this option",
        recovery: "Recovery",
        str: "Str",
        strength: "Strength",
        text_shareurl: "Your inventory is updated by clicking on Share URL from the menu again.",
        this_icon: "This icon is ",
        tier_common: "Common",
        tier_exotic: "Exotic",
        tier_legendary: "Legendary",
        tier_rare: "Rare",
        tier_uncommon: "Uncommon",
        transfer: "Transfer",
        transfer_all: "All",
        transfer_amount: "Transfer Amount",
        transfer_ask: "Don\'t ask in the future",
        consolidate: "Consolidate",
        transfer_consolidate: "Consolidate (pull from all characters",
        transfer_one: "One",
        unable_create_loadout_for_type: "Currently unable to create loadouts with this item type.",
        unable_unequip: "Unable to unequip ",
        unable_to_create_loadout_for_bucket: "You cannot create a loadout with more than 10 items in this slot: ",
        unable_to_move_bucketitems: "This item cannot be transferred with the API.",
        vo_container_width: "Container Width",
        vo_layout_mode: "Vault Mode",
        vo_layout_mode_cust: "Custom",
        vo_layout_mode_def: "Default",
        vo_number_of_columns: "Number of Columns",
        vo_vault_columns: "Vault Columns",
        vo_vault_first: "First/Left",
        vo_vault_last: "Last/Right",
        vo_vault_position: "Vault Position",
        vo_vault_width: "Vault Width",
        whats_new_title: "Tower Ghost for Destiny Updates"
    },
    pt: {
        agility: "Agility",
        armor: "Armor",
        best_combo: "Best Combo",
        cancel: "Cancel",
        cannot_equip: "Unknown error trying to equip ",
        cannot_unequip: "No more items to try to unequip the ",
        close_msg: "Close",
        ok_msg: "OK",
        disc: "Disc",
        discipline: "Discipline",
        donation_instructions: "This is a non-commercial project dedicated to Destiny. If you like this app provide a donation to keep this project alive and support the maintenance costs.",
        donation_title: "Donations for Tower Ghost for Destiny!",
        error_loading_inventory: "Error loading inventory ",
        gear_with_highest: "Equip Gear With Highest:",
        inte: "Int",
        intellect: "Intellect",
        invalid_transfer_amount: "Invalid amount entered: ",
        inventory_armor: "Armor",
        inventory_general: "General",
        inventory_postmaster: "Post Master",
        inventory_postmaster_messages: "Messages",
        inventory_postmaster_lost_items: "Lost Items",
        inventory_subclasses: "Sub Classes",
        inventory_weapons: "Weapons",
        itemDefs_undefined: "Could not load item definitions, please report the issue to my Github including the version number being used.",
        language_pack_downloaded: "Language Pack downloaded, please refresh to see the changes",
        language_text: "This will change the language for all items and the interface for some languages, more languages will be added in the future.",
        light: "Light",
        loadouts_alreadythere_pt1: " is already in the ",
        loadouts_alreadythere_pt2: "'s bucket of ",
        loadouts_delete: "Delete",
        loadouts_desktop: "check",
        loadouts_instructions: "No items in loadout, click items to add, ",
        loadouts_instructions_contd: " to equip.",
        loadouts_invalidbucket: " will not be moved. Because of this bucket: ",
        loadouts_mobile: "hold",
        loadouts_no_replacement: " will not be moved. There is no item to replace it.",
        loadouts_no_transfer: " will not be moved",
        loadouts_outofspace: " will not be moved, there is no space in ",
        loadouts_save: "Save",
        loadouts_save_new: "Save As",
        loadouts_swap: " will be swapped with ",
        loadouts_to_equip: " will be equipped.",
        loadouts_to_moveequip: " will be moved and equipped.",
        loadouts_to_transfer: " will be moved",
        loadouts_transfer: "Transfer",
        loadouts_transfer_confirm: "Transfer Confirm",
        loadouts_transferred: "<strong>Item(s) Transferred!</strong><br>If you like this app remember to <a style=\"color:#3080CF; cursor:pointer;\" class=\"donateLink\" target=\"_system\">buy me a beer</a>.",
        login_authenticating_pt1: "Logging into Bungie... Please be patient.",
        login_authenticating_pt2: "If log in screen remains for 2+ minutes, use these links for",
        login_authenticating_pt3: "to retry login. If the problem persists, reinstall the app.",
        login_help: "Please wait for the login window to auto close as TGD prepares your information.",
        login_instructions: "To get started you'll need to log in to your Bungie.net account via:",
        login_loading_inventory: "Please wait, loading arsenal from Bungie",
        login_loading_updates: "Please wait, downloading auto updates",
        login_title: "Welcome to Tower Ghost for Destiny!",
        menu_viewformat: "View Format",
        menu_viewimagegrid: "Image Grid",
        menu_viewitemlist: "Items List",
        menu_about: "About",
        menu_advancedtooltips: "Advanced Tooltips",
        menu_all: "All",
        menu_autorefresh: "Auto Refresh (5 min)",
        menu_autotransfer: "Auto Transfer Stacks",
        menu_clear: "Clear Filters",
        menu_destinydbtooltips: "DestinyDB Tooltips",
        menu_destinydbmode: "DestinyDB Mode",
        menu_destinystatus: "DestinyStatus Report",
        menu_destinytrials: "DestinyTrials Report",
        menu_destinytracker: "DestinyTracker Report",
        menu_destinyguardiangg: "Guardian.GG Report",
        menu_damage: "Damage",
        menu_donate: "Donate",
        menu_filter_by: "Filter By",
        menu_filter_by_subclass_eq: "Subclass Equipped",
        menu_filter_by_weapon_eq: "Weapons Equipped",
        menu_filter_for_class: "Filter for Class",
        menu_help: "Help",
        menu_language: "Language",
        menu_loadouts: "Loadouts",
        menu_loadouts_create: "Create",
        menu_loadouts_manage: "Manage",
        menu_padheight: "Auto Pad Height",
        menu_progress: "Progress",
        menu_progress_1: "Missing Perks",
        menu_progress_2: "Missing Border",
        menu_progress_3: "Maxed",
        menu_refresh: "Refresh (secs)",
        menu_set: "Set",
        menu_set_showmissing: "Show Missing Items",
        menu_set_showduplicates: "Show Duplicate Items",
        menu_settings: "Settings",
        menu_options: "More",
        menu_shareurl: "Share URL with friends",
        menu_sortby: "Sort By",
        menu_sortby_lightlvl: "Light Level",
        menu_sortby_name: "Name",
        menu_sortby_type: "Type",
        menu_sortby_tier_type: "Tier, Type",
        menu_sortby_tier_light: "Tier, Light",
        menu_sortby_tier_name: "Tier, Name",
        menu_sortby_type_light: "Type, Light",
        menu_tier: "Tier",
        menu_usexbox: "Use Xbox Account",
        menu_useps: "Use Playstation Account",
        menu_view: "View",
        menu_view_armor: "Armor",
        menu_view_by: "View By",
        menu_view_by_lightlvl: "Light Level",
        menu_view_by_stat_points: "Combined Stat Points",
        menu_view_general: "General",
        menu_view_options: "View Options",
        menu_view_weapons: "Weapons",
        missing_items: "Missing Items",
        most_points: "Points",
        movepopup_move: "Move",
        movepopup_store: "store",
        movepopup_equip: "equip",
        movepopup_vault: "vault",
        movepopup_extras: "extras",
        normalize: "Normalize",
        normalize_title: "Normalize - equally distribute item across your characters",
        paypal_code: "EN",
        pick_a_set: "Please pick a Set before selecting this option",
        recovery: "Recovery",
        str: "Str",
        strength: "Strength",
        text_shareurl: "Your inventory is updated by clicking on Share URL from the menu again.",
        this_icon: "This icon is ",
        tier_common: "Common",
        tier_exotic: "Exotic",
        tier_legendary: "Legendary",
        tier_rare: "Rare",
        tier_uncommon: "Uncommon",
        transfer: "Transfer",
        transfer_all: "All",
        transfer_amount: "Transfer Amount",
        transfer_ask: "Don\'t ask in the future",
        consolidate: "Consolidate",
        transfer_consolidate: "Consolidate (pull from all characters",
        transfer_one: "One",
        unable_create_loadout_for_type: "Currently unable to create loadouts with this item type.",
        unable_unequip: "Unable to unequip ",
        unable_to_create_loadout_for_bucket: "You cannot create a loadout with more than 10 items in this slot: ",
        unable_to_move_bucketitems: "This item cannot be transferred with the API.",
        vo_container_width: "Container Width",
        vo_layout_mode: "Vault Mode",
        vo_layout_mode_cust: "Custom",
        vo_layout_mode_def: "Default",
        vo_number_of_columns: "Number of Columns",
        vo_vault_columns: "Vault Columns",
        vo_vault_first: "First/Left",
        vo_vault_last: "Last/Right",
        vo_vault_position: "Vault Position",
        vo_vault_width: "Vault Width",
        whats_new_title: "Tower Ghost for Destiny Updates"
    },
    tr: {
        agility: "Agility",
        armor: "Armor",
        best_combo: "Best Combo",
        cancel: "Vazgeç",
        cannot_equip: "Öğeyi donanırken hata oluştu ",
        cannot_unequip: "Üzerinizdekini bırakmak için öğe yok ",
        close_msg: "Kapat",
        ok_msg: "OK",
        disc: "Disc",
        discipline: "Discipline",
        donation_instructions: "Bu program tamamen ücretsiz ve Destiny ye bağışlanmış bir programdır.Herhangi bir ücret talep etmemektedir yani kelepirdir. Programımızı geliştirmek ve daha iyi bir deneyim sağlamamızı istiyorsanız,lütfen bağışlarınızı ve desteğinizi esirgemeyiniz.Teşekkürler.",
        donation_title: "Destiny ye bağışlar!",
        error_loading_inventory: "Cephaneniz yüklenirken hata oluştu ",
        gear_with_highest: "Equip Gear With Highest:",
        inte: "Int",
        intellect: "Intellect",
        invalid_transfer_amount: "Geçersiz miktar girildi: ",
        inventory_armor: "Armorlar",
        inventory_general: "Görevler",
        inventory_postmaster: "Post Master",
        inventory_postmaster_lost_items: "Kayıp Öğeler",
        inventory_postmaster_messages: "Mesajlar",
        inventory_subclasses: "Sub Klaslar",
        inventory_weapons: "Silahlar",
        itemDefs_undefined: "Öğe tanımlanamadı, lütfen bu hatayı bana ingilizce olarak GitHub sayfamdan belirtin.",
        language_pack_downloaded: "Dil paketi indirildi,lütfen yenileyin ve değişikliklere göz atın.",
        language_text: "Bu seçenek,programın bütün içeriğinin dilini değiştirecektir.Ileride programda daha fazla dil desteği olacaktır.",
        light: "Light",
        loadouts_alreadythere_pt1: "zaten bunun içerisinde ",
        loadouts_alreadythere_pt2: "'s bucket of ",
        loadouts_delete: "Sil",
        loadouts_desktop: "kontrol",
        loadouts_instructions: "Teçhizatında donanmak için öğe yok.Donanmak için tıkla, ",
        loadouts_instructions_contd: " ekle.",
        loadouts_invalidbucket: " aktarılmayacak. Çünkü seçtiğin bu öğeler yüzünden: ",
        loadouts_mobile: "tut",
        loadouts_no_replacement: " aktarılmayacak. Bu öğenin yerine koyabileceğimiz başka bir öğe yok.",
        loadouts_no_transfer: " aktarılmayacak",
        loadouts_outofspace: " aktarılmayacak, çünkü yandaki yerde yeterli alanın yok ",
        loadouts_save: "Kaydet",
        loadouts_save_new: "Kaydet As",
        loadouts_swap: " ile takas yapılacak ",
        loadouts_to_equip: " donanılacak.",
        loadouts_to_moveequip: " aktarılacak ve donanılacak.",
        loadouts_to_transfer: " aktarılacak",
        loadouts_transfer: "Transfer",
        loadouts_transfer_confirm: "Aktarmayı Onayla",
        loadouts_transferred: "<strong>Öğe(ler) başarı ile aktarıldı!</strong><br> Eğer bu kolaylık hoşunuza gittiyse,<a style=\"color:#3080CF; cursor:pointer;\" class=\"donateLink\" target=\"_system\">bana bi çay ısmarlayın</a>",
        login_authenticating_pt1: "Bungie'ye giriş yapılıyor.. Lütfen sabırlı olun :).",
        login_authenticating_pt2: "Eğer yükleme ekranı 2 dakikadan uzun sürdüyse, Yenilemek için bu linkleri kullanın",
        login_authenticating_pt3: "ve yeniden giriş yapmayı deneyin. Eğer sorun devam ederse,programı silip tekrar yükleyin.",
        login_help: "Yükleme ekranının otomatik kapanmasını bekleyiniz.Yüklendikten sonra program sizi cephanenize yönlendirecektir.",
        login_instructions: "Programı kullanabilmek için Bungie.Net hesabına giriş yapman gerekiyor:",
        login_loading_inventory: "Lütfen Bekleyin, Cephaneniz Bungie tarafından yükleniyor",
        login_loading_updates: "Please wait, downloading auto updates",
        login_title: "Tower Ghost for Destiny ye Hoşgeldiniz!",
        menu_viewformat: "View Format",
        menu_viewimagegrid: "Image Grid",
        menu_viewitemlist: "Items List",
        menu_about: "Hakkında",
        menu_advancedtooltips: "Advanced Tooltips",
        menu_all: "Hepsi",
        menu_autorefresh: "Otomatik yenileme (5 mins)",
        menu_autotransfer: "Otomatik Transfer",
        menu_clear: "Arama Filtrelerini Temizle",
        menu_damage: "Hasar Türü",
        menu_destinydbmode: "DestinyDB Modu",
        menu_destinydbtooltips: "DestinyDB Araçları",
        menu_destinystatus: "DestinyStatus Raporu",
        menu_destinytrials: "DestinyTrials Raporu",
        menu_destinytracker: "DestinyTracker Raporu",
        menu_destinyguardiangg: "Guardian.GG Raporu",
        menu_donate: "Bağış",
        menu_filter_by: "Filter By",
        menu_filter_by_subclass_eq: "Subclass Equipped",
        menu_filter_by_weapon_eq: "Weapons Equipped",
        menu_filter_for_class: "Filter for Class",
        menu_help: "Yardım",
        menu_language: "Dil",
        menu_loadouts: "Teçhizatlar",
        menu_loadouts_create: "Oluştur",
        menu_loadouts_manage: "Manage",
        menu_padheight: "Otomatik Ped Yüksekliği",
        menu_progress: "Ilerleme",
        menu_progress_1: "Ilerlemesi eksik olan öğeler",
        menu_progress_2: "Ilerlemesi Tam olan öğeler",
        menu_progress_3: "Maksimum olan öğeler",
        menu_refresh: "Yenile",
        menu_set: "Set",
        menu_set_showduplicates: "Birden Fazla Olan Öğeleri Göster",
        menu_set_showmissing: "Eksik Öğeleri Göster",
        menu_settings: "Ayarlar",
        menu_options: "More",
        menu_shareurl: "URL'yi Arkadaşlarınla paylaş",
        menu_sortby: "Sort By",
        menu_sortby_lightlvl: "Light Level",
        menu_sortby_name: "Name",
        menu_sortby_type: "Type",
        menu_sortby_tier_type: "Tier, Type",
        menu_sortby_tier_light: "Tier, Light",
        menu_sortby_tier_name: "Tier, Name",
        menu_sortby_type_light: "Type, Light",
        menu_tier: "Öğe Türü",
        menu_useps: "PlayStation Hesabını Kullan",
        menu_usexbox: "Xbox Hesabını Kullan",
        menu_view: "Görüntüle",
        menu_view_armor: "Armorlar",
        menu_view_by: "View By",
        menu_view_by_lightlvl: "Light Level",
        menu_view_by_stat_points: "Combined Stat Points",
        menu_view_general: "Görevler",
        menu_view_options: "Görüntüleme Ayarları",
        menu_view_weapons: "Silahlar",
        missing_items: "Kayıp Öğeler",
        most_points: "Points",
        movepopup_equip: "donan",
        movepopup_extras: "ekstralar",
        movepopup_move: "taşı",
        movepopup_store: "al",
        movepopup_vault: "vault",
        normalize: "Normalize",
        normalize_title: "Normalize - bir öğeyi bütün karakterler arasında eşit olarak bölüştürür",
        paypal_code: "TR",
        pick_a_set: "Lütfen bir set seçin",
        recovery: "Recovery",
        str: "Str",
        strength: "Strength",
        text_shareurl: "Inventoriniz SHARE URL seçeneği ile tekrar yenilenebilir.",
        this_icon: "Bu ikon ",
        tier_common: "Yaygın",
        tier_exotic: "Exotic",
        tier_legendary: "Legendary",
        tier_rare: "Rare",
        tier_uncommon: "Nadir",
        transfer: "Transfer",
        transfer_all: "Hepsi",
        transfer_amount: "Aktarılacak Miktar",
        transfer_ask: "Don\'t ask in the future",
        consolidate: "Consolidate",
        transfer_consolidate: "Consolidate (pull from all characters",
        transfer_one: "Bir Adet",
        unable_create_loadout_for_type: "Bu öğe tipi ile teçhizat oluşturmak mümkün değil.",
        unable_to_create_loadout_for_bucket: "Bu slot içerisinde 10'dan fazla öğe ile teçhizat oluşturamazsın: ",
        unable_to_move_bucketitems: "Seçtiğin öğeler bu uygulama ile aktarılamaz.",
        unable_unequip: "Üzerinizden çıkartılamıyor ",
        vo_container_width: "Container Width",
        vo_layout_mode: "Layout Mode",
        vo_layout_mode_cust: "Custom",
        vo_layout_mode_def: "Default",
        vo_number_of_columns: "Columns",
        vo_vault_columns: "Vault Columns",
        vo_vault_first: "Ilk/Sol",
        vo_vault_last: "Son/Sağ",
        vo_vault_position: "Vault pozisyonu",
        vo_vault_width: "Vault Width",
        whats_new_title: "Tower Ghost for Destiny Güncellemeleri"
    }
};tgd.selectMultiCharacters = function(description, characters) {
    var self = this;

    self.description = description;
    self.characters = characters;

    var selectedStatus = ko.observable(_.reduce(self.characters(), function(memo, character) {
        memo[character.id] = (character.id !== "Vault");
        return memo;
    }, {}));

    self.selectedCharacters = ko.computed(function() {
        return _.filter(self.characters(), function(c) {
            return selectedStatus()[c.id] === true;
        });
    });

    self.setSelectedCharacter = function() {
        var ss = selectedStatus();
        ss[this.id] = !ss[this.id];
        selectedStatus(ss);
    };
};tgd.settingsManager = function(settings) {
    var self = this;

    _.extend(self, settings);

    self.activeLocale = ko.observable(self.currentLocale());

    self.activeLocale.subscribe(function(language_code) {
        self.appLocale(language_code);
        self.autoUpdates(true);
        tgd.checkUpdates();
        BootstrapDialog.alert("Downloading updated language files");
    });
};tgd.getStoredValue = function(key) {
    var saved = "";
    if (window.localStorage && window.localStorage.getItem)
        saved = window.localStorage.getItem(key);
    if (_.isEmpty(saved)) {
        return tgd.defaults[key];
    } else {
        return saved;
    }
};

tgd.StoreObj = function(key, compare, writeCallback) {
    var value = ko.observable(compare ? tgd.getStoredValue(key) == compare : tgd.getStoredValue(key));
    this.read = function() {
        return value();
    };
    this.write = function(newValue) {
        window.localStorage.setItem(key, newValue);
        value(newValue);
        if (writeCallback) writeCallback(newValue);
    };
};tgd.transferConfirm = function(item, targetCharacterId, characters, onFinish) {
    var self = this;

    var getItemCount = function(characters) {
        return _.reduce(characters, function(memo, character) {
            var items = _.where(character.items(), {
                description: item.description
            });
            memo = memo + _.reduce(items, function(memo, i) {
                return memo + i.primaryStat();
            }, 0);
            return memo;
        }, 0);
    };
    self.itemTotal = getItemCount(characters());
    self.characterTotal = getItemCount(_.filter(characters(), function(character) {
        return item.character.id == character.id;
    }));
    self.dialog = null;
    self.consolidate = ko.observable(false);
    self.materialsAmount = ko.observable(self.characterTotal);

    self.finishTransfer = function(consolidate) {
        if (consolidate) {
            item.consolidate(targetCharacterId, item.description);
            self.dialog.close();
        } else {
            var transferAmount = parseInt(self.materialsAmount());
            if (!isNaN(transferAmount) && (transferAmount > 0) && (transferAmount <= self.characterTotal)) {
                onFinish(transferAmount);
                self.dialog.close();
            } else {
                BootstrapDialog.alert(app.activeText().invalid_transfer_amount + transferAmount);
            }
        }
    };

    self.setDialog = function(dialog) {
        self.dialog = dialog;
    };

    self.decrement = function() {
        var num = parseInt(self.materialsAmount());
        if (!isNaN(num)) {
            self.materialsAmount(Math.max(num - 1, 1));
        }
    };

    self.increment = function() {
        var num = parseInt(self.materialsAmount());
        if (!isNaN(num)) {
            self.materialsAmount(Math.min(num + 1, self.characterTotal));
        }
    };

    self.all = function() {
        var num = parseInt(self.materialsAmount());
        if (!isNaN(num)) {
            self.materialsAmount(self.characterTotal);
        }
    };

    self.one = function() {
        var num = parseInt(self.materialsAmount());
        if (!isNaN(num)) {
            self.materialsAmount(1);
        }
    };
};(function() {

    
    try {

        // Check for Cordova
        var isCordova = typeof cordova !== 'undefined',
            // CordovaPromiseFS
            fs,
            // CordovaFileLoader
            loader,
            // script-tag...
            script,
            // ...that contains the serverRoot
            serverRoot;

        // Get serverRoot from script tag.
        script = document.querySelector('script[server]');
        if (script) serverRoot = script.getAttribute('server');
        if (!serverRoot) {
            throw new Error('Add a "server" attribute to the bootstrap.js script!');
        }

        // Initialize filesystem and loader
        fs = new CordovaPromiseFS({
            persistent: isCordova || isFirefox, // Chrome should use temporary storage.
            Promise: Promise
        });

        tgd.loader = new CordovaAppLoader({
            fs: fs,
            localRoot: 'app',
            serverRoot: serverRoot,
            mode: 'mirror',
            cacheBuster: true,
            preventAutoUpdateLoop: false,
            checkTimeout: 30 * 1000
        });

        // Check > Download > Update
        tgd.checkUpdates = function() {
            $.toaster({
                priority: 'info',
                title: 'Info',
                message: "Checking for updates",
                settings: {
                    timeout: tgd.defaults.toastTimeout
                }
            });
            tgd.loader.check(serverRoot + "bootstrap.json?locale=" + (localStorage.appLocale || localStorage.locale || "en"))
                .then(function(updateAvailable) {
                    if (updateAvailable) {
                        $.toaster({
                            priority: 'info',
                            title: 'Info',
                            message: "Downloading updates",
                            settings: {
                                timeout: tgd.defaults.toastTimeout
                            }
                        });
                        
                        $("#tgdLoader").show();
                    }
                    return tgd.loader.download(function(progress) {
                        $("#tgdLoaderProgress").width((progress.percentage * 100).toFixed(0) + "%");
                    }, true);
                })
                .catch(function(e) {
                    $("#tgdLoader").hide();
                    $.toaster({
                        priority: 'danger',
                        title: 'Error',
                        message: "Problem checking for updates: " + e.message,
                        settings: {
                            timeout: tgd.defaults.toastTimeout
                        }
                    });
                })
                .then(function(manifest) {
                    $("#tgdLoader").hide();
                    if (manifest) {
                        $.toaster({
                            priority: 'info',
                            title: 'Info',
                            message: "Installing updates",
                            settings: {
                                timeout: tgd.defaults.toastTimeout
                            }
                        });
                    }
                    return tgd.loader.update();
                }, function(err) {
                    $("#tgdLoader").hide();
                    $.toaster({
                        priority: 'danger',
                        title: 'Error',
                        message: 'Auto-update error:' + err,
                        settings: {
                            timeout: tgd.defaults.toastTimeout
                        }
                    });
                });
        };

        if (localStorage.autoUpdates == "true" || (tgd.defaults.autoUpdates == "true" && _.isEmpty(localStorage.autoUpdates))) {
            
            tgd.checkUpdates();
        }
    } catch (e) {
        
    }
})();tgd.showLoading = function(callback) {
    $("body").css("cursor", "progress");
    setTimeout(function() {
        callback();
        setTimeout(function() {
            $("body").css("cursor", "default");
        }, 10);
    }, 600);
};

tgd.cartesianProductOf = function(x) {
    return _.reduce(x, function(a, b) {
        return _.flatten(_.map(a, function(x) {
            return _.map(b, function(y) {
                return x.concat([y]);
            });
        }), true);
    }, [
        []
    ]);
};

tgd.sum = function(arr) {
    return _.reduce(arr, function(memo, num) {
        return memo + num;
    }, 0);
};

tgd.average = function(arr) {
    return _.reduce(arr, function(memo, num) {
        return memo + num;
    }, 0) / arr.length;
};

tgd.joinStats = function(arrItems) {
    var tmp = {};
    _.each(arrItems, function(item) {
        _.each(item.activeRoll || item.stats, function(value, key) {
            if (!(key in tmp)) tmp[key] = 0;
            tmp[key] += value;
        });
    });
    return tmp;
};

tgd.hashCode = function(str) {

    if (Array.prototype.reduce) {
        return str.split("").reduce(function(a, b) {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
    } else {
        var hash = 0,
            i, chr, len;
        if (str.length === 0) return hash;
        for (i = 0, len = str.length; i < len; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
};tgd.version = "3.9.0.4";tgd.moveItemPositionHandler = function(element, item) {
    
    if (app.destinyDbMode() === true) {
        
        window.open(item.href, tgd.openTabAs);
        return false;
    } else if (app.loadoutMode() === true) {
        
        var existingItem, itemFound = false;
        if (item._id > 0) {
            existingItem = _.findWhere(app.activeLoadout().ids(), {
                id: item._id
            });
            if (existingItem) {
                app.activeLoadout().ids.remove(existingItem);
                itemFound = true;
            }
        } else {
            existingItem = _.filter(app.activeLoadout().generics(), function(itm) {
                return item.id == itm.hash && item.characterId() == itm.characterId;
            });
            if (existingItem.length > 0) {
                app.activeLoadout().generics.removeAll(existingItem);
                itemFound = true;
            }
        }
        if (itemFound === false) {
            if (item.transferStatus >= 2 && item.bucketType != "Subclasses") {
                $.toaster({
                    priority: 'danger',
                    title: 'Warning',
                    message: app.activeText().unable_create_loadout_for_type,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            } else if (item._id === "0") {
                app.activeLoadout().addGenericItem({
                    hash: item.id,
                    bucketType: item.bucketType,
                    characterId: item.characterId()
                });
            } else if (_.where(app.activeLoadout().items(), {
                    bucketType: item.bucketType
                }).length < 10) {
                app.activeLoadout().addUniqueItem({
                    id: item._id,
                    bucketType: item.bucketType,
                    doEquip: false
                });
            } else {
                $.toaster({
                    priority: 'danger',
                    title: 'Error',
                    message: app.activeText().unable_to_create_loadout_for_bucket + item.bucketType,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        }
    } else {
        
        app.activeItem(item);
        var $movePopup = $("#move-popup");
        //TODO: Investigate how to allow Gunsmith weapons to be equipped and avoid this clause
        if ((item.transferStatus >= 2 && item.bucketType != "Subclasses") || item.bucketType == "Post Master" || item.bucketType == "Messages" || item.bucketType == "Invisible" || item.bucketType == "Lost Items" || item.bucketType == "Bounties" || item.bucketType == "Mission" || item.typeName == "Armsday Order") {
            $.toaster({
                priority: 'danger',
                title: 'Error',
                message: app.activeText().unable_to_move_bucketitems,
                settings: {
                    timeout: tgd.defaults.toastTimeout
                }
            });
            return;
        }
        if (element == tgd.activeElement) {
            $movePopup.hide();
            tgd.activeElement = null;
            
        } else {
            
            tgd.activeElement = element;
            $ZamTooltips.hide();
            if (window.isMobile) {
                $("body").css("padding-bottom", $movePopup.height() + "px");
                /* bringing back the delay it's sitll a problem in issue #128 */
                setTimeout(function() {
                    $movePopup.show().addClass("mobile");
                }, 50);
            } else {
                
                $movePopup.removeClass("navbar navbar-default navbar-fixed-bottom").addClass("desktop").show().position({
                    my: "left bottom",
                    at: "left top",
                    collision: "none",
                    of: element,
                    using: function(pos, ui) {
                        var obj = $(this),
                            box = $(ui.element.element).find(".move-popup").width();
                        obj.removeAttr('style');
                        if (box + pos.left > $(window).width()) {
                            pos.left = pos.left - box;
                        }
                        obj.css(pos).width(box);
                    }
                });
            }
        }
    }
};

var Item = function(model, profile) {
    var self = this;

    if (model && model.id) {
        model.equipRequiredLevel = 0;
        model.isEquipment = true;
    }

    /* TODO: Determine why this is needed */
    _.each(model, function(value, key) {
        self[key] = value;
    });

    this.character = profile;

    this.init(model);

    this.characterId = ko.observable(self.character.id);
    this.isFiltered = ko.observable(false);
    this.isVisible = ko.pureComputed(this._isVisible, this);
    this.columnMode = ko.computed(this._columnMode, this);
    this.opacity = ko.computed(this._opacity, this);
    this.primaryStatValue = ko.pureComputed(this._primaryStatValue, this);
    this.maxLightPercent = ko.pureComputed(function() {
        var toggle = app.cspToggle();
        return Math.round((self.primaryValues.MaxLightCSP / tgd.DestinyMaxCSP[self.bucketType]) * 100);
    });
    this.cspStat = ko.pureComputed(this._cspStat, this);
    this.cspClass = ko.pureComputed(this._cspClass, this);
};

Item.prototype = {
    init: function(item) {
        var self = this;
        var info = {};
        if (item.itemHash in _itemDefs) {
            info = _itemDefs[item.itemHash];
        } else if (item.id in _itemDefs) {
            item.itemHash = item.id;
            info = _itemDefs[item.id];
        } else {
            /* Classified Items */
            info = {
                bucketTypeHash: "1498876634",
                itemName: "Classified",
                tierTypeName: "Exotic",
                icon: "/img/misc/missing_icon.png",
                itemTypeName: "Classified"
            };
            
            
        }
        if (info.bucketTypeHash in tgd.DestinyBucketTypes) {
            //some weird stuff shows up under this bucketType w/o this filter
            if (info.bucketTypeHash == "2422292810" && info.deleteOnAction === false) {
                return;
            }
            var description, tierTypeName, itemDescription, itemTypeName, bucketType;
            try {
                description = decodeURIComponent(info.itemName);
                tierTypeName = decodeURIComponent(info.tierTypeName);
                itemDescription = decodeURIComponent(info.itemDescription);
                itemTypeName = decodeURIComponent(info.itemTypeName);
            } catch (e) {
                description = info.itemName;
                tierTypeName = info.tierTypeName;
                itemDescription = info.itemDescription;
                itemTypeName = info.itemTypeName;
            }
            info.icon = (info.icon === "") ? "/img/misc/missing_icon.png" : info.icon;
            bucketType = item.bucketType || self.character.getBucketTypeHelper(item, info);
            $.extend(self, {
                id: item.itemHash,
                href: "https://destinydb.com/items/" + item.itemHash,
                _id: item.itemInstanceId,
                characterId: ko.observable(self.character.id),
                isEquipped: ko.observable(),
                locked: ko.observable(),
                bonusStatOn: ko.observable(),
                primaryStat: ko.observable(),
                damageType: item.damageType,
                damageTypeName: tgd.DestinyDamageTypes[item.damageType],
                isEquipment: item.isEquipment,
                isGridComplete: item.isGridComplete,
                description: description,
                itemDescription: itemDescription,
                classType: info.classType,
                bucketType: bucketType,
                type: info.itemSubType,
                typeName: itemTypeName,
                tierType: info.tierType,
                tierTypeName: tierTypeName,
                icon: tgd.dataDir + info.icon,
                maxStackSize: info.maxStackSize,
                equipRequiredLevel: item.equipRequiredLevel,
                canEquip: item.canEquip,
                weaponIndex: tgd.DestinyWeaponPieces.indexOf(bucketType),
                armorIndex: tgd.DestinyArmorPieces.indexOf(bucketType),
                transferStatus: item.transferStatus,
                backgroundPath: (itemTypeName == "Emblem") ? app.makeBackgroundUrl(info.secondaryIcon) : "",
                actualBucketType: _.reduce(tgd.DestinyLayout, function(memo, layout) {
                    if ((layout.bucketTypes.indexOf(bucketType) > -1 && layout.extras.indexOf(bucketType) == -1) || (layout.bucketTypes.indexOf(bucketType) == -1 && layout.extras.indexOf(bucketType) > -1))
                        memo = layout.array;
                    return memo;
                }, "")
            });
            self.updateItem(item);
        }
    },
    updateItem: function(item) {
        var self = this;
        var info = {};
        if (item.itemHash in _itemDefs) {
            info = _itemDefs[item.itemHash];
        } else {
            /* Classified Items */
            info = {
                bucketTypeHash: "1498876634",
                itemName: "Classified",
                tierTypeName: "Exotic",
                icon: "/img/misc/missing_icon.png",
                itemTypeName: "Classified"
            };
            
            
        }
        var bucketType = item.bucketType || self.character.getBucketTypeHelper(item, info);
        var primaryStat = self.parsePrimaryStat(item, bucketType);
        self.primaryStat(primaryStat);
        self.isEquipped(item.isEquipped);
        self.locked(item.locked);
        self.perks = self.parsePerks(item.id, item.talentGridHash, item.perks, item.nodes, item.itemInstanceId);
        var statPerks = _.where(self.perks, {
            isStat: true
        });
        self.hasLifeExotic = _.where(self.perks, {
            name: "The Life Exotic"
        }).length > 0;
        var bonus = (statPerks.length === 0) ? 0 : tgd.bonusStatPoints(self.armorIndex, primaryStat);
        self.stats = self.parseStats(self.perks, item.stats, item.itemHash);
        self.rolls = self.normalizeRolls(self.stats, statPerks, primaryStat, bonus, "");
        self.futureRolls = self.calculateFutureRolls(self.stats, statPerks, primaryStat, self.armorIndex, bonus, bucketType, this.description);
        var hasUnlockedStats = _.where(statPerks, {
            active: true
        }).length > 0;
        self.bonusStatOn(hasUnlockedStats ? _.findWhere(statPerks, {
            active: true
        }).name : "");
        self.hasUnlockedStats = hasUnlockedStats || statPerks.length === 0;
        self.progression = _.filter(self.perks, function(perk) {
            return perk.active === false && perk.isExclusive === -1;
        }).length === 0;
        self.perksInProgress = _.filter(self.perks, function(perk) {
            return perk.active === false && perk.isExclusive === -1;
        }).length === 0;
        self.primaryValues = {
            CSP: tgd.sum(_.values(self.stats)),
            bonus: bonus,
            Default: primaryStat
        };
        self.primaryValues.MaxLightCSP = Math.round(tgd.calculateStatRoll(self, tgd.DestinyLightCap, true));
    },
    calculateFutureRolls: function(stats, statPerks, primaryStat, armorIndex, currentBonus, bucketType, description) {
        var futureRolls = [];
        if (statPerks.length === 0) {
            futureRolls = [stats];
        } else {
            var futureBonus = tgd.bonusStatPoints(armorIndex, tgd.DestinyLightCap);
            var allStatsLocked = _.where(statPerks, {
                active: true
            }).length === 0;
            futureRolls = _.map(statPerks, function(statPerk) {
                var tmp = _.clone(stats);
                var isStatActive = statPerk.active;
                //Figure out the stat name of the other node
                var otherStatName = _.reduce(stats, function(memo, stat, name) {
                    return (name != statPerk.name && stat > 0) ? name : memo;
                }, '');
                //Normalize stats by removing the bonus stat 
                tmp[isStatActive ? statPerk.name : otherStatName] = tmp[isStatActive ? statPerk.name : otherStatName] - (allStatsLocked ? 0 : currentBonus);
                //Figure out the sum of points and the weight of each side
                var sum = tgd.sum(tmp),
                    weight = (tmp[statPerk.name] / sum),
                    currentStatValue = sum * weight,
                    otherStatValue = sum * (1 - weight);
                //Calculate both stats at Max Light (LL320) with bonus
                //TODO: figure out a way to consolidate this equation into tgd.calculateStatRoll
                //tmp[statPerk.name] = Math.round((sum * tgd.DestinyLightCap / primaryStat) * weight) + futureBonus; //(allStatsLocked || isStatActive ? futureBonus : 0);
                tmp[statPerk.name] = Math.round(currentStatValue + ((tgd.DestinyLightCap - primaryStat) * tgd.DestinyInfusionRates[bucketType])) + futureBonus;
                tmp["bonusOn"] = statPerk.name;
                if (otherStatName !== "") {
                    //tmp[otherStatName] = Math.round((sum * tgd.DestinyLightCap / primaryStat) * (1 - weight));
                    tmp[otherStatName] = Math.round(otherStatValue + ((tgd.DestinyLightCap - primaryStat) * tgd.DestinyInfusionRates[bucketType]));
                }
                return tmp;
            });
            /*if ( description == "Graviton Forfeit" ){
            	
				//abort;
            }*/
        }
        return futureRolls;
    },
    normalizeRolls: function(stats, statPerks, primaryStat, bonus, description) {
        var arrRolls = [];
        if (statPerks.length === 0) {
            arrRolls = [stats];
        } else {
            var hasUnlockedStats = _.where(statPerks, {
                active: true
            }).length > 0;

            arrRolls = _.map(statPerks, function(statPerk) {
                var tmp = _.clone(stats);
                tmp["bonusOn"] = statPerk.name;
                if (hasUnlockedStats && statPerk.active === false) {
                    var otherStatName = _.reduce(stats, function(memo, stat, name) {
                        return (name != statPerk.name && stat > 0) ? name : memo;
                    }, '');
                    tmp[otherStatName] = tmp[otherStatName] - bonus;
                    tmp[statPerk.name] = tmp[statPerk.name] + bonus;
                } else if (hasUnlockedStats === false) {
                    tmp[statPerk.name] = tmp[statPerk.name] + bonus;
                }
                return tmp;
            });
            /*if ( description == "Jasper Carcanet" ){
            	
            }*/
        }
        return arrRolls;
    },
    parsePrimaryStat: function(item, bucketType) {
        var primaryStat = "";
        if (item.primaryStat) {
            if (item.primaryStat && item.primaryStat.value) {
                primaryStat = item.primaryStat.value;
            } else {
                primaryStat = item.primaryStat;
            }
        }
        if (item && item.objectives && item.objectives.length > 0) {
            var progress = (tgd.average(_.map(item.objectives, function(objective) {
                var result = 0;
                if (objective.objectiveHash in _objectiveDefs && _objectiveDefs[objective.objectiveHash] && _objectiveDefs[objective.objectiveHash].completionValue) {
                    result = objective.progress / _objectiveDefs[objective.objectiveHash].completionValue;
                }
                return result;
            })) * 100).toFixed(0) + "%";
            primaryStat = (primaryStat === "") ? progress : primaryStat + "/" + progress;
        }
        if (bucketType == "Materials" || bucketType == "Consumables" || ((bucketType == "Lost Items" || bucketType == "Invisible") && item.stackSize > 1)) {
            primaryStat = item.stackSize;
        }
        return primaryStat;
    },
    parseStats: function(perks, stats, itemHash) {
        var parsedStats = {};
        if (stats && stats.length && stats.length > 0) {
            _.each(stats, function(stat) {
                if (stat.statHash in window._statDefs) {
                    var p = window._statDefs[stat.statHash];
                    parsedStats[p.statName] = stat.value;
                }
            });
            //Truth has a bug where it displays a Mag size of 2 when it's actually 3, all other RL don't properly reflect the mag size of 3 when Tripod is enabled
            if (_.findWhere(perks, {
                    name: "Tripod",
                    active: true
                }) || [1274330686, 2808364178].indexOf(itemHash) > -1) {
                parsedStats.Magazine = 3;
            }
        }
        //this is for the static share site
        else if (_.isObject(stats)) {
            parsedStats = stats;
        }
        return parsedStats;
    },
    parsePerks: function(id, talentGridHash, perks, nodes, itemInstanceId) {
        var parsedPerks = [];
        if (id) {
            parsedPerks = perks;
        } else if (_.isArray(perks) && perks.length > 0) {
            var talentGrid = _talentGridDefs[talentGridHash];
            if (talentGrid && talentGrid.nodes) {
                _.each(perks, function(perk) {
                    if (perk.perkHash in window._perkDefs) {
                        var isInherent, p = window._perkDefs[perk.perkHash];
                        //There is an inconsistency between perkNames in Destiny for example:
                        /* Boolean Gemini - Has two perks David/Goliath which is also called One Way/Or Another
                           This type of inconsistency leads to issues with filtering therefore p.perkHash must be used
                        */
                        var nodeIndex = talentGrid.nodes.indexOf(
                            _.filter(talentGrid.nodes, function(o) {
                                return _.flatten(_.pluck(o.steps, 'perkHashes')).indexOf(p.perkHash) > -1;
                            })[0]
                        );
                        if (nodeIndex > 0) {
                            isInherent = _.reduce(talentGrid.nodes[nodeIndex].steps, function(memo, step) {
                                if (memo === false) {
                                    var isPerk = _.values(step.perkHashes).indexOf(p.perkHash) > -1;
                                    if (isPerk && step.activationRequirement.gridLevel === 0) {
                                        memo = true;
                                    }
                                }
                                return memo;
                            }, false);
                        }
                        var description = p && p.displayDescription ? p.displayDescription : "";
                        parsedPerks.push({
                            iconPath: tgd.dataDir + p.displayIcon,
                            name: p.displayName,
                            description: '<strong>' + p.displayName + '</strong>: ' + description,
                            active: perk.isActive,
                            isExclusive: talentGrid.exclusiveSets.indexOf(nodeIndex),
                            isInherent: isInherent,
                            isVisible: true,
                            hash: p.perkHash
                        });
                    }
                });
                var statNames = _.pluck(tgd.DestinyArmorStats, 'statName'),
                    perkHashes = _.pluck(parsedPerks, 'hash'),
                    perkNames = _.pluck(parsedPerks, 'name'),
                    talentPerks = {};
                var talentGridNodes = talentGrid.nodes;
                _.each(nodes, function(node) {
                    if (node.hidden === false) {
                        var nodes = _.findWhere(talentGridNodes, {
                            nodeHash: node.nodeHash
                        });
                        if (nodes && nodes.steps && _.isArray(nodes.steps)) {
                            var perk = nodes.steps[node.stepIndex];
                            var isSkill = _.intersection(perk.nodeStepName.split(" "), statNames);
                            if (isSkill.length === 0 &&
                                (tgd.DestinyUnwantedNodes.indexOf(perk.nodeStepName) == -1) &&
                                (perkNames.indexOf(perk.nodeStepName) == -1) &&
                                (perk.perkHashes.length === 0 || perkHashes.indexOf(perk.perkHashes[0]) === -1)) {
                                talentPerks[perk.nodeStepName] = {
                                    active: node.isActivated,
                                    name: perk.nodeStepName,
                                    description: '<strong>' + perk.nodeStepName + '</strong>: ' + perk.nodeStepDescription,
                                    iconPath: tgd.dataDir + perk.icon,
                                    isExclusive: -1,
                                    hash: perk.icon.match(/icons\/(.*)\.png/)[1],
                                    isVisible: node.isActivated
                                };
                            } else if (isSkill.length > 0) {
                                var statName = isSkill[0];
                                talentPerks[statName] = {
                                    active: node.isActivated === true && [7, 1].indexOf(node.state) == -1,
                                    name: statName,
                                    description: "",
                                    iconPath: "",
                                    isExclusive: -1,
                                    isVisible: false,
                                    isStat: true,
                                    hash: _.findWhere(tgd.DestinyArmorStats, {
                                        statName: statName
                                    })
                                };
                            }
                        }
                    }
                });
                _.each(talentPerks, function(perk) {
                    parsedPerks.push(perk);
                });
            }
        }
        return parsedPerks;
    },
    _opacity: function() {
        return (this.equipRequiredLevel <= this.character.level() || this.character.id == 'Vault') ? 1 : 0.3;
    },
    _columnMode: function() {
        var self = this;
        var className = "";
        if (self.characterId() == 'Vault') {
            className = 'col-xs-' + app.vaultColumns();
        } else if (tgd.DestinyBucketColumns[self.bucketType] == 4) {
            className = 'col-xs-' + (tgd.bootstrapGridColumns / 4);
        } else {
            className = 'col-xs-' + (tgd.bootstrapGridColumns / 3);
        }
        if (self.isGridComplete) {
            className += ' complete';
        }
        return className;
    },
    isEquippable: function(avatarId) {
        var self = this;
        return ko.pureComputed(function() {
            //rules for how subclasses can be equipped
            var equippableSubclass = (self.bucketType == "Subclasses" && !self.isEquipped() && self.character.id == avatarId) || self.bucketType !== "Subclasses";
            //if it's in this character and it's equippable
            return (self.characterId() == avatarId && !self.isEquipped() && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && self.typeName.indexOf("Armsday") == -1 && equippableSubclass) || (self.characterId() != avatarId && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && equippableSubclass && self.transferStatus < 2);
        });
    },
    isStoreable: function(avatarId) {
        var self = this;
        return ko.pureComputed(function() {
            return (self.characterId() != avatarId && avatarId !== 'Vault' && self.bucketType !== 'Subclasses' && self.transferStatus < 2) ||
                (self.isEquipped() && self.character.id == avatarId);
        });
    },
    clone: function() {
        var self = this;
        var model = {};
        for (var i in self) {
            if (self.hasOwnProperty(i)) {
                var val = ko.unwrap(self[i]);
                if (typeof(val) !== 'function') {
                    model[i] = val;
                }
            }
        }
        //
        //
        var newItem = new Item(model, self.character);
        return newItem;
    },
    hasPerkSearch: function(search) {
        var foundPerk = false,
            self = this;
        if (self.perks) {
            var vSearch = search.toLowerCase();
            self.perks.forEach(function(perk) {
                if (perk.name.toLowerCase().indexOf(vSearch) > -1 || perk.description.toLowerCase().indexOf(vSearch) > -1)
                    foundPerk = true;
            });
        }
        return foundPerk;
    },
    hashProgress: function(state) {
        var self = this;
        if (typeof self.progression !== "undefined") {
            /* Missing Perks */
            if (state == "1" && self.progression === false) {
                return true;
            }
            /* Filled perks but not maxed out */
            else if (state == "2" && self.progression === true && self.isGridComplete === false) {
                return true;
            }
            /* Maxed weapons (Gold Borders only) */
            else if (state == "3" && self.progression === true && self.isGridComplete === true) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    },
    hasGeneral: function(type) {
        if (type == "Engrams" && this.description.indexOf("Engram") > -1 && this.isEquipment === false) {
            return true;
        } else if (type in tgd.DestinyGeneralItems && tgd.DestinyGeneralItems[type].indexOf(this.id) > -1) {
            return true;
        } else {
            return false;
        }
    },
    _cspStat: function() {
        var stat = this.primaryStat();
        if (app.armorViewBy() == 'CSP' && _.has(tgd.DestinyMaxCSP, this.bucketType)) {
            stat = this.getValue("All") + "-" + this.getValue("MaxLightCSP");
        }
        return stat;
    },
    _cspClass: function() {
        var rollType = "None";
        if (_.has(tgd.DestinyMaxCSP, this.bucketType)) {
            var maxLightPercent = ko.unwrap(this.maxLightPercent),
                minAvgPercentNeeded = ko.unwrap(app.minAvgPercentNeeded);
            rollType = "BadRoll";
            if (maxLightPercent >= minAvgPercentNeeded) {
                rollType = "GoodRoll";
            }
            //4 pts under the requirement is still good enough to maybe get you there
            else if (maxLightPercent >= (minAvgPercentNeeded - 4)) {
                rollType = "OkayRoll";
            }
        }
        if (this.weaponIndex > -1) {
            rollType = this.damageTypeName;
        }
        return rollType;
    },
    _primaryStatValue: function() {
        if (this.primaryStat && typeof this.primaryStat == "function") {
            var primaryStat = ko.unwrap(this.primaryStat());
            if (this.objectives && typeof primaryStat == "string" && primaryStat.indexOf("/") > -1) {
                primaryStat = parseInt(primaryStat.split("/")[0]);
            }
            return primaryStat;
        }
    },
    _isVisible: function() {
        var $parent = app,
            self = this;

        if (typeof self.id == "undefined") {
            return false;
        }

        var dmgFilter = true;
        var progressFilter = true;
        var weaponFilter = true;
        var armorFilter = true;
        var showDuplicate = true;
        var setFilter = true;
        var searchFilter = ($parent.searchKeyword() === '' || $parent.searchKeyword() !== "" && self.description.toLowerCase().indexOf($parent.searchKeyword().toLowerCase()) > -1);
        var tierFilter = $parent.tierFilter() == "0" || $parent.tierFilter() == self.tierType;

        var itemStatValue = "";
        if (this.primaryStatValue && this.primaryStatValue()) {
            itemStatValue = this.primaryStatValue().toString();
        }
        var operator = $parent.searchKeyword().substring(0, 1);
        if (itemStatValue !== "" && itemStatValue.indexOf("%") == -1 && (operator == ">" || operator == "<" || $.isNumeric($parent.searchKeyword()))) {
            var operand = "=",
                searchValue = $parent.searchKeyword();
            if (operator === ">" || operator === "<") {
                operand = operator + operand;
                searchValue = searchValue.replace(operator, '');
            } else {
                operand = "=" + operand;
            }
            searchFilter = new Function('return ' + itemStatValue + operand + searchValue.toString())();
        }

        if (self.armorIndex > -1 || self.weaponIndex > -1) {
            setFilter = $parent.setFilter().length === 0 || $parent.setFilter().indexOf(self.id) > -1;
            searchFilter = searchFilter || self.hasPerkSearch($parent.searchKeyword());
            if (self.weaponIndex > -1) {
                dmgFilter = $parent.dmgFilter().length === 0 || $parent.dmgFilter().indexOf(self.damageTypeName) > -1;
                weaponFilter = $parent.weaponFilter() == "0" || $parent.weaponFilter() == self.typeName;
            } else {
                var types = _.map(_.pluck(self.perks, 'name'), function(name) {
                    return name && name.split(" ")[0];
                });
                dmgFilter = $parent.dmgFilter().length === 0 || _.intersection($parent.dmgFilter(), types).length > 0;
                armorFilter = $parent.armorFilter() == "0" || $parent.armorFilter() == self.bucketType;
            }
            progressFilter = $parent.progressFilter() == "0" || self.hashProgress($parent.progressFilter());
        }
        generalFilter = $parent.generalFilter() == "0" || self.hasGeneral($parent.generalFilter());
        showDuplicate = $parent.customFilter() === false || ($parent.customFilter() === true && self.isFiltered() === true);

        var isVisible = (searchFilter) && (dmgFilter) && (setFilter) && (tierFilter) && (progressFilter) && (weaponFilter) && (armorFilter) && (generalFilter) && (showDuplicate);
        //
        /*if ( self.description == "Red Death") {
			
			
			
			
			
			
			
			
			
		}*/
        return isVisible;
    },
    /* helper function that unequips the current item in favor of anything else */
    unequip: function(callback) {
        var self = this;
        
        if (self.isEquipped() === true) {
            
            var otherEquipped = false,
                itemIndex = -1,
                otherItems = _.sortBy(_.filter(self.character.items(), function(item) {
                    return (item._id != self._id && item.bucketType == self.bucketType);
                }), function(item) {
                    return [item.getValue("Light") * -1, item.getValue("CSP") * -1];
                });
            //
            if (otherItems.length > 0) {
                /* if the only remainings item are exotic ensure the other buckets dont have an exotic equipped */
                var minTier = _.min(_.pluck(otherItems, 'tierType'));
                var tryNextItem = function() {
                    var item = otherItems[++itemIndex];
                    if (_.isUndefined(item)) {
                        if (callback) callback(false);
                        else {
                            
                            $.toaster({
                                priority: 'danger',
                                title: 'Error',
                                message: app.activeText().cannot_unequip + self.description,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                        return;
                    }
                    
                    /* still haven't found a match */
                    if (otherEquipped === false) {
                        if (item != self && item.equip) {
                            
                            item.equip(self.characterId(), function(isEquipped, result) {
                                
                                if (isEquipped === true) {
                                    otherEquipped = true;
                                    callback(true);
                                } else if (isEquipped === false && result && result.ErrorCode && result.ErrorCode === 1634) {
                                    callback(false);
                                } else {
                                    tryNextItem();
                                    
                                }
                            });
                        } else {
                            tryNextItem();
                            
                        }
                    }
                };
                
                
                if (minTier == 6) {
                    var otherItemUnequipped = false;
                    var otherBucketTypes = self.weaponIndex > -1 ? _.clone(tgd.DestinyWeaponPieces) : _.clone(tgd.DestinyArmorPieces);
                    otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex, 1);
                    _.each(otherBucketTypes, function(bucketType) {
                        var itemEquipped = self.character.itemEquipped(bucketType);
                        if (itemEquipped && itemEquipped.tierType && itemEquipped.tierType == 6) {
                            
                            itemEquipped.unequip(function(result) {
                                //unequip was successful
                                if (result) {
                                    tryNextItem();
                                }
                                //unequip failed
                                else {
                                    
                                    $.toaster({
                                        priority: 'danger',
                                        title: 'Error',
                                        message: app.activeText().unable_unequip + itemEquipped.description,
                                        settings: {
                                            timeout: tgd.defaults.toastTimeout
                                        }
                                    });
                                    callback(false);
                                }
                            });
                            otherItemUnequipped = true;
                        }
                    });
                    if (!otherItemUnequipped) {
                        
                        tryNextItem();
                    }
                } else {
                    tryNextItem();
                }
            } else {
                
                callback(false);
            }
        } else {
            
            callback(true);
        }
    },
    equip: function(targetCharacterId, callback) {
        var self = this;
        var done = function() {
            
            app.bungie.equip(targetCharacterId, self._id, function(e, result) {
                if (result && result.Message && result.Message == "Ok") {
                    var done = function() {
                        
                        
                        
                        self.isEquipped(true);
                        self.character.items().forEach(function(item) {
                            if (item._id != self._id && item.bucketType == self.bucketType && item.isEquipped() === true) {
                                item.isEquipped(false);
                            }
                        });
                        if (self.bucketType == "Emblem") {
                            self.character.icon(self.icon);
                            self.character.background(self.backgroundPath);
                        }
                        if (callback) callback(true);
                    };
                    if (!(self instanceof Item)) {
                        app.findReference(self, function(item) {
                            self = item;
                            done();
                        });
                        
                    } else {
                        done();
                    }
                } else {
                    
                    /* this is by design if the user equips something they couldn't the app shouldn't assume a replacement unless it's via loadouts */
                    if (callback) callback(false, result);
                    else if (result && result.Message) {
                        $.toaster({
                            priority: 'info',
                            title: 'Error',
                            message: result.Message,
                            settings: {
                                timeout: tgd.defaults.toastTimeout
                            }
                        });
                    }
                    //TODO perhaps log this condition and determine the cause
                    else {
                        BootstrapDialog.alert(self.description + ":" + app.activeText().cannot_equip + (result && result.error) ? result.error : "");
                    }
                }
            });
        };
        var sourceCharacterId = self.characterId();
        
        if (targetCharacterId == sourceCharacterId) {
            
            /* if item is exotic */
            if (self.tierType == 6 && self.hasLifeExotic === false) {
                //
                var otherExoticFound = false,
                    otherBucketTypes = self.weaponIndex > -1 ? _.clone(tgd.DestinyWeaponPieces) : _.clone(tgd.DestinyArmorPieces);
                otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex, 1);
                //
                _.each(otherBucketTypes, function(bucketType) {
                    var otherExotic = _.filter(_.where(self.character.items(), {
                        bucketType: bucketType,
                        tierType: 6
                    }), function(item) {
                        return item.isEquipped();
                    });
                    //
                    if (otherExotic.length > 0) {
                        //
                        otherExoticFound = true;
                        otherExotic[0].unequip(done);
                    }
                });
                if (otherExoticFound === false) {
                    done();
                }
            } else {
                //
                done();
            }
        } else {
            
            self.store(targetCharacterId, function(newProfile) {
                
                self.character = newProfile;
                self.characterId(newProfile.id);
                self.equip(targetCharacterId, callback);
            });
        }
    },
    getStackAmount: function(stacks) {
        return _.reduce(stacks, function(memo, item) {
            memo = memo + item.primaryStat();
            return memo;
        }, 0);
    },
    adjustGenericItem: function(sourceCharacter, targetCharacter, amount, callback) {
        var self = this;
        var maxStackSize = this.maxStackSize;
        /* find the like items in the source and target characters */
        var sourceStacks = sourceCharacter.getSiblingStacks(self.description);
        var targetStacks = targetCharacter.getSiblingStacks(self.description);
        /* calculate the remainder in the source character */
        var sourceRemainder = Math.max(0, self.getStackAmount(sourceStacks) - amount);
        
        /* calculate the remainder in the target character */
        var targetItem = _.findWhere(targetCharacter.items(), {
            description: this.description
        });
        var amountInTarget = self.getStackAmount(targetStacks);
        var targetAmount = amount + amountInTarget;
        
        
        /* adjust the source character stack */
        if (sourceRemainder == 0) {
            
            _.each(sourceStacks, function(item) {
                sourceCharacter.items.remove(item);
            });
        } else if (sourceRemainder <= maxStackSize) {
            
            self.primaryStat(sourceRemainder);
            if (sourceStacks.length > 1) {
                _.each(sourceStacks, function(item, index) {
                    if (item != self) self.character.items.remove(item);
                });
            }
        } else {
            var totalItemsAmount = Math.ceil(sourceRemainder / maxStackSize),
                remainder = sourceRemainder;
            
            if (totalItemsAmount != sourceStacks.length) {
                if (totalItemsAmount > sourceStacks.length) {
                    /*need to add items */
                } else {
                    /* need to remove items */
                }
            }
            _.each(sourceStacks, function(item) {
                var itemAmount = remainder - maxStackSize > 0 ? maxStackSize : remainder;
                if (itemAmount > 0) {
                    
                    item.primaryStat(itemAmount);
                    remainder = remainder - itemAmount;
                } else {
                    
                    self.character.items.remove(item);
                }
            });
            
        }
        /* adjust the target character stack */
        if (targetAmount <= maxStackSize) {
            if (targetItem) {
                targetItem.primaryStat(targetAmount);
            } else {
                var theClone = self.clone();
                theClone.characterId(targetCharacter.id);
                theClone.character = targetCharacter;
                theClone.primaryStat(targetAmount);
                targetCharacter.items.push(theClone);
            }
        } else {
            var totalTargetStacks = Math.ceil(targetAmount / maxStackSize),
                missingItemsAmount = totalTargetStacks - targetStacks.length,
                remainder = amountInTarget == 0 ? targetAmount : targetAmount - ((totalTargetStacks - 1) * maxStackSize);
            
            _.each(targetStacks, function(item) {
                if (item.primaryStat() < maxStackSize) {
                    
                    item.primaryStat(maxStackSize);
                }
            });
            _.times(missingItemsAmount, function(index) {
                var itemAmount = remainder - maxStackSize > 0 ? maxStackSize : remainder;
                
                remainder = remainder - itemAmount;
                var theClone = self.clone();
                theClone.characterId(targetCharacter.id);
                theClone.character = targetCharacter;
                theClone.primaryStat(itemAmount);
                targetCharacter.items.push(theClone);
            });
            
        }
        callback();
        /*
        var existingItem = _.find(
        	_.where(y.items(), {
        		description: self.description
        	}),
        	function(i) {
        		return i.primaryStat() < i.maxStackSize;
        	});

        var theClone;
        var remainder = self.primaryStat() - amount;
        var isOverflow = (typeof existingItem == "undefined") ? false : ((existingItem.primaryStat() + amount) > existingItem.maxStackSize);
        

        var tmpAmount = 0;
        if (existingItem !== undefined) {
        	
        	tmpAmount = Math.min(existingItem.maxStackSize - existingItem.primaryStat(), amount);
        	
        	if (isOverflow) {
        		
        		// existing stack gets maxed
        		existingItem.primaryStat(existingItem.maxStackSize);
        		
        	} else {
        		
        	}
        } else {
        	
        }

        // grab self index in x.items
        //var idxSelf = x.items.indexOf(self);
        var idxSelf = _.indexOf(x.items(), _.findWhere(x.items(), {
        	id: self.id
        }));
        
        // remove self from x.items
        //THIS IS WHERE IT"S FUNAMENTALLY FLAWED
        x.items.remove(self);
        
        // if remainder, clone self and add clone to x.items in same place that self was with remainder as primaryStat
        if (remainder > 0) {
        	
        	theClone = self.clone();
        	theClone.characterId(sourceCharacterId);
        	theClone.character = x;
        	theClone.primaryStat(remainder);
        	x.items.splice(idxSelf, 0, theClone);
        	
        } else if (remainder < 0) {
        	
        	var sourceRemaining = (amount - self.primaryStat());
        	
        	var sourceExistingItems = _.where(x.items(), {
        		description: self.description
        	});
        	// handle weird cases when user has transferred more than a stacks worth. Bungie API allows this.
        	var sourceIdx = sourceExistingItems.length - 1;
        	while ((sourceRemaining > 0) && (sourceIdx >= 0)) {
        		var sourceRightMost = sourceExistingItems[sourceIdx];
        		var sourceTmpAmount = Math.min(sourceRemaining, sourceRightMost.primaryStat());
        		
        		sourceRightMost.primaryStat(sourceRightMost.primaryStat() - sourceTmpAmount);
        		if (sourceRightMost.primaryStat() <= 0) {
        			x.items.remove(sourceRightMost);
        			
        		}
        		sourceRemaining = sourceRemaining - sourceTmpAmount;
        		
        		sourceIdx = sourceIdx - 1;
        	}
        } else {
        	
        }
        var idxExistingItem;
        var newAmount;
        if (existingItem !== undefined) {
        	if (!isOverflow) {
        		// grab existingItem index in y.items
        		idxExisting = y.items.indexOf(existingItem);
        		// remove existingItem from y.items
        		y.items.remove(existingItem);
        		
        		// self becomes the swallowing stack @ y.items indexOf existingItem with (amount + existingItem.primaryStat())
        		newAmount = amount + existingItem.primaryStat();
        	} else {
        		newAmount = amount - tmpAmount;
        		
        	}
        } else {
        	newAmount = amount;
        	
        }
        self.characterId(targetCharacterId);
        self.character = y;
        self.primaryStat(newAmount);
        if (existingItem !== undefined) {
        	if (!isOverflow) {
        		y.items.splice(idxExisting, 0, self);
        		
        	} else {
        		y.items.push(self);
        		
        	}
        } else {
        	y.items.push(self);
        	
        }
        
        // visually split stuff if stacks transferred eceeded maxStackSize for that item
        if (newAmount > self.maxStackSize) {
        	
        	while (self.primaryStat() > self.maxStackSize) {
        		var extraAmount = self.primaryStat() - self.maxStackSize;
        		idxSelf = y.items.indexOf(self);
        		// put clone at self index keeping self to the 'right'
        		theClone = self.clone();
        		theClone.characterId(targetCharacterId);
        		theClone.character = y;
        		theClone.primaryStat(self.maxStackSize);
        		y.items.splice(idxSelf, 0, theClone);
        		
        		// adjust self value
        		self.primaryStat(extraAmount);
        	}
        }

        // clean up. if we've split a stack and have other stacks 'to the right' we need to join them shuffling values 'left'.
        if (remainder !== 0) {
        	
        	var selfExistingItems = _.where(x.items(), {
        		description: self.description
        	});
        	var idx = 0;
        	while (idx < selfExistingItems.length) {
        		if ((idx + 1) >= selfExistingItems.length) {
        			
        			break;
        		}

        		var cur = selfExistingItems[idx];
        		if (cur.primaryStat() < cur.maxStackSize) {
        			var next = selfExistingItems[idx + 1];
        			var howMuch = Math.min(cur.maxStackSize - cur.primaryStat(), next.primaryStat());
        			

        			cur.primaryStat(cur.primaryStat() + howMuch);
        			next.primaryStat(next.primaryStat() - howMuch);
        			if (next.primaryStat() <= 0) {
        				
        				x.items.remove(next);
        			}
        		}

        		idx = idx + 1;
        	}
        }
        */
    },
    transfer: function(sourceCharacterId, targetCharacterId, amount, cb) {
        //
        //
        var self = this,
            x, y, characters = app.characters();
        if (characters.length === 0) {
            /*ga('send', 'exception', {
                'exDescription': "No characters found to transfer with " + JSON.stringify(app.activeUser()),
                'exFatal': false,
                'appVersion': tgd.version,
                'hitCallback': function() {
                    
                }
            });*/
            app.refresh();
            return BootstrapDialog.alert("Attempted a transfer with no characters loaded, how is that possible? Please report this issue to my Github.");
        }

        var isVault = (targetCharacterId == "Vault");
        var ids = _.pluck(characters, 'id');
        x = characters[ids.indexOf(sourceCharacterId)];
        y = characters[ids.indexOf(targetCharacterId)];
        if (_.isUndefined(y)) {
            return app.refresh();
        }
        //This is a stop-gap measure because materials/consumables don't have the replacement tech built-in
        var itemsInDestination = _.where(y.items(), {
            bucketType: self.bucketType
        }).length;
        var maxBucketSize = self.bucketType in tgd.DestinyBucketSizes ? tgd.DestinyBucketSizes[self.bucketType] : 10;
        if (itemsInDestination == maxBucketSize && y.id != "Vault") {
            return BootstrapDialog.alert("Cannot transfer " + self.description + " because " + self.bucketType + " is full.");
        }
        //
        app.bungie.transfer(isVault ? sourceCharacterId : targetCharacterId, self._id, self.id, amount, isVault, function(e, result) {
            //
            //			
            if (result && result.Message && result.Message == "Ok") {
                if (self.bucketType == "Materials" || self.bucketType == "Consumables") {
                    self.adjustGenericItem(x, y, amount, function() {
                        cb(y, x);
                    });
                } else {
                    
                    /* remove the item where it came from after transferred by finding it's unique instance id */
                    x.items.remove(function(item) {
                        return item._id == self._id;
                    });
                    
                    /* update the references as to who this item belongs to */
                    self.character = y;
                    /* move this item to the target destination */
                    
                    y.items.push(self);
                    /* TODO: Fix the delayed characterId update */
                    setTimeout(function() {
                        self.characterId(targetCharacterId);
                        //not sure why this is nessecary but w/o it the xfers have a delay that cause free slot errors to show up
                        if (cb) cb(y, x);
                    }, 500);
                }
            } else if (cb) {
                
                
                cb(y, x, result);
            } else if (result && result.Message) {
                
                $.toaster({
                    priority: 'info',
                    title: 'Error',
                    message: result.Message,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        });
    },
    handleTransfer: function(targetCharacterId, cb) {
        var self = this;
        return function(y, x, result) {
            if (result && result.ErrorCode && (result.ErrorCode == 1656 || result.ErrorCode == 1623)) {
                
                /*var characterId = app.characters()[1].id;
				var instanceId = app.characters()[1].weapons()[0]._id;*/
                /*app.bungie.getAccountSummary(function(results) {
                    var characterIndex = _.findWhere(results.data.items, {
                        itemId: self._id
                    }).characterIndex;
                    if (characterIndex > -1) {
                        characterId = results.data.characters[characterIndex].characterBase.characterId;
                    } else {
                        characterId = "Vault";
                    }
                    
                    if (characterId != self.character.id) {
                        var character = _.findWhere(app.characters(), {
                            id: characterId
                        });
                        // handle refresh of other buckets
                        
                        if (characterId == targetCharacterId) {
                            
                            x.items.remove(self);
                            self.characterId = targetCharacterId
                            self.character = character;
                            character.items.push(self);
                            if (cb) cb(y, x);
                        } else {
                            
                            x._reloadBucket(self.bucketType, undefined, function() {
                                character._reloadBucket(self.bucketType, undefined, function() {
                                    
                                    //TODO move this function to a more general area for common use
                                    self.character.id = characterId;
                                    var newItem = Loadout.prototype.findReference(self);
                                    
                                    newItem.store(targetCharacterId, cb);
                                });
                            });
                        }
                    } else {*/
                x._reloadBucket(self.bucketType, undefined, function() {
                    y._reloadBucket(self.bucketType, undefined, function() {
                        
                        app.findReference(self, function(newItem) {
                            newItem.store(targetCharacterId, cb);
                        });
                    });
                });
                /*    }
                });*/
            } else if (result && result.ErrorCode && result.ErrorCode == 1642) {
                
                x._reloadBucket(self.bucketType, undefined, function() {
                    y._reloadBucket(self.bucketType, undefined, function() {
                        var adhoc = new tgd.Loadout();
                        if (self._id > 0) {
                            adhoc.addUniqueItem({
                                id: self._id,
                                bucketType: self.bucketType,
                                doEquip: false
                            });
                        } else {
                            adhoc.addGenericItem({
                                hash: self.id,
                                bucketType: self.bucketType,
                                characterId: self.characterId()
                            });
                        }
                        var msa = adhoc.transfer(targetCharacterId, true);
                        if (msa.length > 0)
                            
                        adhoc.swapItems(msa, targetCharacterId, function() {
                            if (cb) cb(y, x);
                        });
                    });
                });
            } else if (result && result.ErrorCode && result.ErrorCode == 1648) {
                //TODO: TypeError: 'undefined' is not an object (evaluating '_.findWhere(app.characters(), { id: "Vault" }).items')
                var vaultItems = _.findWhere(app.characters(), {
                    id: "Vault"
                }).items();
                var targetItem = _.where(vaultItems, {
                    id: self.id
                });
                if (targetItem.length > 0) {
                    targetItem[0].store(targetCharacterId, function() {
                        self.character.id = targetCharacterId;
                        self.store("Vault", cb);
                    });
                }
            } else if (cb) {
                cb(y, x);
            } else if (result && result.Message) {
                
                $.toaster({
                    priority: 'info',
                    title: 'Error',
                    message: result.Message,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        };
    },
    store: function(targetCharacterId, callback) {
        //
        var self = this;
        var sourceCharacterId = self.characterId(),
            defaultTransferAmount = 1;
        var done = function(transferAmount) {
            //
            if (targetCharacterId == "Vault") {
                //
                self.unequip(function(result) {
                    //
                    if (result === true) {
                        self.transfer(sourceCharacterId, "Vault", transferAmount, self.handleTransfer(targetCharacterId, callback));
                    } else {
                        if (callback) {
                            callback(self.character);
                        } else {
                            
                            $.toaster({
                                priority: 'danger',
                                title: 'Error',
                                message: "Unable to unequip " + self.description,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                    }
                });
            } else if (sourceCharacterId !== "Vault") {
                
                self.unequip(function(result) {
                    if (result === true) {
                        if (self.bucketType == "Subclasses") {
                            if (callback)
                                callback(self.character);
                        } else {
                            
                            self.transfer(sourceCharacterId, "Vault", transferAmount, self.handleTransfer(targetCharacterId, function() {
                                
                                if (self.character.id == targetCharacterId) {
                                    
                                    if (callback) callback(self.character);
                                } else {
                                    
                                    self.transfer("Vault", targetCharacterId, transferAmount, self.handleTransfer(targetCharacterId, callback));
                                }
                            }));
                        }
                    } else {
                        if (callback) {
                            callback(self.character);
                        } else {
                            
                            $.toaster({
                                priority: 'danger',
                                title: 'Error',
                                message: "Unable to unequip " + self.description,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                    }
                });
            } else {
                
                self.transfer("Vault", targetCharacterId, transferAmount, self.handleTransfer(targetCharacterId, callback));
            }
        };
        if (self.bucketType == "Materials" || self.bucketType == "Consumables") {
            if (self.primaryStat() == defaultTransferAmount) {
                done(defaultTransferAmount);
            } else if (app.autoXferStacks() === true || tgd.autoTransferStacks === true) {
                done(self.primaryStat());
            } else {
                var confirmTransfer = new tgd.transferConfirm(self, targetCharacterId, app.orderedCharacters, done);
                var defaultAction = function() {
                    confirmTransfer.finishTransfer(confirmTransfer.consolidate());
                };
                (new tgd.koDialog({
                    templateName: 'confirmTransferTemplate',
                    viewModel: confirmTransfer,
                    onFinish: defaultAction,
                    buttons: [{
                        label: app.activeText().transfer,
                        cssClass: 'btn-primary',
                        action: defaultAction
                    }, {
                        label: app.activeText().close_msg,
                        action: function(dialogItself) {
                            dialogItself.close();
                        }
                    }]
                })).title(app.activeText().transfer + " " + self.description).show(true, function() {}, function() {
                    $("input.materialsAmount").select();
                });
            }
        } else {
            var adhoc = new tgd.Loadout();
            adhoc.addUniqueItem({
                id: self._id,
                bucketType: self.bucketType,
                doEquip: false
            });
            var result = adhoc.transfer(targetCharacterId, true)[0];
            if (result && result.swapItem) {
                adhoc.promptUserConfirm([result], targetCharacterId, callback);
            } else {
                done(defaultTransferAmount);
            }
        }
    },
    normalize: function(characters) {
        app.normalizeSingle(this.description, characters, false, undefined);
    },
    consolidate: function(targetCharacterId, description, selectedCharacters) {
        //
        //
        var activeCharacters = (typeof selectedCharacters == "undefined") ? [] : selectedCharacters;
        var getNextStack = (function() {
            var i = 0;
            var chars = _.filter(app.orderedCharacters(), function(c) {
                return (c.id !== targetCharacterId && activeCharacters.length === 0) || (activeCharacters.indexOf(c.id) > -1);
            });
            var stacks = _.flatten(_.map(chars, function(c) {
                return _.filter(c.items(), {
                    description: description
                });
            }));
            return function() {
                return i >= stacks.length ? undefined : stacks[i++];
            };
        })();

        var nextTransfer = function(callback) {
            var theStack = getNextStack();

            if (typeof theStack == "undefined") {
                //
                if (callback !== undefined) {
                    callback();
                }
                return;
            }

            //transferAmount needs to be defined once and reused bc querying the primaryStat value mid-xfers results in merging qty amounts with existing stacks.
            var transferAmount = theStack.primaryStat();

            //

            if (targetCharacterId == "Vault") {
                theStack.transfer(theStack.character.id, "Vault", transferAmount, function() {
                    nextTransfer(callback);
                });
            } else if (theStack.character.id == "Vault") {
                theStack.transfer("Vault", targetCharacterId, transferAmount, function() {
                    nextTransfer(callback);
                });
            } else if (theStack.character.id == targetCharacterId) {
                nextTransfer(callback);
            } else {
                theStack.transfer(theStack.character.id, "Vault", transferAmount, function() {
                    theStack.transfer("Vault", targetCharacterId, transferAmount, function() {
                        nextTransfer(callback);
                    });
                });
            }
        };

        // kick off transfers
        nextTransfer(undefined);
    },
    showExtras: function() {
        var self = this;

        var extrasPopup = new tgd.extrasPopup(self);
        (new tgd.koDialog({
            templateName: 'normalizeTemplate',
            viewModel: extrasPopup,
            buttons: [{
                label: app.activeText().normalize,
                cssClass: 'btn-primary',
                action: function(dialogItself) {
                    var characters = extrasPopup.selectedCharacters();
                    if (characters.length <= 1) {
                        BootstrapDialog.alert("Need to select two or more characters.");
                        return;
                    }
                    self.normalize(characters);
                    dialogItself.close();
                }
            }, {
                label: app.activeText().consolidate,
                cssClass: 'btn-primary',
                action: function(dialogItself) {
                    var characters = _.pluck(extrasPopup.selectedCharacters(), 'id');
                    self.consolidate(self.character.id, self.description, characters);
                    dialogItself.close();
                }
            }, {
                label: app.activeText().close_msg,
                action: function(dialogItself) {
                    dialogItself.close();
                }
            }]
        })).title("Extras for " + self.description).show(true);
    },
    toggleLock: function() {
        var self = this;
        // have to use an actual character id and not the vault for lock/unlock
        var characterId = (self.characterId() == 'Vault') ? _.find(app.orderedCharacters(), function(c) {
            return c.id !== 'Vault';
        }).id : self.character.id;
        var newState = !self.locked();
        //

        app.bungie.setlockstate(characterId, self._id, newState, function(results, response) {
            if (response.ErrorCode !== 1) {
                return BootstrapDialog.alert("setlockstate error: " + JSON.stringify(response));
            } else {
                //
                self.locked(newState);
            }
        });
    },
    openInDestinyTracker: function() {
        window.open("http://db.destinytracker.com/items/" + this.id, tgd.openTabAs);
    },
    openInArmory: function() {
        window.open("https://www.bungie.net/en/armory/Detail?type=item&item=" + this.id, tgd.openTabAs);
    },
    openInDestinyDB: function() {
        window.open(this.href, tgd.openTabAs);
    },
    getValue: function(type) {
        var value;
        if (type == "Light") {
            value = this.primaryValues.Default;
        } else if (type == "MaxLightCSP") {
            value = this.primaryValues.MaxLightCSP;
        } else if (type == "MaxLightPercent") {
            value = this.maxLightPercent();
        } else if (type == "All") {
            value = this.primaryValues.CSP;
        } else if (_.isObject(this.stats) && type in this.stats) {
            value = parseInt(this.stats[type]);
        } else {
            value = 0;
        }
        return value;
    }
};function Profile(character) {
    var self = this;
    this.id = character.characterBase.characterId;
    this.order = ko.observable(character.index);
    this.icon = ko.observable("");
    this.gender = ko.observable("");
    this.classType = ko.observable("");
    this.level = ko.observable("");
    this.stats = ko.observable("");
    this.race = ko.observable("");
    this.percentToNextLevel = ko.observable("");
    this.background = ko.observable("");
    this.items = ko.observableArray()
        /*.extend({
                rateLimit: {
                    timeout: 500,
                    method: "notifyWhenChangesStop"
                }
            });*/
    this.activeBestSets = ko.observable();
    this.items.subscribe(_.throttle(app.redraw, 500));
    this.reloadingBucket = false;
    this.statsShowing = ko.observable(false);
    this.statsPane = ko.observable("info");
    this.weapons = ko.pureComputed(this._weapons, this);
    this.armor = ko.pureComputed(this._armor, this);
    this.general = ko.pureComputed(this._general, this);
    this.invisible = ko.pureComputed(this._invisible, this);
    this.lostItems = ko.pureComputed(this._lostItems, this);
    this.equippedGear = ko.pureComputed(this._equippedGear, this);
    this.equippedStats = ko.pureComputed(this._equippedStats, this);
    this.sumCSP = ko.pureComputed(this._sumCSP, this);
    this.equippedSP = ko.pureComputed(this._equippedSP, this);
    this.equippedTier = ko.pureComputed(this._equippedTier, this);
    this.potentialTier = ko.pureComputed(this._potentialTier, this);
    this.potentialCSP = ko.pureComputed(this._potentialCSP, this);
    this.powerLevel = ko.pureComputed(this._powerLevel, this);
    this.classLetter = ko.pureComputed(this._classLetter, this);
    this.uniqueName = ko.pureComputed(this._uniqueName, this);
    this.iconBG = ko.pureComputed(this._iconBG, this);
    this.container = ko.observable();
    this.reloadBucket = _.bind(this._reloadBucket, this);
    this.init(character);

    this.weapons.subscribe(app.addWeaponTypes);
    this.items.subscribe(app.addTierTypes);
    this.statsPane.subscribe(function(currentPane) {
        if (currentPane == "more" && _.isEmpty(self.activeBestSets())) {
            self.optimizeGear('Equipped')();
        }
    });
}

Profile.prototype = {
    init: function(profile) {
        var self = this;

        if (self.id == "Vault") {
            self.background(app.makeBackgroundUrl("assets/vault_emblem.jpg", true));
            self.icon("assets/vault_icon.jpg");
            self.gender("Tower");
            self.classType("Vault");
        } else {
            self.updateCharacter(profile);
        }

        self.addItems(profile.items, []);

        if (self.id != "Vault" && typeof profile.processed == "undefined") {
            self._reloadBucket(self, undefined, _.noop, true);
        }
    },
    setFarmTarget: function() {
        app.farmTarget(this.id);
    },
    updateCharacter: function(profile) {
        var self = this;
        if (profile && profile.processed) {
            self.background(profile.characterBase.background);
            self.icon(profile.characterBase.icon);
            self.gender(profile.characterBase.gender);
            self.classType(profile.characterBase.classType);
            self.level(profile.characterBase.level);
            self.stats(profile.characterBase.stats);
            self.race(profile.characterBase.race);
            self.percentToNextLevel(0);
        } else {
            self.background(app.makeBackgroundUrl(tgd.dataDir + profile.backgroundPath, true));
            self.icon(tgd.dataDir + profile.emblemPath);
            self.gender(tgd.DestinyGender[profile.characterBase.genderType]);
            self.classType(tgd.DestinyClass[profile.characterBase.classType]);
            self.level(profile.characterLevel);
            self.stats(profile.characterBase.stats);
            if (!("STAT_LIGHT" in self.stats()))
                self.stats()['STAT_LIGHT'] = 0;
            self.percentToNextLevel(profile.percentToNextLevel);
            self.race(_raceDefs[profile.characterBase.raceHash].raceName);
        }
    },
    refresh: function(profile, event) {
        
        var self = this;
        if (self.id == "Vault") {
            self._reloadBucket(self, event);
        } else {
            app.bungie.character(self.id, function(result) {
                if (result && result.data) {
                    self.updateCharacter(result.data);
                    self._reloadBucket(self, event);
                }
            });
        }
    },
    getBucketTypeHelper: function(item, info) {
        var self = this;
        if (typeof info == "undefined") {
            return "";
        } else if (item.location !== 4) {
            return tgd.DestinyBucketTypes[info.bucketTypeHash];
        } else if (item.isEquipment || tgd.lostItemsHelper.indexOf(item.itemHash) > -1 || (item.location == 4 && item.itemInstanceId > 0)) {
            return "Lost Items";
        } else if (tgd.invisibleItemsHelper.indexOf(item.itemHash) > -1) {
            return "Invisible";
        }
        return "Messages";
    },
    reloadBucketFilter: function(buckets) {
        var self = this;
        return function(item) {
            var info = {};
            if (item.itemHash in _itemDefs) {
                info = _itemDefs[item.itemHash];
            } else {
                /* Classified Items */
                info = {
                    bucketTypeHash: "1498876634",
                    itemName: "Classified",
                    tierTypeName: "Exotic",
                    icon: "/img/misc/missing_icon.png",
                    itemTypeName: "Classified"
                };
            }
            if (info && info.bucketTypeHash) {
                if (info.bucketTypeHash in tgd.DestinyBucketTypes) {
                    var itemBucketType = self.getBucketTypeHelper(item, info);
                    if (buckets.indexOf(itemBucketType) > -1) {
                        return true;
                    }
                }
                /*else {
					
				}*/
            }
        };
    },
    addItems: function(newItems, buckets) {
        var self = this;
        var newUniqueItems = _.filter(newItems, function(newItem) {
            return newItem.itemInstanceId > 0;
        });
        var newGenericItems = _.filter(newItems, function(item) {
            return item.itemInstanceId === "0";
        });
        var newGenericItemCounts = _.object(_.map(_.groupBy(newGenericItems, 'itemHash'), function(items, hash) {
            var info = _itemDefs[hash];
            return [parseInt(hash), {
                newQuantity: tgd.sum(_.pluck(items, 'stackSize')),
                maxStackSize: info.maxStackSize
            }];
        }));
        var currentItems = _.filter(self.items(), function(item) {
            return buckets.indexOf(item.bucketType) > -1 || buckets.length === 0;
        });
        var currentGenericItems = _.filter(currentItems, function(item) {
            return item._id == "0";
        });
        var currentGenericItemCounts = _.object(_.map(_.groupBy(currentGenericItems, 'id'), function(items, hash) {
            return [parseInt(hash), tgd.sum(_.pluck(items, 'stackSize'))];
        }));
        //
        var currentUniqueItems = _.filter(currentItems, function(item) {
            return item._id > 0;
        });
        /* Process Add/Remove/Update for Unique Items */
        _.each(currentUniqueItems, function(item) {
            var existingItem = _.first(_.filter(newUniqueItems, function(newItem) {
                return newItem.itemInstanceId == item._id;
            }));
            if (existingItem) {
                item.updateItem(existingItem);
            } else {
                self.items.remove(item);
            }
        });
        _.each(newUniqueItems, function(newItem) {
            var foundItem = _.filter(currentUniqueItems, function(item) {
                return newItem.itemInstanceId == item._id;
            });
            if (foundItem.length === 0) {
                var processedItem = new Item(newItem, self);
                if ("id" in processedItem) self.items.push(processedItem);
            }
        });
        /* Process Add/Remove/Update for Generic Items */
        _.each(newGenericItemCounts, function(info, hash) {
            var existingItems = _.filter(currentGenericItems, function(item) {
                return item.itemHash == hash;
            });
            if (existingItems.length > 0) {
                var currentQuantity = currentGenericItemCounts[hash];
                /* need to update (qty changed) add (more qty), remove (less qty) */
                if (currentQuantity != info.newQuantity) {
                    //
                    var newItem = _.findWhere(newGenericItems, {
                        itemHash: parseInt(hash)
                    });
                    if (info.newQuantity <= info.maxStackSize) {
                        //
                        if (existingItems.length > 1) {
                            //
                            _.each(existingItems, function(item, index) {
                                if (index > 0) self.items.remove(item);
                            });
                        }
                        existingItems[0].updateItem(newItem);
                    } else {
                        var missingItemsAmount = Math.ceil(info.newQuantity / info.maxStackSize) - existingItems.length,
                            remainder = info.newQuantity;
                        
                        _.times(missingItemsAmount, function(index) {
                            var newItm = _.clone(newItem);
                            newItm.stackSize = remainder % info.maxStackSize >= info.maxStackSize ? info.maxStackSize : remainder % info.maxStackSize;
                            
                            remainder = remainder - info.maxStackSize;
                            
                            var processedItem = new Item(newItm, self);
                            if ("id" in processedItem) self.items.push(processedItem);
                        });
                        _.each(existingItems, function(item, index) {
                            if (missingItemsAmount < 0 && index + 1 <= Math.abs(missingItemsAmount)) {
                                
                                self.items.remove(item);
                            } else {
                                //newItm.stackSize = (missingItemsAmount === 0 && index === 0) ? remainder : info.maxStackSize;
                                var newItm = _.clone(newItem);
                                remainder = remainder - (remainder - info.maxStackSize > 0 ? info.maxStackSize : remainder);
                                
                                newItem.stackSize = remainder;
                                item.updateItem(newItm);

                            }
                            //index 0 missingItemAmount 1 false
                            //index 1 missingItemAmount 1 false
                            //index 2 missingItemAmount 1 true


                            //index 0 missingItemAmount 2 false
                            //index 1 missingItemAmount 2 true
                            //index 2 missingItemAmount 2 true							
                        });
                    }
                }
            } else {
                var genericItemsToAdd = _.where(newGenericItems, {
                    itemHash: parseInt(hash)
                });
                _.each(genericItemsToAdd, function(newItem) {
                    var processedItem = new Item(newItem, self);
                    if ("id" in processedItem) self.items.push(processedItem);
                });
            }
        });
        /* loop over current items, check if it's not in newItems, delete it if so */
        _.each(currentGenericItems, function(item) {
            if (!_.has(newGenericItemCounts, item.itemHash)) {
                self.items.remove(item);
            }
        });
        //ensures maxLightPercent is recalculated if the item has been infused up
        app.cspToggle(!app.cspToggle());
    },
    reloadBucketHandler: function(buckets, done) {
        var self = this;
        return function(results, response) {
            if (results && results.data && results.data.buckets) {
                var newItems = _.filter(app.bungie.flattenItemArray(results.data.buckets), self.reloadBucketFilter(buckets));
                self.addItems(newItems, buckets);
                done();
            } else {
                if (results && results.ErrorCode && results.ErrorCode == 99) {
                    done();
                    return BootstrapDialog.alert(results.Message);
                } else {
                    done();
                    app.refresh();
                    return BootstrapDialog.alert("Code 20: " + app.activeText().error_loading_inventory + JSON.stringify(response));
                }
            }
        };
    },
    setPane: function(pane) {
        var self = this;
        return function() {
            self.statsPane(pane);
            return false;
        }
    },
    calculatePowerLevelWithItems: function(items) {
        if (items.length === 0) {
            return 0;
        }
        var index = _.filter(items, function(item) {
            return item.bucketType == "Artifact" && item.isEquipped() === true;
        }).length;
        var weights = tgd.DestinyBucketWeights[index];
        if (weights) {
            var eligibleGear = _.filter(items, function(item) {
                return item.bucketType in weights;
            });
            var primaryStatsGear = _.map(eligibleGear, function(item) {
                return item.primaryStatValue() * (weights[item.bucketType] / 100);
            });
            var powerLevel = Math.floor(tgd.sum(primaryStatsGear));
            return powerLevel;
        } else {
            return 0;
        }
    },
    getCooldown: function(tier, statHash) {
        var activeSubclass = this.itemEquipped("Subclasses").id;
        if (statHash === 144602215) { /* Intellect */
            if (tgd.subclassesSuperA.indexOf(activeSubclass) > -1) {
                return tgd.cooldownsSuperA[tier];
            } else {
                return tgd.cooldownsSuperB[tier];
            }
        } else if (statHash === 4244567218) { /* Strength */
            if (tgd.subclassesStrengthA.indexOf(activeSubclass) > -1) {
                return tgd.cooldownsMelee[tier];
            } else {
                return tgd.cooldownsGrenade[tier];
            }
        } else if (statHash === 1735777505) { /* Discipline */
            return tgd.cooldownsGrenade[tier];
        }
    },
    _equippedGear: function() {
        this.activeBestSets(null);
        return _.filter(this.items(), function(item) {
            return item.isEquipped();
        });
    },
    _equippedStats: function() {
        return tgd.joinStats(this.equippedGear());
    },
    _equippedSP: function() {
        return _.filter(this.equippedStats(), function(value, stat) {
            return _.where(tgd.DestinyArmorStats, {
                statName: stat
            }).length > 0;
        });
    },
    _sumCSP: function() {
        return tgd.sum(this.equippedSP());
    },
    _equippedTier: function() {
        var effectiveTier = tgd.sum(_.map(this.equippedSP(), function(value) {
            return Math.floor(value / tgd.DestinySkillTier);
        }));
        return effectiveTier;
    },
    _potentialTier: function() {
        return Math.floor(this.sumCSP() / tgd.DestinySkillTier);
    },
    _potentialCSP: function() {
        return tgd.sum(_.map(_.filter(this.equippedGear(), function(item) {
            return item.armorIndex > -1;
        }), function(item) {
            return item.getValue("MaxLightCSP");
        }));
    },
    _classLetter: function() {
        return this.classType()[0].toUpperCase();
    },
    _uniqueName: function() {
        return this.level() + " " + this.race() + " " + this.gender() + " " + this.classType();
    },
    _iconBG: function() {
        return app.makeBackgroundUrl(this.icon(), true);
    },
    _powerLevel: function() {
        if (this.id == "Vault") return "";
        return this.calculatePowerLevelWithItems(this.equippedGear());
    },
    _reloadBucket: function(model, event, callback, excludeMessage) {
        var self = this,
            element;
        if (self.reloadingBucket) {
            return;
        }

        if (!excludeMessage)
            $.toaster({
                priority: 'info',
                title: 'Success',
                message: 'Refreshing ' + self.uniqueName(),
                settings: {
                    timeout: tgd.defaults.toastTimeout
                }
            });

        var buckets = [];
        if (typeof model === 'string' || model instanceof String) {
            buckets.push(model);
        } else if (model instanceof tgd.Layout) {
            buckets.push.apply(buckets, model.bucketTypes);
        } else if (model instanceof Profile) {
            //TODO Investigate the implications of not using the extras property of layout to fix Ghost/Artifacts
            _.each(tgd.DestinyLayout, function(layout) {
                buckets.push.apply(buckets, layout.bucketTypes);
            });
            buckets.splice(buckets.indexOf("Invisible"), 1);
        }

        self.reloadingBucket = true;
        if (typeof event !== "undefined") {
            element = $(event.target).is(".fa") ? $(event.target) : $(event.target).find(".fa");
            if (element.is(".fa") === false) {
                element = $(event.target).is(".emblem") ? $(event.target) : $(event.target).find(".emblem");
                if (element.is(".emblem") === false) {
                    element = $(event.target).parent().find(".emblem");
                }
            }
            element.addClass("fa-spin");
        }

        var needsInvisibleRefresh = buckets.indexOf("Invisible") > -1;

        function done() {
            function reallyDone() {
                self.reloadingBucket = false;
                if (element) {
                    element.removeClass("fa-spin");
                }
                if (!excludeMessage)
                    $.toaster({
                        priority: 'info',
                        title: 'Success',
                        message: 'Refresh completed for ' + self.uniqueName(),
                        settings: {
                            timeout: tgd.defaults.toastTimeout
                        }
                    });
            }

            if (needsInvisibleRefresh) {
                app.bungie.account(function(results, response) {
                    if (results && results.data && results.data.inventory && results.data.inventory.buckets && results.data.inventory.buckets.Invisible) {
                        var invisible = results.data.inventory.buckets.Invisible;
                        invisible.forEach(function(b) {
                            b.items.forEach(function(item) {
                                self.items.push(new Item(item, self, true));
                            });
                        });
                        reallyDone();
                    } else {
                        reallyDone();
                        app.refresh();
                        return BootstrapDialog.alert("Code 40: " + app.activeText().error_loading_inventory + JSON.stringify(response));
                    }
                });
            } else {
                reallyDone();
            }
            if (callback)
                callback();
        }


        if (self.id == "Vault") {
            app.bungie.vault(self.reloadBucketHandler(buckets, done));
        } else {
            app.bungie.inventory(self.id, self.reloadBucketHandler(buckets, done));
        }
    },
    _weapons: function() {
        return _.filter(this.items(), function(item) {
            if (item.weaponIndex > -1)
                return item;
        });
    },
    _armor: function() {
        return _.filter(this.items(), function(item) {
            if (item.armorIndex > -1 && tgd.DestinyGeneralExceptions.indexOf(item.bucketType) == -1)
                return item;
        });
    },
    _general: function() {
        return _.filter(this.items(), function(item) {
            if ((item.armorIndex == -1 || tgd.DestinyGeneralExceptions.indexOf(item.bucketType) > -1) && item.weaponIndex == -1 && item.bucketType !== "Post Master" && item.bucketType !== "Messages" && item.bucketType !== "Invisible" && item.bucketType !== "Lost Items" && item.bucketType !== "Subclasses")
                return item;
        });
    },
    _invisible: function() {
        return _.filter(this.items(), function(item) {
            if (item.bucketType == "Invisible")
                return item;
        });
    },
    _lostItems: function() {
        return _.filter(this.items(), function(item) {
            if (item.bucketType == "Lost Items")
                return item;
        });
    },
    all: function(type) {
        var items = _.where(this.items(), {
            bucketType: type
        });
        var activeSort = parseInt(app.activeSort());
        /* Tier, Type */
        if (activeSort === 0) {
            items = _.sortBy(items, function(item) {
                return [item.tierType * -1, item.type];
            }).reverse();
        }
        /* Type */
        else if (activeSort === 1) {
            items = _.sortBy(items, function(item) {
                return item.type;
            });
        }
        /* Light */
        else if (activeSort === 2) {
            items = _.sortBy(items, function(item) {
                return item.primaryStatValue() * -1;
            });
        }
        /* Type, Light */
        else if (activeSort === 3) {
            items = _.sortBy(items, function(item) {
                return [item.type, item.primaryStatValue() * -1];
            });
        }
        /* Name */
        else if (activeSort === 4) {
            items = _.sortBy(items, function(item) {
                return item.description;
            });
        }
        /* Tier, Light */
        else if (activeSort === 5) {
            items = _.sortBy(items, function(item) {
                return [item.tierType * -1, item.primaryStatValue() * -1];
            }).reverse();
        }
        /* Tier, Name */
        else if (activeSort === 6) {
            items = _.sortBy(items, function(item) {
                return [item.tierType * -1, item.description * -1];
            }).reverse();
        }
        return items;
    },
    getSiblingStacks: function(description) {
        return _.where(this.items(), {
            description: description
        });
    },
    get: function(type) {
        return _.filter(this.all(type), function(item) {
            return item.isEquipped() === false;
        });
    },
    getVisible: function(type) {
        return _.filter(this.get(type), function(item) {
            return item.isVisible();
        });
    },
    itemEquipped: function(type) {
        return _.first(_.filter(this.items(), function(item) {
            return item.isEquipped() === true && item.bucketType == type;
        }));
    },
    itemEquippedVisible: function(type) {
        var ie = this.itemEquipped(type);
        return _.isEmpty(ie) ? false : ie.isVisible();
    },
    toggleStats: function() {
        this.statsShowing(!this.statsShowing());
    },
    queryVendorArmor: function(callback) {
        var self = this;
        /* Exotic Armor Blueprints (800), The Speaker (600), Iron Banner (100), Agent of the Nine (100) manually included */
        var additionalVendors = [3902439767, 2680694281, 242140165, 2796397637];
        var armorVendors = _.map(_.filter(_vendorDefs, function(vendor) {
                return [300, 400, 500].indexOf(vendor.summary.vendorSubcategoryHash) > -1 || additionalVendors.indexOf(vendor.summary.vendorHash) > -1;
            }), function(vendor) {
                return vendor.hash;
            }),
            armor = [],
            count = 0;
        var finish = function(vendorItems) {
            armor = armor.concat(vendorItems);
            count++;
            if (count == armorVendors.length) {
                
                var armorItems = _.sortBy(armor, function(item) {
                    return item.getValue("MaxLightPercent") * -1;
                });
                
                callback(armorItems);
            }
        };
        _.each(armorVendors, function(vendorId) {
            var vendorSummary = _vendorDefs[vendorId].summary;
            //
            app.bungie.getVendorData(self.id, vendorId, function(response) {
                var vendorItems = [];
                if (_.has(response.data, 'vendor')) {
                    vendorItems = _.reduce(response.data.vendor.saleItemCategories, function(memo, categories) {
                        var armor = _.filter(_.map(categories.saleItems, function(sItem) {
                            var tgdItem = new Item(sItem.item, self);
                            tgdItem._id = tgdItem.instanceId = tgdItem.itemHash.toString() + vendorSummary.vendorHash;
                            tgdItem.isVendor = true;
                            tgdItem.itemDescription = "<strong style='color: LawnGreen;'> Available at " + vendorSummary.vendorName + "</strong> <br> " + tgdItem.itemDescription;
                            return tgdItem;
                        }), function(item) {
                            return item.armorIndex > -1 && item.getValue("Light") >= 280 && (item.classType == 3 || _.has(tgd.DestinyClass, item.classType) && tgd.DestinyClass[item.classType] == item.character.classType());
                        });
                        memo = memo.concat(armor);
                        return memo;
                    }, []);
                }
                finish(vendorItems);
            });
        });
    },
    queryRolls: function(items, callback) {
        var count = 0;

        function done() {
            count++;
            if (items.length == count) {
                callback();
            }
        }

        function getRolls(item, callback) {
            app.bungie.getItemDetail(item.characterId(), item._id, function(detail) {
                item.rolls = _.reduce(detail.data.statsOnNodes, function(rolls, stat, key, stats) {
                    var index = _.keys(stats).indexOf(key);
                    _.each(stat.currentNodeStats, function(node) {
                        _.each(rolls, function(roll, rollIndex) {
                            var key = _statDefs[node.statHash].statName;
                            if (index === 0 || (index > 0 && rollIndex === 0))
                                roll[key] = (roll[key] || 0) + node.value;
                        });
                    });
                    _.each(stat.nextNodeStats, function(node) {
                        _.each(rolls, function(roll, rollIndex) {
                            var key = _statDefs[node.statHash].statName;
                            if (rollIndex === 1)
                                roll[key] = (roll[key] || 0) + node.value;
                        });
                    });
                    return rolls;
                }, [{}, {}]);
                window.localStorage.setItem("rolls_" + item._id, JSON.stringify(item.rolls));
                callback();
            });
        }
        _.each(items, function(item) {
            if (!item.rolls) {
                var cachedRolls = window.localStorage.getItem("rolls_" + item._id);
                if (cachedRolls) {
                    item.rolls = JSON.parse(cachedRolls);
                    if (tgd.sum(item.rolls[0]) != tgd.sum(item.stats)) {
                        //
                        getRolls(item, done);
                    } else {
                        done();
                    }
                } else {
                    if (_.keys(item.stats).length == 1) {
                        item.rolls = [item.stats];
                        done();
                    } else {
                        getRolls(item, done);
                    }
                }
            } else {
                done();
            }
        });
    },
    reduceMaxSkill: function(type, buckets, items) {
        var character = this;
        
        var fullSets = [];
        var alternatives = [];
        _.each(buckets, function(bucket) {
            candidates = _.filter(items, function(item) {
                return _.isObject(item.stats) && item.bucketType == bucket && item.equipRequiredLevel <= character.level() && item.canEquip === true && (
                    (item.classType != 3 && tgd.DestinyClass[item.classType] == character.classType()) || (item.classType === 3 && item.armorIndex > -1 && item.typeName.indexOf(character.classType()) > -1) || (item.weaponIndex > -1) || item.bucketType == "Ghost"
                );
            });
            
            _.each(candidates, function(candidate) {
                if (candidate.stats[type] > 0) {
                    //
                    fullSets.push([candidate]);
                } else {
                    alternatives.push([candidate]);
                }
            });
        });
        
        //
        var statAlternatives = _.flatten(fullSets);
        
        _.each(fullSets, function(set) {
            var mainItem = set[0];
            var currentStat = mainItem.stats[type];
            
            _.each(buckets, function(bucket) {
                if (bucket != mainItem.bucketType) {
                    if (currentStat < tgd.DestinySkillCap) {
                        candidates = _.filter(statAlternatives, function(item) {
                            return item.bucketType == bucket &&
                                ((item.tierType != 6 && mainItem.tierType == 6) || (mainItem.tierType != 6));
                        });
                        if (candidates.length > 0) {
                            primaryStats = _.map(candidates, function(item) {
                                return item.stats[type];
                            });
                            
                            var maxCandidateValue = _.max(primaryStats);
                            maxCandidate = candidates[primaryStats.indexOf(maxCandidateValue)];
                            var deltas = {};
                            _.each(candidates, function(candidate, index) {
                                
                                var delta = ((currentStat + candidate.stats[type]) - tgd.DestinySkillCap);
                                if (delta >= 0) {
                                    var allStatsSummed = ((currentStat + candidate.getValue("All")) - candidate.stats[type] - tgd.DestinySkillCap);
                                    if (allStatsSummed >= 0) {
                                        deltas[index] = allStatsSummed;
                                    }
                                }
                                //

                            });
                            var values = _.values(deltas),
                                keys = _.keys(deltas);
                            if (values.length > 0) {
                                maxCandidate = candidates[keys[values.indexOf(_.min(values))]];
                                
                            }
                            currentStat += maxCandidate.stats[type];
                            
                            set.push(maxCandidate);
                        }
                    } else {
                        
                        candidates = _.filter(alternatives, function(item) {
                            return item.bucketType == bucket;
                        });
                        if (candidates.length > 0) {
                            primaryStats = _.map(candidates, function(item) {
                                return item.getValue("All");
                            });
                            set.push(candidates[primaryStats.indexOf(_.max(primaryStats))]);
                        }
                    }
                }
            });
        });
        var availableSets = [];
        _.map(fullSets, function(set) {
            var sumSet = tgd.joinStats(set);
            if (sumSet[type] >= tgd.DestinySkillCap) {
                availableSets.push({
                    set: set,
                    sumSet: sumSet
                });
                
            }
        });
        var sumSetValues = _.sortBy(_.map(availableSets, function(combo) {
            var score = tgd.sum(_.map(combo.sumSet, function(value, key) {
                var result = Math.floor(value / tgd.DestinySkillTier);
                return result > 5 ? 5 : result;
            }));
            combo.sum = tgd.sum(_.values(combo.sumSet));
            var subScore = (combo.sum / 1000);
            combo.score = score + subScore;
            return combo;
        }), 'score');
        var highestSetObj = sumSetValues[sumSetValues.length - 1];
        return [highestSetObj.sum, highestSetObj.set];
    },
    findMaxLightSet: function(items, callback) {
        var buckets = [].concat(tgd.DestinyArmorPieces),
            groups = {},
            statGroups = {},
            highestArmorTier = 0,
            highestArmorValue = 0,
            highestTierValue = 0,
            character = this;

        _.each(buckets, function(bucket) {
            groups[bucket] = _.filter(items, function(item) {
                return item.bucketType == bucket && item.equipRequiredLevel <= character.level() && item.canEquip === true && (
                    (item.classType != 3 && tgd.DestinyClass[item.classType] == character.classType()) || (item.classType == 3 && item.armorIndex > -1 && item.typeName.indexOf(character.classType()) > -1) || (item.weaponIndex > -1) || item.bucketType == "Ghost"
                );
            });
            var csps = _.map(groups[bucket], function(item) {
                return item.getValue("MaxLightCSP");
            });
            statGroups[bucket] = {
                max: _.max(csps),
                min: _.min(csps)
            };
        });

        highestArmorValue = tgd.sum(_.map(statGroups, function(stat) {
            return stat.max;
        }));

        //
        //
        /*{
            return [key, stat.max];
        })));*/

        highestArmorTier = Math.floor(highestArmorValue / tgd.DestinySkillTier);
        //

        highestTierValue = highestArmorTier * tgd.DestinySkillTier;
        //

        groups = _.object(_.map(groups, function(items, bucketType) {
            var minCSP = highestTierValue - (highestArmorValue - statGroups[bucketType].max);
            var newItems = _.sortBy(_.filter(items, function(item) {
                return item.getValue("MaxLightCSP") >= minCSP;
            }), function(item) {
                return item.getValue("MaxLightCSP") * -1;
            });
            return [
                bucketType,
                newItems
            ];
        }));

        callback(groups);
    },
    findBestArmorSetV2: function(items, callback) {

        var buckets = [].concat(tgd.DestinyArmorPieces),
            sets = [],
            bestSets = [],
            backups = [],
            groups = {},
            candidates,
            statGroups = {},
            highestArmorTier = 0,
            highestArmorValue = 0,
            highestTierValue = 0,
            character = this;

        //
        tgd.showLoading(function() {
            _.each(buckets, function(bucket) {
                groups[bucket] = _.filter(items, function(item) {
                    return item.bucketType == bucket && item.equipRequiredLevel <= character.level() /*&& item.canEquip === true*/ && (
                        (item.classType != 3 && tgd.DestinyClass[item.classType] == character.classType()) || (item.classType == 3 && item.armorIndex > -1 && item.typeName.indexOf(character.classType()) > -1) || (item.weaponIndex > -1) || item.bucketType == "Ghost"
                    );
                });
                var csps = _.map(groups[bucket], function(item) {
                    return item.getValue("All");
                });
                statGroups[bucket] = {
                    max: _.max(csps),
                    min: _.min(csps)
                };
            });

            highestArmorValue = tgd.sum(_.map(statGroups, function(stat) {
                return stat.max;
            }));
            //

            highestArmorTier = Math.floor(highestArmorValue / tgd.DestinySkillTier);
            //

            highestTierValue = highestArmorTier * tgd.DestinySkillTier;
            //

            _.each(groups, function(items, bucketType) {
                var minCSP = highestTierValue - (highestArmorValue - statGroups[bucketType].max);
                //
                candidates = _.filter(items, function(item) {
                    return item.getValue("All") >= minCSP;
                });
                //
                _.each(candidates, function(candidate) {
                    sets.push([candidate]);
                });
            });

            backups = _.flatten(sets);
            //
            //character.queryRolls(backups, function() {
            _.each(sets, function(set) {
                var mainPiece = set[0];
                //instead of looping over each mainPiece it'll be the mainPiece.rolls array which will contain every combination
                var subSets = [
                    [mainPiece]
                ];
                candidates = _.groupBy(_.filter(backups, function(item) {
                    return item.bucketType != mainPiece.bucketType && ((item.tierType != 6 && mainPiece.tierType == 6) || (mainPiece.tierType != 6)) && mainPiece._id != item._id;
                }), 'bucketType');
                _.each(candidates, function(items) {
                    subSets.push(items);
                });
                subSets = _.map(subSets, function(selection) {
                    var choices = selection.rolls ? [selection] : selection;
                    var x = _.flatten(_.map(choices, function(item) {
                        return _.map(item.rolls, function(roll) {
                            var itemClone = _.clone(item);
                            itemClone.activeRoll = roll;
                            return itemClone;
                        });
                    }));
                    return x;
                });
                var combos = _.filter(tgd.cartesianProductOf(subSets), function(sets) {
                    var exoticItems = _.filter(sets, function(item) {
                        return item.tierType === 6 && item.hasLifeExotic === false;
                    });
                    return exoticItems.length < 2;
                });
                var scoredCombos = _.map(combos, function(items) {
                    var tmp = tgd.joinStats(items);
                    delete tmp["bonusOn"];
                    return {
                        set: items,
                        score: tgd.sum(_.map(tmp, function(value, key) {
                            var result = Math.floor(value / tgd.DestinySkillTier);
                            return result > 5 ? 5 : result;
                        })) + (tgd.sum(_.values(tmp)) / 1000)
                    };
                });
                var highestScore = Math.floor(_.max(_.pluck(scoredCombos, 'score')));
                _.each(scoredCombos, function(combo) {
                    if (combo.score >= highestScore) {
                        bestSets.push(combo);
                    }
                });
            });
            var highestFinalScore = Math.floor(_.max(_.pluck(bestSets, 'score')));
            var lastSets = [];
            _.each(bestSets, function(combo) {
                if (combo.score >= highestFinalScore) {
                    lastSets.push(combo);
                }
            });
            callback(_.sortBy(lastSets, 'score'));
        });

        // });

    },
    findHighestItemBy: function(type, buckets, items) {
        var character = this;
        var sets = [];
        var backups = [];
        var primaryStats = {};
        var candidates;

        _.each(buckets, function(bucket) {
            candidates = _.filter(items, function(item) {
                return item.bucketType == bucket && item.equipRequiredLevel <= character.level() && item.canEquip === true && ((item.classType != 3 && tgd.DestinyClass[item.classType] == character.classType()) || (item.classType == 3 && item.armorIndex > -1) || (item.weaponIndex > -1)) && ((type == "All" && item.armorIndex > -1) || type != "All");
            });
            //
            //
            _.each(candidates, function(candidate) {
                if (type == "Light" || type == "All" || (type != "Light" && candidate.stats[type] > 0)) {
                    (candidate.tierType == 6 && candidate.hasLifeExotic === false ? sets : backups)[candidate.isEquipped() ? "unshift" : "push"]([candidate]);
                }
            });
        });

        backups = _.flatten(backups);

        //
        //

        _.each(_.groupBy(_.flatten(sets), 'bucketType'), function(items, bucketType) {
            primaryStats[bucketType] = _.max(_.map(items, function(item) {
                return item.getValue(type);
            }));
        });

        _.each(backups, function(spare) {
            //if the user has no exotics the sets array is empty and primaryStats is an empty object therefore maxCandidate should be 0 and not undefined
            var maxCandidate = primaryStats[spare.bucketType] || 0;
            if (maxCandidate < spare.getValue(type)) {
                //
                sets.push([spare]);
            }
        });

        //
        //

        _.each(sets, function(set) {
            var main = set[0];
            //

            _.each(buckets, function(bucket) {
                if (bucket != main.bucketType) {
                    candidates = _.where(backups, {
                        bucketType: bucket
                    });
                    
                    //
                    if (candidates.length > 0) {
                        primaryStats = _.map(candidates, function(item) {
                            return item.getValue(type);
                        });
                        //
                        var maxCandidate = _.max(primaryStats);
                        var candidate = candidates[primaryStats.indexOf(maxCandidate)];
                        //
                        set.push(candidate);
                    }
                }
            });
        });
        var sumSets = _.map(sets, function(set) {
            return tgd.sum(_.map(set, function(item) {
                return item.getValue(type);
            }));
        });

        highestSetValue = _.max(sumSets);
        highestSet = _.sortBy(sets[sumSets.indexOf(highestSetValue)], function(item) {
            return item.tierType * -1;
        });
        return [highestSetValue, highestSet];
    },
    equipAction: function(type, highestSetValue, highestSet) {
        var character = this;

        $.toaster({
            priority: 'success',
            title: 'Result',
            message: " The highest set available for " + type + "  is  " + highestSetValue,
            settings: {
                timeout: 7 * 1000
            }
        });

        var count = 0;
        var done = function() {
            count++;
            if (count == highestSet.length) {
                var msa = adhoc.transfer(character.id, true);
                
                adhoc.swapItems(msa, character.id, function() {
                    $.toaster({
                        settings: {
                            timeout: 7 * 1000
                        },
                        priority: 'success',
                        title: 'Result',
                        message: " Completed equipping the highest " + type + " set at " + highestSetValue
                    });
                    character.statsShowing(false);
                });
            }
        };
        // abort;

        var adhoc = new tgd.Loadout();
        _.each(highestSet, function(candidate) {
            var itemEquipped = character.itemEquipped(candidate.bucketType);
            if (itemEquipped && itemEquipped._id && itemEquipped._id !== candidate._id) {
                var message;
                if ((type == "Light" && candidate.primaryStatValue() > itemEquipped.primaryStatValue()) || type != "Light") {
                    adhoc.addUniqueItem({
                        id: candidate._id,
                        bucketType: candidate.bucketType,
                        doEquip: true
                    });
                    message = candidate.bucketType + " can have a better item with " + candidate.description;
                    
                } else {
                    message = candidate.description + " skipped because the equipped item (" + itemEquipped.description + ") is equal or greater light";
                }
                $.toaster({
                    priority: 'info',
                    title: 'Equip',
                    message: message,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
                done();
            } else {
                done();
            }
        });
    },
    renderBestGroups: function(type, groups) {
        //
        var character = this;
        var armorSelection = new tgd.armorSelection(type, groups, character);
        tgd.activeArmorSelection = armorSelection;
        
        var defaultAction = function(dialog) {
            var firstSet = armorSelection.firstSet();
            if (firstSet) {
                armorSelection.saveSelectedCombo(firstSet);
                dialog.close();
            }
        };
        (new tgd.koDialog({
            templateName: 'maxLightTemplates',
            viewModel: armorSelection,
            onFinish: defaultAction,
            buttons: [{
                label: app.activeText().movepopup_equip,
                action: function(dialog) {
                    var firstSet = armorSelection.firstSet();
                    if (firstSet) {
                        armorSelection.equipSelectedCombo(firstSet);
                        dialog.close();
                    }
                }
            }, {
                label: app.activeText().loadouts_save,
                action: defaultAction
            }, {
                label: app.activeText().cancel,
                action: function(dialog) {
                    dialog.close();
                }
            }]
        })).title("Armor Builds for " + type).show(true, function() {
            groups = null;
        }, _.noop);
    },
    renderBestSets: function(type, bestSets) {
        var character = this,
            weaponsEquipped = _.filter(character.equippedGear(), function(item) {
                return item.weaponIndex > -1;
            }),
            weaponTypes = _.map(app.weaponTypes(), function(type) {
                return type.name.split(" ")[0];
            }).concat(tgd.DestinyWeaponPieces),
            highestTier = Math.floor(_.max(_.pluck(bestSets, 'score'))),
            armorBuilds = {},
            arrArmorBuilds = [];
        _.each(bestSets, function(combo) {
            if (combo.score >= highestTier) {
                var statTiers = "",
                    statValues = "",
                    stats = tgd.joinStats(combo.set),
                    sortedKeys = _.pluck(tgd.DestinyArmorStats, 'statName');
                combo.stats = [];
                _.each(sortedKeys, function(name) {
                    statTiers = statTiers + " <strong>" + name.substring(0, 3) + "</strong> T" + Math.floor(stats[name] / tgd.DestinySkillTier);
                    statValues = statValues + stats[name] + "/";
                    combo.stats.push(stats[name]);
                });
                combo.light = character.calculatePowerLevelWithItems(combo.set.concat(weaponsEquipped));
                combo.statTiers = $.trim(statTiers);
                combo.statValues = statValues.substring(0, statValues.length - 1);
                combo.statTierValues = _.map(sortedKeys, function(name) {
                    return Math.floor(stats[name] / tgd.DestinySkillTier);
                }).join("/");
                combo.perks = _.sortBy(_.filter(
                    _.flatten(
                        _.map(combo.set, function(item) {
                            return _.map(item.perks, function(perk) {
                                perk.bucketType = item.bucketType;
                                return perk;
                            });
                        })
                    ),
                    function(perk) {
                        return (perk.active === true && perk.bucketType != "Class Items" && _.intersection(weaponTypes, perk.name.split(" ")).length > 0) || (perk.active === true && perk.bucketType == "Helmet" && perk.isExclusive == -1 && perk.isInherent === false);
                    }
                ), 'name');
                combo.similarityScore = _.values(_.countBy(_.map(_.filter(combo.perks, function(perk) {
                    return perk.bucketType != "Class Items" && perk.bucketType != "Helmet";
                }), function(perk) {
                    return _.intersection(weaponTypes, perk.name.split(" "))[0];
                })));
                combo.similarityScore = (3 / combo.similarityScore.length) + tgd.sum(combo.similarityScore);
                combo.hash = _.pluck(_.sortBy(combo.set, 'bucketType'), '_id').join(",");
                combo.id = tgd.hashCode(combo.statTiers);
                if (!(combo.statTiers in armorBuilds)) {
                    armorBuilds[combo.statTiers] = [];
                }
                armorBuilds[combo.statTiers].push(combo);
            }
        });
        _.each(armorBuilds, function(statTiers, key) {
            var newTiers = _.reduce(statTiers, function(memo, combo) {
                if (!_.findWhere(memo, {
                        hash: combo.hash
                    }))
                    memo.push(combo);
                return memo;
            }, []);
            arrArmorBuilds.push(_.first(_.sortBy(newTiers, function(combo) {
                return [combo.similarityScore, combo.score];
            }).reverse(), 200));
        });
        //reset armorBuilds so it doesn't take up memory after it's been transformed into an array
        armorBuilds = {};

        arrArmorBuilds = _.sortBy(arrArmorBuilds, function(builds) {
            return _.max(_.pluck(builds, 'similarityScore')) * -1;
        });

        var renderTemplate = function(builds) {
            var _template = $(tgd.armorTemplates({
                builds: builds
            }));
            _template.find(".itemImage,.perkImage").bind("error", function() {
                tgd.imageErrorHandler(this.src.replace(location.origin, '').replace("www/", ""), this)();
            });
            return _template;
        };

        var assignBindingHandlers = function() {
            $("a.itemLink").each(function() {
                var element = $(this);
                var itemId = element.attr("itemId");
                var instanceId = element.attr("instanceId");
                element.click(false);
                Hammer(element[0], {
                    time: 2000
                }).on("tap", function(ev) {
                    $ZamTooltips.lastElement = element;
                    $ZamTooltips.show("destinydb", "items", itemId, element);
                }).on("press", function(ev) {
                    arrArmorBuilds = _.map(_.filter(arrArmorBuilds, function(sets) {
                        return _.filter(sets, function(combos) {
                            return _.pluck(combos.set, '_id').indexOf(instanceId) > -1;
                        }).length > 0;
                    }), function(sets) {
                        return _.filter(sets, function(combos) {
                            return _.pluck(combos.set, '_id').indexOf(instanceId) > -1;
                        });
                    });
                    armorTemplateDialog.content(renderTemplate(arrArmorBuilds));
                    setTimeout(assignBindingHandlers, 10);
                });
            });
            $(".prevCombo").bind("click", function() {
                var currentRow = $(this).parents(".row");
                var currentId = currentRow.attr("id");
                var newId = currentId.split("_")[0] + "_" + (parseInt(currentId.split("_")[1]) - 1);
                currentRow.hide();
                $("#" + newId).show();
            });
            $(".nextCombo").bind("click", function() {
                var currentRow = $(this).parents(".row");
                var currentId = currentRow.attr("id");
                var newId = currentId.split("_")[0] + "_" + (parseInt(currentId.split("_")[1]) + 1);
                currentRow.hide();
                $("#" + newId).show();
            });
        };

        //
        var $template = renderTemplate(arrArmorBuilds);

        var armorTemplateDialog = (new tgd.dialog({
            buttons: [{
                label: app.activeText().movepopup_equip,
                action: function(dialog) {
                    if ($("input.armorBuild:checked").length === 0) {
                        BootstrapDialog.alert("Error: Please select one armor build to equip.");
                    } else {
                        var selectedBuild = $("input.armorBuild:checked").val();
                        var selectedStatTier = selectedBuild.split("_")[0];
                        var selectedIndex = selectedBuild.split("_")[1];
                        highestCombo = _.filter(arrArmorBuilds, function(sets) {
                            return sets[0].statTiers == selectedStatTier;
                        })[0][selectedIndex];
                        character.equipAction(type, highestCombo.score.toFixed(3), highestCombo.set);
                        dialog.close();
                    }
                }
            }, {
                label: app.activeText().loadouts_save,
                action: function(dialog) {
                    if ($("input.armorBuild:checked").length === 0) {
                        BootstrapDialog.alert("Error: Please select one armor build to equip.");
                    } else {
                        var selectedBuild = $("input.armorBuild:checked").val();
                        var selectedStatTier = selectedBuild.split("_")[0];
                        var selectedIndex = selectedBuild.split("_")[1];
                        highestCombo = _.filter(arrArmorBuilds, function(sets) {
                            return sets[0].statTiers == selectedStatTier;
                        })[0][selectedIndex];
                        app.createLoadout();
                        var loadoutName = tgd.calculateLoadoutName(highestCombo);
                        app.activeLoadout().name(loadoutName);
                        _.each(highestCombo.set, function(item) {
                            var bonusOn = item.bonusStatOn();
                            if (item && item.activeRoll && item.activeRoll.bonusOn) {
                                bonusOn = item.activeRoll.bonusOn;
                            }
                            app.activeLoadout().addUniqueItem({
                                id: item._id,
                                bucketType: item.bucketType,
                                doEquip: true,
                                bonusOn: bonusOn
                            });
                        });
                        dialog.close();
                    }
                }
            }, {
                label: app.activeText().cancel,
                action: function(dialog) {
                    dialog.close();
                }
            }]
        })).title("Armor Build" + (arrArmorBuilds.length > 1 ? "s" : "") + " Found for Tier " + highestTier).content($template).show(true, function() {
            armorBuilds = null;
            arrArmorBuilds = null;
        }, function() {
            assignBindingHandlers();
        });
    },
    equipBest: function(type, armor, items) {
        var character = this;

        /* Only consider Armor within your own character, and all Ghosts anywhere */
        var activeItems = _.filter(items, function(item) {
            return item.armorIndex > -1 && item.primaryStat() > 3 && item.tierType >= 5 && item.isEquipment === true && (item.bucketType == "Ghost" || (item.bucketType !== "Ghost" && item.characterId() == character.id));
        });
        tgd.weaponTypes = _.map(app.weaponTypes(), function(type) {
            return type.name.split(" ")[0];
        }).concat(tgd.DestinyWeaponPieces);
        //
        if (type == "OptimizedBest") {
            /* Only consider the top 3 items sorted by CSP of the results provided */
            activeItems = _.reduce(_.groupBy(activeItems, 'bucketType'), function(memo, group) {
                var sortedItems = _.sortBy(group, function(item) {
                    return item.getValue("All") * -1;
                });
                memo = memo.concat(_.first(sortedItems, 3));
                return memo;
            }, []);
        }
        if (type == "Best" || type == "OptimizedBest") {
            character.findBestArmorSetV2(activeItems, function(sets) {
                character.renderBestSets(type, sets);
            });
        } else if (type == "MaxLight") {
            if (isMobile && confirm("Warning: This button analyzes all of your armor requiring a lot of processing power and might make the app unresponsive, are you sure you want to continue?") || !isMobile) {
                character.findMaxLightSet(activeItems, function(groups) {
                    character.renderBestGroups(type, groups);
                });
            }
        } else if (type == "Custom") {
            var groups = _.groupBy(activeItems, "bucketType");
            character.renderBestGroups(type, groups);
        }
    },
    viewCombo: function(combo) {
        var character = this;
        return function() {
            character.statsShowing(false);
            app.createLoadout();
            var loadoutName = tgd.calculateLoadoutName(combo);
            app.activeLoadout().name(loadoutName);
            _.each(combo.set, function(item) {
                app.activeLoadout().addUniqueItem({
                    id: item._id,
                    bucketType: item.bucketType,
                    doEquip: true,
                    bonusOn: item.activeRoll.bonusOn
                });
            });
        };
    },
    optimizeGear: function(type) {
        var character = this;
        return function() {
            //
            tgd.showLoading(function() {
                var armor = _.filter(character.equippedGear(), function(item) {
                    return item.armorIndex > -1 && ((type == "Equipped") || (type == "Minus Other" && tgd.DestinyOtherArmor.indexOf(item.bucketType) == -1));
                });
                var otherArmor = [];
                if (type == "Minus Other") {
                    /* query the other armor types and concat the armor array with the found items */
                    otherArmor = _.map(tgd.DestinyOtherArmor, function(bucketType) {
                        return _.where(character.items(), {
                            bucketType: bucketType
                        });
                    });
                    armor = armor.concat(otherArmor);
                }
                var otherArmorPieces = _.flatten(otherArmor).length;
                if (otherArmorPieces <= 12 && isMobile || otherArmorPieces >= 13 && isMobile && confirm("Warning: There are " + otherArmorPieces + " pieces of Artifacts, Class Items and Ghosts available, this operation is processing intensive and may make the app unresponsive, would you like to conitnue?") || !isMobile) {
                    var bestSets = tgd.calculateBestSets(armor, 'rolls');
                    //
                    character.activeBestSets(bestSets);
                }
            });
        };
    },
    equipHighest: function(type) {
        var character = this;
        return function() {
            if (character.id == "Vault") return;

            var armor = [].concat(tgd.DestinyArmorPieces);
            var weapons = tgd.DestinyWeaponPieces;
            var items = _.flatten(_.map(app.characters(), function(avatar) {
                return avatar.items();
            }));

            var highestSet;
            var highestSetValue;
            var bestArmorSets;
            var bestWeaponSets;

            if (type == "Best" || type == "OptimizedBest" || type == "MaxLight" || type == "Custom") {
                character.equipBest(type, armor, items);
            } else if (type == "Light") {
                bestArmorSets = character.findHighestItemBy("Light", armor, items)[1];
                //
                bestWeaponSets = character.findHighestItemBy("Light", weapons, items)[1];
                //
                highestSet = bestArmorSets.concat(bestWeaponSets);
                //
                highestSetValue = character.calculatePowerLevelWithItems(highestSet);
                character.equipAction(type, highestSetValue, highestSet);
            } else if (type == "All") {
                bestArmorSets = character.findHighestItemBy("All", armor, items);
                //
                highestSet = bestArmorSets[1];
                highestSetValue = bestArmorSets[0];
                character.equipAction(type, highestSetValue, highestSet);
            } else {
                bestArmorSets = character.findHighestItemBy(type, armor, items);
                if (bestArmorSets[0] < tgd.DestinySkillCap) {
                    highestSetValue = bestArmorSets[0];
                    highestSet = bestArmorSets[1];
                } else {
                    bestArmorSets = character.reduceMaxSkill(type, armor, items);
                    highestSetValue = bestArmorSets[0];
                    highestSet = bestArmorSets[1];
                }
                character.equipAction(type, highestSetValue, highestSet);
            }

        };
    }
};window.Hammer.Tap.prototype.defaults.threshold = 9;

var app = function() {
    var self = this;

    this.loadingUser = ko.observable(false);
    this.hiddenWindowOpen = ko.observable(false);
    this.loadoutMode = ko.observable(false);
    this.destinyDbMode = ko.observable(false);
    this.dynamicMode = ko.observable(false);
    this.viewOptionsEnabled = ko.observable(false);
    this.minAvgPercentNeeded = ko.observable(97);
    this.activeLoadout = ko.observable(new tgd.Loadout());
    this.loadouts = ko.observableArray();
    this.searchKeyword = ko.observable(tgd.defaults.searchKeyword);
    this.preferredSystem = ko.pureComputed(new tgd.StoreObj("preferredSystem"));
    this.appLocale = ko.pureComputed(new tgd.StoreObj("appLocale"));
    this.locale = ko.pureComputed(new tgd.StoreObj("locale"));
    this.layoutMode = ko.pureComputed(new tgd.StoreObj("layoutMode"));
    this.ccWidth = ko.pureComputed(new tgd.StoreObj("ccWidth"));
    this.vaultColumns = ko.pureComputed(new tgd.StoreObj("vaultColumns"));
    this.vaultWidth = ko.pureComputed(new tgd.StoreObj("vaultWidth"));
    this.vaultPos = ko.pureComputed(new tgd.StoreObj("vaultPos"));
    this.xsColumn = ko.pureComputed(new tgd.StoreObj("xsColumn"));
    this.smColumn = ko.pureComputed(new tgd.StoreObj("smColumn"));
    this.mdColumn = ko.pureComputed(new tgd.StoreObj("mdColumn"));
    this.lgColumn = ko.pureComputed(new tgd.StoreObj("lgColumn"));
    this.activeView = ko.pureComputed(new tgd.StoreObj("activeView"));
    this.activeSort = ko.pureComputed(new tgd.StoreObj("activeSort"));
    this.autoUpdates = ko.pureComputed(new tgd.StoreObj("autoUpdates", "true"));
    this.doRefresh = ko.pureComputed(new tgd.StoreObj("doRefresh", "true"));
    this.autoXferStacks = ko.pureComputed(new tgd.StoreObj("autoXferStacks", "true"));
    this.padBucketHeight = ko.pureComputed(new tgd.StoreObj("padBucketHeight", "true"));
    this.dragAndDrop = ko.pureComputed(new tgd.StoreObj("dragAndDrop", "true"));
    this.farmViewEnabled = ko.pureComputed(new tgd.StoreObj("farmViewEnabled", "true"));
    this.farmMode = ko.pureComputed(new tgd.StoreObj("farmMode", "true"));
    this.farmTarget = ko.pureComputed(new tgd.StoreObj("farmTarget"));
    this.farmItems = ko.observableArray(); //data-bind: checked requires an observeableArray
    this.farmItemCounts = ko.observable({});
    this.advancedTooltips = ko.pureComputed(new tgd.StoreObj("advancedTooltips", "true"));
    this.sectionsTemplate = ko.pureComputed(new tgd.StoreObj("sectionsTemplate"));
    this.tooltipsEnabled = ko.pureComputed(new tgd.StoreObj("tooltipsEnabled", "true", function(newValue) {
        $ZamTooltips.isEnabled = newValue;
    }));
    this.refreshSeconds = ko.pureComputed(new tgd.StoreObj("refreshSeconds"));
    this.tierFilter = ko.pureComputed(new tgd.StoreObj("tierFilter"));
    this.weaponFilter = ko.observable(tgd.defaults.weaponFilter);
    this.armorFilter = ko.observable(tgd.defaults.armorFilter);
    this.generalFilter = ko.observable(tgd.defaults.generalFilter);
    this.dmgFilter = ko.observableArray(tgd.defaults.dmgFilter);
    this.progressFilter = ko.observable(tgd.defaults.progressFilter);
    this.setFilter = ko.observableArray(tgd.defaults.setFilter);
    this.activeClasses = ko.observableArray(tgd.defaults.activeClasses);
    this.activeStats = ko.observableArray(tgd.defaults.activeStats);
    this.shareView = ko.observable(tgd.defaults.shareView);
    this.shareUrl = ko.observable(tgd.defaults.shareUrl);
    this.showMissing = ko.observable(tgd.defaults.showMissing);
    this.customFilter = ko.observable(tgd.defaults.customFilter);
    this.showDuplicate = ko.observable(tgd.defaults.showDuplicate);
    this.showArmorSC = ko.observable(tgd.defaults.showArmorSC);
    this.showArmorPerks = ko.observable(tgd.defaults.showArmorPerks);
    this.armorViewBy = ko.observable(tgd.defaults.armorViewBy);
    this.cspToggle = ko.observable(false);

    this.sortedLoadouts = ko.pureComputed(function() {
        return self.loadouts().sort(function(left, right) {
            return left.name == right.name ? 0 : (left.name < right.name ? -1 : 1);
        });
    });

    this.activeItem = ko.observable();
    this.activeUser = ko.observable({});
    this.allLayouts = ko.observableArray().extend({
        rateLimit: {
            timeout: 1000,
            method: "notifyWhenChangesStop"
        }
    });
    this.activeLayouts = ko.pureComputed(function() {
        return _.filter(self.allLayouts(), function(layout) {
            return (self.activeView() == layout.id || self.activeView() == "0");
        });
    });
    this.tierTypes = ko.observableArray();
    this.weaponTypes = ko.observableArray();
    this.characters = ko.observableArray().extend({
        rateLimit: {
            timeout: 1000,
            method: "notifyWhenChangesStop"
        }
    });
    this.orderedCharacters = ko.pureComputed(function() {
        return self.characters().sort(function(a, b) {
            return a.order() - b.order();
        });
    });
    this.currentLocale = ko.computed(function() {
        var locale = self.locale();
        if (self.appLocale() !== "") {
            locale = self.appLocale();
        }
        locale = _.findWhere(tgd.languages, {
            bungie_code: locale
        }).code || locale;
        return locale;
    });
    this.activeText = ko.pureComputed(function() {
        return tgd.locale[self.currentLocale()];
    });
    this.manageLoadouts = function() {
        var loadoutManager = new tgd.loadoutManager(self.loadouts);
        (new tgd.koDialog({
            templateName: 'manageLoadoutsTemplate',
            viewModel: loadoutManager,
            buttons: [{
                label: app.activeText().loadouts_save,
                action: function(dialog) {
                    if (confirm("Are you sure you want to save your changes?")) {
                        self.saveLoadouts(true);
                        dialog.close();
                    }
                }
            }, {
                label: app.activeText().cancel,
                action: function(dialog) {
                    dialog.close();
                }
            }]
        })).title(self.activeText().menu_loadouts_manage + " Loadouts").show(true);
    };
    this.createLoadout = function() {
        self.loadoutMode(true);
        self.activeLoadout(new tgd.Loadout());
    };
    this.cancelLoadout = function() {
        self.loadoutMode(false);
        self.dynamicMode(false);
        self.activeLoadout(new tgd.Loadout());
    };

    this.startMultiSelect = function() {
        self.dynamicMode(true);
        self.createLoadout();
    };

    this.showFarmHelp = function() {
        (new tgd.dialog()).title(self.activeText().menu_help + " for Farm Mode").content(tgd.farmhelpTemplate()).show();
    };

    this.showHelp = function() {
        self.toggleBootstrapMenu();
        (new tgd.dialog()).title(self.activeText().menu_help).content(tgd.helpTemplate()).show(true);
    };

    this.showSettings = function() {
        self.toggleBootstrapMenu();
        var settingsManager = new tgd.settingsManager({
            doRefresh: self.doRefresh,
            currentLocale: self.currentLocale,
            appLocale: self.appLocale,
            refreshSeconds: self.refreshSeconds,
            tooltipsEnabled: self.tooltipsEnabled,
            advancedTooltips: self.advancedTooltips,
            autoXferStacks: self.autoXferStacks,
            padBucketHeight: self.padBucketHeight,
            dragAndDrop: self.dragAndDrop,
            farmViewEnabled: self.farmViewEnabled,
            autoUpdates: self.autoUpdates,
            activeText: self.activeText
        });

        (new tgd.koDialog({
            viewModel: settingsManager,
            templateName: 'settingsTemplate',
            buttons: [{
                label: self.activeText().close_msg,
                action: function(dialogItself) {
                    dialogItself.close();
                }
            }]
        })).title(self.activeText().menu_settings).show(true);
    };

    this.handleGoogleResponse = function(data) {
        if (data && data.response) {
            if (data.response.errorType) {
                BootstrapDialog.alert("Error: " + data.response.errorType);
            } else if (data.response.orderId) {
                BootstrapDialog.alert("Donation accepted Ref# " + data.response.orderId);
            } else {
                BootstrapDialog.alert("Unknown error has occurred");
            }
        } else {
            BootstrapDialog.alert("No response returned");
        }
    };

    this.showDonate = function() {
        self.toggleBootstrapMenu();
        (new tgd.dialog()).title(self.activeText().donation_title).content(tgd.donateTemplate()).show(true, _.noop, function() {
            $("a.donatePaypal").click(function() {
                window.open("https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=XGW27FTAXSY62&lc=" + self.activeText().paypal_code + "&no_note=1&no_shipping=1&currency_code=USD", tgd.openTabAs);
                return false;
            });
            $("div.supportsIAB").toggle(isChrome === true || isAndroid === true || isIOS === true);
            $("div.chromeWallet").toggle(isChrome === true);
            $("div.googlePlay").toggle(isAndroid === true);
            $("div.appleIAP").toggle(isIOS === true);
            $("a.donate").bind("click", function() {
                if (isChrome && !isNWJS) {
                    google.payments.inapp.buy({
                        'parameters': {
                            'env': 'prod'
                        },
                        'sku': $(this).attr("sku"),
                        'success': self.handleGoogleResponse,
                        'failure': self.handleGoogleResponse
                    });
                } else if (isAndroid || isIOS) {
                    inappbilling.buy(
                        function() {
                            BootstrapDialog.alert("Donation accepted, thank you for your support");
                        },
                        _.noop,
                        $(this).attr("sku")
                    );
                }
            });
        });
    };

    this.showAbout = function() {
        self.toggleBootstrapMenu();
        (new tgd.dialog()).title(self.activeText().menu_about).content(tgd.aboutTemplate()).show();
    };

    this.clearFilters = function(model, element) {
        self.toggleBootstrapMenu();
        self.activeView(tgd.defaults.activeView);
        self.searchKeyword(tgd.defaults.searchKeyword);
        self.refreshSeconds(tgd.defaults.refreshSeconds);
        self.tierFilter(tgd.defaults.tierFilter);
        self.weaponFilter(tgd.defaults.weaponFilter);
        self.armorFilter(tgd.defaults.armorFilter);
        self.generalFilter(tgd.defaults.generalFilter);
        self.activeStats(tgd.defaults.activeStats);
        self.activeClasses(tgd.defaults.activeClasses);
        self.dmgFilter([]);
        self.progressFilter(tgd.defaults.progressFilter);
        self.setFilter([]);
        self.shareView(tgd.defaults.shareView);
        self.shareUrl(tgd.defaults.shareUrl);
        self.showMissing(tgd.defaults.showMissing);
        self.showDuplicate(tgd.defaults.showDuplicate);
        self.customFilter(tgd.defaults.customFilter);
        self.showArmorPerks(tgd.defaults.showArmorPerks);
        self.armorViewBy(tgd.defaults.armorViewBy);
        $(element.target).removeClass("active");
        return false;
    };

    this.renderCallback = function(context, content, element, callback) {
        if (element) lastElement = element;
        content = content.replace(/(<img\ssrc=")(.*?)("\s?>)/g, '');
        var instanceId = $(lastElement).attr("instanceId"),
            activeItem, query, $content = $("<div>" + content + "</div>");
        /*
        return callback($content.html());*/
        if (instanceId > 0) {
            query = {
                '_id': instanceId
            };
        } else {
            var id = $(lastElement).attr("href");
            query = {
                id: parseInt(id.split("/")[id.split("/").length - 1])
            };
        }
        self.characters().forEach(function(character) {
            var item = _.findWhere(character.items(), query);
            if (item) activeItem = item;
        });
        if (!activeItem && tgd && tgd.activeArmorSelection) {
            activeItem = _.reduce(tgd.activeArmorSelection.armorGroups(), function(memo, group) {
                var item = _.findWhere(group.items(), query);
                if (item) memo = item;
                return memo;
            }, undefined);
        }
        if (activeItem) {
            /* Title using locale */
            $content.find("h2.destt-has-icon").text(activeItem.description);
            /* Sub title for materials and consumables */
            if (tgd.DestinyGeneralItems["Glimmer Credit"].indexOf(activeItem.id) > -1) {
                $content.find("div.destt-info span").after(" valued at " + (activeItem.primaryStat() * 200) + "G");
            }
            /* Add Required Level if provided */
            if (activeItem.equipRequiredLevel) {
                var classType = (activeItem.classType == 3) ? '' : (' for  ' + tgd.DestinyClass[activeItem.classType]);
                $content.find(".destt-required-level").remove();
                $content.find(".destt-title").after('<span class="destt-info" style="float:right;">Required Level: <span>' + activeItem.equipRequiredLevel + classType + '</span></span>');
            }
            /* Type using locale */
            $content.find("h3.destt-has-icon").text(activeItem.typeName);
            /* Primary Stat and Stat Type */
            var primaryStatMin = $content.find(".destt-primary-min");
            if (primaryStatMin.length === 0 && (activeItem.armorIndex > -1 || activeItem.weaponIndex > -1) && activeItem.primaryStat() !== "") {
                var statType = (activeItem.armorIndex > -1) ? "DEFENSE" : "ATTACK";
                var statBlock = '<div class="destt-primary"><div class="destt-primary-min">' + activeItem.primaryStat() + '</div><div class="destt-primary-max destt-primary-no-max">' + statType + '</div></div>';
                $content.find(".destt-desc").before(statBlock);
            } else {
                primaryStatMin.html(activeItem.primaryStat());
                /* Description using locale */
            }
            $content.find(".destt-desc").html(activeItem.itemDescription);
            /* Remove Emblem Text */
            if ($content.find(".fhtt-emblem").length > 0) {
                $content.find("span").remove();
            }
            /* Add Emblem Icon */
            if ($content.find(".fhtt-emblem-icon").length > 0) {
                $content.find(".fhtt-emblem-icon").html($("<img>").attr("src", activeItem.icon));
            }
            /* Damage Colors */
            if ($content.find("[class*='destt-damage-color-']").length === 0 && activeItem.damageType > 1) {
                var burnIcon = $("<div></div>").addClass("destt-primary-damage-" + activeItem.damageType);
                $content.find(".destt-primary").addClass("destt-damage-color-" + activeItem.damageType).prepend(burnIcon);
            }
            /* Armor Stats */
            if (!_.isEmpty(activeItem.stats)) {
                var stats = $content.find(".destt-stat");
                if (stats.length === 0) {
                    $content.find(".destt-desc").after(tgd.statsTemplate({
                        stats: activeItem.stats
                    }));
                    stats = $content.find(".destt-stat");
                } else {
                    stats.html(tgd.statsTemplate({
                        stats: activeItem.stats
                    }));
                }
                var itemStats, itemDef = _itemDefs[activeItem.id];
                if (itemDef && itemDef.stats) {
                    itemStats = _.map(itemDef.stats, function(obj, key) {
                        obj.name = _statDefs[key].statName;
                        return obj;
                    });
                }
                var statBarElements = _.sortBy(stats.find(".stat-bar"), function(element) {
                    return _.pluck(tgd.DestinyArmorStats, 'statName').indexOf($.trim($(element).find(".stat-bar-label").text()));
                });
                stats.html(
                    $(statBarElements).map(function(index, stat) {
                        var $stat = $("<div>" + stat.outerHTML + "</div>"),
                            label = $stat.find(".stat-bar-label"),
                            labelText = $.trim(label.text());
                        if (labelText in activeItem.stats) {
                            var newLabelText, armoryLabelText, ddbLabelText;
                            //Rate Of Fire: 23 (23 is the Item's value)
                            label.text(labelText + ": " + activeItem.stats[labelText]);
                            //Look for Armory Stats
                            var statObj = _.findWhere(itemStats, {
                                name: labelText
                            });
                            if (statObj && statObj.minimum && statObj.maximum && statObj.minimum > 0 && statObj.maximum > 0) {
                                armoryLabelText = statObj.minimum + "/" + statObj.maximum;
                            } else {
                                armoryLabelText = "";
                            }
                            if ($stat.find(".stat-bar-static-value").css("display") == "block") {
                                ddbLabelText = $.trim($stat.find(".stat-bar-static-value").text().replace(/ /g, ''));
                                if ((ddbLabelText.indexOf("/") > -1 && ddbLabelText != armoryLabelText) || (ddbLabelText.indexOf("/") == -1 && ddbLabelText > 0 && armoryLabelText.split("/")[0] != ddbLabelText && armoryLabelText.split("/")[1] != ddbLabelText)) {
                                    newLabelText = "D:" + ddbLabelText + " A:" + armoryLabelText;
                                } else if (ddbLabelText.indexOf("/") == -1) {
                                    newLabelText = "Min/Max: " + armoryLabelText;
                                } else {
                                    newLabelText = "Min/Max: " + ddbLabelText;
                                }
                                $stat.find(".stat-bar-static-value").text(newLabelText);
                            } else {
                                ddbLabelText = $.trim($stat.find(".stat-bar-value").text().replace(/ /g, ''));
                                if (ddbLabelText.indexOf("/") > -1 && ddbLabelText != armoryLabelText) {
                                    newLabelText = "D:" + ddbLabelText + " A:" + armoryLabelText;
                                } else {
                                    newLabelText = "Min/Max: " + armoryLabelText;
                                }
                                $stat.find(".stat-bar-empty").html($("<div><div></div></div>").find("div").addClass("stat-bar-minmax").text(newLabelText).parent().html() + $stat.find(".stat-bar-empty").html());
                            }
                        }
                        return $stat.html();
                    }).get().join("")
                );
                //
                if (self.advancedTooltips() === true && itemStats) {
                    var magazineRow = stats.find(".stat-bar:last");
                    if (activeItem.weaponIndex > -1) {
                        var desireableStats = ["Aim assistance", "Equip Speed", "Recoil direction", "Inventory Size"];
                        _.each(desireableStats, function(statName) {
                            var statObj = _.findWhere(itemStats, {
                                name: statName
                            });
                            if (statObj) {
                                var clonedRow = magazineRow.clone();
                                var label = statObj.name;
                                if (statName == "Recoil direction")
                                    label = "Recoil";
                                else if (statName == "Aim assistance")
                                    label = "Aim Assist";
                                clonedRow.find(".stat-bar-label").html(label + ":" + statObj.value);
                                if (statObj.minimum > 0 && statObj.maximum > 0) {
                                    clonedRow.find(".stat-bar-static-value").html("Min/Max : " + statObj.minimum + "/" + statObj.maximum);
                                }
                                magazineRow.before(clonedRow);
                            }
                        });
                    } else if (activeItem.armorIndex > -1) {
                        var clonedRow = magazineRow.clone(),
                            statDetails;
                        if (activeItem.primaryStat() == 3) {
                            statDetails = _.pluck(activeItem.rolls, 'bonusOn').join(", ");
                            clonedRow.find(".stat-bar-label").html("Stat Roll : ");
                            clonedRow.find(".stat-bar-value, .stat-bar-empty").hide();
                            clonedRow.find(".stat-bar-static-value").show().html(statDetails);
                        } else {
                            var maxLightLevel = tgd.DestinyLightCap;
                            var isItemLeveled = activeItem.hasUnlockedStats;
                            var itemCSP = activeItem.getValue("All");
                            //
                            var maxBonusPoints = tgd.bonusStatPoints(activeItem.armorIndex, maxLightLevel);
                            //
                            var currentBonusPoints = tgd.bonusStatPoints(activeItem.armorIndex, activeItem.primaryValues.Default);
                            //
                            var currentBaseStat = itemCSP - (isItemLeveled ? currentBonusPoints : 0);
                            if (!isItemLeveled) {
                                itemCSP = itemCSP + "<span class='font-smaller-2'>(" + (itemCSP + currentBonusPoints) + ")</span>";
                            }
                            //
                            var maxBaseStat = activeItem.getValue("MaxLightCSP");
                            //
                            var maxStatRoll = tgd.DestinyMaxCSP[activeItem.bucketType];
                            //
                            var maxRollStats = (((currentBaseStat + maxBonusPoints) / maxStatRoll) * 100).toFixed(0) + "%";
                            var maxRollPercent = activeItem.maxLightPercent();
                            //
                            if (activeItem.tierType >= 5) {
                                maxRollStats = maxRollStats + "-" + maxRollPercent + "%";
                            }
                            //
                            statDetails = maxRollStats + " (" + maxBaseStat + "/" + maxStatRoll + ")";
                            //
                            clonedRow.find(".stat-bar-label").html("Stat Roll : " + itemCSP);
                            clonedRow.find(".stat-bar-value, .stat-bar-empty").hide();
                            if (activeItem.tierType >= 5) {
                                clonedRow.find(".stat-bar-static-value").addClass(activeItem.cspClass() + "Text");
                            }
                            clonedRow.find(".stat-bar-static-value").show().html(statDetails);
                        }
                        magazineRow.after(clonedRow);
                    }
                }
            }
            if (activeItem.perks.length > 0) {
                var activePerksTemplate = tgd.perksTemplate({
                    perks: _.filter(activeItem.perks, function(perk) {
                        var hasStat = _.has(perk, 'isStat');
                        return (perk.active === true && hasStat === false ||
                            (perk.active === false && self.advancedTooltips() === true && hasStat === false) ||
                            hasStat === true && perk.isStat === false) && perk.isVisible === true;
                    })
                });
                //TODO: Can't check bucketType bc a weapon might exist in Lost Items, need to use 'itemCategoryHashes' to be able to categorize items properly
                var weaponTypes = _.pluck(app.weaponTypes(), 'name');
                if (weaponTypes.indexOf(activeItem.typeName) > -1) {
                    // Weapon Perks (Pre-HoW) 
                    if ($content.find(".destt-talent").length == 1 && $content.find(".destt-talent-description").text().indexOf("Year 1")) {
                        $content.find(".destt-talent").replaceWith(activePerksTemplate);
                    }
                    // Weapon Perks (Post-HoW)
                    else if ($content.find(".destt-talent").length === 0) {
                        $content.find(".destt-stat").after(activePerksTemplate);
                    }
                } else if (activeItem.armorIndex > -1) {
                    // Armor Perks: this only applies to armor with existing perks
                    if ($content.find(".destt-talent").length > 0) {
                        $content.find(".destt-talent").replaceWith(activePerksTemplate);
                    }
                    // this applies to ghost shells, maybe re rollable armor
                    else {
                        $content.find(".destt-stat").after(activePerksTemplate);
                    }
                }
                $content.find("img").bind("error", function() {
                    var perkName = $(this).attr("data-name");
                    var src = _.findWhere(activeItem.perks, {
                        name: perkName
                    }).iconPath;
                    var element = $('img[data-name="' + perkName + '"]')[0];
                    tgd.imageErrorHandler(src, element)();
                });
            }
            if (activeItem.objectives && activeItem.objectives.length > 0) {
                _.each(activeItem.objectives, function(objective) {
                    var info = _objectiveDefs[objective.objectiveHash];
                    var label = "",
                        value = 0;
                    if (info && info.displayDescription) {
                        label = "<strong>" + info.displayDescription + "</strong>:";
                    }
                    if (info && info.completionValue) {
                        value = Math.floor((objective.progress / info.completionValue) * 100) + "% (" + objective.progress + '/' + info.completionValue + ')';
                    }
                    $content.find(".destt-desc").after(label + value + "<br>");
                });
            }
        }
        var width = $(window).width();
        //this fixes issue #35 makes destinydb tooltips fit on a mobile screen
        if (width < 340) {
            $content.find(".fhtt.des").css("width", (width - 15) + "px");
            $content.find(".stat-bar-empty").css("width", "125px");
        }
        callback($content.html());
    };

    this.toggleAutoUpdates = function() {
        self.toggleBootstrapMenu();
        self.autoUpdates(!self.autoUpdates());
        if (self.autoUpdates()) {
            tgd.checkUpdates();
        } else {
            localStorage.setItem("manifest", null);
            localStorage.setItem("last_update_files", null);
            tgd.loader.reset();
        }
    };

    this.toggleViewOptions = function() {
        self.toggleBootstrapMenu();
        self.viewOptionsEnabled(!self.viewOptionsEnabled());
        if (self.viewOptionsEnabled()) {
            $(".character").css("margin", 'auto');
            $(".character-box").css("position", 'relative');
        } else {
            $(".character").css("margin", '');
            $(".character-box").css("position", 'fixed');
        }
    };
    this.toggleRefresh = function() {
        self.toggleBootstrapMenu();
        self.doRefresh(!self.doRefresh());
    };
    this.togglePadBucketHeight = function() {
        self.toggleBootstrapMenu();
        self.padBucketHeight(!self.padBucketHeight());
        self.redraw();
    };
    this.toggleDragAndDrop = function() {
        self.toggleBootstrapMenu();
        self.dragAndDrop(!self.dragAndDrop());
        if (self.dragAndDrop() === true) {
            self.padBucketHeight(true);
            location.reload();
        }
    };
    this.toggleFarmMode = function() {
        self.farmViewEnabled(!self.farmViewEnabled());
    };
    this.toggleTransferStacks = function() {
        self.toggleBootstrapMenu();
        self.autoXferStacks(!self.autoXferStacks());
    };
    this.toggleDestinyDbMode = function() {
        self.toggleBootstrapMenu();
        self.destinyDbMode(!self.destinyDbMode());
    };
    this.toggleDestinyDbTooltips = function() {
        self.toggleBootstrapMenu();
        self.tooltipsEnabled(!self.tooltipsEnabled());
    };
    this.toggleAdvancedTooltips = function() {
        self.toggleBootstrapMenu();
        self.advancedTooltips(!self.advancedTooltips());
    };
    this.toggleShareView = function() {
        self.toggleBootstrapMenu();
        if (!self.shareView()) {
            var username = self.preferredSystem().toLowerCase() + "/" + self.bungie.gamertag();
            self.shareUrl(tgd.remoteServer + "/share/?" + username);
            self.apiRequest({
                action: "save_inventory",
                username: username,
                data: self.generateStatic()
            }, function() {
                self.shareView(!self.shareView());
            });
        }
    };
    this.toggleDuplicates = function(model, event) {
        self.toggleBootstrapMenu();
        self.showDuplicate(!self.showDuplicate());
        self.customFilter(self.showDuplicate());
        if (self.showDuplicate()) {
            var items = _.flatten(_.map(self.characters(), function(avatar) {
                return avatar.items();
            }));
            var ids = _.pluck(items, 'id');
            _.each(items, function(item) {
                var itemCount = _.filter(ids, function(id) {
                    return id == item.id;
                }).length;
                item.isFiltered(itemCount > 1);
            });
        }
    };
    this.toggleArmorPerks = function() {
        self.toggleBootstrapMenu();
        self.showArmorPerks(!self.showArmorPerks());
        self.customFilter(self.showArmorPerks());
        if (self.showArmorPerks()) {
            self.activeView(2);
            _.each(self.characters(), function(character) {
                var weaponsEquipped = _.filter(character.weapons(), function(item) {
                    return item.isEquipped();
                });
                var weaponTypes = _.map(weaponsEquipped, function(item) {
                    return item && item.typeName && item.typeName.split(" ")[0];
                });
                _.each(character.armor(), function(item) {
                    var itemPerks = _.pluck(item.perks, 'name');
                    var matches = _.filter(itemPerks, function(perk) {
                        return _.filter(perk.split(" "), function(name) {
                            return weaponTypes.indexOf(name) > -1;
                        }).length > 0;
                    });
                    item.isFiltered(matches.length > 0);
                });
            });
        }
    };
    this.toggleArmorSC = function() {
        self.toggleBootstrapMenu();
        self.showArmorSC(!self.showArmorSC());
        self.customFilter(self.showArmorSC());
        if (self.showArmorSC()) {
            self.activeView(2);
            _.each(self.characters(), function(character) {
                var damagedBasedSubclass = _.filter(character.items(), function(item) {
                    return item.bucketType.indexOf("Subclasses") > -1 && item.isEquipped() === true;
                });
                if (damagedBasedSubclass.length > 0) {
                    damagedBasedSubclass = damagedBasedSubclass[0].damageTypeName;
                    _.each(character.armor(), function(item) {
                        var itemPerks = _.pluck(item.perks, 'name');
                        var matches = _.filter(itemPerks, function(perk) {
                            return _.filter(perk.split(" "), function(name) {
                                return damagedBasedSubclass.indexOf(name) > -1;
                            }).length > 0;
                        });
                        item.isFiltered(matches.length > 0);
                    });
                }
            });
        }
    };

    this.toggleArmorClass = function() {
        var classType = this.toString();
        self.toggleBootstrapMenu();
        self.activeClasses[self.activeClasses().indexOf(classType) == -1 ? "push" : "remove"](classType);
        self.customFilter(self.activeClasses().length > 0);
        if (self.customFilter()) {
            self.activeView(2);
            var classTypeNums = _.map(self.activeClasses(), function(className) {
                return _.values(tgd.DestinyClass).indexOf(className);
            });
            _.each(self.characters(), function(character) {
                _.each(character.armor(), function(item) {
                    item.isFiltered(classTypeNums.indexOf(item.classType) > -1);
                });
            });
        }
    };
    this.toggleArmorStat = function() {
        var statType = this.toString();
        self.toggleBootstrapMenu();
        self.activeStats[self.activeStats().indexOf(statType) == -1 ? "push" : "remove"](statType);
        self.customFilter(self.activeStats().length > 0);
        if (self.customFilter()) {
            self.activeView(2);
            var activeStats = self.activeStats();
            _.each(self.characters(), function(character) {
                _.each(character.armor(), function(armor) {
                    var itemStats = _.reduce(armor.stats, function(memo, stat, name) {
                        if (stat > 0) memo.push(name);
                        return memo;
                    }, []);
                    var hasStats = (activeStats.length == 2) ? _.intersection(itemStats, activeStats).length == 2 : _.intersection(itemStats, activeStats).length > 0;
                    armor.isFiltered(hasStats);
                });
            });
        }
    };
    this.showArmorStat = function(statType) {
        return self.activeStats().indexOf(statType) > -1;
    };
    this.showArmorClass = function(classType) {
        return self.activeClasses().indexOf(classType) > -1;
    };
    this.toggleShowMissing = function() {
        self.toggleBootstrapMenu();
        if (self.setFilter().length === 0) {
            $.toaster({
                priority: 'danger',
                title: 'Warning',
                message: self.activeText().pick_a_set,
                settings: {
                    timeout: tgd.defaults.toastTimeout
                }
            });
        } else {
            self.showMissing(!self.showMissing());
        }
    };
    this.openStatusReport = function(type) {
        return function() {
            self.toggleBootstrapMenu();
            var sReportURL;
            var prefSystem = self.preferredSystem().toLowerCase();
            var info = self.bungie.systemIds[prefSystem];
            if (type === 1) {
                sReportURL = "http://destinystatus.com/" + prefSystem + "/" + info.id;
            } else if (type === 2) {
                sReportURL = "http://my.destinytrialsreport.com/" + (prefSystem == "xbl" ? "xbox" : "ps") + "/" + info.id;
            } else if (type === 3) {
                sReportURL = "http://destinytracker.com/destiny/player/" + (prefSystem == "xbl" ? "xbox" : "ps") + "/" + info.id;
            } else if (type === 4) {
                sReportURL = "http://guardian.gg/en/profile/" + info.type + "/" + info.id;
            }
            window.open(sReportURL, tgd.openTabAs);
            return false;
        };
    };
    this.setArmorView = function() {
        var type = this.toString();
        self.armorViewBy(type);
    };
    this.setVaultColumns = function() {
        var columns = this.toString();
        self.vaultColumns(columns);
        self.redraw();
    };
    this.setVaultWidth = function() {
        var width = this.toString();
        self.vaultWidth(width);
        self.redraw();
    };
    this.setCCWidth = function(model, evt) {
        var width = $(evt.target).text();
        width = (width == "Default") ? "" : width;
        self.ccWidth(width);
        self.redraw();
    };
    this._setSetFilter = function(collection) {
        self.toggleBootstrapMenu();
        if (collection in _collections || collection == "All") {
            if (collection == "Year 2 Items" || collection == "Year 1 Items") {
                _collections[collection] = _.pluck(_.filter(_.flatten(_.map(self.characters(), function(character) {
                    return character.items();
                })), function(item) {
                    if (collection == "Year 2 Items") {
                        return item.primaryStatValue() > tgd.DestinyY1Cap || _collections[collection].indexOf(item.id) > -1;
                    } else {
                        return item.primaryStatValue() <= tgd.DestinyY1Cap && _collections["Year 2 Items"].indexOf(item.id) == -1;
                    }

                }), 'id');
            }
            self.setFilter(collection == "All" ? [] : _collections[collection]);
            if (collection == "All") {
                self.showMissing(false);
            } else if (collection.indexOf("Weapons") > -1) {
                self.activeView(1);
                self.armorFilter(0);
                self.generalFilter(0);
            } else if (collection.indexOf("Armor") > -1) {
                self.activeView(2);
                self.weaponFilter(0);
                self.generalFilter(0);
            }
        } else {
            self.setFilter([]);
            self.showMissing(false);
        }
    };
    this.setSetFilter = function(collection) {
        return this._setSetFilter;
    };
    this.setViewFormat = function(model, event) {
        self.toggleBootstrapMenu();
        self.sectionsTemplate($(event.target).closest('li').attr("value"));
    };
    this.setSort = function(model, event) {
        self.toggleBootstrapMenu();
        self.activeSort($(event.target).closest('li').attr("value"));
    };
    this.setView = function(model, event) {
        self.toggleBootstrapMenu();
        self.activeView($(event.target).closest('li').attr("value"));
    };
    this.setDmgFilter = function() {
        self.toggleBootstrapMenu();
        var dmgType = this.toString();
        if (self.dmgFilter.indexOf(dmgType) == -1) {
            self.dmgFilter.push(dmgType);
        } else {
            self.dmgFilter.remove(dmgType);
        }
    };
    this.setTierFilter = function() {
        var tier = this.toString();
        self.toggleBootstrapMenu();
        self.tierFilter(tier);
    };
    this.setWeaponFilter = function(weaponType) {
        return function() {
            self.toggleBootstrapMenu();
            self.activeView(1);
            var type = weaponType.name;
            
            self.weaponFilter(type);
        };
    };
    this._setArmorFilter = function() {
        self.toggleBootstrapMenu();
        self.activeView(2);
        var armorType = this;
        
        self.armorFilter(armorType);
    };
    this.setArmorFilter = function(armorType) {
        return this._setArmorFilter.bind(armorType);
    };
    this.setGeneralFilter = function() {
        var searchType = this.toString();
        self.toggleBootstrapMenu();
        if (searchType != "Engrams") self.activeView(3);
        self.generalFilter(searchType);
    };
    this.setProgressFilter = function(model, event) {
        self.toggleBootstrapMenu();
        self.progressFilter($(event.target).closest('li').attr("value"));
    };
    this.missingSets = ko.pureComputed(function() {
        var allItemNames = _.pluck(_.flatten(_.map(self.characters(), function(character) {
            return character.items();
        })), 'description');
        var armorFilter = ko.unwrap(self.armorFilter);
        var weaponFilter = ko.unwrap(self.weaponFilter);
        var missingIds = _.filter(self.setFilter(), function(id) {
            var isMissing = true;
            var isVisible = false;
            if (id in _itemDefs) {
                var info = _itemDefs[id];
                var description = decodeURIComponent(info.itemName);
                isMissing = allItemNames.indexOf(description) == -1;
                if (info.bucketTypeHash in tgd.DestinyBucketTypes) {
                    var bucketType = tgd.DestinyBucketTypes[info.bucketTypeHash];
                    var typeName = decodeURIComponent(info.itemTypeName);
                    isVisible = (self.armorFilter() === 0 || armorFilter == bucketType) && (self.weaponFilter() === 0 || weaponFilter == typeName);
                }
            }
            return isMissing && isVisible;
        });
        return missingIds;
    });

    this.addWeaponTypes = function(weapons) {
        weapons.forEach(function(item) {
            if (item.isEquipment === true && item.type > 1 && _.where(self.weaponTypes(), {
                    name: item.typeName
                }).length === 0) {
                self.weaponTypes.push({
                    name: item.typeName,
                    type: item.type
                });
            }
        });
    };


    this.addTierTypes = function(items) {
        items.forEach(function(item) {
            if (item.tierTypeName && item.tierType > 0 && _.where(self.tierTypes(), {
                    name: item.tierTypeName
                }).length === 0) {
                self.tierTypes.push({
                    name: item.tierTypeName,
                    tier: item.tierType
                });
            }
        });
    };

    this.makeBackgroundUrl = function(path, excludeDomain) {
        return 'url("' + (excludeDomain ? "" : self.bungie.getUrl()) + path + '")';
    };

    this.hasBothAccounts = function() {
        return !_.isEmpty(self.activeUser().psnId) && !_.isEmpty(self.activeUser().gamerTag);
    };

    this.useXboxAccount = function() {
        self.toggleBootstrapMenu();
        self.preferredSystem("XBL");
        self.characters.removeAll();
        self.loadingUser(true);
        self.search();
    };

    this.usePlaystationAccount = function() {
        self.toggleBootstrapMenu();
        self.preferredSystem("PSN");
        self.characters.removeAll();
        self.loadingUser(true);
        self.search();
    };

    this.redraw = function() {
        setTimeout(self.bucketSizeHandler, 1000);
        setTimeout(self.quickIconHighlighter, 1000);
    };

    var loadingData = false;
    this.search = function() {
        
        if (!("user" in self.activeUser())) {
            return;
        }
        if (loadingData === true) {
            return;
        }
        loadingData = true;
        var total = 0,
            count = 0,
            profiles = [];

        function done(profile) {
            profiles.push(profile);
            count++;
            if (count == total) {
                self.characters(profiles);
                self.tierTypes.sort(function(a, b) {
                    return a.tier - b.tier;
                });
                self.weaponTypes.sort(function(a, b) {
                    if (a.name > b.name) {
                        return 1;
                    }
                    if (a.name < b.name) {
                        return -1;
                    }
                    return 0;
                });
                loadingData = false;
                self.loadingUser(false);
                $ZamTooltips.init();
                setTimeout(function() {
                    self.loadLoadouts();
                }, 10000);
                self.farmModeHandler(self.farmMode());
                
            }
        }
        self.bungie.search(self.preferredSystem(), function(e) {
            if (e && e.error || !e) {
                loadingData = false;
                self.loadingUser(false);
                /* if the first account fails retry the next one*/
                self.preferredSystem(self.preferredSystem() == "PSN" ? "XBL" : "PSN");
                self.search();
                return;
            } else if (typeof e.data == "undefined") {
                if (e && typeof e.Message != "undefined") {
                    return BootstrapDialog.alert(e.Message);
                } else {
                    return BootstrapDialog.alert("Code 10: " + self.activeText().error_loading_inventory + JSON.stringify(e));
                }
            }
            var avatars = e.data.characters;
            var characterIds = _.sortBy(_.map(avatars, function(character) {
                return character.characterBase.characterId;
            }));
            var items = self.bungie.flattenItemArray(e.data.inventory.buckets);
            var vaultItems = _.where(items, function(item) {
                    return item.bucketName != "Invisible";
                }),
                globalItems = _.where(items, {
                    bucketName: "Invisible"
                });
            _.each(avatars, function(avatar) {
                avatar.index = characterIds.indexOf(avatar.characterBase.characterId) + 1;
                avatar.items = globalItems;
            });
            avatars.push({
                characterBase: {
                    characterId: "Vault"
                },
                items: vaultItems,
                index: parseInt(self.vaultPos())
            });
            total = avatars.length;
            _.map(avatars, function(avatar) {
                var profile = new Profile(avatar);
                done(profile);
            });
        });
    };

    this.loadData = function(ref) {
        if (self.loadingUser() === false || self.hiddenWindowOpen() === true) {
            //window.t = (new Date());
            self.loadingUser(true);
            self.bungie = new tgd.bungie(self.bungie_cookies, function() {
                self.characters.removeAll();
                //
                self.bungie.user(function(user) {
                    //
                    if (user.error) {
                        if (user.error == 'network error:502') {
                            return self.logout();
                        }
                        if (isMobile) {
                            //login failed the first time, cookie might need to be refreshed
                            //openHiddenBungieWindow will open Bungie, read the cookie and try it a second time 
                            if (self.hiddenWindowOpen() === false) {
                                self.hiddenWindowOpen(true);
                                self.openHiddenBungieWindow();
                            } else {
                                //after re-reading the cookie it still didn't work so resetting login state
                                self.activeUser(user);
                                self.loadingUser(false);
                                self.hiddenWindowOpen(false);
                                window.localStorage.setItem("bungie_cookies", "");
                            }
                        } else {
                            self.activeUser(user);
                            self.loadingUser(false);
                        }
                        return;
                    }
                    if (ref && ref.close) {
                        ref.close();
                        self.hiddenWindowOpen(false);
                        ref = null;
                    }
                    self.activeUser(user);
                    if (user.psnId && user.gamerTag) {
                        $.toaster({
                            settings: {
                                timeout: 10 * 1000
                            },
                            priority: 'info',
                            title: 'Info',
                            message: "Currently using " + self.preferredSystem() + ", <br><a href='' id='useOtherAccount'>click here to use " + (self.preferredSystem() == "XBL" ? "PSN" : "XBL") + "</a>"
                        });
                        $("#useOtherAccount").click(function() {
                            if (self.preferredSystem() == "XBL") {
                                self.usePlaystationAccount();
                            } else {
                                self.useXboxAccount();
                            }
                        });
                    }
                    self.locale(self.activeUser().user.locale);
                    self.loadingUser(false);
                    _.defer(function() {
                        self.search();
                    });
                });
            });
        }
    };

    this.toggleBootstrapMenu = function() {
        if ($(".navbar-toggle").is(":visible"))
            $(".navbar-toggle").click();
    };

    this.refreshButton = function() {
        self.toggleBootstrapMenu();
        self.refresh();
    };

    this.logout = function() {
        self.clearCookies();
        self.bungie.logout(function() {
            window.location.reload();
        });
    };

    this.refresh = function() {
        if (self.bungie.gamertag()) {
            var count = 0,
                finish = function() {
                    count++;
                    if (count == self.characters().length) {
                        $.toaster({
                            priority: 'success',
                            title: 'Success',
                            message: "All the inventory has been updated.",
                            settings: {
                                timeout: tgd.defaults.toastTimeout
                            }
                        });
                    }
                };
            self.bungie.account(function(result) {
                if (result && result.data && result.data.characters) {
                    var characters = result.data.characters;
                    _.each(self.characters(), function(character) {
                        if (character.id != "Vault") {
                            var result = _.filter(characters, function(avatar) {
                                return avatar.characterBase.characterId == character.id;
                            })[0];
                            character.updateCharacter(result);
                        }
                        character._reloadBucket(character, undefined, finish, true);
                    });
                } else {
                    
                }
            });
        }
    };

    this.refreshHandler = function() {
        clearInterval(self.refreshInterval);
        if (self.loadoutMode() === true) {
            if (self.dynamicMode() === false) {
                self.toggleBootstrapMenu();
            }
            $("body").css("padding-bottom", "260px");
        } else {
            $("body").css("padding-bottom", "80px");
        }
        if (self.doRefresh() === true && self.loadoutMode() === false) {
            
            self.refreshInterval = setInterval(function() {
                
                self.refresh();
                tgd.autoRefreshTime = (new Date()).getTime();
            }, self.refreshSeconds() * 1000);
        }
    };

    this.bucketSizeHandler = function() {
        var buckets = $("div.profile .itemBucket:visible").css({
            'height': 'auto',
            'min-height': 'auto'
        });
        if (self.padBucketHeight() === true) {
            var bucketSizes = {};
            var itemHeight = 0;
            var vaultPos = parseInt(self.vaultPos()) - 1;
            vaultPos = (vaultPos < 0) ? 0 : vaultPos;
            var vaultColumns = tgd.bootstrapGridColumns / self.vaultColumns();
            buckets.each(function() {
                var bucketType = this.className.split(" ")[2];
                var isVault = this.className.indexOf("Vault") > -1;
                var columnsPerBucket = isVault ? vaultColumns : tgd.DestinyBucketColumns[bucketType];
                var $visibleBucketItems = $(this).find(".bucket-item:visible");
                var visibleBucketHeight = $visibleBucketItems.eq(0).height();
                var bucketHeight = Math.ceil($visibleBucketItems.length / columnsPerBucket) * (visibleBucketHeight + 2);
                if ((visibleBucketHeight) && (visibleBucketHeight > itemHeight) && !isVault) {
                    itemHeight = visibleBucketHeight;
                }
                if (!(bucketType in bucketSizes)) {
                    bucketSizes[bucketType] = [bucketHeight];
                } else {
                    bucketSizes[bucketType].push(bucketHeight);
                }
            });
            //
            _.each(bucketSizes, function(sizes, type) {
                //this is the max height all buckets will use
                var maxHeight = _.max(sizes);
                //this is the max height the non-vault characters will use
                var profileSizes = sizes.slice(0);
                profileSizes.splice(vaultPos, 1);
                var maxProfilesHeight = _.max(profileSizes);
                var minNumRows = 3;
                if (type == "Bounties") {
                    minNumRows = 4;
                } else if (tgd.DestinyFiveRowBuckets.indexOf(type) > -1) {
                    minNumRows = 5;
                }
                maxProfilesHeight = Math.max(itemHeight * minNumRows, maxProfilesHeight);
                var itemBuckets = buckets.filter("." + type);
                /*if ( type == "Heavy") {
                	
                	
                }*/
                itemBuckets.css("min-height", maxHeight);
                itemBuckets.find(".itemBucketBG").css("height", maxProfilesHeight);
                //itemBuckets.find(".itemBucketBG").parent().parent().css("height", maxProfilesHeight);
            });
            // gets all the sub class areas and makes them the same heights. I'm terrible at JQuery/CSS/HTML stuff.
            var vaultSubClass = $('div.profile .title2:visible strong:contains("Vault Sub")').parent().parent().css("height", "auto");
            var notVaultSubClass = $('div.profile .title2:visible strong:contains("Sub")').not(':contains("Vault")').first().parent().parent().css("height", "auto");
            vaultSubClass.css("min-height", notVaultSubClass.height());
            vaultSubClass.css("visibility", "hidden");
        } else {
            buckets.find(".itemBucketBG").css("height", "auto");
        }
    };

    this.globalClickHandler = function(e) {
        if ($("#move-popup").is(":visible") && e.target.className.indexOf("itemLink") == -1 && e.target.parentNode.className.indexOf("itemLink") == -1) {
            $("#move-popup").hide();
            tgd.activeElement = null;
        }
    };

    this.quickIconHighlighter = function() {
        var scrollTop = $(window).scrollTop();
        $(".profile").each(function(index, item) {
            var $item = $(item);
            var characterId = $item.attr('id');
            var $quickIcon = $(".quickScrollView ." + characterId);
            var $characterBox = $(".character-box." + characterId);
            var top = $item.position().top - 55;
            var bottom = top + $item.height();
            var isActive = scrollTop >= top && scrollTop <= bottom && scrollTop > 0;
            $quickIcon.toggleClass("activeProfile", isActive);
            $characterBox.toggleClass("active", isActive);
            $characterBox.toggleClass("not-active", !isActive);
            $characterBox.css({
                width: $characterBox.parent().width() + 'px'
            });
        });
    };

    this.readBungieCookie = function(ref, loop) {
        //
        // 
        try {
            ref.executeScript({
                code: 'document.cookie'
            }, function(result) {
                
                if ((result || "").toString().indexOf("bungled") > -1) {
                    self.bungie_cookies = result;
                    window.localStorage.setItem("bungie_cookies", result);
                    self.loadData(ref, loop);
                }
            });
        } catch (e) {
            
        }
    };

    this.openHiddenBungieWindow = function() {
        window.ref = window.open("https://www.bungie.net/en/User/Profile", '_blank', 'location=no,hidden=yes');
        ref.addEventListener('loadstop', function(event) {
            //BootstrapDialog.alert("loadstop hidden");
            self.readBungieCookie(ref, 1);
        });
    };

    this.findReference = function(item, callback) {
        if (item && item.id > 0) {
            var subscriptions = [];
            var newItemHandler = function(items) {
                var foundItem = _.where(items, {
                    _id: item._id
                });
                if (foundItem.length > 0) {
                    _.each(subscriptions, function(sub) {
                        sub.dispose();
                    });
                    callback(foundItem[0]);
                }
            };
            var allItems = _.flatten(_.map(self.characters(), function(character) {
                subscriptions.push(character.items.subscribe(newItemHandler));
                return character.items();
            }));
            newItemHandler(allItems);
        }
    };

    this.clearCookies = function() {
        window.localStorage.setItem("bungie_cookies", "");
        try {
            window.cookies.clear(function() {
                
            });
        } catch (e) {}
    };

    this.openBungieWindow = function(type) {
        return function() {
            var loop;
            if (isNWJS) {
                var gui = require('nw.gui');
                var mainwin = gui.Window.get();
                window.ref = gui.Window.open('https://www.bungie.net/en/User/SignIn/' + type + "?bru=%252Fen%252FUser%252FProfile", 'Test Popup');
            } else if (isChrome || isMobile) {
                window.ref = window.open('https://www.bungie.net/en/User/SignIn/' + type + "?bru=%252Fen%252FUser%252FProfile", '_blank', 'location=yes');
            } else {
                //window.ref = window.open('about:blank');
                //window.ref.opener = null;
                window.ref = window.open('https://www.bungie.net/en/User/SignIn/' + type, '_blank', 'toolbar=0,location=0,menubar=0');
            }
            if (isMobile) {
                ref.addEventListener('loadstop', function(event) {
                    self.readBungieCookie(ref, loop);
                });
                ref.addEventListener('exit', function() {
                    if (_.isEmpty(self.bungie_cookies)) {
                        self.readBungieCookie(ref, loop);
                    }
                });
            } else if (isNWJS) {
                window.ref.on('loaded', function() {
                    location.reload();
                });
            } else {
                clearInterval(loop);
                loop = setInterval(function() {
                    if (window.ref.closed) {
                        clearInterval(loop);
                        if (!isMobile && !isChrome) {
                            $.toaster({
                                priority: 'success',
                                title: 'Loading',
                                message: "Please wait while Firefox acquires your arsenal",
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                            var event = new CustomEvent("request-cookie-from-ps", {});
                            window.dispatchEvent(event);
                            setTimeout(function() {
                                
                                self.loadData();
                            }, 5000);
                        } else {
                            self.loadData();
                        }
                    }
                }, 100);
            }
        };
    };

    this.scrollTo = function(distance, callback) {
        if (isWindowsPhone) {
            $('html,body').scrollTop(distance);
            if (callback) callback();
        } else {
            $("body").animate({
                scrollTop: distance
            }, 300, "swing", callback);
        }
    };

    this.scrollToActiveIndex = function(newIndex) {
        var index = $(".quickScrollView img").filter(function() {
            var classAttr = $(this).attr("class"),
                className = _.isUndefined(classAttr) ? "" : classAttr;
            return className.indexOf("activeProfile") > -1;
        }).index(".quickScrollView img");
        self.scrollTo($(".profile:eq(" + index + ")").position().top - 50, function() {
            $.toaster({
                priority: 'info',
                title: 'View',
                message: tgd.DestinyViews[newIndex],
                settings: {
                    timeout: tgd.defaults.toastTimeout
                }
            });
        });
    };

    this.shiftViewLeft = function() {
        var newIndex = parseInt(self.activeView()) - 1;
        if (newIndex < 0) newIndex = 3;
        self.activeView(newIndex);
        self.scrollToActiveIndex(newIndex);
    };

    this.shiftViewRight = function() {
        var newIndex = parseInt(self.activeView()) + 1;
        if (newIndex == 4) newIndex = 0;
        self.activeView(newIndex);
        self.scrollToActiveIndex(newIndex);
    };

    this.requests = {};
    var id = -1;
    this.apiRequest = function(params, callback) {
        var apiURL = tgd.remoteServer + "/api3.cfm";
        $.ajax({
            url: apiURL,
            data: params,
            type: "POST",
            success: function(data) {
                var response = (typeof data == "string") ? JSON.parse(data) : data;
                callback(response);
            }
        });
    };

    this.staticApiRequest = function(params, callback) {
        var apiURL = tgd.remoteServer + "/static_api.cfm";
        $.ajax({
            url: apiURL,
            data: params,
            type: "POST",
            success: function(data) {
                var response = (typeof data == "string") ? JSON.parse(data) : data;
                callback(response);
            }
        });
    };

    this.saveLoadouts = function(includeMessage) {
        var _includeMessage = _.isUndefined(includeMessage) ? true : includeMessage;
        if (self.activeUser() && self.activeUser().user && self.activeUser().user.membershipId) {
            var loadoutKeys = ["name", "ids", "generics"];
            var params = {
                action: "save",
                membershipId: parseFloat(self.activeUser().user.membershipId),
                loadouts: ko.toJSON(
                    _.map(self.loadouts(), function(loadout) {
                        return _.reduce(loadout, function(memo, value, key) {
                            if (loadoutKeys.indexOf(key) > -1)
                                memo[key] = ko.unwrap(value);
                            return memo;
                        }, {});
                    })
                )
            };
            self.apiRequest(params, function(results) {
                if (_includeMessage === true) {
                    if (results.success) {
                        $.toaster({
                            priority: 'success',
                            title: 'Saved',
                            message: "Loadouts saved to the cloud",
                            settings: {
                                timeout: tgd.defaults.toastTimeout
                            }
                        });
                    } else BootstrapDialog.alert("Error has occurred saving loadouts");
                }
            });
        } else {
            BootstrapDialog.alert("Error reading your membershipId, could not save loadouts");
        }
    };

    this.loadLoadouts = function() {
        if (self.loadouts().length === 0) {
            var _loadouts = window.localStorage.getItem("loadouts");
            if (!_.isEmpty(_loadouts)) {
                _loadouts = _.map(JSON.parse(_loadouts), function(loadout) {
                    return new tgd.Loadout(loadout);
                });
            } else {
                _loadouts = [];
            }
            var maxCSP = "";
            try {
                maxCSP = _.map(
                    _.groupBy(
                        _.sortBy(
                            _.filter(
                                _.flatten(
                                    _.map(self.characters(), function(character) {
                                        return character.items();
                                    })
                                ),
                                function(item) {
                                    return item.armorIndex > -1;
                                }), 'bucketType'), 'bucketType'),
                    function(items, bucketType) {
                        return String.fromCharCode(_.max(_.map(items, function(item) {
                            return item.getValue("All");
                        })));
                    }).join("");
            } catch (e) {}
            self.apiRequest({
                action: "load",
                //this ID is shared between PSN/XBL so a better ID is one that applies only to one profile
                membershipId: parseFloat(self.activeUser().user.membershipId),
                //Crowd Sourced values for maxCSP
                maxCSP: maxCSP
                    /*this one applies only to your current profile
				accountId: self.bungie.getMemberId()*/
            }, function(results) {
                var _results = [];
                if (results && results.loadouts) {
                    _results = _.isArray(results.loadouts) ? results.loadouts : [results.loadouts];
                    _results = _.map(_results, function(loadout) {
                        loadout.ids = _.isArray(loadout.ids) ? loadout.ids : [loadout.ids];
                        loadout.equipIds = _.isEmpty(loadout.equipIds) ? [] : loadout.equipIds;
                        loadout.equipIds = _.isArray(loadout.equipIds) ? loadout.equipIds : [loadout.equipIds];
                        return new tgd.Loadout(loadout);
                    });
                }
                /* one time migrate joins the two arrays and clears the local one */
                if (_loadouts.length > 0) {
                    _results = _loadouts.concat(_results);
                    window.localStorage.setItem("loadouts", "");
                }
                self.loadouts(_results);
                /* one time migrate saves the new joined array to the cloud */
                if (_loadouts.length > 0) {
                    self.saveLoadouts(false);
                }
                //insulate this code from any potential failures from bad data or otherwise
                try {
                    if (results && results.maxCSP) {
                        if (results.maxCSP.indexOf(",") > -1 && results.maxCSP.split(",").length == 7) {
                            tgd.DestinyMaxCSP = _.object(_.map(results.maxCSP.split(","), function(value, index) {
                                return [_.sortBy(tgd.DestinyArmorPieces)[index], parseInt(value)];
                            }));
                        }
                    }
                } catch (e) {
                    
                }
                var destinyMaxCSP = tgd.sum(tgd.DestinyMaxCSP);
                tgd.maxTierPossible = Math.floor(destinyMaxCSP / tgd.DestinySkillTier);
                tgd.maxTierPointsPossible = tgd.maxTierPossible * tgd.DestinySkillTier;
                app.minAvgPercentNeeded(Math.round((tgd.maxTierPointsPossible / destinyMaxCSP) * 100));
                self.cspToggle(!self.cspToggle());
            });
        }
    };

    this.showWhatsNew = function(callback) {
        var container = $("<div></div>");
        container.attr("style", "overflow-y: scroll; height: 480px");
        container.html(tgd.whatsNewTemplate());
        (new tgd.dialog()).title(self.activeText().whats_new_title).content(container).show(false, function() {
            if (_.isFunction(callback)) callback();
        });
    };

    this.whatsNew = function() {
        if ($("#showwhatsnew").text() == "true") {
            var version = tgd.version.replace(/\./g, '');
            if (version.length == 4) version = version + "0";
            var cookie = window.localStorage.getItem("whatsnew");
            if (cookie && cookie.length && cookie.length == 4) cookie = cookie + "0";
            if (_.isEmpty(cookie) || parseInt(cookie) < parseInt(version)) {
                self.showWhatsNew(function() {
                    window.localStorage.setItem("whatsnew", version);
                });
            }
        }
    };

    this.normalizeSingle = function(description, characters, usingbatchMode, callback) {
        var itemTotal = 0;

        /* association of character, amounts to increment/decrement */
        var characterStatus = _.map(characters, function(c) {
            var characterTotal = _.reduce(
                _.filter(c.items(), {
                    description: description
                }),
                function(memo, i) {
                    return memo + i.primaryStat();
                },
                0);
            itemTotal = itemTotal + characterTotal;
            return {
                character: c,
                current: characterTotal,
                needed: 0
            };
        });
        //

        if (itemTotal < characterStatus.length) {
            if (usingbatchMode === false) {
                $.toaster({
                    priority: 'danger',
                    title: 'Warning',
                    message: "Cannot distribute " + itemTotal + " " + description + " between " + characterStatus.length + " characters.",
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
            if (callback !== undefined) {
                callback();
            }
            return;
        }

        var itemSplit = (itemTotal / characterStatus.length) | 0; /* round down */
        //

        /* calculate how much to increment/decrement each character */
        _.each(characterStatus, function(c) {
            c.needed = itemSplit - c.current;
        });
        //

        var getNextSurplusCharacter = (function() {
            return function() {
                return _.filter(characterStatus, function(c) {
                    return c.needed < 0;
                })[0];
            };
        })();

        var getNextShortageCharacter = (function() {
            return function() {
                return _.filter(characterStatus, function(c) {
                    return c.needed > 0;
                })[0];
            };
        })();

        /* bail early conditions */
        if ((typeof getNextSurplusCharacter() === "undefined") || (typeof getNextShortageCharacter() === "undefined")) {
            //
            if (usingbatchMode === false) {
                $.toaster({
                    priority: 'success',
                    title: 'Result',
                    message: description + " already normalized as best as possible.",
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
            if (typeof callback !== "undefined") {
                callback();
            }
            return;
        }

        var adjustStateAfterTransfer = function(surplusCharacter, shortageCharacter, amountTransferred) {
            surplusCharacter.current = surplusCharacter.current - amountTransferred;
            surplusCharacter.needed = surplusCharacter.needed + amountTransferred;
            //

            shortageCharacter.needed = shortageCharacter.needed - amountTransferred;
            shortageCharacter.current = shortageCharacter.current + amountTransferred;
            //
        };

        var nextTransfer = function(callback) {
            var surplusCharacter = getNextSurplusCharacter();
            var shortageCharacter = getNextShortageCharacter();

            if ((typeof surplusCharacter === "undefined") || (typeof shortageCharacter === "undefined")) {
                //
                if (usingbatchMode === false) {
                    //self.refresh();
                    $.toaster({
                        priority: 'success',
                        title: 'Result',
                        message: "All items normalized as best as possible",
                        settings: {
                            timeout: tgd.defaults.toastTimeout
                        }
                    });
                }
                if (callback !== undefined) {
                    callback();
                }
                return;
            }
            if (surplusCharacter.character.id == shortageCharacter.character.id) {
                //
                if (callback !== undefined) {
                    callback();
                }
                return;
            }
            /* TODO: all the surplus characters' items that match the description. might be multiple stacks, need to loop over each item, perhaps more testing required */
            var surplusItems = _.filter(surplusCharacter.character.items(), {
                description: description
            });
            var surplusItem = surplusItems[0];
            //TODO: TypeError: undefined is not an object (evaluating 'surplusItem.primaryStat')
            var maxWeCanWorkWith = Math.min(surplusItem.primaryStat(), (surplusCharacter.needed * -1));
            var amountToTransfer = Math.min(maxWeCanWorkWith, shortageCharacter.needed);

            //

            if (surplusCharacter.character.id == "Vault") {
                //
                surplusItem.transfer("Vault", shortageCharacter.character.id, amountToTransfer, function() {
                    adjustStateAfterTransfer(surplusCharacter, shortageCharacter, amountToTransfer);
                    nextTransfer(callback);
                });
            } else if (shortageCharacter.character.id == "Vault") {
                //
                surplusItem.transfer(surplusCharacter.character.id, "Vault", amountToTransfer, function() {
                    adjustStateAfterTransfer(surplusCharacter, shortageCharacter, amountToTransfer);
                    nextTransfer(callback);
                });
            } else {
                surplusItem.transfer(surplusCharacter.character.id, "Vault", amountToTransfer, function() {
                    surplusItem.transfer("Vault", shortageCharacter.character.id, amountToTransfer, function() {
                        adjustStateAfterTransfer(surplusCharacter, shortageCharacter, amountToTransfer);
                        nextTransfer(callback);
                    });
                });
            }
        };

        var messageStr = "<div><div>Normalize " + description + "</div><ul>";
        for (i = 0; i < characterStatus.length; i++) {
            messageStr = messageStr.concat("<li>" + characterStatus[i].character.classType() + ": " +
                (characterStatus[i].needed > 0 ? "+" : "") +
                characterStatus[i].needed + "</li>");
        }
        messageStr = messageStr.concat("</ul></div>");

        if (usingbatchMode === false) {
            var defaultAction = function(dialogItself) {
                nextTransfer(callback);
                dialogItself.close();
            };
            (new tgd.koDialog({
                templateName: '',
                viewModel: {},
                onFinish: defaultAction,
                message: messageStr,
                buttons: [{
                    label: self.activeText().normalize,
                    cssClass: 'btn-primary',
                    action: defaultAction
                }, {
                    label: self.activeText().close_msg,
                    action: function(dialogItself) {
                        dialogItself.close();
                    }
                }]
            })).title(self.activeText().normalize_title).show(true);
        } else {
            nextTransfer(callback);
        }
    };

    this.normalizeAll = function(bucketType) {
        //

        var done = function(onlyCharacters) {

            var descriptions = _.uniq(_.flatten(_.map(onlyCharacters, function(character) {
                return _.pluck(_.filter(character.items(), function(item) {
                    return item.bucketType == bucketType && item.transferStatus < 2;
                }), 'description');
            })));

            var getNextDescription = (function() {
                var i = 0;
                return function() {
                    return i < descriptions.length ? descriptions[i++] : undefined;
                };
            })();

            var nextNormalize = function() {
                var description = getNextDescription();

                if (typeof description === "undefined") {
                    $.toaster({
                        priority: 'success',
                        title: 'Result',
                        message: "All items normalized as best as possible",
                        settings: {
                            timeout: tgd.defaults.toastTimeout
                        }
                    });
                    return;
                }

                // normalizeSingle = function(description, characters, usingbatchMode, callback)
                self.normalizeSingle(description, onlyCharacters, true, nextNormalize);
            };

            nextNormalize();
        };

        this.selectMultiCharacters("Normalize All " + bucketType, "Normalize: equally distribute all " + bucketType + " across the selected characters", done);
    };

    this.selectMultiCharacters = function(title, description, callback) {
        var smc = new tgd.selectMultiCharacters(description, self.orderedCharacters);
        var defaultAction = function(dialogItself) {
            
            var characters = smc.selectedCharacters();
            if (characters.length <= 1) {
                BootstrapDialog.alert("Need to select two or more characters.");
            } else {
                callback(characters);
            }
            dialogItself.close();
        };
        (new tgd.koDialog({
            templateName: "selectMultiCharactersTemplate",
            viewModel: smc,
            buttons: [{
                label: self.activeText().ok_msg,
                cssClass: 'btn-primary',
                action: defaultAction
            }, {
                label: self.activeText().close_msg,
                action: function(dialogItself) {
                    dialogItself.close();
                }
            }]
        })).title(title).show(true);
    };

    this.setVaultTo = function() {
        var pos = this.toString();
        var vault = _.findWhere(self.characters(), {
            id: "Vault"
        });
        if (vault) {
            self.vaultPos(pos);
            vault.order(pos);
        } else {
            return false;
        }
    };

    this.isVaultAt = function(pos) {
        return ko.pureComputed(function() {
            var vault = _.findWhere(self.characters(), {
                id: "Vault"
            });
            if (vault) {
                result = (vault.order() == pos);
            } else {
                result = false;
            }
            return result;
        }).extend({
            rateLimit: {
                timeout: 1000,
                method: "notifyWhenChangesStop"
            }
        });
    };

    this._columnMode = function() {
        var character = this;
        var totalCharacters = 3,
            xsColumn = self.xsColumn(),
            smColumn = self.smColumn(),
            mdColumn = self.mdColumn(),
            lgColumn = self.lgColumn(),
            vaultColumns = lgColumn,
            totalColumns = tgd.bootstrapGridColumns,
            characterColumns,
            layoutMode = self.layoutMode();
        if (layoutMode == 'uneven') {
            vaultColumns = self.vaultWidth();
            characterColumns = Math.floor((totalColumns - vaultColumns) / totalCharacters);
        } else {
            vaultColumns = lgColumn;
            characterColumns = lgColumn;
        }
        if (character.id == "Vault") {
            //if Vault set to Right and # columns set to 3 then make the vault full width 
            if ((layoutMode == 'even' && self.vaultPos() == 4) && (lgColumn == 8 || mdColumn == 8 || smColumn == 8)) {
                if (lgColumn == 8) lgColumn = 24;
                if (mdColumn == 8) mdColumn = 24;
                if (smColumn == 8) smColumn = 24;
            } else {
                lgColumn = vaultColumns;
            }
        } else {
            lgColumn = characterColumns;
        }
        return "col-xs-" + xsColumn + " col-sm-" + smColumn + " col-md-" + mdColumn + " col-lg-" + lgColumn;
    };

    this.columnMode = function(character) {
        return ko.pureComputed(self._columnMode, character);
    };

    this.setColumns = function(input, ctx, evt) {
        var type = this.toString();
        self[type + "Column"](tgd.bootstrapGridColumns / input.value);
        self.redraw();
    };

    this._btnActive = function() {
        var input = this;
        return ((tgd.bootstrapGridColumns / input.value) == self[input.kind + "Column"]()) ? "btn-primary" : "";
    };

    this.btnActive = function(type, input) {
        input.kind = type;
        return ko.pureComputed(self._btnActive, input);
    };

    this.generateStatic = function() {
        var profileKeys = ["race", "order", "gender", "classType", "id", "level", "imgIcon", "icon", "background", "stats"];
        var itemKeys = ["id", "_id", "characterId", "damageType", "damageTypeName", "isEquipped", "isGridComplete", "locked",
            "description", "itemDescription", "bucketType", "type", "typeName", "tierType", "tierTypeName", "icon", "primaryStat",
            "progression", "weaponIndex", "armorIndex", "perks", "stats", "isUnique", "href"
        ];
        var profiles = _.map(self.characters(), function(profile) {
            var newProfile = {};
            _.each(profileKeys, function(key) {
                newProfile[key] = ko.unwrap(profile[key]);
            });
            newProfile.items = _.map(profile.items(), function(item) {
                var newItem = {};
                _.each(itemKeys, function(key) {
                    newItem[key] = ko.unwrap(item[key]);
                });
                return ko.toJS(newItem);
            });
            return newProfile;
        });
        return JSON.stringify(profiles);
    };

    this.initLocale = function(callback) {
        if (navigator && navigator.globalization && navigator.globalization.getPreferredLanguage) {
            
            navigator.globalization.getPreferredLanguage(function(a) {
                if (a && a.value && a.value.indexOf("-") > -1) {
                    var value = a.value.split("-")[0];
                    if (_.pluck(tgd.languages, 'code').indexOf(value) > -1) {
                        
                        if (value == "pt")
                            value = "pt-br";
                        self.locale(value);
                    }
                }
            });
        }
    };

    /* This function can be used in the future to localize header names */
    this.getBucketName = function(bucketType) {
        if (bucketType == "Invisible") {
            return "Special Orders";
        } else {
            return bucketType;
        }
    };

    this.dndImageGridOptions = {
        start: function() {
            $ZamTooltips.isEnabled = false;
            $ZamTooltips.hide();
        },
        stop: function() {
            if (self.tooltipsEnabled() === true)
                $ZamTooltips.isEnabled = true;
        },
        over: function() {
            $(this).addClass("active");
        },
        out: function() {
            $(this).removeClass("active");
        },
        sort: function(event, ui) {
            var $target = $(event.target);
            if (!/html|body/i.test($target.offsetParent()[0].tagName)) {
                var top = event.pageY - $target.offsetParent().offset().top - (ui.helper.outerHeight(true) / 2);
                ui.helper.css({
                    'top': top + 'px'
                });
            }
        },
        scroll: false,
        revert: false,
        placeholder: "item-placeholder",
        cursorAt: {
            cursor: "move",
            top: 27,
            left: 27
        },
        cursor: "pointer",
        appendTo: "body"
    };

    this.dndBeforeMove = function(arg) {
        if (arg && arg.targetParent && arg.targetParent.length > 0) {
            arg.cancelDrop = (arg.item.bucketType !== arg.targetParent[0].bucketType || arg.item.transferStatus >= 2);
        }
    };

    this.dndAfterMove = function(arg) {
        var destination = _.filter(arg.targetParent, function(item) {
            return item.character.id != arg.item.character.id;
        });
        if (destination.length === 0) {
            destination = _.filter(arg.targetParent, function(item) {
                return item._id != arg.item._id;
            });
        }
        if (destination.length > 0) {
            destination = destination[0];
            if (destination.character.id != arg.item.character.id) {
                var action = destination.isEquipped() ? "equip" : "store";
                $.toaster({
                    priority: 'info',
                    title: 'Transfer',
                    message: arg.item.description + " will be " + action + "d to " + destination.character.uniqueName(),
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
                arg.item[action](destination.character.id);
            }
        }
    };

    this.loadStatic = function(username) {
        self.staticApiRequest({
                username: username
            },
            function(staticProfiles) {
                if (staticProfiles.length === 0) {
                    return BootstrapDialog.alert("There is no shared data to view for this profile");
                }
                _.each(staticProfiles, function(data, index) {
                    var avatar = {
                        processed: true,
                        characterBase: {
                            characterId: data.id,
                            stats: data.stats,
                            level: data.level,
                            race: data.race,
                            gender: data.gender,
                            classType: data.classType,
                            background: data.background,
                            icon: data.icon
                        },
                        items: data.items,
                        index: data.order
                    };
                    var profile = new Profile(avatar);
                    self.characters.push(profile);
                    self.redraw();
                });
            }
        );
    };

    this.transferFarmItems = function(targetCharacterId, items) {
        //
        if (tgd.transferringFarmItems) return;
        var itemsToTransfer = [],
            farmItemCounts = self.farmItemCounts();
        var selectedFarmItems = self.farmItems();
        _.each(selectedFarmItems, function(itemType) {
            var filteredItems = _.sortBy(_.filter(items, tgd.farmItemFilters[itemType]), 'tierType');
            itemsToTransfer = itemsToTransfer.concat(filteredItems);
            if (targetCharacterId == "Vault") {
                farmItemCounts[itemType] = (farmItemCounts[itemType] || 0) + filteredItems.length;
            } else {
                var spaceAvailable = _.countBy(_.findWhere(self.characters(), {
                    id: targetCharacterId
                }).items(), 'bucketType');
                itemsToTransfer = _.filter(itemsToTransfer, function(item) {
                    var slotsAvailable = spaceAvailable[item.bucketType];
                    var maxSpaceAvailable = (tgd.DestinyNonUniqueBuckets.indexOf(item.bucketType) > -1) ? 20 : 10;
                    if (slotsAvailable < maxSpaceAvailable) {
                        //
                        spaceAvailable[item.bucketType]++;
                        return true;
                    } else {
                        return false;
                    }
                });
            }
        });
        self.farmItemCounts(farmItemCounts);
        if (itemsToTransfer.length === 0) {
            return;
        }
        var adhoc = new tgd.Loadout(itemsToTransfer, true);
        tgd.autoTransferStacks = true;
        tgd.transferringFarmItems = true;
        var msa = adhoc.transfer(targetCharacterId, true);
        if (msa.length > 0) {
            adhoc.swapItems(msa, targetCharacterId, function() {
                tgd.autoTransferStacks = false;
                tgd.transferringFarmItems = false;
            });
        }
    };

    this.farmItemHandler = function(items) {
        self.transferFarmItems(self.farmTarget(), items);
    };

    this.vaultItemHandler = function(items) {
        var sortedItems = _.groupBy(items, 'actualBucketType');
        /* detect the quantity amounts, if full then disable farmMode */
        _.each(tgd.DestinyLayout, function(layout) {
            var group = sortedItems[layout.array];
            if (group && group.length == layout.counts[0] && self.farmMode() === true && self.farmTarget() == "Vault") {
                self.farmMode(false);
                var warning_msg = layout.name + " is full, disabling Farm Mode.";
                
                $.toaster({
                    priority: 'danger',
                    title: 'Warning',
                    message: warning_msg,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        });
    };

    var subscriptions = [],
        remainingInterval;
    this.farmModeHandler = function(isEnabled) {
        if (isEnabled === true) {
            if (self.doRefresh() === false) {
                self.doRefresh(true);
            }
            clearInterval(remainingInterval);
            remainingInterval = setInterval(function() {
                var timeRemaining = Math.floor(self.refreshSeconds() - ((((new Date()).getTime()) - tgd.autoRefreshTime) / 1000));
                if (timeRemaining > 60) {
                    timeRemaining = Math.floor(timeRemaining / 60) + "m" + (timeRemaining % 60) + "s";
                } else {
                    timeRemaining = timeRemaining + "s";
                }
                $("#timeRemainingForRefresh").html(timeRemaining);
            }, 1000);
            _.each(self.characters(), function(character) {
                if (character.id == "Vault" && self.farmTarget() == "Vault") {
                    subscriptions.push(character.items.subscribe(self.vaultItemHandler));
                    //only subscribe to the vault's item when the farmTarget is set to a character	
                } else if (character.id != "Vault" && self.farmTarget() == "Vault" || character.id == "Vault" && self.farmTarget() !== "Vault") {
                    //
                    subscriptions.push(character.items.subscribe(self.farmItemHandler));
                    self.farmItemHandler(character.items());
                }
            });
        } else {
            clearInterval(remainingInterval);
            _.each(subscriptions, function(subscription) {
                subscription.dispose();
            });
        }
    };

    this.init = function() {
        _.each(ko.templates, function(content, name) {
            $("<script></script").attr("type", "text/html").attr("id", name).html(content).appendTo("head");
        });
        var providedTemplates = _.keys(ko.templates);
        $("div[data-bind*=template]").map(function(i, e) {
            var template = $(e).attr("data-bind").match(/'(.*)'/)[1];
            if (providedTemplates.indexOf(template) == -1) {
                $(e).remove();
            }
        });

        if (window.isStaticBrowser) {
            $ZamTooltips.init();
            self.bungie = new tgd.bungie('', function() {
                self.loadStatic(unescape(location.search.replace('?', '')));
            });
        } else {
            $.idleTimer(1000 * 60 * 30);
            $(document).on("idle.idleTimer", function(event, elem, obj) {
                clearInterval(self.refreshInterval);
            });
            $(document).on("active.idleTimer", self.refreshHandler);
        }

        if (self.lgColumn() == "3" || self.mdColumn() == "4") {
            self.lgColumn(tgd.defaults.lgColumn);
            self.mdColumn(tgd.defaults.mdColumn);
            self.smColumn(tgd.defaults.smColumn);
            self.xsColumn(tgd.defaults.xsColumn);
        }

        _.each(tgd.DestinyLayout, function(layout) {
            self.allLayouts.push(new tgd.Layout(layout));
        });

        self.initLocale();

        if (_.isUndefined(window._itemDefs) || _.isUndefined(window._perkDefs)) {
            return BootstrapDialog.alert(self.activeText().itemDefs_undefined);
        }

        /* These templates are loaded after the locale for the language template, they are used dynamically for pop ups and other content */
        _.each(_.templates, function(content, templateName) {
            if (templateName == "languagesTemplate" && self.activeText() && self.activeText().language_text) {
                content = self.activeText().language_text + content;
            }
            tgd[templateName] = _.template(content);
        });
        if (!window.isStaticBrowser) {
            self.doRefresh.subscribe(self.refreshHandler);
            self.refreshSeconds.subscribe(self.refreshHandler);
            self.loadoutMode.subscribe(self.refreshHandler);
            //farmItems needs to be an observableArray attached to localStorage
            tgd.farmItems = new tgd.StoreObj("farmItems");
            var savedSelections = tgd.farmItems.read();
            self.farmItems(_.isArray(savedSelections) ? savedSelections : savedSelections.split(","));
            self.farmItems.subscribe(function(newValues) {
                tgd.farmItems.write(newValues);
            });
        }

        self.farmMode.subscribe(self.farmModeHandler);
        self.padBucketHeight.subscribe(self.redraw);
        self.refreshHandler();

        if (!window.isStaticBrowser) {
            self.bungie_cookies = "";
            if (window.localStorage && window.localStorage.getItem) {
                self.bungie_cookies = window.localStorage.getItem("bungie_cookies");
            }
            var isEmptyCookie = (self.bungie_cookies || "").indexOf("bungled") == -1;

            //This makes it so that the viewport width behaves like android/ios browsers
            if (isWindowsPhone) {
                var msViewportStyle = document.createElement("style");
                msViewportStyle.appendChild(document.createTextNode("@-ms-viewport{width:auto!important}"));
                document.getElementsByTagName("head")[0].appendChild(msViewportStyle);
            }

            var dragAndDropEnabled = self.padBucketHeight() === true && self.dragAndDrop() === true;
            ko.bindingHandlers.sortable.isEnabled = dragAndDropEnabled;
            ko.bindingHandlers.draggable.isEnabled = dragAndDropEnabled;
            if (isMobile && isEmptyCookie) {
                self.bungie = new tgd.bungie('', function() {
                    self.activeUser({
                        "code": 99,
                        "error": "Please sign-in to continue."
                    });
                });
            } else {
                self.loadData();
            }
        }
        tgd.autoRefreshTime = (new Date()).getTime();
        $("html").click(self.globalClickHandler);
        /* this fixes issue #16 */
        self.activeView.subscribe(self.redraw);
        $(window).resize(_.throttle(self.bucketSizeHandler, 500));
        $(window).resize(_.throttle(self.quickIconHighlighter, 500));
        $(window).scroll(_.throttle(self.quickIconHighlighter, 500));
        self.collectionSets = _.sortBy(Object.keys(_collections));
        tgd.maxTierPossible = Math.floor(tgd.sum(tgd.DestinyMaxCSP) / tgd.DestinySkillTier);
        tgd.maxTierPointsPossible = tgd.maxTierPossible * tgd.DestinySkillTier;
        tgd.DestinyArmorStats = _.filter(_statDefs, function(stat) {
            return tgd.DestinyArmorStats.indexOf(stat.statHash) > -1;
        });
        if (!window.isStaticBrowser) {
            $(document).on("click", "a[target='_system']", function() {
                window.open(this.href, tgd.openTabAs);
                return false;
            });
        }
        ko.applyBindings(self);

        $("form").bind("submit", false);

        if (!window.isStaticBrowser) {
            if (isMobile) {
                //This sets up swipe left/swipe right for mobile devices
                //TODO: Add an option to disable this for users
                Hammer(document.getElementById('charactersContainer'), {
                        //Removing these values and allowing HammerJS to figure out the best value based on the device
                        //drag_min_distance: 1,
                        //swipe_velocity: 0.1,
                        drag_horizontal: true,
                        drag_vertical: false
                    }).on("swipeleft", self.shiftViewLeft)
                    .on("swiperight", self.shiftViewRight)
                    .on("tap", self.globalClickHandler);

                //This ensures that the top status bar color matches the app
                if (typeof StatusBar !== "undefined") {
                    StatusBar.styleBlackOpaque();
                    StatusBar.backgroundColorByHexString("#272B30");
                    //StatusBar.overlaysWebView(false);
                }

                //This sets up inAppBilling donations for iOS/Android
                if (typeof inappbilling != "undefined") {
                    inappbilling.init(_.noop, _.noop, {
                        showLog: false
                    }, ['small', 'medium', 'large']);
                }

                //Prevent the user from pressing the back button to reload the app (not accepted by Microsoft's review team)
                if (!isWindowsPhone) {
                    document.addEventListener("backbutton", function(e) {
                        e.preventDefault();
                    }, false);
                }
            }

            self.whatsNew();
        }

        window.BOOTSTRAP_OK = true;

    };
};

window.app = new app();

BootstrapDialog.defaultOptions.nl2br = false;

if (isMobile) {
    window.addEventListener("statusTap", function() {
        var target = $("body");

        //disable touch scroll to kill existing inertial movement
        target.css({
            '-webkit-overflow-scrolling': 'auto',
            'overflow-y': 'hidden'
        });

        //animate
        target.animate({
            scrollTop: 0
        }, 300, "swing", function() {

            //re-enable touch scrolling
            target.css({
                '-webkit-overflow-scrolling': 'touch',
                'overflow-y': 'scroll'
            });
        });
    });
    document.addEventListener('deviceready', app.init, false);
} else {
    $(document).ready(app.init);
}tgd.moveItemPositionHandler = function(element, item) {
    
    if (app.destinyDbMode() === true) {
        
        window.open(item.href, tgd.openTabAs);
        return false;
    } else if (app.loadoutMode() === true) {
        
        var existingItem, itemFound = false;
        if (item._id > 0) {
            existingItem = _.findWhere(app.activeLoadout().ids(), {
                id: item._id
            });
            if (existingItem) {
                app.activeLoadout().ids.remove(existingItem);
                itemFound = true;
            }
        } else {
            existingItem = _.filter(app.activeLoadout().generics(), function(itm) {
                return item.id == itm.hash && item.characterId() == itm.characterId;
            });
            if (existingItem.length > 0) {
                app.activeLoadout().generics.removeAll(existingItem);
                itemFound = true;
            }
        }
        if (itemFound === false) {
            if (item.transferStatus >= 2 && item.bucketType != "Subclasses") {
                $.toaster({
                    priority: 'danger',
                    title: 'Warning',
                    message: app.activeText().unable_create_loadout_for_type,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            } else if (item._id === "0") {
                app.activeLoadout().addGenericItem({
                    hash: item.id,
                    bucketType: item.bucketType,
                    characterId: item.characterId()
                });
            } else if (_.where(app.activeLoadout().items(), {
                    bucketType: item.bucketType
                }).length < 10) {
                app.activeLoadout().addUniqueItem({
                    id: item._id,
                    bucketType: item.bucketType,
                    doEquip: false
                });
            } else {
                $.toaster({
                    priority: 'danger',
                    title: 'Error',
                    message: app.activeText().unable_to_create_loadout_for_bucket + item.bucketType,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        }
    } else {
        
        app.activeItem(item);
        var $movePopup = $("#move-popup");
        //TODO: Investigate how to allow Gunsmith weapons to be equipped and avoid this clause
        if ((item.transferStatus >= 2 && item.bucketType != "Subclasses") || item.bucketType == "Post Master" || item.bucketType == "Messages" || item.bucketType == "Invisible" || item.bucketType == "Lost Items" || item.bucketType == "Bounties" || item.bucketType == "Mission" || item.typeName == "Armsday Order") {
            $.toaster({
                priority: 'danger',
                title: 'Error',
                message: app.activeText().unable_to_move_bucketitems,
                settings: {
                    timeout: tgd.defaults.toastTimeout
                }
            });
            return;
        }
        if (element == tgd.activeElement) {
            $movePopup.hide();
            tgd.activeElement = null;
            
        } else {
            
            tgd.activeElement = element;
            $ZamTooltips.hide();
            if (window.isMobile) {
                $("body").css("padding-bottom", $movePopup.height() + "px");
                /* bringing back the delay it's sitll a problem in issue #128 */
                setTimeout(function() {
                    $movePopup.show().addClass("mobile");
                }, 50);
            } else {
                
                $movePopup.removeClass("navbar navbar-default navbar-fixed-bottom").addClass("desktop").show().position({
                    my: "left bottom",
                    at: "left top",
                    collision: "none",
                    of: element,
                    using: function(pos, ui) {
                        var obj = $(this),
                            box = $(ui.element.element).find(".move-popup").width();
                        obj.removeAttr('style');
                        if (box + pos.left > $(window).width()) {
                            pos.left = pos.left - box;
                        }
                        obj.css(pos).width(box);
                    }
                });
            }
        }
    }
};

var Item = function(model, profile) {
    var self = this;

    if (model && model.id) {
        model.equipRequiredLevel = 0;
        model.isEquipment = true;
    }

    /* TODO: Determine why this is needed */
    _.each(model, function(value, key) {
        self[key] = value;
    });

    this.character = profile;

    this.init(model);

    this.characterId = ko.observable(self.character.id);
    this.isFiltered = ko.observable(false);
    this.isVisible = ko.pureComputed(this._isVisible, this);
    this.columnMode = ko.computed(this._columnMode, this);
    this.opacity = ko.computed(this._opacity, this);
    this.primaryStatValue = ko.pureComputed(this._primaryStatValue, this);
    this.maxLightPercent = ko.pureComputed(function() {
        var toggle = app.cspToggle();
        return Math.round((self.primaryValues.MaxLightCSP / tgd.DestinyMaxCSP[self.bucketType]) * 100);
    });
    this.cspStat = ko.pureComputed(this._cspStat, this);
    this.cspClass = ko.pureComputed(this._cspClass, this);
};

Item.prototype = {
    init: function(item) {
        var self = this;
        var info = {};
        if (item.itemHash in _itemDefs) {
            info = _itemDefs[item.itemHash];
        } else if (item.id in _itemDefs) {
            item.itemHash = item.id;
            info = _itemDefs[item.id];
        } else {
            /* Classified Items */
            info = {
                bucketTypeHash: "1498876634",
                itemName: "Classified",
                tierTypeName: "Exotic",
                icon: "/img/misc/missing_icon.png",
                itemTypeName: "Classified"
            };
            
            
        }
        if (info.bucketTypeHash in tgd.DestinyBucketTypes) {
            //some weird stuff shows up under this bucketType w/o this filter
            if (info.bucketTypeHash == "2422292810" && info.deleteOnAction === false) {
                return;
            }
            var description, tierTypeName, itemDescription, itemTypeName, bucketType;
            try {
                description = decodeURIComponent(info.itemName);
                tierTypeName = decodeURIComponent(info.tierTypeName);
                itemDescription = decodeURIComponent(info.itemDescription);
                itemTypeName = decodeURIComponent(info.itemTypeName);
            } catch (e) {
                description = info.itemName;
                tierTypeName = info.tierTypeName;
                itemDescription = info.itemDescription;
                itemTypeName = info.itemTypeName;
            }
            info.icon = (info.icon === "") ? "/img/misc/missing_icon.png" : info.icon;
            bucketType = item.bucketType || self.character.getBucketTypeHelper(item, info);
            $.extend(self, {
                id: item.itemHash,
                href: "https://destinydb.com/items/" + item.itemHash,
                _id: item.itemInstanceId,
                characterId: ko.observable(self.character.id),
                isEquipped: ko.observable(),
                locked: ko.observable(),
                bonusStatOn: ko.observable(),
                primaryStat: ko.observable(),
                damageType: item.damageType,
                damageTypeName: tgd.DestinyDamageTypes[item.damageType],
                isEquipment: item.isEquipment,
                isGridComplete: item.isGridComplete,
                description: description,
                itemDescription: itemDescription,
                classType: info.classType,
                bucketType: bucketType,
                type: info.itemSubType,
                typeName: itemTypeName,
                tierType: info.tierType,
                tierTypeName: tierTypeName,
                icon: tgd.dataDir + info.icon,
                maxStackSize: info.maxStackSize,
                equipRequiredLevel: item.equipRequiredLevel,
                canEquip: item.canEquip,
                weaponIndex: tgd.DestinyWeaponPieces.indexOf(bucketType),
                armorIndex: tgd.DestinyArmorPieces.indexOf(bucketType),
                transferStatus: item.transferStatus,
                backgroundPath: (itemTypeName == "Emblem") ? app.makeBackgroundUrl(info.secondaryIcon) : "",
                actualBucketType: _.reduce(tgd.DestinyLayout, function(memo, layout) {
                    if ((layout.bucketTypes.indexOf(bucketType) > -1 && layout.extras.indexOf(bucketType) == -1) || (layout.bucketTypes.indexOf(bucketType) == -1 && layout.extras.indexOf(bucketType) > -1))
                        memo = layout.array;
                    return memo;
                }, "")
            });
            self.updateItem(item);
        }
    },
    updateItem: function(item) {
        var self = this;
        var info = {};
        if (item.itemHash in _itemDefs) {
            info = _itemDefs[item.itemHash];
        } else {
            /* Classified Items */
            info = {
                bucketTypeHash: "1498876634",
                itemName: "Classified",
                tierTypeName: "Exotic",
                icon: "/img/misc/missing_icon.png",
                itemTypeName: "Classified"
            };
            
            
        }
        var bucketType = item.bucketType || self.character.getBucketTypeHelper(item, info);
        var primaryStat = self.parsePrimaryStat(item, bucketType);
        self.primaryStat(primaryStat);
        self.isEquipped(item.isEquipped);
        self.locked(item.locked);
        self.perks = self.parsePerks(item.id, item.talentGridHash, item.perks, item.nodes, item.itemInstanceId);
        var statPerks = _.where(self.perks, {
            isStat: true
        });
        self.hasLifeExotic = _.where(self.perks, {
            name: "The Life Exotic"
        }).length > 0;
        var bonus = (statPerks.length === 0) ? 0 : tgd.bonusStatPoints(self.armorIndex, primaryStat);
        self.stats = self.parseStats(self.perks, item.stats, item.itemHash);
        self.rolls = self.normalizeRolls(self.stats, statPerks, primaryStat, bonus, "");
        self.futureRolls = self.calculateFutureRolls(self.stats, statPerks, primaryStat, self.armorIndex, bonus, bucketType, this.description);
        var hasUnlockedStats = _.where(statPerks, {
            active: true
        }).length > 0;
        self.bonusStatOn(hasUnlockedStats ? _.findWhere(statPerks, {
            active: true
        }).name : "");
        self.hasUnlockedStats = hasUnlockedStats || statPerks.length === 0;
        self.progression = _.filter(self.perks, function(perk) {
            return perk.active === false && perk.isExclusive === -1;
        }).length === 0;
        self.perksInProgress = _.filter(self.perks, function(perk) {
            return perk.active === false && perk.isExclusive === -1;
        }).length === 0;
        self.primaryValues = {
            CSP: tgd.sum(_.values(self.stats)),
            bonus: bonus,
            Default: primaryStat
        };
        self.primaryValues.MaxLightCSP = Math.round(tgd.calculateStatRoll(self, tgd.DestinyLightCap, true));
    },
    calculateFutureRolls: function(stats, statPerks, primaryStat, armorIndex, currentBonus, bucketType, description) {
        var futureRolls = [];
        if (statPerks.length === 0) {
            futureRolls = [stats];
        } else {
            var futureBonus = tgd.bonusStatPoints(armorIndex, tgd.DestinyLightCap);
            var allStatsLocked = _.where(statPerks, {
                active: true
            }).length === 0;
            futureRolls = _.map(statPerks, function(statPerk) {
                var tmp = _.clone(stats);
                var isStatActive = statPerk.active;
                //Figure out the stat name of the other node
                var otherStatName = _.reduce(stats, function(memo, stat, name) {
                    return (name != statPerk.name && stat > 0) ? name : memo;
                }, '');
                //Normalize stats by removing the bonus stat 
                tmp[isStatActive ? statPerk.name : otherStatName] = tmp[isStatActive ? statPerk.name : otherStatName] - (allStatsLocked ? 0 : currentBonus);
                //Figure out the sum of points and the weight of each side
                var sum = tgd.sum(tmp),
                    weight = (tmp[statPerk.name] / sum),
                    currentStatValue = sum * weight,
                    otherStatValue = sum * (1 - weight);
                //Calculate both stats at Max Light (LL320) with bonus
                //TODO: figure out a way to consolidate this equation into tgd.calculateStatRoll
                //tmp[statPerk.name] = Math.round((sum * tgd.DestinyLightCap / primaryStat) * weight) + futureBonus; //(allStatsLocked || isStatActive ? futureBonus : 0);
                tmp[statPerk.name] = Math.round(currentStatValue + ((tgd.DestinyLightCap - primaryStat) * tgd.DestinyInfusionRates[bucketType])) + futureBonus;
                tmp["bonusOn"] = statPerk.name;
                if (otherStatName !== "") {
                    //tmp[otherStatName] = Math.round((sum * tgd.DestinyLightCap / primaryStat) * (1 - weight));
                    tmp[otherStatName] = Math.round(otherStatValue + ((tgd.DestinyLightCap - primaryStat) * tgd.DestinyInfusionRates[bucketType]));
                }
                return tmp;
            });
            /*if ( description == "Graviton Forfeit" ){
            	
				//abort;
            }*/
        }
        return futureRolls;
    },
    normalizeRolls: function(stats, statPerks, primaryStat, bonus, description) {
        var arrRolls = [];
        if (statPerks.length === 0) {
            arrRolls = [stats];
        } else {
            var hasUnlockedStats = _.where(statPerks, {
                active: true
            }).length > 0;

            arrRolls = _.map(statPerks, function(statPerk) {
                var tmp = _.clone(stats);
                tmp["bonusOn"] = statPerk.name;
                if (hasUnlockedStats && statPerk.active === false) {
                    var otherStatName = _.reduce(stats, function(memo, stat, name) {
                        return (name != statPerk.name && stat > 0) ? name : memo;
                    }, '');
                    tmp[otherStatName] = tmp[otherStatName] - bonus;
                    tmp[statPerk.name] = tmp[statPerk.name] + bonus;
                } else if (hasUnlockedStats === false) {
                    tmp[statPerk.name] = tmp[statPerk.name] + bonus;
                }
                return tmp;
            });
            /*if ( description == "Jasper Carcanet" ){
            	
            }*/
        }
        return arrRolls;
    },
    parsePrimaryStat: function(item, bucketType) {
        var primaryStat = "";
        if (item.primaryStat) {
            if (item.primaryStat && item.primaryStat.value) {
                primaryStat = item.primaryStat.value;
            } else {
                primaryStat = item.primaryStat;
            }
        }
        if (item && item.objectives && item.objectives.length > 0) {
            var progress = (tgd.average(_.map(item.objectives, function(objective) {
                var result = 0;
                if (objective.objectiveHash in _objectiveDefs && _objectiveDefs[objective.objectiveHash] && _objectiveDefs[objective.objectiveHash].completionValue) {
                    result = objective.progress / _objectiveDefs[objective.objectiveHash].completionValue;
                }
                return result;
            })) * 100).toFixed(0) + "%";
            primaryStat = (primaryStat === "") ? progress : primaryStat + "/" + progress;
        }
        if (bucketType == "Materials" || bucketType == "Consumables" || ((bucketType == "Lost Items" || bucketType == "Invisible") && item.stackSize > 1)) {
            primaryStat = item.stackSize;
        }
        return primaryStat;
    },
    parseStats: function(perks, stats, itemHash) {
        var parsedStats = {};
        if (stats && stats.length && stats.length > 0) {
            _.each(stats, function(stat) {
                if (stat.statHash in window._statDefs) {
                    var p = window._statDefs[stat.statHash];
                    parsedStats[p.statName] = stat.value;
                }
            });
            //Truth has a bug where it displays a Mag size of 2 when it's actually 3, all other RL don't properly reflect the mag size of 3 when Tripod is enabled
            if (_.findWhere(perks, {
                    name: "Tripod",
                    active: true
                }) || [1274330686, 2808364178].indexOf(itemHash) > -1) {
                parsedStats.Magazine = 3;
            }
        }
        //this is for the static share site
        else if (_.isObject(stats)) {
            parsedStats = stats;
        }
        return parsedStats;
    },
    parsePerks: function(id, talentGridHash, perks, nodes, itemInstanceId) {
        var parsedPerks = [];
        if (id) {
            parsedPerks = perks;
        } else if (_.isArray(perks) && perks.length > 0) {
            var talentGrid = _talentGridDefs[talentGridHash];
            if (talentGrid && talentGrid.nodes) {
                _.each(perks, function(perk) {
                    if (perk.perkHash in window._perkDefs) {
                        var isInherent, p = window._perkDefs[perk.perkHash];
                        //There is an inconsistency between perkNames in Destiny for example:
                        /* Boolean Gemini - Has two perks David/Goliath which is also called One Way/Or Another
                           This type of inconsistency leads to issues with filtering therefore p.perkHash must be used
                        */
                        var nodeIndex = talentGrid.nodes.indexOf(
                            _.filter(talentGrid.nodes, function(o) {
                                return _.flatten(_.pluck(o.steps, 'perkHashes')).indexOf(p.perkHash) > -1;
                            })[0]
                        );
                        if (nodeIndex > 0) {
                            isInherent = _.reduce(talentGrid.nodes[nodeIndex].steps, function(memo, step) {
                                if (memo === false) {
                                    var isPerk = _.values(step.perkHashes).indexOf(p.perkHash) > -1;
                                    if (isPerk && step.activationRequirement.gridLevel === 0) {
                                        memo = true;
                                    }
                                }
                                return memo;
                            }, false);
                        }
                        var description = p && p.displayDescription ? p.displayDescription : "";
                        parsedPerks.push({
                            iconPath: tgd.dataDir + p.displayIcon,
                            name: p.displayName,
                            description: '<strong>' + p.displayName + '</strong>: ' + description,
                            active: perk.isActive,
                            isExclusive: talentGrid.exclusiveSets.indexOf(nodeIndex),
                            isInherent: isInherent,
                            isVisible: true,
                            hash: p.perkHash
                        });
                    }
                });
                var statNames = _.pluck(tgd.DestinyArmorStats, 'statName'),
                    perkHashes = _.pluck(parsedPerks, 'hash'),
                    perkNames = _.pluck(parsedPerks, 'name'),
                    talentPerks = {};
                var talentGridNodes = talentGrid.nodes;
                _.each(nodes, function(node) {
                    if (node.hidden === false) {
                        var nodes = _.findWhere(talentGridNodes, {
                            nodeHash: node.nodeHash
                        });
                        if (nodes && nodes.steps && _.isArray(nodes.steps)) {
                            var perk = nodes.steps[node.stepIndex];
                            var isSkill = _.intersection(perk.nodeStepName.split(" "), statNames);
                            if (isSkill.length === 0 &&
                                (tgd.DestinyUnwantedNodes.indexOf(perk.nodeStepName) == -1) &&
                                (perkNames.indexOf(perk.nodeStepName) == -1) &&
                                (perk.perkHashes.length === 0 || perkHashes.indexOf(perk.perkHashes[0]) === -1)) {
                                talentPerks[perk.nodeStepName] = {
                                    active: node.isActivated,
                                    name: perk.nodeStepName,
                                    description: '<strong>' + perk.nodeStepName + '</strong>: ' + perk.nodeStepDescription,
                                    iconPath: tgd.dataDir + perk.icon,
                                    isExclusive: -1,
                                    hash: perk.icon.match(/icons\/(.*)\.png/)[1],
                                    isVisible: node.isActivated
                                };
                            } else if (isSkill.length > 0) {
                                var statName = isSkill[0];
                                talentPerks[statName] = {
                                    active: node.isActivated === true && [7, 1].indexOf(node.state) == -1,
                                    name: statName,
                                    description: "",
                                    iconPath: "",
                                    isExclusive: -1,
                                    isVisible: false,
                                    isStat: true,
                                    hash: _.findWhere(tgd.DestinyArmorStats, {
                                        statName: statName
                                    })
                                };
                            }
                        }
                    }
                });
                _.each(talentPerks, function(perk) {
                    parsedPerks.push(perk);
                });
            }
        }
        return parsedPerks;
    },
    _opacity: function() {
        return (this.equipRequiredLevel <= this.character.level() || this.character.id == 'Vault') ? 1 : 0.3;
    },
    _columnMode: function() {
        var self = this;
        var className = "";
        if (self.characterId() == 'Vault') {
            className = 'col-xs-' + app.vaultColumns();
        } else if (tgd.DestinyBucketColumns[self.bucketType] == 4) {
            className = 'col-xs-' + (tgd.bootstrapGridColumns / 4);
        } else {
            className = 'col-xs-' + (tgd.bootstrapGridColumns / 3);
        }
        if (self.isGridComplete) {
            className += ' complete';
        }
        return className;
    },
    isEquippable: function(avatarId) {
        var self = this;
        return ko.pureComputed(function() {
            //rules for how subclasses can be equipped
            var equippableSubclass = (self.bucketType == "Subclasses" && !self.isEquipped() && self.character.id == avatarId) || self.bucketType !== "Subclasses";
            //if it's in this character and it's equippable
            return (self.characterId() == avatarId && !self.isEquipped() && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && self.typeName.indexOf("Armsday") == -1 && equippableSubclass) || (self.characterId() != avatarId && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && equippableSubclass && self.transferStatus < 2);
        });
    },
    isStoreable: function(avatarId) {
        var self = this;
        return ko.pureComputed(function() {
            return (self.characterId() != avatarId && avatarId !== 'Vault' && self.bucketType !== 'Subclasses' && self.transferStatus < 2) ||
                (self.isEquipped() && self.character.id == avatarId);
        });
    },
    clone: function() {
        var self = this;
        var model = {};
        for (var i in self) {
            if (self.hasOwnProperty(i)) {
                var val = ko.unwrap(self[i]);
                if (typeof(val) !== 'function') {
                    model[i] = val;
                }
            }
        }
        //
        //
        var newItem = new Item(model, self.character);
        return newItem;
    },
    hasPerkSearch: function(search) {
        var foundPerk = false,
            self = this;
        if (self.perks) {
            var vSearch = search.toLowerCase();
            self.perks.forEach(function(perk) {
                if (perk.name.toLowerCase().indexOf(vSearch) > -1 || perk.description.toLowerCase().indexOf(vSearch) > -1)
                    foundPerk = true;
            });
        }
        return foundPerk;
    },
    hashProgress: function(state) {
        var self = this;
        if (typeof self.progression !== "undefined") {
            /* Missing Perks */
            if (state == "1" && self.progression === false) {
                return true;
            }
            /* Filled perks but not maxed out */
            else if (state == "2" && self.progression === true && self.isGridComplete === false) {
                return true;
            }
            /* Maxed weapons (Gold Borders only) */
            else if (state == "3" && self.progression === true && self.isGridComplete === true) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    },
    hasGeneral: function(type) {
        if (type == "Engrams" && this.description.indexOf("Engram") > -1 && this.isEquipment === false) {
            return true;
        } else if (type in tgd.DestinyGeneralItems && tgd.DestinyGeneralItems[type].indexOf(this.id) > -1) {
            return true;
        } else {
            return false;
        }
    },
    _cspStat: function() {
        var stat = this.primaryStat();
        if (app.armorViewBy() == 'CSP' && _.has(tgd.DestinyMaxCSP, this.bucketType)) {
            stat = this.getValue("All") + "-" + this.getValue("MaxLightCSP");
        }
        return stat;
    },
    _cspClass: function() {
        var rollType = "None";
        if (_.has(tgd.DestinyMaxCSP, this.bucketType)) {
            var maxLightPercent = ko.unwrap(this.maxLightPercent),
                minAvgPercentNeeded = ko.unwrap(app.minAvgPercentNeeded);
            rollType = "BadRoll";
            if (maxLightPercent >= minAvgPercentNeeded) {
                rollType = "GoodRoll";
            }
            //4 pts under the requirement is still good enough to maybe get you there
            else if (maxLightPercent >= (minAvgPercentNeeded - 4)) {
                rollType = "OkayRoll";
            }
        }
        if (this.weaponIndex > -1) {
            rollType = this.damageTypeName;
        }
        return rollType;
    },
    _primaryStatValue: function() {
        if (this.primaryStat && typeof this.primaryStat == "function") {
            var primaryStat = ko.unwrap(this.primaryStat());
            if (this.objectives && typeof primaryStat == "string" && primaryStat.indexOf("/") > -1) {
                primaryStat = parseInt(primaryStat.split("/")[0]);
            }
            return primaryStat;
        }
    },
    _isVisible: function() {
        var $parent = app,
            self = this;

        if (typeof self.id == "undefined") {
            return false;
        }

        var dmgFilter = true;
        var progressFilter = true;
        var weaponFilter = true;
        var armorFilter = true;
        var showDuplicate = true;
        var setFilter = true;
        var searchFilter = ($parent.searchKeyword() === '' || $parent.searchKeyword() !== "" && self.description.toLowerCase().indexOf($parent.searchKeyword().toLowerCase()) > -1);
        var tierFilter = $parent.tierFilter() == "0" || $parent.tierFilter() == self.tierType;

        var itemStatValue = "";
        if (this.primaryStatValue && this.primaryStatValue()) {
            itemStatValue = this.primaryStatValue().toString();
        }
        var operator = $parent.searchKeyword().substring(0, 1);
        if (itemStatValue !== "" && itemStatValue.indexOf("%") == -1 && (operator == ">" || operator == "<" || $.isNumeric($parent.searchKeyword()))) {
            var operand = "=",
                searchValue = $parent.searchKeyword();
            if (operator === ">" || operator === "<") {
                operand = operator + operand;
                searchValue = searchValue.replace(operator, '');
            } else {
                operand = "=" + operand;
            }
            searchFilter = new Function('return ' + itemStatValue + operand + searchValue.toString())();
        }

        if (self.armorIndex > -1 || self.weaponIndex > -1) {
            setFilter = $parent.setFilter().length === 0 || $parent.setFilter().indexOf(self.id) > -1;
            searchFilter = searchFilter || self.hasPerkSearch($parent.searchKeyword());
            if (self.weaponIndex > -1) {
                dmgFilter = $parent.dmgFilter().length === 0 || $parent.dmgFilter().indexOf(self.damageTypeName) > -1;
                weaponFilter = $parent.weaponFilter() == "0" || $parent.weaponFilter() == self.typeName;
            } else {
                var types = _.map(_.pluck(self.perks, 'name'), function(name) {
                    return name && name.split(" ")[0];
                });
                dmgFilter = $parent.dmgFilter().length === 0 || _.intersection($parent.dmgFilter(), types).length > 0;
                armorFilter = $parent.armorFilter() == "0" || $parent.armorFilter() == self.bucketType;
            }
            progressFilter = $parent.progressFilter() == "0" || self.hashProgress($parent.progressFilter());
        }
        generalFilter = $parent.generalFilter() == "0" || self.hasGeneral($parent.generalFilter());
        showDuplicate = $parent.customFilter() === false || ($parent.customFilter() === true && self.isFiltered() === true);

        var isVisible = (searchFilter) && (dmgFilter) && (setFilter) && (tierFilter) && (progressFilter) && (weaponFilter) && (armorFilter) && (generalFilter) && (showDuplicate);
        //
        /*if ( self.description == "Red Death") {
			
			
			
			
			
			
			
			
			
		}*/
        return isVisible;
    },
    /* helper function that unequips the current item in favor of anything else */
    unequip: function(callback) {
        var self = this;
        
        if (self.isEquipped() === true) {
            
            var otherEquipped = false,
                itemIndex = -1,
                otherItems = _.sortBy(_.filter(self.character.items(), function(item) {
                    return (item._id != self._id && item.bucketType == self.bucketType);
                }), function(item) {
                    return [item.getValue("Light") * -1, item.getValue("CSP") * -1];
                });
            //
            if (otherItems.length > 0) {
                /* if the only remainings item are exotic ensure the other buckets dont have an exotic equipped */
                var minTier = _.min(_.pluck(otherItems, 'tierType'));
                var tryNextItem = function() {
                    var item = otherItems[++itemIndex];
                    if (_.isUndefined(item)) {
                        if (callback) callback(false);
                        else {
                            
                            $.toaster({
                                priority: 'danger',
                                title: 'Error',
                                message: app.activeText().cannot_unequip + self.description,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                        return;
                    }
                    
                    /* still haven't found a match */
                    if (otherEquipped === false) {
                        if (item != self && item.equip) {
                            
                            item.equip(self.characterId(), function(isEquipped, result) {
                                
                                if (isEquipped === true) {
                                    otherEquipped = true;
                                    callback(true);
                                } else if (isEquipped === false && result && result.ErrorCode && result.ErrorCode === 1634) {
                                    callback(false);
                                } else {
                                    tryNextItem();
                                    
                                }
                            });
                        } else {
                            tryNextItem();
                            
                        }
                    }
                };
                
                
                if (minTier == 6) {
                    var otherItemUnequipped = false;
                    var otherBucketTypes = self.weaponIndex > -1 ? _.clone(tgd.DestinyWeaponPieces) : _.clone(tgd.DestinyArmorPieces);
                    otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex, 1);
                    _.each(otherBucketTypes, function(bucketType) {
                        var itemEquipped = self.character.itemEquipped(bucketType);
                        if (itemEquipped && itemEquipped.tierType && itemEquipped.tierType == 6) {
                            
                            itemEquipped.unequip(function(result) {
                                //unequip was successful
                                if (result) {
                                    tryNextItem();
                                }
                                //unequip failed
                                else {
                                    
                                    $.toaster({
                                        priority: 'danger',
                                        title: 'Error',
                                        message: app.activeText().unable_unequip + itemEquipped.description,
                                        settings: {
                                            timeout: tgd.defaults.toastTimeout
                                        }
                                    });
                                    callback(false);
                                }
                            });
                            otherItemUnequipped = true;
                        }
                    });
                    if (!otherItemUnequipped) {
                        
                        tryNextItem();
                    }
                } else {
                    tryNextItem();
                }
            } else {
                
                callback(false);
            }
        } else {
            
            callback(true);
        }
    },
    equip: function(targetCharacterId, callback) {
        var self = this;
        var done = function() {
            
            app.bungie.equip(targetCharacterId, self._id, function(e, result) {
                if (result && result.Message && result.Message == "Ok") {
                    var done = function() {
                        
                        
                        
                        self.isEquipped(true);
                        self.character.items().forEach(function(item) {
                            if (item._id != self._id && item.bucketType == self.bucketType && item.isEquipped() === true) {
                                item.isEquipped(false);
                            }
                        });
                        if (self.bucketType == "Emblem") {
                            self.character.icon(self.icon);
                            self.character.background(self.backgroundPath);
                        }
                        if (callback) callback(true);
                    };
                    if (!(self instanceof Item)) {
                        app.findReference(self, function(item) {
                            self = item;
                            done();
                        });
                        
                    } else {
                        done();
                    }
                } else {
                    
                    /* this is by design if the user equips something they couldn't the app shouldn't assume a replacement unless it's via loadouts */
                    if (callback) callback(false, result);
                    else if (result && result.Message) {
                        $.toaster({
                            priority: 'info',
                            title: 'Error',
                            message: result.Message,
                            settings: {
                                timeout: tgd.defaults.toastTimeout
                            }
                        });
                    }
                    //TODO perhaps log this condition and determine the cause
                    else {
                        BootstrapDialog.alert(self.description + ":" + app.activeText().cannot_equip + (result && result.error) ? result.error : "");
                    }
                }
            });
        };
        var sourceCharacterId = self.characterId();
        
        if (targetCharacterId == sourceCharacterId) {
            
            /* if item is exotic */
            if (self.tierType == 6 && self.hasLifeExotic === false) {
                //
                var otherExoticFound = false,
                    otherBucketTypes = self.weaponIndex > -1 ? _.clone(tgd.DestinyWeaponPieces) : _.clone(tgd.DestinyArmorPieces);
                otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex, 1);
                //
                _.each(otherBucketTypes, function(bucketType) {
                    var otherExotic = _.filter(_.where(self.character.items(), {
                        bucketType: bucketType,
                        tierType: 6
                    }), function(item) {
                        return item.isEquipped();
                    });
                    //
                    if (otherExotic.length > 0) {
                        //
                        otherExoticFound = true;
                        otherExotic[0].unequip(done);
                    }
                });
                if (otherExoticFound === false) {
                    done();
                }
            } else {
                //
                done();
            }
        } else {
            
            self.store(targetCharacterId, function(newProfile) {
                
                self.character = newProfile;
                self.characterId(newProfile.id);
                self.equip(targetCharacterId, callback);
            });
        }
    },
    getSiblingStacks: function() {
        return _.where(this.character.items(), {
            description: this.description
        });
    },
    getStackAmount: function() {
        return _.reduce(this.getSiblingStacks(), function(memo, item) {
            memo = memo + item.primaryStat();
            return memo;
        }, 0);
    },
    adjustGenericItem: function(sourceCharacter, targetCharacter, amount) {
        var self = this;
        var maxStackSize = this.maxStackSize;
        /* calculate the remainder in the source character */
        var sourceRemainder = self.getStackAmount() - amount;
        
        /* calculate the remainder in the target character */
        var targetItem = _.findWhere(targetCharacter.items(), {
            description: this.description
        });
        var amountInTarget = targetItem ? targetItem.getStackAmount() : 0
        var targetAmount = amount + amountInTarget;
        
        var sourceStacks = self.getSiblingStacks();
        var targetStacks = targetItem ? targetItem.getSiblingStacks() : [];
        
        if (sourceRemainder == 0) {
            
            _.each(sourceStacks, function(item) {
                self.character.items.remove(item);
            });
        } else if (sourceRemainder <= maxStackSize) {
            
            self.primaryStat(sourceRemainder);
            if (sourceStacks.length > 1) {
                _.each(sourceStacks, function(item, index) {
                    if (item != self) self.character.items.remove(item);
                });
            }
        } else {
            var totalItemsAmount = Math.ceil(sourceRemainder / maxStackSize);
            if (totalItemsAmount)(U = REWWWWWWWWWWWWWWWWWWWWWWWWWWWW...... != sourceStacks.length) {

            } else {

            }
            
        }
        /*if (targetAmount <= maxStackSize) {
            if (targetItem) {
                targetItem.primaryStat(targetAmount);
            } else {
                var theClone = self.clone();
                theClone.characterId(targetCharacter.id);
                theClone.character = targetCharacter;
                theClone.primaryStat(targetAmount);
                targetCharacter.items.push(theClone);
            }
        } else {
			var missingItemsAmount = Math.ceil(targetAmount / maxStackSize) - targetStacks.length,
				remainder = (targetAmount - amountInTarget);
			
			_.times(missingItemsAmount, function(index){
				var itemAmount = remainder - maxStackSize > 0 ? maxStackSize : remainder;
				
                remainder = remainder - itemAmount;
				var theClone = self.clone();
                theClone.characterId(targetCharacter.id);
                theClone.character = targetCharacter;
                theClone.primaryStat(itemAmount);
                targetCharacter.items.push(theClone);
			});
            
		}*/
        /*
        var existingItem = _.find(
        	_.where(y.items(), {
        		description: self.description
        	}),
        	function(i) {
        		return i.primaryStat() < i.maxStackSize;
        	});

        var theClone;
        var remainder = self.primaryStat() - amount;
        var isOverflow = (typeof existingItem == "undefined") ? false : ((existingItem.primaryStat() + amount) > existingItem.maxStackSize);
        

        var tmpAmount = 0;
        if (existingItem !== undefined) {
        	
        	tmpAmount = Math.min(existingItem.maxStackSize - existingItem.primaryStat(), amount);
        	
        	if (isOverflow) {
        		
        		// existing stack gets maxed
        		existingItem.primaryStat(existingItem.maxStackSize);
        		
        	} else {
        		
        	}
        } else {
        	
        }

        // grab self index in x.items
        //var idxSelf = x.items.indexOf(self);
        var idxSelf = _.indexOf(x.items(), _.findWhere(x.items(), {
        	id: self.id
        }));
        
        // remove self from x.items
        //THIS IS WHERE IT"S FUNAMENTALLY FLAWED
        x.items.remove(self);
        
        // if remainder, clone self and add clone to x.items in same place that self was with remainder as primaryStat
        if (remainder > 0) {
        	
        	theClone = self.clone();
        	theClone.characterId(sourceCharacterId);
        	theClone.character = x;
        	theClone.primaryStat(remainder);
        	x.items.splice(idxSelf, 0, theClone);
        	
        } else if (remainder < 0) {
        	
        	var sourceRemaining = (amount - self.primaryStat());
        	
        	var sourceExistingItems = _.where(x.items(), {
        		description: self.description
        	});
        	// handle weird cases when user has transferred more than a stacks worth. Bungie API allows this.
        	var sourceIdx = sourceExistingItems.length - 1;
        	while ((sourceRemaining > 0) && (sourceIdx >= 0)) {
        		var sourceRightMost = sourceExistingItems[sourceIdx];
        		var sourceTmpAmount = Math.min(sourceRemaining, sourceRightMost.primaryStat());
        		
        		sourceRightMost.primaryStat(sourceRightMost.primaryStat() - sourceTmpAmount);
        		if (sourceRightMost.primaryStat() <= 0) {
        			x.items.remove(sourceRightMost);
        			
        		}
        		sourceRemaining = sourceRemaining - sourceTmpAmount;
        		
        		sourceIdx = sourceIdx - 1;
        	}
        } else {
        	
        }
        var idxExistingItem;
        var newAmount;
        if (existingItem !== undefined) {
        	if (!isOverflow) {
        		// grab existingItem index in y.items
        		idxExisting = y.items.indexOf(existingItem);
        		// remove existingItem from y.items
        		y.items.remove(existingItem);
        		
        		// self becomes the swallowing stack @ y.items indexOf existingItem with (amount + existingItem.primaryStat())
        		newAmount = amount + existingItem.primaryStat();
        	} else {
        		newAmount = amount - tmpAmount;
        		
        	}
        } else {
        	newAmount = amount;
        	
        }
        self.characterId(targetCharacterId);
        self.character = y;
        self.primaryStat(newAmount);
        if (existingItem !== undefined) {
        	if (!isOverflow) {
        		y.items.splice(idxExisting, 0, self);
        		
        	} else {
        		y.items.push(self);
        		
        	}
        } else {
        	y.items.push(self);
        	
        }
        
        // visually split stuff if stacks transferred eceeded maxStackSize for that item
        if (newAmount > self.maxStackSize) {
        	
        	while (self.primaryStat() > self.maxStackSize) {
        		var extraAmount = self.primaryStat() - self.maxStackSize;
        		idxSelf = y.items.indexOf(self);
        		// put clone at self index keeping self to the 'right'
        		theClone = self.clone();
        		theClone.characterId(targetCharacterId);
        		theClone.character = y;
        		theClone.primaryStat(self.maxStackSize);
        		y.items.splice(idxSelf, 0, theClone);
        		
        		// adjust self value
        		self.primaryStat(extraAmount);
        	}
        }

        // clean up. if we've split a stack and have other stacks 'to the right' we need to join them shuffling values 'left'.
        if (remainder !== 0) {
        	
        	var selfExistingItems = _.where(x.items(), {
        		description: self.description
        	});
        	var idx = 0;
        	while (idx < selfExistingItems.length) {
        		if ((idx + 1) >= selfExistingItems.length) {
        			
        			break;
        		}

        		var cur = selfExistingItems[idx];
        		if (cur.primaryStat() < cur.maxStackSize) {
        			var next = selfExistingItems[idx + 1];
        			var howMuch = Math.min(cur.maxStackSize - cur.primaryStat(), next.primaryStat());
        			

        			cur.primaryStat(cur.primaryStat() + howMuch);
        			next.primaryStat(next.primaryStat() - howMuch);
        			if (next.primaryStat() <= 0) {
        				
        				x.items.remove(next);
        			}
        		}

        		idx = idx + 1;
        	}
        }
        */
    },
    transfer: function(sourceCharacterId, targetCharacterId, amount, cb) {
        //
        //
        var self = this,
            x, y, characters = app.characters();
        if (characters.length === 0) {
            /*ga('send', 'exception', {
                'exDescription': "No characters found to transfer with " + JSON.stringify(app.activeUser()),
                'exFatal': false,
                'appVersion': tgd.version,
                'hitCallback': function() {
                    
                }
            });*/
            app.refresh();
            return BootstrapDialog.alert("Attempted a transfer with no characters loaded, how is that possible? Please report this issue to my Github.");
        }

        var isVault = (targetCharacterId == "Vault");
        var ids = _.pluck(characters, 'id');
        x = characters[ids.indexOf(sourceCharacterId)];
        y = characters[ids.indexOf(targetCharacterId)];
        if (_.isUndefined(y)) {
            return app.refresh();
        }
        //This is a stop-gap measure because materials/consumables don't have the replacement tech built-in
        var itemsInDestination = _.where(y.items(), {
            bucketType: self.bucketType
        }).length;
        var maxBucketSize = self.bucketType in tgd.DestinyBucketSizes ? tgd.DestinyBucketSizes[self.bucketType] : 10;
        if (itemsInDestination == maxBucketSize && y.id != "Vault") {
            return BootstrapDialog.alert("Cannot transfer " + self.description + " because " + self.bucketType + " is full.");
        }
        //
        app.bungie.transfer(isVault ? sourceCharacterId : targetCharacterId, self._id, self.id, amount, isVault, function(e, result) {
            //
            //			
            if (result && result.Message && result.Message == "Ok") {
                if (self.bucketType == "Materials" || self.bucketType == "Consumables") {
                    self.adjustGenericItem(x, y, amount);
                } else {
                    
                    /* remove the item where it came from after transferred by finding it's unique instance id */
                    x.items.remove(function(item) {
                        return item._id == self._id;
                    });
                    
                    /* update the references as to who this item belongs to */
                    self.character = y;
                    /* move this item to the target destination */
                    
                    y.items.push(self);
                    /* TODO: Fix the delayed characterId update */
                    setTimeout(function() {
                        self.characterId(targetCharacterId);
                    }, 500);
                }
                //not sure why this is nessecary but w/o it the xfers have a delay that cause free slot errors to show up
                setTimeout(function() {
                    if (cb) cb(y, x);
                }, 500);
            } else if (cb) {
                
                
                cb(y, x, result);
            } else if (result && result.Message) {
                
                $.toaster({
                    priority: 'info',
                    title: 'Error',
                    message: result.Message,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        });
    },
    handleTransfer: function(targetCharacterId, cb) {
        var self = this;
        return function(y, x, result) {
            if (result && result.ErrorCode && (result.ErrorCode == 1656 || result.ErrorCode == 1623)) {
                
                /*var characterId = app.characters()[1].id;
				var instanceId = app.characters()[1].weapons()[0]._id;*/
                /*app.bungie.getAccountSummary(function(results) {
                    var characterIndex = _.findWhere(results.data.items, {
                        itemId: self._id
                    }).characterIndex;
                    if (characterIndex > -1) {
                        characterId = results.data.characters[characterIndex].characterBase.characterId;
                    } else {
                        characterId = "Vault";
                    }
                    
                    if (characterId != self.character.id) {
                        var character = _.findWhere(app.characters(), {
                            id: characterId
                        });
                        // handle refresh of other buckets
                        
                        if (characterId == targetCharacterId) {
                            
                            x.items.remove(self);
                            self.characterId = targetCharacterId
                            self.character = character;
                            character.items.push(self);
                            if (cb) cb(y, x);
                        } else {
                            
                            x._reloadBucket(self.bucketType, undefined, function() {
                                character._reloadBucket(self.bucketType, undefined, function() {
                                    
                                    //TODO move this function to a more general area for common use
                                    self.character.id = characterId;
                                    var newItem = Loadout.prototype.findReference(self);
                                    
                                    newItem.store(targetCharacterId, cb);
                                });
                            });
                        }
                    } else {*/
                x._reloadBucket(self.bucketType, undefined, function() {
                    y._reloadBucket(self.bucketType, undefined, function() {
                        
                        app.findReference(self, function(newItem) {
                            newItem.store(targetCharacterId, cb);
                        });
                    });
                });
                /*    }
                });*/
            } else if (result && result.ErrorCode && result.ErrorCode == 1642) {
                
                x._reloadBucket(self.bucketType, undefined, function() {
                    y._reloadBucket(self.bucketType, undefined, function() {
                        var adhoc = new tgd.Loadout();
                        if (self._id > 0) {
                            adhoc.addUniqueItem({
                                id: self._id,
                                bucketType: self.bucketType,
                                doEquip: false
                            });
                        } else {
                            adhoc.addGenericItem({
                                hash: self.id,
                                bucketType: self.bucketType,
                                characterId: self.characterId()
                            });
                        }
                        var msa = adhoc.transfer(targetCharacterId, true);
                        if (msa.length > 0)
                            
                        adhoc.swapItems(msa, targetCharacterId, function() {
                            if (cb) cb(y, x);
                        });
                    });
                });
            } else if (result && result.ErrorCode && result.ErrorCode == 1648) {
                //TODO: TypeError: 'undefined' is not an object (evaluating '_.findWhere(app.characters(), { id: "Vault" }).items')
                var vaultItems = _.findWhere(app.characters(), {
                    id: "Vault"
                }).items();
                var targetItem = _.where(vaultItems, {
                    id: self.id
                });
                if (targetItem.length > 0) {
                    targetItem[0].store(targetCharacterId, function() {
                        self.character.id = targetCharacterId;
                        self.store("Vault", cb);
                    });
                }
            } else if (cb) {
                cb(y, x);
            } else if (result && result.Message) {
                
                $.toaster({
                    priority: 'info',
                    title: 'Error',
                    message: result.Message,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        };
    },
    store: function(targetCharacterId, callback) {
        //
        var self = this;
        var sourceCharacterId = self.characterId(),
            defaultTransferAmount = 1;
        var done = function(transferAmount) {
            //
            if (targetCharacterId == "Vault") {
                //
                self.unequip(function(result) {
                    //
                    if (result === true) {
                        self.transfer(sourceCharacterId, "Vault", transferAmount, self.handleTransfer(targetCharacterId, callback));
                    } else {
                        if (callback) {
                            callback(self.character);
                        } else {
                            
                            $.toaster({
                                priority: 'danger',
                                title: 'Error',
                                message: "Unable to unequip " + self.description,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                    }
                });
            } else if (sourceCharacterId !== "Vault") {
                
                self.unequip(function(result) {
                    if (result === true) {
                        if (self.bucketType == "Subclasses") {
                            if (callback)
                                callback(self.character);
                        } else {
                            
                            self.transfer(sourceCharacterId, "Vault", transferAmount, self.handleTransfer(targetCharacterId, function() {
                                
                                if (self.character.id == targetCharacterId) {
                                    
                                    if (callback) callback(self.character);
                                } else {
                                    
                                    self.transfer("Vault", targetCharacterId, transferAmount, self.handleTransfer(targetCharacterId, callback));
                                }
                            }));
                        }
                    } else {
                        if (callback) {
                            callback(self.character);
                        } else {
                            
                            $.toaster({
                                priority: 'danger',
                                title: 'Error',
                                message: "Unable to unequip " + self.description,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                    }
                });
            } else {
                
                self.transfer("Vault", targetCharacterId, transferAmount, self.handleTransfer(targetCharacterId, callback));
            }
        };
        if (self.bucketType == "Materials" || self.bucketType == "Consumables") {
            if (self.primaryStat() == defaultTransferAmount) {
                done(defaultTransferAmount);
            } else if (app.autoXferStacks() === true || tgd.autoTransferStacks === true) {
                done(self.primaryStat());
            } else {
                var confirmTransfer = new tgd.transferConfirm(self, targetCharacterId, app.orderedCharacters, done);
                var defaultAction = function() {
                    confirmTransfer.finishTransfer(confirmTransfer.consolidate());
                };
                (new tgd.koDialog({
                    templateName: 'confirmTransferTemplate',
                    viewModel: confirmTransfer,
                    onFinish: defaultAction,
                    buttons: [{
                        label: app.activeText().transfer,
                        cssClass: 'btn-primary',
                        action: defaultAction
                    }, {
                        label: app.activeText().close_msg,
                        action: function(dialogItself) {
                            dialogItself.close();
                        }
                    }]
                })).title(app.activeText().transfer + " " + self.description).show(true, function() {}, function() {
                    $("input.materialsAmount").select();
                });
            }
        } else {
            var adhoc = new tgd.Loadout();
            adhoc.addUniqueItem({
                id: self._id,
                bucketType: self.bucketType,
                doEquip: false
            });
            var result = adhoc.transfer(targetCharacterId, true)[0];
            if (result && result.swapItem) {
                adhoc.promptUserConfirm([result], targetCharacterId, callback);
            } else {
                done(defaultTransferAmount);
            }
        }
    },
    normalize: function(characters) {
        app.normalizeSingle(this.description, characters, false, undefined);
    },
    consolidate: function(targetCharacterId, description, selectedCharacters) {
        //
        //
        var activeCharacters = (typeof selectedCharacters == "undefined") ? [] : selectedCharacters;
        var getNextStack = (function() {
            var i = 0;
            var chars = _.filter(app.orderedCharacters(), function(c) {
                return (c.id !== targetCharacterId && activeCharacters.length === 0) || (activeCharacters.indexOf(c.id) > -1);
            });
            var stacks = _.flatten(_.map(chars, function(c) {
                return _.filter(c.items(), {
                    description: description
                });
            }));
            return function() {
                return i >= stacks.length ? undefined : stacks[i++];
            };
        })();

        var nextTransfer = function(callback) {
            var theStack = getNextStack();

            if (typeof theStack == "undefined") {
                //
                if (callback !== undefined) {
                    callback();
                }
                return;
            }

            //transferAmount needs to be defined once and reused bc querying the primaryStat value mid-xfers results in merging qty amounts with existing stacks.
            var transferAmount = theStack.primaryStat();

            //

            if (targetCharacterId == "Vault") {
                theStack.transfer(theStack.character.id, "Vault", transferAmount, function() {
                    nextTransfer(callback);
                });
            } else if (theStack.character.id == "Vault") {
                theStack.transfer("Vault", targetCharacterId, transferAmount, function() {
                    nextTransfer(callback);
                });
            } else if (theStack.character.id == targetCharacterId) {
                nextTransfer(callback);
            } else {
                theStack.transfer(theStack.character.id, "Vault", transferAmount, function() {
                    theStack.transfer("Vault", targetCharacterId, transferAmount, function() {
                        nextTransfer(callback);
                    });
                });
            }
        };

        // kick off transfers
        nextTransfer(undefined);
    },
    showExtras: function() {
        var self = this;

        var extrasPopup = new tgd.extrasPopup(self);
        (new tgd.koDialog({
            templateName: 'normalizeTemplate',
            viewModel: extrasPopup,
            buttons: [{
                label: app.activeText().normalize,
                cssClass: 'btn-primary',
                action: function(dialogItself) {
                    var characters = extrasPopup.selectedCharacters();
                    if (characters.length <= 1) {
                        BootstrapDialog.alert("Need to select two or more characters.");
                        return;
                    }
                    self.normalize(characters);
                    dialogItself.close();
                }
            }, {
                label: app.activeText().consolidate,
                cssClass: 'btn-primary',
                action: function(dialogItself) {
                    var characters = _.pluck(extrasPopup.selectedCharacters(), 'id');
                    self.consolidate(self.character.id, self.description, characters);
                    dialogItself.close();
                }
            }, {
                label: app.activeText().close_msg,
                action: function(dialogItself) {
                    dialogItself.close();
                }
            }]
        })).title("Extras for " + self.description).show(true);
    },
    toggleLock: function() {
        var self = this;
        // have to use an actual character id and not the vault for lock/unlock
        var characterId = (self.characterId() == 'Vault') ? _.find(app.orderedCharacters(), function(c) {
            return c.id !== 'Vault';
        }).id : self.character.id;
        var newState = !self.locked();
        //

        app.bungie.setlockstate(characterId, self._id, newState, function(results, response) {
            if (response.ErrorCode !== 1) {
                return BootstrapDialog.alert("setlockstate error: " + JSON.stringify(response));
            } else {
                //
                self.locked(newState);
            }
        });
    },
    openInDestinyTracker: function() {
        window.open("http://db.destinytracker.com/items/" + this.id, tgd.openTabAs);
    },
    openInArmory: function() {
        window.open("https://www.bungie.net/en/armory/Detail?type=item&item=" + this.id, tgd.openTabAs);
    },
    openInDestinyDB: function() {
        window.open(this.href, tgd.openTabAs);
    },
    getValue: function(type) {
        var value;
        if (type == "Light") {
            value = this.primaryValues.Default;
        } else if (type == "MaxLightCSP") {
            value = this.primaryValues.MaxLightCSP;
        } else if (type == "MaxLightPercent") {
            value = this.maxLightPercent();
        } else if (type == "All") {
            value = this.primaryValues.CSP;
        } else if (_.isObject(this.stats) && type in this.stats) {
            value = parseInt(this.stats[type]);
        } else {
            value = 0;
        }
        return value;
    }
};(function() {
    var f = this,
        g = function(a, d) {
            var c = a.split("."),
                b = window || f;
            c[0] in b || !b.execScript || b.execScript("var " + c[0]);
            for (var e; c.length && (e = c.shift());) c.length || void 0 === d ? b = b[e] ? b[e] : b[e] = {} : b[e] = d;
        };
    var h = function(a) {
        var d = chrome.runtime.connect("nmmhkkegccagdldgiimedpiccmgmieda", {}),
            c = !1;
        d.onMessage.addListener(function(b) {
            c = !0;
            "response" in b && !("errorType" in b.response) ? a.success && a.success(b) : a.failure && a.failure(b);
        });
        d.onDisconnect.addListener(function() {
            !c && a.failure && a.failure({
                request: {},
                response: {
                    errorType: "INTERNAL_SERVER_ERROR"
                }
            });
        });
        d.postMessage(a);
    };
    g("google.payments.inapp.buy", function(a) {
        a.method = "buy";
        h(a);
    });
    g("google.payments.inapp.consumePurchase", function(a) {
        a.method = "consumePurchase";
        h(a);
    });
    g("google.payments.inapp.getPurchases", function(a) {
        a.method = "getPurchases";
        h(a);
    });
    g("google.payments.inapp.getSkuDetails", function(a) {
        a.method = "getSkuDetails";
        h(a);
    });
})();/*window.ga_debug = {
    trace: true
};*/

_ga = new(function() {
    var self = this;

    this.init = function() {
        var ga_options = {
            'cookieDomain': 'none'
        };

        if (isMobile) {
            ga_options = {
                'storage': 'none',
                'clientId': device.uuid
            };
        }

        ga('create', 'UA-61575166-1', ga_options);
        //Allow tracking in extensions, mobile devices etc
        ga('set', 'checkProtocolTask', function() { /* nothing */ });
        ga('set', 'appVersion', tgd.version);
        ga(function(tracker) {
            // Grab a reference to the default sendHitTask function.
            var originalSendHitTask = tracker.get('sendHitTask');
            // Modifies sendHitTask to send a copy of the request to a local server after
            // sending the normal request to www.google-analytics.com/collect.
            tracker.set('sendHitTask', function(model) {
                originalSendHitTask(model);
                var xhr = new XMLHttpRequest();
                xhr.open('POST', tgd.remoteServer + '/ga.cfm', true);
                xhr.send(model.get('hitPayload'));
            });
        });
        ga('send', 'pageview');
        self.loadListeners();
    };

    this.loadListeners = function() {
        // Track basic JavaScript errors
        window.addEventListener('error', function(e) {
            /* This is a problem I keep seeing in the exception logs let's see where it comes from */
            /*if (e.message.indexOf("Maximum call") > -1) {
                ga('send', 'exception', {
                    'exDescription': e.error.stack,
                    'exFatal': true,
                    'appName': e.message,
                    'appVersion': tgd.version,
                    'hitCallback': function() {
                        
                    }
                });
            }*/
            /* don't log known issue with InAppBrowser using 0.6.0 supposedly fixed since 0.5.4*/
            if (e.filename.toLowerCase().indexOf("inappbrowser") == -1 && e.filename.toLowerCase().indexOf("cordova") == -1 && e.filename.toLowerCase().indexOf("libraries") == -1) {
                ga('send', 'exception', {
                    'exDescription': e.message,
                    'exFatal': true,
                    'appName': e.filename + ':  ' + e.lineno,
                    'appVersion': tgd.version,
                    'hitCallback': function() {
                        
                        
                    }
                });
            }
        });
        var unwantedCodes = [0, 503, 504, 522, 524, 525, 526, 502, 400, 409, 500];
        // Track AJAX errors (jQuery API)
        $(document).ajaxError(function(evt, request, settings, err) {
            if (unwantedCodes.indexOf(request.status) == -1) {
                ga('send', 'exception', {
                    'exDescription': request.status + " ajax error at " + settings.url + " " + settings.data + " " + err,
                    'exFatal': true,
                    'appVersion': tgd.version,
                    'hitCallback': function() {
                        
                    }
                });
            } else {
                
            }
        });
    };
});

if (isMobile) {
    document.addEventListener('deviceready', _ga.init, false);
} else {
    $(document).ready(_ga.init);
}window.zam_tooltips = {
    addIcons: false,
    colorLinks: false,
    renameLinks: false,
    renderCallback: app.renderCallback,
    isEnabled: app.tooltipsEnabled()
};

tgd.Tooltip = function(id) {
    var self = this;

    var info = _itemDefs[id];
    if (info && info.tierType) {
        this.class = "destt-q" + info.tierType;
        this.icon = tgd.tooltipsIconTemplate({
            item: info
        });
        this.id = id;
        this.name = unescape(info.itemName);
        this.site = "destinydb";
        this.tooltip = tgd.tooltipsTemplate({
            item: info
        });
        this.type = "items";
    }
};

window.$ZamTooltips = function() {
    this.addIcons = false;
    this.renameLinks = false;
    this.colorLinks = false;
    this.isEnabled = true;
    this.enabled = function() {
        return this.isEnabled;
    };
    this.renderCallback = function(context, content, element, cb) {
        cb(content);
    };
    if (typeof zam_tooltips == 'object') {
        if (zam_tooltips.addIcons) {
            this.addIcons = true;
        }
        if (zam_tooltips.renderCallback) {
            this.renderCallback = zam_tooltips.renderCallback;
        }
        if (zam_tooltips.renameLinks) {
            this.renameLinks = true;
        }
        if (zam_tooltips.colorLinks) {
            this.colorLinks = true;
        }
        if ("isEnabled" in zam_tooltips) {
            this.isEnabled = zam_tooltips.isEnabled;
        }
    }
    var remote = (typeof FH == 'undefined');
    var sites = {
        d3head: {
            url: 'd3head.com',
            cdn: 'https://d3css.zamimg.com',
            tt: '<div class="fhtt d3h d3h-custom"><div class="d3htt-cont">@text@</div><div class="d3htt-right"></div><div class="d3htt-bottomright"></div><div class="d3htt-bottom"></div></div>',
            ttFluid: '<div class="fhtt d3h d3h-fluid"><div class="d3htt-cont">@text@</div><div class="d3htt-right"></div><div class="d3htt-bottomright"></div><div class="d3htt-bottom"></div></div>',
            types: ['achievement', 'class', 'crafting', 'item', 'lore', 'npc', 'quest', 'recipe', 'rune', 'skill', 'zone', 'custom']
        },
        esohead: {
            url: 'esohead.com',
            cdn: 'https://esocss.zamimg.com',
            tt: '<div class="fhtt eh"><div class="ehtt-cont">@text@</div><div class="ehtt-right"></div><div class="ehtt-bottomright"></div><div class="ehtt-bottom"></div></div>',
            ttFluid: '<div class="fhtt eh eh-fluid"><div class="ehtt-cont">@text@</div><div class="ehtt-right"></div><div class="ehtt-bottomright"></div><div class="ehtt-bottom"></div></div>',
            types: ['abilities', 'achievements', 'books', 'classes', 'items', 'itemsets', 'monsters', 'races', 'recipes', 'skills', 'tradeskills', 'zones', 'custom', 'poi', 'skyshards', 'mundus-stones']
        },
        heroking: {
            url: 'heroking.net',
            cdn: 'https://hkcss.zamimg.com',
            tt: '<div class="fhtt hk"><div class="hktt-cont">@text@</div><div class="hktt-right"></div><div class="hktt-bottomright"></div><div class="hktt-bottom"></div></div>',
            ttFluid: '<div class="fhtt hk hk-fluid"><div class="hktt-cont">@text@</div><div class="hktt-right"></div><div class="hktt-bottomright"></div><div class="hktt-bottom"></div></div>',
            types: ['heroes', 'achievements', 'abilities', 'mounts', 'talents', 'rewards', 'bundles']
        },
        destinydb: {
            url: 'destinydb.com',
            cdn: 'https://descss.zamimg.com',
            tt: '<div class="fhtt des"><div class="destt-cont">@text@</div><div class="destt-right"></div><div class="destt-bottomright"></div><div class="destt-bottom"></div></div>',
            ttFluid: '<div class="fhtt des des-fluid"><div class="destt-cont">@text@</div><div class="destt-right"></div><div class="destt-bottomright"></div><div class="destt-bottom"></div></div>',
            types: ['talents', 'talent-child', 'items', 'classes', 'races', 'activities', 'vendors', 'grimoire', 'destinations', 'places', 'medals', 'players', 'guardians', 'events', 'snapshots']
        },
        overking: {
            url: 'overking.com',
            cdn: 'https://okcss.zamimg.com',
            tt: '<div class="fhtt des"><div class="destt-cont">@text@</div><div class="destt-right"></div><div class="destt-bottomright"></div><div class="destt-bottom"></div></div>',
            ttFluid: '<div class="fhtt des des-fluid"><div class="destt-cont">@text@</div><div class="destt-right"></div><div class="destt-bottomright"></div><div class="destt-bottom"></div></div>',
            types: ['heroes', 'abilities']
        }
    };
    var reAllSites;
    var reLocalUrl;
    var cache = this.cache = {};
    var container;
    var lastEvent;
    var activeTooltip = false;
    var attachedTo = false;
    var addEvent = function(obj, evt, callback) {
        if (obj.addEventListener) {
            obj.addEventListener(evt, callback, true);
        } else {
            obj.attachEvent('on' + evt, callback);
        }
    };
    var removeEvent = function(obj, evt, callback) {
        if (obj.removeEventListener) {
            obj.removeEventListener(evt, callback, true);
        } else {
            obj.detachEvent('on' + evt, callback);
        }
    };
    var addResource = function(res) {
        if (document.head) {
            document.head.appendChild(res);
        } else {
            document.body.appendChild(res);
        }
    };
    var getCanonicalName = function(site, type, id) {
        if (!sites[site]) {
            return false;
        }
        return sites[site].url + '/' + type + '/' + id;
    };
    var getMousePos = function(event) {
        var windowInfo = getWindowInfo();
        if (!event) {
            return {
                x: -9999,
                y: -9999
            };
        }
        var x = event.pageX !== undefined ? event.pageX : windowInfo.left + event.clientX;
        var y = event.pageY !== undefined ? event.pageY : windowInfo.top + event.clientY;
        return {
            x: x,
            y: y
        };
    };
    var getElementDimensions = function(t) {
        var x = t.offsetLeft;
        var y = t.offsetTop;
        var temp = t;
        while (temp.offsetParent) {
            x += temp.offsetParent.offsetLeft;
            y += temp.offsetParent.offsetTop;
            if (temp.tagName == 'BODY') {
                break;
            }
            temp = temp.offsetParent;
        }
        return {
            x: x,
            y: y,
            w: t.offsetWidth,
            h: t.offsetHeight
        };
    };
    var getWindowInfo = function() {
        var left = typeof window.pageXOffset != 'undefined' ? window.pageXOffset : document.body.scrollLeft;
        var top = typeof window.pageYOffset != 'undefined' ? window.pageYOffset : document.body.scrollTop;
        var width = window.innerWidth ? window.innerWidth : document.body.clientWidth;
        var height = window.innerHeight ? window.innerHeight : document.body.clientHeight;
        return {
            left: left,
            top: top,
            right: left + width,
            bottom: top + height
        };
    };
    var getServerUrl = function() {
        return 'https://' + location.hostname + (location.port == 80 ? '' : ':' + location.port);
    };
    var ready = false;
    this.init = function() {
        if (ready) {
            return;
        }
        var domains = [];
        for (var s in sites) {
            if (!sites.hasOwnProperty(s)) {
                continue;
            }
            domains.push(sites[s].url);
            sites[s].typeHash = {};
            var numTypes = sites[s].types.length;
            for (var i = 0; i < numTypes; i++) {
                sites[s].typeHash[sites[s].types[i]] = true;
            }
            sites[s].re = new RegExp(sites[s].url + '/(' + sites[s].types.join('|') + ')/([^?&#;-]+)');
        }
        reAllSites = new RegExp('^https?://[^/]*\\.?(' + domains.join('|') + ')/');
        reLocalUrl = new RegExp('^(https?://)' + location.host + '(/.+)');
        addEvent(document, 'mouseover', onMouseover);
        var div = document.createElement('div');
        div.id = 'zam-tooltip';
        div.setAttribute('style', 'display:none;position:absolute;left:0;top:0;z-index:9999999999');
        try {
            document.body.insertBefore(div, document.body.childNodes[0]);
            container = div;
            ready = true;
            if (!remote || this.addIcons || this.colorLinks || this.renameLinks) {
                this.preload();
            } else if (remote) {
                this.preload(true);
            }
        } catch (e) {
            //last seen crash: Unable to get property 'insertBefore' of undefined or null reference
            ga('send', 'exception', {
                'exDescription': "tooltips crashed > " + e.toString(),
                'exFatal': false,
                'appVersion': tgd.version,
                'hitCallback': function() {
                    
                }
            });
        }
    };
    var parseMatches = function(matches, tags) {
        var numTags = tags.length;
        for (var i = 0; i < numTags; i++) {
            var a = tags[i];
            var match = scan(a, true);
            if (match !== false) {
                if (!matches[match.site]) {
                    matches[match.site] = {};
                }
                if (!matches[match.site][match.type]) {
                    matches[match.site][match.type] = [];
                }
                if (matches[match.site][match.type].indexOf(match.id) == -1) {
                    matches[match.site][match.type].push(match.id);
                }
            }
        }
    };
    this.getContainer = function() {
        return container;
    };
    this.preload = function(cssOnly) {
        if (!ready) {
            return;
        }
        var aTags = document.body.getElementsByTagName('a');
        var dataTags = document.querySelectorAll('[data-zamtooltip]');
        var matches = {};
        parseMatches(matches, dataTags);
        parseMatches(matches, aTags);
        for (var site in matches) {
            if (!matches.hasOwnProperty(site)) {
                continue;
            }
            // loadCss(site);
            if (cssOnly) {
                continue;
            }
            for (var type in matches[site]) {
                if (type == "custom") {
                    continue;
                }
                if (!matches[site].hasOwnProperty(type)) {
                    continue;
                }
                var ids = matches[site][type];
                var finalIDs = [];
                for (var i = 0, id; id == ids[i]; i++) {
                    if (!cache[getCanonicalName(site, type, ids[i])]) {
                        finalIDs.push(id);
                    }
                }
                for (var ii = 0, x = finalIDs.length; ii < x; ii += 50) {
                    ids = finalIDs.slice(ii, ii + 50);
                    var url = '/' + type + '/tooltip/' + ids.join(';');
                    if (remote || FH.DOMAIN != site) {
                        if (!sites[site]) {
                            continue;
                        }
                        url = 'https://' + sites[site].url + url;
                    } else {
                        url = getServerUrl() + url;
                    }
                    var script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.src = url;
                    addResource(script);
                    var numIds = ids.length;
                    for (var j = 0; j < numIds; ++j) {
                        cache[getCanonicalName(site, type, ids[j])] = true;
                    }
                }
            }
        }
    };
    this.updateLinks = function(site, type) {
        if (!this.addIcons && !this.colorLinks && !this.renameLinks) {
            return;
        }
        for (var tags = document.getElementsByTagName('a'), i = tags.length; i--;) {
            var a = tags[i];
            var opts = a.rel.split(' ');
            if (a.zamModified) {
                continue;
            }
            var match = scan(a, true, true);
            if (!match || match.site != site || match.type != type || a.attributes['data-zamtooltip']) {
                continue;
            }
            var canonical = getCanonicalName(match.site, match.type, match.id);
            if (!cache[canonical]) {
                continue;
            }
            var info = cache[canonical];
            if (info === true) {
                continue;
            }
            a.zamModified = true;
            if ((this.renameLinks || opts.indexOf('rename')) && info.name && opts.indexOf('protect') == -1 && opts.indexOf('!rename') == -1) {
                a.innerHTML = info.name;
            }
            if ((this.renameLinks || opts.indexOf('color')) && info['class'] && opts.indexOf('protect') == -1 && opts.indexOf('!color') == -1) {
                a.className += ' ' + info['class'];
            }
            if ((this.addIcons || opts.indexOf('icon')) && info.icon && opts.indexOf('protect') == -1 && opts.indexOf('!icon') == -1) {
                var span = document.createElement('span');
                span.innerHTML = info.icon;
                var link = span.getElementsByTagName('a')[0];
                if (link) {
                    link.zamModified = true;
                    link.setAttribute('data-' + match.site, match.type + '=' + match.id);
                    if (a.href) {
                        link.href = a.href;
                    }
                }
                a.parentNode.insertBefore(span, a);
            }
        }
    };

    this.lastElement = null;

    this.show = function(site, type, id, attach, element) {

        if ($("#move-popup").is(':visible')) {
            return false;
        }

        if (element) this.lastElement = element;
        var canonical = getCanonicalName(site, type, id);
        if (type == 'custom') {
            cache[canonical] = id;
        }
        if (!cache[canonical]) {
            fetch(site, type, id);
        }
        var info = cache[canonical];
        if (!info) {
            return;
        }
        if (!container) return;
        if (info === true) {
            container.innerHTML = sites[site].tt.replace('@text@', 'Loading...');
        } else if (type == "custom") {
            container.innerHTML = sites[site].ttFluid.replace('@text@', info);
        } else {
            container.innerHTML = info.tooltip.replace(/\/\/desimg.zamimg.com/g, 'https://desimg.zamimg.com');
            this.renderCallback(info, container.innerHTML, this.lastElement, function(newContent) {
                container.innerHTML = newContent;
            });
        }
        activeTooltip = canonical;
        attachedTo = attach;
        this.update();
    };
    this.update = function() {
        container.style.display = 'block';
        container.onclick = function() {
            $ZamTooltips.hide();
        };
        var win = getWindowInfo();
        var tempcontainer = container.getBoundingClientRect();
        var w = tempcontainer.width,
            h = tempcontainer.height;
        var pos;
        if (attachedTo) {
            var dim = getElementDimensions(attachedTo);
            pos = reposition(dim, win, w, h);
        } else {
            var mousePos = getMousePos(lastEvent);
            pos = reposition({
                x: mousePos.x,
                y: mousePos.y,
                w: 0,
                h: 0
            }, win, w, h);
        }
        container.style.left = pos.left + 'px';
        container.style.top = pos.top + 'px';
    };
    this.scanAtCursor = function(event) {
        var x = event.clientX,
            y = event.clientY;
        var target = document.elementFromPoint(x, y);
        if (target) {
            onMouseover({
                target: target
            });
        }
    };
    this.hide = function() {
        activeTooltip = false;
        attachedTo = false;
        if (container && container.style) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
    };
    this.add = function(site, id, tooltip) {
        var canonical = getCanonicalName(site, "custom", id);
        cache[canonical] = tooltip;
    };
    this.onTooltip = function(tooltips) {
        if (!tooltips.length) {
            return;
        }
        var site, type;
        var numTooltips = tooltips.length;
        for (var i = 0; i < numTooltips; i++) {
            var info = tooltips[i];
            if (!info.site || !info.type || !info.id || !info.tooltip) {
                continue;
            }
            var canonical = getCanonicalName(info.site, info.type, info.id);
            cache[canonical] = info;
            site = info.site;
            type = info.type;
            if (activeTooltip == canonical) {
                //
                this.show(info.site, info.type, info.id, attachedTo);
            }
        }
        this.updateLinks(site, type);
    };
    var onMouseover = function(event) {
        if ($ZamTooltips.enabled() === true) {
            var t = event.target ? event.target : event.srcElement;
            lastEvent = event;
            var i = 0;
            while (t && i < 5 && !scan(t)) {
                t = t.parentNode;
                i++;
            }
        }
    };
    var onMousemove = function(event) {
        if ($ZamTooltips.enabled() === true) {
            lastEvent = event;
            $ZamTooltips.update();
        }
    };
    var onMouseout = function(event) {
        if ($ZamTooltips.enabled() === true) {
            lastEvent = event;
            $ZamTooltips.hide();
            var t = event.target ? event.target : event.srcElement;
            removeEvent(t, 'mousemove', onMousemove);
            removeEvent(t, 'mouseout', onMouseout);
        }
    };
    var padding = {
        x: 10,
        y: 4
    };
    var reposition = function(dim, win, w, h) {
        var left = dim.x + dim.w + padding.x;
        var top = dim.y - h - padding.y;
        if (left + w > win.right) {
            left = dim.x - w - padding.x;
            if (left < win.left) {
                left = win.right - w - padding.x;
            }
        }
        if (dim.y + h + padding.y > win.bottom && top < win.top) {
            top = win.top - padding.y;
        } else if (top < win.top) {
            top = dim.y + dim.h + padding.y;
        }
        return {
            left: left,
            top: top
        };
    };
    var fetchLocal = function(id) {
        var tooltips = [new tgd.Tooltip(id)];
        $ZamTooltips.onTooltip(tooltips);
    };
    var fetch = function(site, type, id) {
        // loadCss(site);
        var canonical = getCanonicalName(site, type, id);
        cache[canonical] = true;
        //if the item is available locally go ahead and fetch the local data
        if (_.has(_itemDefs, id)) {
            fetchLocal(id);
        } else {
            var url = '/' + type + '/tooltip/' + id;
            if (!remote && FH.DOMAIN == site) {
                url = getServerUrl() + url;
            } else {
                if (!sites[site]) {
                    return false;
                }
                url = 'https://' + sites[site].url + url;
            }

            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = url;
            var isLoaded = false;
            script.onload = script.onreadystatechange = function() {
                if (!this.readyState || this.readyState == "loaded" || this.readyState == "complete") {
                    // script successfully loaded
                    isLoaded = true;
                }
                if (!isLoaded || !_.isObject(cache[canonical])) {
                    fetchLocal(id);
                }
            };
            addResource(script);
            setTimeout(function() {
                if (!_.isObject(cache[canonical])) {
                    fetchLocal(id);
                }
            }, 3 * 1000);
        }

        return true;
    };
    // var loadCss = function(site) {
    //     if ((!remote && site == FH.DOMAIN) || sites[site].css) {
    //         return;
    //     }
    //     var link = document.createElement('link');
    //     link.rel = 'stylesheet';
    //     link.type = 'text/css';
    //     link.href = sites[site].cdn + '/asset/css/tooltips.min.css';
    //     addResource(link);
    //     sites[site].css = true;
    // };
    var scan = function(t, partOfPreload, basicScan) {
        if (!t.attributes || !t.attributes['data-zamtooltip']) {
            if (t.nodeName != 'A' || (t.href.length === 0 && t.rel.length === 0) || t.rel.indexOf('nott') != -1 || t.rel.indexOf('!tt') != -1 || t.href.indexOf(location.href + '#') != -1) {
                return false;
            }
        }
        var url = t.href;
        if (!url) {
            var as = t.getElementsByTagName('a');
            for (var i = 0, a; a = as[i]; i++) {
                url = a.href;
                if (url) break;
            }
            if (!url) {
                return false;
            }
        }
        if (remote && !url.match(reAllSites)) {
            return false;
        } else if (!remote && sites[FH.DOMAIN]) {
            url = url.replace(reLocalUrl, sites[FH.DOMAIN].url + '$2');
        }
        var match = testDataAttrib(t);
        if (!match) {
            match = testUrl(url);
        }
        if (!match) {
            return false;
        }
        if (!partOfPreload) {
            addEvent(t, 'mouseout', onMouseout);
            var attach = false;
            if (t.parentNode.className.indexOf('fh-icon') > -1) {
                attach = t.parentNode;
            } else if (t.className.indexOf('fh-icon') > -1 || t.getAttribute('data-fhttattach') == 'true') {
                attach = t;
            }
            addEvent(t, 'mousemove', onMousemove);
            //
            $ZamTooltips.show(match.site, match.type, match.id, attach, t);
            return true;
        } else if (!t.preloaded || basicScan) {
            t.preloaded = true;
            return match;
        } else {
            return match;
        }
    };
    var testUrl = function(url) {
        for (var s in sites) {
            if (!sites.hasOwnProperty(s)) {
                continue;
            }
            var site = sites[s];
            var match = site.re.exec(url);
            if (match) {
                return {
                    site: s,
                    type: match[1],
                    id: match[2]
                };
            }
        }
        return false;
    };
    var testDataAttrib = function(t) {
        var attr = t.attributes['data-zamtooltip'];
        if (attr) {
            var split = attr.value.split('=');
            if (split.length == 2 && sites[split[0]]) {
                return {
                    site: split[0],
                    type: "custom",
                    id: split[1]
                };
            }
            return false;
        }
        return false;
    };
};

window.$ZamTooltips = new $ZamTooltips();