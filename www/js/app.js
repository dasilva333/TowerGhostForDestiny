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

    this.show = function(excludeClick, onHide, onShown) {
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

    return self.modal;
});

tgd.activeElement;
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
                BootstrapDialog.alert(app.activeText().unable_create_loadout_for_type);
            } else if (_.where(app.activeLoadout().items(), {
                    bucketType: item.bucketType
                }).length < 9) {
                app.activeLoadout().addItem({
                    id: item._id,
                    bucketType: item.bucketType,
                    doEquip: false
                });
            } else {
                BootstrapDialog.alert(app.activeText().unable_to_create_loadout_for_bucket + item.bucketType);
            }
        }
    } else {
        var $movePopup = $("#move-popup");
        if (item.bucketType == "Post Master" || item.bucketType == "Bounties" || item.bucketType == "Mission") {
            return BootstrapDialog.alert(app.activeText().unable_to_move_bucketitems);
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

                BootstrapDialog.alert(app.activeText().this_icon + viewModel.uniqueName);
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
    this.preferredSystem = ko.computed(new tgd.StoreObj("preferredSystem"));
    this.itemDefs = ko.computed(new tgd.StoreObj("itemDefs"));
    this.defsLocale = ko.computed(new tgd.StoreObj("defsLocale"));
    this.defLocaleVersion = ko.computed(new tgd.StoreObj("defLocaleVersion"));
    this.appLocale = ko.computed(new tgd.StoreObj("defsLocale"));
    this.locale = ko.computed(new tgd.StoreObj("locale"));
    this.vaultPos = ko.computed(new tgd.StoreObj("vaultPos"));
    this.xsColumn = ko.computed(new tgd.StoreObj("xsColumn"));
    this.smColumn = ko.computed(new tgd.StoreObj("smColumn"));
    this.mdColumn = ko.computed(new tgd.StoreObj("mdColumn"));
    this.lgColumn = ko.computed(new tgd.StoreObj("lgColumn"));
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
    this.activeUser = ko.observable({});

    this.tierTypes = ko.observableArray();
    this.weaponTypes = ko.observableArray();
    this.characters = ko.observableArray();
    this.orderedCharacters = ko.computed(function() {
        return self.characters().sort(function(a, b) {
            return a.order() - b.order();
        });
    });
    this.currentLocale = ko.computed(function() {
        var locale = self.locale();
        if (self.appLocale() != "") {
            locale = self.appLocale();
        }
        return locale;
    });
    this.activeText = ko.computed(function() {
        return tgd.locale[self.currentLocale()];
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
        self.toggleBootstrapMenu();
        (new tgd.dialog).title("Help").content($("#help").html()).show();
    }

    this.showLanguageSettings = function() {
        self.toggleBootstrapMenu();
        (new tgd.dialog({
            message: tgd.languagesTemplate({
                locale: self.currentLocale(),
                languages: tgd.languages
            })
        })).title("Set Language").show(true, function() {}, function() {
            console.log("showed modal");
            $(".btn-setLanguage").on("click", function() {
                self.appLocale(this.value);
                $(".btn-setLanguage").removeClass("btn-primary");
                $(this).addClass("btn-primary");
            });
        });
    }

    this.showAbout = function() {
        self.toggleBootstrapMenu();
        (new tgd.dialog).title("About").content($("#about").html()).show();
    }

    this.incrementSeconds = function() {
        self.refreshSeconds(parseInt(self.refreshSeconds()) + 1);
    }

    this.decrementSeconds = function() {
        self.refreshSeconds(parseInt(self.refreshSeconds()) - 1);
    }

    this.clearFilters = function(model, element) {
        self.toggleBootstrapMenu();
        self.activeView(tgd.defaults.activeView);
        self.searchKeyword(tgd.defaults.searchKeyword);
        self.doRefresh(tgd.defaults.doRefresh);
        self.refreshSeconds(tgd.defaults.refreshSeconds);
        self.tierFilter(tgd.defaults.tierFilter);
        self.typeFilter(tgd.defaults.typeFilter);
        self.dmgFilter([]);
        self.progressFilter(tgd.defaults.progressFilter);
        self.setFilter([]);
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
            /* Title using locale */
            $content.find("h2.destt-has-icon").text(activeItem.description);
            /* Type using locale */
            $content.find("h3.destt-has-icon").text(activeItem.typeName);
            /* Description using locale */
            $content.find(".destt-desc").text(activeItem.itemDescription);
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

    this.toggleViewOptions = function() {
        self.toggleBootstrapMenu();
        $("#viewOptions").toggle();
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
            BootstrapDialog.alert(self.activeText().pick_a_set);
        } else {
            self.showMissing(!self.showMissing());
        }
    }
    this.openStatusReport = function() {
        self.toggleBootstrapMenu();
        window.open("http://destinystatus.com/" + self.preferredSystem().toLowerCase() + "/" + self.bungie.gamertag(), "_system");
        return false;
    }
    this.setSetFilter = function(model, event) {
        self.toggleBootstrapMenu();
        var collection = $(event.target).closest('li').attr("value");
        if (collection in _collections || collection == "All") {
            self.setFilter(collection == "All" ? [] : _collections[collection]);
            if (collection == "All") {
                self.showMissing(false);
            } else if (collection.indexOf("Weapons") > -1) {
                self.activeView(1);
            } else if (collection.indexOf("Armor") > -1) {
                self.activeView(2);
            }
        } else {
            self.setFilter([]);
            self.showMissing(false);
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
        self.tierFilter(model.tier);
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
        self.setFilter().forEach(function(item) {
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
                var description, tierTypeName, itemDescription, itemTypeName;
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
                    itemDescription: itemDescription,
                    bucketType: (item.location == 4) ? "Post Master" : tgd.DestinyBucketTypes[info.bucketTypeHash],
                    type: info.itemSubType,
                    typeName: itemTypeName,
                    tierType: info.tierType,
                    tierTypeName: tierTypeName,
                    icon: dataDir + info.icon
                };
                tgd.duplicates.push(item.itemHash);
                if (item.primaryStat) {
                    itemObject.primaryStat = item.primaryStat.value;
                }
                if (info.bucketTypeHash == "2197472680" && item.progression) {
                    itemObject.primaryStat = ((item.progression.currentProgress / item.progression.nextLevelAt) * 100).toFixed(0) + "%";
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


    this.addTierTypes = function(items) {
        items.forEach(function(item) {
            if (_.where(self.tierTypes(), {
                    tier: item.tierType
                }).length == 0) {
                self.tierTypes.push({
                    name: item.tierTypeName,
                    tier: item.tierType
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
        self.preferredSystem("XBL");
        self.characters.removeAll();
        self.loadingUser(true);
        self.search();
    }

    this.usePlaystationAccount = function() {
        self.preferredSystem("PSN");
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
                self.loadingUser(false);
                self.loadLoadouts();
                self.tierTypes(self.tierTypes.sort(function(a, b) {
                    return b.type - a.type
                }));
                setTimeout(self.bucketSizeHandler, 500);
                loadingData = false;
                //console.timeEnd("avatars.forEach");
            }
        }
        self.bungie.search(self.preferredSystem(), function(e) {
            if (e && e.error || !e) {
                loadingData = false;
                self.loadingUser(false);
                /* if the first account fails retry the next one*/
                self.preferredSystem(self.preferredSystem() == "PSN" ? "XBL" : "PSN");
                self.search();
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
                return BootstrapDialog.alert("Code 10: " + self.activeText().error_loading_inventory + JSON.stringify(e));
            }
            var avatars = e.data.characters;
            total = avatars.length + 1;
            //console.time("self.bungie.vault");
            self.bungie.vault(function(results, response) {
                if (results && results.data && results.data.buckets) {
                    var buckets = results.data.buckets;
                    var profile = new Profile({
                        race: "",
                        order: self.vaultPos(),
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
                    self.addTierTypes(profile.items());
                    self.addWeaponTypes(profile.weapons());
                    //self.characters.push(profile);
                    //console.timeEnd("self.bungie.vault");
                    done(profile)
                } else {
                    loadingData = false;
                    self.refresh();
                    return BootstrapDialog.alert("Code 20: " + self.activeText().error_loading_inventory + JSON.stringify(response));
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
                            stats: character.characterBase.stats,
                            percentToNextLevel: character.percentToNextLevel,
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
                        return BootstrapDialog.alert("Code 30: " + self.activeText().error_loading_inventory + JSON.stringify(response));
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
                        self.activeUser(user);
                        self.loadingUser(false);
                    }
                    return
                }
                if (ref && ref.close) {
                    ref.close();
                    self.hiddenWindowOpen(false);
                    ref = null;
                }
                self.activeUser(user);
                self.locale(self.activeUser().user.locale);
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
        var buckets = $("div.profile[id!='Vault'] .itemBucket:visible").css("height", "auto");
        if (self.padBucketHeight() == true) {
            var bucketSizes = {};
            buckets.each(function() {
                var bucketType = this.className.split(" ")[2];
                var columnsPerBucket = tgd.DestinyBucketColumns[bucketType];
                var bucketHeight = Math.ceil($(this).find(".bucket-item:visible").length / columnsPerBucket) * ($(this).find(".bucket-item:visible:eq(0)").height() + 2);
                if (!(bucketType in bucketSizes)) {
                    bucketSizes[bucketType] = [bucketHeight];
                } else {
                    bucketSizes[bucketType].push(bucketHeight);
                }
            });
            _.each(bucketSizes, function(sizes, type) {
                var maxHeight = Math.max.apply(null, sizes);
                buckets.filter("." + type).css("min-height", maxHeight);
            });
        }
    }

    this.globalClickHandler = function(e) {
        if ($("#move-popup").is(":visible") && e.target.className !== "itemImage") {
            $("#move-popup").hide();
            tgd.activeElement = null;
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

    this.donate = function() {
        window.open("https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=XGW27FTAXSY62&lc=" + self.activeText().paypal_code + "&no_note=1&no_shipping=1&currency_code=USD", "_system");
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
            if (isMobile) {
                ref.addEventListener('loadstop', function(event) {
                    self.readBungieCookie(ref, loop);
                });
                ref.addEventListener('exit', function() {
                    if (_.isEmpty(self.bungie_cookies)) {
                        self.readBungieCookie(ref, loop);
                    }
                });
            } else {
                clearInterval(loop);
                loop = setInterval(function() {
                    if (window.ref.closed) {
                        clearInterval(loop);
                        if (!isMobile && !isChrome) {
                            BootstrapDialog.alert("Please wait while Firefox acquires your arsenal");
                            var event = document.createEvent('CustomEvent');
                            event.initCustomEvent("request-cookie", true, true, {});
                            document.documentElement.dispatchEvent(event);
                            setTimeout(function() {
                                console.log("loadData");
                                self.loadData();
                            }, 5000);
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
        var apiURL = "https://www.towerghostfordestiny.com/api2.cfm";
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
                //this ID is shared between PSN/XBL so a better ID is one that applies only to one profile
                membershipId: parseFloat(self.activeUser().user.membershipId),
                locale: self.currentLocale(),
                version: self.defLocaleVersion(),
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
                if (results && results.itemDefs) {
                    console.log("downloading locale update");
                    self.downloadLocale(self.currentLocale(), results.itemDefs.version);
                }
            });
        } else if (_loadouts.length > 0) {
            self.loadouts(_loadouts);
        }
    }

    this.showWhatsNew = function(callback) {
        (new tgd.dialog).title(self.activeText().whats_new_title).content("Version: " + tgd.version + JSON.parse(unescape($("#whatsnew").html())).content).show(false, function() {
            if (_.isFunction(callback)) callback();
        })
    }

    this.whatsNew = function() {
        if ($("#showwhatsnew").text() == "true") {
            var version = parseInt(tgd.version.replace(/\./g, ''));
            var cookie = window.localStorage.getItem("whatsnew");
            if (_.isEmpty(cookie) || parseInt(cookie) < version) {
                self.showWhatsNew(function() {
                    window.localStorage.setItem("whatsnew", version.toString());
                });
            }
        }
    }

    this.normalizeSingle = function(description, characters, usingbatchMode, callback) {
        var itemTotal = 0;

        /* association of character, amounts to increment/decrement */
        var characterStatus = _.map(characters, function(c) {
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
        //console.log(characterStatus);

        if (itemTotal < characterStatus.length) {
            if (usingbatchMode == false) {
                BootstrapDialog.alert("Cannot distribute " + itemTotal + " " + description + " between " + characterStatus.length + " characters.");
            }
            if (callback !== undefined) {
                callback();
            }
            return;
        }

        var itemSplit = (itemTotal / characterStatus.length) | 0; /* round down */
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

            if (surplusCharacter.character.id == "Vault") {
                //console.log("surplus is vault");
                surplusItem.transfer("Vault", shortageCharacter.character.id, amountToTransfer, function() {
                    adjustStateAfterTransfer(surplusCharacter, shortageCharacter, amountToTransfer);
                    nextTransfer(callback);
                });
            } else if (shortageCharacter.character.id == "Vault") {
                //console.log("shortage is vault");
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
                    action: function(dialogItself) {
                        nextTransfer(callback);
                        dialogItself.close();
                    }
                }, {
                    label: 'Close',
                    action: function(dialogItself) {
                        dialogItself.close();
                    }
                }]
            })).title("Normalize Materials/Consumables").show(true);
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

    this.setVaultTo = function(pos) {
        return function() {
            var vault = _.findWhere(self.characters(), {
                id: "Vault"
            });
            if (vault) {
                self.vaultPos(pos);
                vault.order(pos);
            } else {
                return false;
            }
        }
    }

    this.isVaultAt = function(pos) {
        return ko.computed(function() {
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
    }

    this.columnMode = ko.computed(function() {
        return "col-xs-" + self.xsColumn() + " col-sm-" + self.smColumn() + " col-md-" + self.mdColumn() + " col-lg-" + self.lgColumn();
    });

    this.setColumns = function(type, input) {
        return function() {
            self[type + "Column"](12 / input.value);
        }
    }

    this.btnActive = function(type, input) {
        return ko.computed(function() {
            return ((12 / input.value) == self[type + "Column"]()) ? "btn-primary" : "";
        });
    };

    this.initItemDefs = function() {
        var itemDefs = self.itemDefs();
        if (self.currentLocale() != "en" && !_.isEmpty(itemDefs) && self.currentLocale() == self.defsLocale()) {
            window._itemDefs = JSON.parse(itemDefs);
        }
    }

    this.downloadLocale = function(locale, version) {
        $.ajax({
            url: "https://www.towerghostfordestiny.com/locale.cfm?locale=" + locale,
            success: function(data) {
                BootstrapDialog.alert(self.activeText().language_pack_downloaded);
                try {
                    self.itemDefs(JSON.stringify(data));
                } catch (e) {
                    localStorage.clear();
                    localStorage.setItem("quota_error", "1");
                    console.log("quota error");
                }
                self.defsLocale(locale);
                self.defLocaleVersion(version);
                window._itemDefs = data;
            }
        });
    }

    this.onLocaleChange = function() {
        var locale = self.currentLocale();
        console.log("locale changed to " + locale);
        if (locale == "en") {
            self.defsLocale(locale);
        }
        if (locale != "en" && self.defsLocale() != locale && !localStorage.getItem("quota_error")) {
            console.log("downloading language pack");
            self.downloadLocale(locale, tgd.version);
        }
    }

    this.initLocale = function(callback) {
        self.locale.subscribe(self.onLocaleChange);
        self.appLocale.subscribe(self.onLocaleChange);
        if (navigator && navigator.globalization && navigator.globalization.getPreferredLanguage) {
            console.log("getting device locale internally");
            navigator.globalization.getPreferredLanguage(function(a) {
                if (a && a.value && a.value.indexOf("-") > -1) {
                    var value = a.value.split("-")[0];
                    if (_.pluck(tgd.languages, 'code').indexOf(value) > -1) {
                        console.log("internal locale is " + value);
                        if (value == "pt")
                            value = "pt-br";
                        self.locale(value);
                    }
                }
            });
        }
    }

    this.init = function() {
        self.initLocale();
        if (_.isUndefined(window._itemDefs)) {
            return BootstrapDialog.alert(self.activeText().itemDefs_undefined);
        }
        self.initItemDefs();
        tgd.perksTemplate = _.template(tgd.perksTemplate);
        tgd.normalizeTemplate = _.template(tgd.normalizeTemplate);
        tgd.statsTemplate = _.template(tgd.statsTemplate);
        tgd.languagesTemplate = _.template(app.activeText().language_text + tgd.languagesTemplate);
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
            Hammer(document.getElementById('charactersContainer'), {
                    drag_min_distance: 1,
                    swipe_velocity: 0.1,
                    drag_horizontal: true,
                    drag_vertical: false
                }).on("swipeleft", self.shiftViewLeft)
                .on("swiperight", self.shiftViewRight)
                .on("tap", self.globalClickHandler);
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
            self.activeUser({
                "code": 99,
                "error": "Please sign-in to continue."
            });
        } else {
            setTimeout(function() {
                self.loadData()
            }, isChrome || isMobile ? 1 : 5000);
        }
        $("form").bind("submit", false);
        $("html").click(self.globalClickHandler);
        /* this fixes issue #16 */
        self.activeView.subscribe(function() {
            setTimeout(self.bucketSizeHandler, 500);
        });
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