tgd.dialog = (function(options) {
    var self = this;

    this.modal;

    this.title = function(title) {
        self.modal = new BootstrapDialog(options);
        self.modal.setTitle(title);
        return self;
    }

    this.content = function(content) {
        self.modal.setMessage(content);
        return self;
    }

    this.buttons = function(buttons) {
        self.modal.setClosable(true).enableButtons(true).setData("buttons", buttons);
        return self;
    }

    this.show = function(excludeClick, cb) {
        self.modal.open();
        var mdl = self.modal.getModal();
        if (!excludeClick) {
            mdl.bind("click", function() {
                self.modal.close();
            });
        }
        mdl.on("hide.bs.modal", cb);
        return self;
    }

    return self.modal;
});

var activeElement;
tgd.moveItemPositionHandler = function(element, item) {
    app.activeItem(item);
    if (app.destinyDbMode() == true) {
        window.open(item.href, "_system");
        return false;
    } else if (app.loadoutMode() == true) {
        var existingItem = _.findWhere(app.activeLoadout().ids(), {
            id: item._id
        });
        if (existingItem)
            app.activeLoadout().ids.remove(existingItem);
        else {
            if (item._id == 0) {
                BootstrapDialog.alert("Currently unable to create loadouts with this item type.");
            } else if (_.where(app.activeLoadout().items(), {
                    bucketType: item.bucketType
                }).length < 9) {
                app.activeLoadout().addItem({
                    id: item._id,
                    bucketType: item.bucketType,
                    doEquip: false
                });
            } else {
                BootstrapDialog.alert("You cannot create a loadout with more than 9 items in the " + item.bucketType + " slots");
            }
        }
    } else {
        var $movePopup = $("#move-popup");
        if (item.bucketType == "Post Master") {
            return BootstrapDialog.alert("Post Master items cannot be transferred with the API.");
        }
        if (element == activeElement) {
            $movePopup.hide();
            activeElement = null;
        } else {
            activeElement = element;
            $ZamTooltips.hide();
            if (window.isMobile) {
                $("body").css("padding-bottom", $movePopup.height() + "px");
                /* bringing back the delay it's sitll a problem in issue #128 */
                setTimeout(function() {
                    $movePopup.show();
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
}

window.ko.bindingHandlers.scrollToView = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        Hammer(element, {
                time: 2000
            })
            .on("tap", function() {
                var index = $(".profile#" + viewModel.id).index(".profile"),
                    distance = $(".profile:eq(" + index + ")").position().top - 50;
                app.scrollTo(distance);
            })
            .on("press", function() {

                BootstrapDialog.alert("This icon is " + viewModel.uniqueName);
            });
        app.quickIconHighlighter();
    }
};

window.ko.bindingHandlers.fastclick = {
    init: function(element, valueAccessor) {
        FastClick.attach(element);
        return ko.bindingHandlers.click.init.apply(this, arguments);
    }
};

ko.bindingHandlers.moveItem = {
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
            // press is actually hold 
            .on("press", function(ev) {
                var target = tgd.getEventDelegate(ev.target, ".itemLink");
                if (target) {
                    var context = ko.contextFor(target);
                    if (context && "$data" in context) {
                        var item = ko.contextFor(target).$data;
                        if (item && item.doEquip && app.loadoutMode() == true) {
                            item.doEquip(!item.doEquip());
                            item.markAsEquip(item, {
                                target: target
                            });
                        } else {
                            $ZamTooltips.lastElement = target;
                            $ZamTooltips.show("destinydb", "items", item.id, target);
                        }
                    }
                }
            });
    }
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
}

var User = function(model) {
    var self = this;
    _.each(model, function(value, key) {
        self[key] = value;
    });
    //try loading the Playstation account first
    this.activeSystem = ko.observable(self.psnId ? "PSN" : "XBL");
}

tgd.getStoredValue = function(key) {
    var saved = "";
    if (window.localStorage && window.localStorage.getItem)
        saved = window.localStorage.getItem(key);
    if (_.isEmpty(saved)) {
        return tgd.defaults[key];
    } else {
        return saved
    }
}

tgd.StoreObj = function(key, compare, writeCallback) {
    var value = ko.observable(compare ? tgd.getStoredValue(key) == compare : tgd.getStoredValue(key));
    this.read = function() {
        return value();
    }
    this.write = function(newValue) {
        window.localStorage.setItem(key, newValue);
        value(newValue);
        if (writeCallback) writeCallback(newValue);
    }
}

var app = new(function() {
    var self = this;
    var dataDir = "data";

    this.retryCount = ko.observable(0);
    this.loadingUser = ko.observable(false);
    this.hiddenWindowOpen = ko.observable(false);
    this.loadoutMode = ko.observable(false);
    this.destinyDbMode = ko.observable(false);
    this.activeLoadout = ko.observable(new Loadout());
    this.loadouts = ko.observableArray();
    this.searchKeyword = ko.observable(tgd.defaults.searchKeyword);
    this.activeView = ko.computed(new tgd.StoreObj("activeView"));
    this.doRefresh = ko.computed(new tgd.StoreObj("doRefresh", "true"));
    this.autoTransferStacks = ko.computed(new tgd.StoreObj("autoTransferStacks", "true"));
    this.padBucketHeight = ko.computed(new tgd.StoreObj("padBucketHeight", "true"));
    this.tooltipsEnabled = ko.computed(new tgd.StoreObj("tooltipsEnabled", "true", function(newValue) {
        $ZamTooltips.isEnabled = newValue;
    }));
    this.refreshSeconds = ko.computed(new tgd.StoreObj("refreshSeconds"));
    this.tierFilter = ko.computed(new tgd.StoreObj("tierFilter"));
    this.typeFilter = ko.observable(tgd.defaults.typeFilter);
    this.dmgFilter = ko.observableArray(tgd.defaults.dmgFilter);
    this.progressFilter = ko.observable(tgd.defaults.progressFilter);
    this.setFilter = ko.observableArray(tgd.defaults.setFilter);
    this.setFilterFix = ko.observableArray(tgd.defaults.setFilter);
    this.shareView = ko.observable(tgd.defaults.shareView);
    this.shareUrl = ko.observable(tgd.defaults.shareUrl);
    this.showMissing = ko.observable(tgd.defaults.showMissing);
    this.showDuplicate = ko.observable(tgd.defaults.showDuplicate);

    this.sortedLoadouts = ko.computed(function() {
        return self.loadouts().sort(function(left, right) {
            return left.name == right.name ? 0 : (left.name < right.name ? -1 : 1);
        });
    });

    this.activeItem = ko.observable();
    this.activeUser = ko.observable(new User());

    this.weaponTypes = ko.observableArray();
    this.characters = ko.observableArray();
    this.orderedCharacters = ko.computed(function() {
        return self.characters().sort(function(a, b) {
            return a.order - b.order;
        });
    });

    this.createLoadout = function() {
        self.loadoutMode(true);
        self.activeLoadout(new Loadout());
    }
    this.cancelLoadout = function() {
        self.loadoutMode(false);
        self.activeLoadout(new Loadout());
    }

    this.showHelp = function() {
        (new tgd.dialog).title("Help").content($("#help").html()).show();
    }

    this.showAbout = function() {
        (new tgd.dialog).title("About").content($("#about").html()).show();
    }

    this.incrementSeconds = function() {
        self.refreshSeconds(parseInt(self.refreshSeconds()) + 1);
    }

    this.decrementSeconds = function() {
        self.refreshSeconds(parseInt(self.refreshSeconds()) - 1);
    }

    this.clearFilters = function(model, element) {
        self.activeView(tgd.defaults.activeView);
        self.searchKeyword(tgd.defaults.searchKeyword);
        self.doRefresh(tgd.defaults.doRefresh);
        self.refreshSeconds(tgd.defaults.refreshSeconds);
        self.tierFilter(tgd.defaults.tierFilter);
        self.typeFilter(tgd.defaults.typeFilter);
        self.dmgFilter([]);
        self.progressFilter(tgd.defaults.progressFilter);
        self.setFilter([]);
        self.setFilterFix([]);
        self.shareView(tgd.defaults.shareView);
        self.shareUrl(tgd.defaults.shareUrl);
        self.showMissing(tgd.defaults.showMissing);
        self.showDuplicate(tgd.defaults.showDuplicate);
        $(element.target).removeClass("active");
        return false;
    }
    this.renderCallback = function(context, content, element, callback) {
        if (element) lastElement = element
        var instanceId = $(lastElement).attr("instanceId"),
            activeItem, $content = $("<div>" + content + "</div>");
        self.characters().forEach(function(character) {
            ['weapons', 'armor'].forEach(function(list) {
                var item = _.findWhere(character[list](), {
                    '_id': instanceId
                });
                if (item) activeItem = item;
            });
        });
        if (activeItem) {
            /* Damage Colors */
            if ($content.find("[class*='destt-damage-color-']").length == 0 && activeItem.damageType > 1) {
                var burnIcon = $("<div></div>").addClass("destt-primary-damage-" + activeItem.damageType);
                $content.find(".destt-primary").addClass("destt-damage-color-" + activeItem.damageType).prepend(burnIcon);
            }
            /* Weapon Perks (Pre-HoW) */
            if (activeItem.perks && $content.find(".destt-talent").length == 1 && $content.find(".destt-talent-description").text().indexOf("Year 1")) {
                $content.find(".destt-talent").replaceWith(tgd.perksTemplate({
                    perks: activeItem.perks
                }));
            }
            /* Weapon Perks (Post-HoW) */
            else if (activeItem.perks && $content.find(".destt-talent").length == 0) {
                $content.find(".destt-info").prepend(tgd.perksTemplate({
                    perks: activeItem.perks
                }));
            }
            /* Armor Perks */
            else if (activeItem.perks && tgd.DestinyArmorPieces.indexOf(activeItem.bucketType) > -1 && self.tierType !== 6) {
                $content.find(".destt-talent").replaceWith(tgd.perksTemplate({
                    perks: activeItem.perks
                }));
            }
            /* Armor Stats */
            var stats = $content.find(".destt-stat");
            if (activeItem.stats && stats.length > 0) {
                stats.html(
                    stats.find(".stat-bar").map(function(index, stat) {
                        var $stat = $("<div>" + stat.outerHTML + "</div>"),
                            label = $stat.find(".stat-bar-label"),
                            labelText = $.trim(label.text());
                        if (labelText in activeItem.stats) {
                            label.text(labelText + ": " + activeItem.stats[labelText]);
                            $stat.find(".stat-bar-static-value").text(" Min/Max: " + $stat.find(".stat-bar-static-value").text());
                        }
                        return $stat.html();
                    }).get().join("")
                );
            }
            $content.find(".destt-primary-min").html(activeItem.primaryStat);
        } else {
            //remove the "Emblem" title from the image issue #31
            if ($content.find(".fhtt-emblem").length > 0) {
                $content.find("span").remove();
            }
        }
        var width = $(window).width();
        //this fixes issue #35 makes destinydb tooltips fit on a mobile screen
        if (width < 340) {
            $content.find(".fhtt.des").css("width", (width - 15) + "px");
            $content.find(".stat-bar-empty").css("width", "125px");
        }
        callback($content.html());
    }
    this.toggleRefresh = function() {
        self.toggleBootstrapMenu();
        self.doRefresh(!self.doRefresh());
    }
    this.togglePadBucketHeight = function() {
        self.toggleBootstrapMenu();
        self.padBucketHeight(!self.padBucketHeight());
        self.bucketSizeHandler();
    }
    this.toggleTransferStacks = function() {
        self.toggleBootstrapMenu();
        self.autoTransferStacks(!self.autoTransferStacks());
    }
    this.toggleDestinyDbMode = function() {
        self.toggleBootstrapMenu();
        self.destinyDbMode(!self.destinyDbMode());
    }
    this.toggleDestinyDbTooltips = function() {
        self.toggleBootstrapMenu();
        self.tooltipsEnabled(!self.tooltipsEnabled());
    }
    this.toggleShareView = function() {
        self.toggleBootstrapMenu();
        self.shareView(!self.shareView());
    }
    this.toggleDuplicates = function(model, event) {
        self.toggleBootstrapMenu();
        self.showDuplicate(!self.showDuplicate());
    }
    this.toggleShowMissing = function() {
        self.toggleBootstrapMenu();
        if (self.setFilter().length == 0) {
            BootstrapDialog.alert("Please pick a Set before selecting this option");
        } else {
            self.showMissing(!self.showMissing());
        }
    }
    this.setSetFilter = function(model, event) {
        self.toggleBootstrapMenu();
        var collection = $(event.target).closest('li').attr("value");
        if (collection in _collections || collection == "All") {
            self.setFilter(collection == "All" ? [] : _collections[collection]);
            self.setFilterFix(collection == "All" ? [] : _collectionsFix[collection]);
            if (collection == "All") {
                self.showMissing(false);
            } else if (collection.indexOf("Weapons") > -1) {
                self.activeView(1);
            } else if (collection.indexOf("Armor") > -1) {
                self.activeView(2);
            }
        } else {
            self.setFilter([]);
            self.setFilterFix([]);
            self.showMissing(false);
            BootstrapDialog.alert("Please report this to my Github; Unknown collection value: " + collection);
        }
    }
    this.setView = function(model, event) {
        self.toggleBootstrapMenu();
        self.activeView($(event.target).closest('li').attr("value"));
    }
    this.setDmgFilter = function(model, event) {
        self.toggleBootstrapMenu();
        var dmgType = $(event.target).closest('li').attr("value");
        self.dmgFilter.indexOf(dmgType) == -1 ? self.dmgFilter.push(dmgType) : self.dmgFilter.remove(dmgType);
    }
    this.setTierFilter = function(model, event) {
        self.toggleBootstrapMenu();
        self.tierFilter($(event.target).closest('li').attr("value"));
    }
    this.setTypeFilter = function(model, event) {
        self.toggleBootstrapMenu();
        self.typeFilter($(event.target).closest('li').attr("value"));
    }
    this.setProgressFilter = function(model, event) {
        self.toggleBootstrapMenu();
        self.progressFilter($(event.target).closest('li').attr("value"));
    }
    this.missingSets = ko.computed(function() {
        var missingIds = [];
        self.setFilter().concat(self.setFilterFix()).forEach(function(item) {
            var itemFound = false;
            self.characters().forEach(function(character) {
                ['weapons', 'armor'].forEach(function(list) {
                    if (_.pluck(character[list](), 'id').indexOf(item) > -1) itemFound = true;
                });
            });
            if (!itemFound) missingIds.push(item);
        });
        return missingIds;
    })

    var processItem = function(profile) {
        return function(item) {
            if (!(item.itemHash in window._itemDefs)) {
                console.log("found an item without a definition! " + JSON.stringify(item));
                console.log(item.itemHash);
                return;
            }
            var info = window._itemDefs[item.itemHash];
            if (info.bucketTypeHash in tgd.DestinyBucketTypes) {
                var description = info.itemName;
                try {
                    description = decodeURIComponent(info.itemName);
                } catch (e) {
                    description = info.itemName;
                }
                var itemObject = {
                    id: item.itemHash,
                    _id: item.itemInstanceId,
                    characterId: profile.id,
                    damageType: item.damageType,
                    damageTypeName: tgd.DestinyDamageTypes[item.damageType],
                    isEquipped: item.isEquipped,
                    isGridComplete: item.isGridComplete,
                    locked: item.locked,
                    description: description,
                    bucketType: (item.location == 4) ? "Post Master" : tgd.DestinyBucketTypes[info.bucketTypeHash],
                    type: info.itemSubType,
                    typeName: info.itemTypeName,
                    tierType: info.tierType,
                    icon: dataDir + info.icon
                };
                tgd.duplicates.push(item.itemHash);
                if (item.primaryStat) {
                    itemObject.primaryStat = item.primaryStat.value;
                }
                if (item.progression) {
                    itemObject.progression = (item.progression.progressToNextLevel <= 1000 && item.progression.currentProgress > 0);
                }

                itemObject.weaponIndex = tgd.DestinyWeaponPieces.indexOf(itemObject.bucketType);
                itemObject.armorIndex = tgd.DestinyArmorPieces.indexOf(itemObject.bucketType);
                /* both weapon engrams and weapons fit under this condition*/
                if ((itemObject.weaponIndex > -1 || itemObject.armorIndex > -1) && item.perks.length > 0) {
                    itemObject.perks = item.perks.map(function(perk) {
                        if (perk.perkHash in window._perkDefs) {
                            var p = window._perkDefs[perk.perkHash];
                            return {
                                iconPath: self.bungie.getUrl() + perk.iconPath,
                                name: p.displayName,
                                description: p.displayDescription
                            }
                        } else {
                            return perk;
                        }
                    });
                    itemObject.isUnique = false;
                }

                if (itemObject.typeName && itemObject.typeName == "Emblem") {
                    itemObject.backgroundPath = self.makeBackgroundUrl(info.secondaryIcon);
                }
                if (itemObject.bucketType == "Materials" || itemObject.bucketType == "Consumables") {
                    itemObject.primaryStat = item.stackSize;
                }
                if (info.itemType == 2 && itemObject.bucketType != "Class Items") {
                    itemObject.stats = {};
                    _.each(item.stats, function(stat) {
                        if (stat.statHash in window._statDefs) {
                            var p = window._statDefs[stat.statHash];
                            itemObject.stats[p.statName] = stat.value;
                        }
                    });
                }
                //console.log("new item time " + (new Date()-t));
                profile.items.push(new Item(itemObject, profile));
            }
        }
    }

    this.addWeaponTypes = function(weapons) {
        weapons.forEach(function(item) {
            if (item.type > 0 && _.where(self.weaponTypes(), {
                    type: item.type
                }).length == 0) {
                self.weaponTypes.push({
                    name: item.typeName,
                    type: item.type
                });
            }
        });
    }

    this.makeBackgroundUrl = function(path, excludeDomain) {
        return 'url("' + (excludeDomain ? "" : self.bungie.getUrl()) + path + '")';
    }

    this.hasBothAccounts = function() {
        return !_.isEmpty(self.activeUser().psnId) && !_.isEmpty(self.activeUser().gamerTag);
    }

    this.useXboxAccount = function() {
        self.activeUser().activeSystem("XBL");
        self.characters.removeAll();
        self.loadingUser(true);
        self.search();
    }

    this.usePlaystationAccount = function() {
        self.activeUser().activeSystem("PSN");
        self.characters.removeAll();
        self.loadingUser(true);
        self.search();
    }

    var loadingData = false;
    this.search = function() {
        if (!("user" in self.activeUser())) {
            return;
        }
        if (loadingData == true) {
            return;
        }
        loadingData = true;
        tgd.duplicates.removeAll();
        var total = 0,
            count = 0,
            profiles = [];
        /* TODO: implement a better loading bar by using the counts and this: #loadingBar */
        function done(profile) {
            profiles.push(profile);
            count++;
            if (count == total) {
                self.characters(profiles);
                self.shareUrl(new report().de());
                self.loadingUser(false);
                self.loadLoadouts();
                setTimeout(self.bucketSizeHandler, 500);
                loadingData = false;
                //console.timeEnd("avatars.forEach");
            }
        }
        self.bungie.search(self.activeUser().activeSystem(), function(e) {
            if (e && e.error || !e) {
                loadingData = false;
                self.loadingUser(false);
                /* if the first account fails retry the next one*/
                if (self.hasBothAccounts()) {
                    self.activeUser().activeSystem(self.activeUser().activeSystem() == "PSN" ? "XBL" : "PSN");
                    self.search();
                } else {
                    BootstrapDialog.alert("Error loading inventory " + JSON.stringify(e));
                }
                return
            } else if (typeof e.data == "undefined") {
                ga('send', 'exception', {
                    'exDescription': "data missing in bungie.search > " + JSON.stringify(error),
                    'exFatal': false,
                    'appVersion': tgd.version,
                    'hitCallback': function() {
                        console.log("crash reported");
                    }
                });
                return BootstrapDialog.alert("Error loading inventory " + JSON.stringify(e));
            }
            var avatars = e.data.characters;
            total = avatars.length + 1;
            //console.time("self.bungie.vault");
            self.bungie.vault(function(results, response) {
                if (results && results.data && results.data.buckets) {
                    var buckets = results.data.buckets;
                    var profile = new Profile({
                        race: "",
                        order: 0,
                        gender: "Tower",
                        classType: "Vault",
                        id: "Vault",
                        level: "",
                        imgIcon: "assets/vault_icon.jpg",
                        icon: self.makeBackgroundUrl("assets/vault_icon.jpg", true),
                        background: self.makeBackgroundUrl("assets/vault_emblem.jpg", true)
                    });

                    buckets.forEach(function(bucket) {
                        bucket.items.forEach(processItem(profile));
                    });
                    self.addWeaponTypes(profile.weapons());
                    //self.characters.push(profile);
                    //console.timeEnd("self.bungie.vault");
                    done(profile)
                } else {
                    loadingData = false;
                    self.refresh();
                    return BootstrapDialog.alert("Trying to refresh, error loading Vault " + JSON.stringify(response));
                }
            });
            //console.time("avatars.forEach");          
            avatars.forEach(function(character, index) {
                self.bungie.inventory(character.characterBase.characterId, function(response) {
                    if (response && response.data && response.data.buckets) {
                        //console.time("new Profile");                  
                        var profile = new Profile({
                            order: index + 1,
                            gender: tgd.DestinyGender[character.characterBase.genderType],
                            classType: tgd.DestinyClass[character.characterBase.classType],
                            id: character.characterBase.characterId,
                            imgIcon: self.bungie.getUrl() + character.emblemPath,
                            icon: self.makeBackgroundUrl(character.emblemPath),
                            background: self.makeBackgroundUrl(character.backgroundPath),
                            level: character.characterLevel,
                            race: window._raceDefs[character.characterBase.raceHash].raceName
                        });
                        var items = [];


                        Object.keys(response.data.buckets).forEach(function(bucket) {
                            response.data.buckets[bucket].forEach(function(obj) {
                                obj.items.forEach(function(item) {
                                    items.push(item);
                                });
                            });
                        });
                        //simulate me having the 4th horseman
                        //items.push({"itemHash":2344494718,"bindStatus":0,"isEquipped":false,"itemInstanceId":"6917529046313340492","itemLevel":22,"stackSize":1,"qualityLevel":70});
                        //console.time("processItems");
                        items.forEach(processItem(profile));
                        //console.timeEnd("processItems");
                        self.addWeaponTypes(profile.items());
                        //console.timeEnd("new Profile");
                        //self.characters.push(profile);
                        done(profile);
                    } else {
                        loadingData = false;
                        self.refresh();
                        return BootstrapDialog.alert("Trying to refresh, error loading character " + JSON.stringify(response));
                    }
                });
            });
        });
    }

    this.loadData = function(ref) {
        if (self.loadingUser() == false || self.hiddenWindowOpen() == true) {
            //window.t = (new Date());
            self.loadingUser(true);
            self.bungie = new bungie(self.bungie_cookies);
            self.characters.removeAll();
            //console.time("self.bungie.user");
            self.bungie.user(function(user) {
                //console.timeEnd("self.bungie.user");
                if (user.error) {
                    if (user.error == 'network error:502') {
                        try {
                            window.cookies.clear(function() {
                                BootstrapDialog.alert('Cookies cleared!');
                            });
                        } catch (e) {
                            window.ref = window.open('https://www.bungie.net/', '_blank', 'location=yes,clearsessioncache=yes');
                            BootstrapDialog.alert('Clearing cookies not supported in this version, please contact support for more assitance.');
                        }
                    }
                    if (isMobile) {
                        if (self.hiddenWindowOpen() == false) {
                            self.hiddenWindowOpen(true);
                            self.openHiddenBungieWindow();
                        } else {
                            setTimeout(function() {
                                self.loadData(ref);
                            }, 1000);
                        }
                    } else {
                        self.activeUser(new User(user));
                        self.loadingUser(false);
                    }
                    return
                }
                if (ref && ref.close) {
                    ref.close();
                    self.hiddenWindowOpen(false);
                    ref = null;
                }
                self.activeUser(new User(user));
                self.loadingUser(false);
                _.defer(function() {
                    self.search();
                });
            });
        }
    }

    this.toggleBootstrapMenu = function() {
        if ($(".navbar-toggle").is(":visible"))
            $(".navbar-toggle").click();
    }

    this.refreshButton = function() {
        self.toggleBootstrapMenu();
        self.refresh();
    }

    this.refresh = function() {
        self.loadingUser(true);
        self.characters.removeAll();
        self.search();
    }

    this.refreshHandler = function() {
        clearInterval(self.refreshInterval);
        if (self.loadoutMode() == true) {
            self.toggleBootstrapMenu();
            $("body").css("padding-bottom", "260px");
        } else {
            $("body").css("padding-bottom", "80px");
        }
        if (self.doRefresh() == 1 && self.loadoutMode() == false) {
            self.refreshInterval = setInterval(function() {
                self.loadData()
            }, self.refreshSeconds() * 1000);
        }
    }

    this.bucketSizeHandler = function() {
        var buckets = $(".profile:gt(0) .itemBucket").css("height", "auto");
        if (self.padBucketHeight() == true) {
            var maxHeight = ($(".bucket-item:visible:eq(0)").height() + 2) * 3;
            buckets.css("min-height", maxHeight);
        }
    }

    this.quickIconHighlighter = function() {
        var scrollTop = $(window).scrollTop();
        $(".profile").each(function(index, item) {
            var $item = $(item);
            var $quickIcon = $(".quickScrollView ." + $item.attr('id'));
            var top = $item.position().top - 55;
            var bottom = top + $item.height();
            $quickIcon.toggleClass("activeProfile", scrollTop >= top && scrollTop <= bottom);
        });
    }

    this.showVersion = function() {
        BootstrapDialog.alert("Current version is " + tgd.version);
    }

    this.donate = function() {
        window.open("http://bit.ly/1Jmb4wQ", "_system");
    }

    this.readBungieCookie = function(ref, loop) {
        //console.log( typeof ref.executeScript );
        //console.log( Object.keys(ref) ); 
        try {
            ref.executeScript({
                code: 'document.cookie'
            }, function(result) {
                console.log("result " + result);
                if ((result || "").toString().indexOf("bungled") > -1) {
                    self.bungie_cookies = result;
                    window.localStorage.setItem("bungie_cookies", result);
                    self.loadData(ref, loop);
                }
            });
        } catch (e) {
            console.log(e);
        }

    }

    this.openHiddenBungieWindow = function() {
        window.ref = window.open("https://www.bungie.net/en/User/Profile", '_blank', 'location=no,hidden=yes');
        ref.addEventListener('loadstop', function(event) {
            //BootstrapDialog.alert("loadstop hidden");
            self.readBungieCookie(ref, 1);
        });
    }

    this.clearCookies = function() {
        window.cookies.clear(function() {
            window.localStorage.setItem("bungie_cookies", "");
            console.log("Cookies cleared");
        });
    }

    this.openBungieWindow = function(type) {
        return function() {
            var loop;
            if (isChrome || isMobile) {
                window.ref = window.open('https://www.bungie.net/en/User/SignIn/' + type + "?bru=%252Fen%252FUser%252FProfile", '_blank', 'location=yes');
            } else {
                window.ref = window.open('about:blank');
                window.ref.opener = null;
                window.ref.open('https://www.bungie.net/en/User/SignIn/' + type, '_blank', 'toolbar=0,location=0,menubar=0');
            }
            if (isMobile && !isKindle) {
                ref.addEventListener('loadstop', function(event) {
                    self.readBungieCookie(ref, loop);
                });
                /*ref.addEventListener('exit', function() {
                    if (self.loadingUser() == false) {
                        if (_.isEmpty(self.bungie_cookies)) {
                            self.readBungieCookie(ref, loop);
                        } else {
                            self.loadData();
                        }
                    }
                });*/
            } else {
                clearInterval(loop);
                loop = setInterval(function() {
                    if (window.ref.closed) {
                        clearInterval(loop);
                        if (isKindle) {
                            self.readBungieCookie(ref, loop);
                        } else {
                            self.loadData();
                        }
                    }
                }, 100);
            }
        }
    }

    this.scrollTo = function(distance, callback) {
        if (isWindowsPhone) {
            $('html,body').scrollTop(distance);
            if (callback) callback();
        } else {
            $("body").animate({
                scrollTop: distance
            }, 300, "swing", callback);
        }
    }

    this.scrollToActiveIndex = function(newIndex) {
        var index = $(".quickScrollView img").filter(function() {
            var className = $(this).attr("class"),
                className = _.isUndefined(className) ? "" : className;
            return className.indexOf("activeProfile") > -1
        }).index(".quickScrollView img");
        self.scrollTo($(".profile:eq(" + index + ")").position().top - 50, function() {
            $.toaster({
                priority: 'info',
                title: 'View:',
                message: tgd.DestinyViews[newIndex]
            });
        });

    }

    this.shiftViewLeft = function() {
        var newIndex = parseInt(self.activeView()) - 1;
        if (newIndex < 0) newIndex = 3;
        self.activeView(newIndex);
        self.scrollToActiveIndex(newIndex);
    }

    this.shiftViewRight = function() {
        var newIndex = parseInt(self.activeView()) + 1;
        if (newIndex == 4) newIndex = 0;
        self.activeView(newIndex);
        self.scrollToActiveIndex(newIndex);
    }

    this.requests = {};
    var id = -1;
    this.apiRequest = function(params, callback) {
        var apiURL = "https://www.towerghostfordestiny.com/api.cfm";
        if (isChrome || isMobile) {
            $.ajax({
                url: apiURL,
                data: params,
                type: "POST",
                dataType: "json",
                success: function(response) {
                    callback(response);
                }
            });
        } else {
            var event = document.createEvent('CustomEvent');
            var opts = {
                route: apiURL,
                payload: params,
                method: "POST",
                complete: callback
            }
            event.initCustomEvent("api-request-message", true, true, {
                id: ++id,
                opts: opts
            });
            self.requests[id] = opts;
            document.documentElement.dispatchEvent(event);
        }
    }

    this.saveLoadouts = function(includeMessage) {
        var _includeMessage = _.isUndefined(includeMessage) ? true : includeMessage;
        if (supportsCloudSaves == true) {
            if (self.activeUser() && self.activeUser().user && self.activeUser().user.membershipId) {
                var params = {
                    action: "save",
                    membershipId: parseFloat(app.activeUser().user.membershipId),
                    loadouts: JSON.stringify(self.loadouts())
                }
                self.apiRequest(params, function(results) {
                    if (_includeMessage == true) {
                        if (results.success) BootstrapDialog.alert("Loadouts saved to the cloud");
                        else BootstrapDialog.alert("Error has occurred saving loadouts");
                    }
                });
            } else {
                BootstrapDialog.alert("Error reading your membershipId, could not save loadouts");
            }
        } else {
            var loadouts = ko.toJSON(self.loadouts());
            window.localStorage.setItem("loadouts", loadouts);
        }
    }

    this.loadLoadouts = function() {
        var _loadouts = window.localStorage.getItem("loadouts");
        if (!_.isEmpty(_loadouts)) {
            _loadouts = _.map(JSON.parse(_loadouts), function(loadout) {
                return new Loadout(loadout);
            })
        } else {
            _loadouts = [];
        }
        if (supportsCloudSaves == true) {
            self.apiRequest({
                action: "load",
                membershipId: parseFloat(self.activeUser().user.membershipId)
            }, function(results) {
                var _results = [];
                if (results && results.loadouts) {
                    _results = _.isArray(results.loadouts) ? results.loadouts : [results.loadouts];
                    _results = _.map(_results, function(loadout) {
                        loadout.ids = _.isArray(loadout.ids) ? loadout.ids : [loadout.ids];
                        loadout.equipIds = _.isEmpty(loadout.equipIds) ? [] : loadout.equipIds;
                        loadout.equipIds = _.isArray(loadout.equipIds) ? loadout.equipIds : [loadout.equipIds];
                        return new Loadout(loadout);
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
            });
        } else if (_loadouts.length > 0) {
            self.loadouts(_loadouts);
        }
    }
    this.whatsNew = function() {
        if ($("#showwhatsnew").text() == "true") {
            var version = parseInt(tgd.version.replace(/\./g, ''));
            var cookie = window.localStorage.getItem("whatsnew");
            if (_.isEmpty(cookie) || parseInt(cookie) < version) {
                (new tgd.dialog).title("Tower Ghost for Destiny Updates").content(JSON.parse(unescape($("#whatsnew").html())).content).show(false, function() {
                    window.localStorage.setItem("whatsnew", version.toString());
                })
            }
        }
    }

    this.normalizeSingle = function(description, useVault, usingbatchMode, callback) {
        if (useVault) {
            if (usingbatchMode == false) {
                BootstrapDialog.alert("'useVault' flag not tested; aborting!");
            }
            if (callback !== undefined) {
                callback();
            }
            return;
        }

        var itemTotal = 0;
        var onlyCharacters = useVault ? app.characters() : _.reject(app.characters(), function(c) {
            return c.id == "Vault"
        });

        /* association of character, amounts to increment/decrement */
        var characterStatus = _.map(onlyCharacters, function(c) {
            var characterTotal = _.reduce(
                _.filter(c.items(), {
                    description: description
                }),
                function(memo, i) {
                    return memo + i.primaryStat;
                },
                0);
            itemTotal = itemTotal + characterTotal;
            return {
                character: c,
                current: characterTotal,
                needed: 0
            };
        });

        var itemSplit = (itemTotal / characterStatus.length) | 0; /* round down */
        if (itemSplit < 3) {
            if (usingbatchMode == false) {
                BootstrapDialog.alert("Cannot distribute " + itemTotal + " \"" + description + "\" between " + characterStatus.length + " characters.");
            }
            if (callback !== undefined) {
                callback();
            }
            return;
        }
        //console.log("Each character needs " + itemSplit + " " + description);

        /* calculate how much to increment/decrement each character */
        _.each(characterStatus, function(c) {
            c.needed = itemSplit - c.current;
        });
        //console.log(characterStatus);

        var getNextSurplusCharacter = (function() {
            return function() {
                return _.filter(characterStatus, function(c) {
                    return c.needed < 0;
                })[0]
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
        if ((getNextSurplusCharacter() == undefined) || (getNextShortageCharacter() == undefined)) {
            //console.log("all items normalized as best as possible");
            if (usingbatchMode == false) {
                BootstrapDialog.alert(description + " already normalized as best as possible.");
            }
            if (callback !== undefined) {
                callback();
            }
            return;
        }

        var adjustStateAfterTransfer = function(surplusCharacter, shortageCharacter, amountTransferred) {
            surplusCharacter.current = surplusCharacter.current - amountTransferred;
            surplusCharacter.needed = surplusCharacter.needed + amountTransferred;
            //console.log("[Surplus (" + surplusCharacter.character.classType + ")] current: " + surplusCharacter.current + ", needed: " + surplusCharacter.needed);

            shortageCharacter.needed = shortageCharacter.needed - amountTransferred;
            shortageCharacter.current = shortageCharacter.current + amountTransferred;
            //console.log("[Shortage (" + shortageCharacter.character.classType + ")] current: " + shortageCharacter.current + ", needed: " + shortageCharacter.needed);
        };

        var nextTransfer = function(callback) {
            var surplusCharacter = getNextSurplusCharacter();
            var shortageCharacter = getNextShortageCharacter();

            if ((surplusCharacter == undefined) || (shortageCharacter == undefined)) {
                //console.log("all items normalized as best as possible");
                if (usingbatchMode == false) {
                    self.refresh();
                    BootstrapDialog.alert("All items normalized as best as possible");
                }
                if (callback !== undefined) {
                    callback();
                }
                return;
            }
            if (surplusCharacter.character.id == shortageCharacter.character.id) {
                //console.log("surplusCharacter is shortageCharacter!?");
                if (callback !== undefined) {
                    callback();
                }
                return;
            }
            /* all the surplus characters' items that match the description. might be multiple stacks. */
            var surplusItems = _.filter(surplusCharacter.character.items(), {
                description: description
            });
            var surplusItem = surplusItems[0];

            var maxWeCanWorkWith = Math.min(surplusItem.primaryStat, (surplusCharacter.needed * -1));
            var amountToTransfer = Math.min(maxWeCanWorkWith, shortageCharacter.needed);

            //console.log("Attempting to transfer " + description + " (" + amountToTransfer + ") from " +
            //surplusCharacter.character.id + " (" + surplusCharacter.character.classType + ") to " +
            //shortageCharacter.character.id + " (" + shortageCharacter.character.classType + ")");

            surplusItem.transfer(surplusCharacter.character.id, "Vault", amountToTransfer, function() {
                surplusItem.transfer("Vault", shortageCharacter.character.id, amountToTransfer, function() {
                    adjustStateAfterTransfer(surplusCharacter, shortageCharacter, amountToTransfer);
                    nextTransfer(callback);
                });
            });
        }

        var messageStr = "<div><div>Normalize " + description + "</div><ul>";
        for (i = 0; i < characterStatus.length; i++) {
            messageStr = messageStr.concat("<li>" + characterStatus[i].character.classType + ": " +
                (characterStatus[i].needed > 0 ? "+" : "") +
                characterStatus[i].needed + "</li>");
        }
        messageStr = messageStr.concat("</ul></div>");

        if (usingbatchMode == false) {
            var dialogItself = (new tgd.dialog({
                message: messageStr,
                buttons: [{
                    label: 'Normalize',
                    cssClass: 'btn-primary',
                    action: function() {
                        nextTransfer(callback);
                    }
                }, {
                    label: 'Close',
                    action: function(dialogItself) {
                        dialogItself.close();
                    }
                }]
            })).title("Normalize Materials/Consumables").show();
        } else {
            nextTransfer(callback);
        }
    }

    this.normalizeAll = function(model, event, useVault) {
        if (useVault) {
            return BootstrapDialog.alert("'useVault' flag not tested; aborting!");
        }

        var onlyCharacters = useVault ? app.characters() : _.reject(app.characters(), function(c) {
            return c.id == "Vault"
        });
        var selector = function(i) {
            return i.bucketType == "Consumables" || i.bucketType == "Materials"
        };

        /* gather all consumable and material descriptions from all characters */
        var descriptions = _.union(
            (onlyCharacters.length > 0 ? _.uniq(_.pluck(_.filter(onlyCharacters[0].items(), selector), "description")) : ""), (onlyCharacters.length > 1 ? _.uniq(_.pluck(_.filter(onlyCharacters[1].items(), selector), "description")) : ""), (onlyCharacters.length > 2 ? _.uniq(_.pluck(_.filter(onlyCharacters[2].items(), selector), "description")) : ""), (onlyCharacters.length > 3 ? _.uniq(_.pluck(_.filter(onlyCharacters[3].items(), selector), "description")) : ""));
        //console.log(descriptions);

        var getNextDescription = (function() {
            var i = 0;
            return function() {
                return i < descriptions.length ? descriptions[i++] : undefined;
            };
        })();

        var nextNormalize = function() {
            var description = getNextDescription();

            while (description !== undefined) {
                if ((description !== "Hadronic Essence") &&
                    (description !== "Sapphire Wire") &&
                    (description !== "Plasteel Plating")) {
                    break;
                } else {
                    description = getNextDescription();
                }
            }

            if (description == undefined) {
                self.refresh();
                return;
            }

            //console.log(description);
            self.normalizeSingle(description, false, true, nextNormalize);
        }

        nextNormalize();
    }

    this.init = function() {
        if (_.isUndefined(window._itemDefs)) {
            return BootstrapDialog.alert("Could not load item definitions, please report the issue to my Github and make sure your font is set to English.");
        }
        tgd.perksTemplate = _.template(tgd.perksTemplate);
        tgd.duplicates = ko.observableArray().extend({
            rateLimit: {
                timeout: 5000,
                method: "notifyWhenChangesStop"
            }
        });
        self.doRefresh.subscribe(self.refreshHandler);
        self.refreshSeconds.subscribe(self.refreshHandler);
        self.loadoutMode.subscribe(self.refreshHandler);
        self.bungie_cookies = "";
        if (window.localStorage && window.localStorage.getItem) {
            self.bungie_cookies = window.localStorage.getItem("bungie_cookies");
        }
        var isEmptyCookie = (self.bungie_cookies || "").indexOf("bungled") == -1;
        if (isWindowsPhone) {
            var msViewportStyle = document.createElement("style");
            msViewportStyle.appendChild(document.createTextNode("@-ms-viewport{width:auto!important}"));
            document.getElementsByTagName("head")[0].appendChild(msViewportStyle);
        }

        if (isMobile) {
            Hammer(document.getElementById('charactersContainer'))
                .on("swipeleft", self.shiftViewLeft)
                .on("swiperight", self.shiftViewRight);
        }

        if (isMobile) {
            if (window.device && device.platform === "iOS" && device.version >= 7.0) {
                StatusBar.overlaysWebView(false);
            }
            if (typeof StatusBar !== "undefined") {
                StatusBar.styleBlackOpaque();
                StatusBar.backgroundColorByHexString("#272B30");
            }
        }

        if (isMobile && isEmptyCookie) {
            self.bungie = new bungie();
            self.activeUser(new User({
                "code": 99,
                "error": "Please sign-in to continue."
            }));
        } else {
            setTimeout(function() {
                self.loadData()
            }, isChrome || isMobile ? 1 : 5000);
        }
        $("form").bind("submit", false);
        $("html").click(function(e) {
            if ($("#move-popup").is(":visible") && e.target.className !== "itemImage") {
                $("#move-popup").hide();
            }
        });
        /* this fixes issue #16 */
        $(window).resize(_.throttle(self.bucketSizeHandler, 500));
        $(window).resize(_.throttle(self.quickIconHighlighter, 500));
        $(window).scroll(_.throttle(self.quickIconHighlighter, 500));
        self.whatsNew();
        ko.applyBindings(self);
    }
});

window.zam_tooltips = {
    addIcons: false,
    colorLinks: false,
    renameLinks: false,
    renderCallback: app.renderCallback,
    isEnabled: app.tooltipsEnabled()
};
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
}