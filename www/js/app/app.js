window.Hammer.Tap.prototype.defaults.threshold = 9;

var app = function() {
    var self = this;

    this.loadingUser = ko.observable(false);
    this.hiddenWindowOpen = ko.observable(false);
    this.loadoutMode = ko.observable(false);
    this.destinyDbMode = ko.observable(false);
    this.dynamicMode = ko.observable(false);
    this.viewOptionsEnabled = ko.observable(false);
    this.minAvgPercentNeeded = ko.observable(96.15);
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
    this.globalItems = ko.observableArray();
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
    this.progressFilter = ko.observable(tgd.defaults.progressFilter);
    this.setFilter = ko.observableArray(_.clone(tgd.defaults.setFilter));
    this.dmgFilter = ko.observableArray(_.clone(tgd.defaults.dmgFilter));
    this.activeClasses = ko.observableArray(_.clone(tgd.defaults.activeClasses));
    this.activeStats = ko.observableArray(_.clone(tgd.defaults.activeStats));
    this.shareView = ko.observable(tgd.defaults.shareView);
    this.shareUrl = ko.observable(tgd.defaults.shareUrl);
    this.showMissing = ko.observable(tgd.defaults.showMissing);
    this.customFilter = ko.observable(tgd.defaults.customFilter);
    this.showDuplicate = ko.observable(tgd.defaults.showDuplicate);
    this.showArmorSC = ko.observable(tgd.defaults.showArmorSC);
    this.showArmorPerks = ko.observable(tgd.defaults.showArmorPerks);
    this.armorViewBy = ko.observable(tgd.defaults.armorViewBy);
    this.lockedState = ko.observable("");

    this.activeItem = ko.observable();
    this.activeUser = ko.observable({});
    this.allLayouts = ko.observableArray().extend({
        rateLimit: {
            timeout: 1000,
            method: "notifyWhenChangesStop"
        }
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
    this.localLoadouts = ko.computed(function() {
        return _.filter(self.loadouts(), function(loadout) {
            return _.isEmpty(loadout.characterId()) || _.isUndefined(loadout.characterId());
        });
    });
    this.manageLoadouts = function() {
        var loadoutManager = new tgd.loadoutManager(self.loadouts);
        console.log("loadoutManager", loadoutManager);
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
    this.createLoadout = function(character) {
        self.loadoutMode(true);
        self.activeLoadout(new tgd.Loadout([], false, character));
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
        self.activeStats(_.clone(tgd.defaults.activeStats));
        self.activeClasses(_.clone(tgd.defaults.activeClasses));
        self.dmgFilter(_.clone(tgd.defaults.dmgFilter));
        self.setFilter(_.clone(tgd.defaults.setFilter));
        self.progressFilter(tgd.defaults.progressFilter);
        self.shareView(tgd.defaults.shareView);
        self.shareUrl(tgd.defaults.shareUrl);
        self.showMissing(tgd.defaults.showMissing);
        self.showDuplicate(tgd.defaults.showDuplicate);
        self.customFilter(tgd.defaults.customFilter);
        self.showArmorPerks(tgd.defaults.showArmorPerks);
        self.armorViewBy(tgd.defaults.armorViewBy);
        $(element.target).removeClass("active");
        self.redraw();
        return false;
    };

    this.renderCallback = function(context, content, element, callback) {
        if (element) lastElement = element;
        content = content.replace(/(<img\ssrc=")(.*?)("\s?>)/g, '');
        var instanceId = $(lastElement).attr("instanceId"),
            activeItem, query, $content = $("<div>" + content + "</div>");
        /*console.log($content.html());
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
                var statKeys = activeItem.statPerks.length === 0 ? _.keys(activeItem.stats) : _.pluck(activeItem.futureRolls, 'bonusOn');
                var statValues = {
                    stats: _.clone(activeItem.stats),
                    armorIndex: activeItem.armorIndex,
                    statPerks: activeItem.statPerks,
                    primaryValues: activeItem.primaryValues,
                    futureRolls: activeItem.futureRolls,
                    rolls: activeItem.rolls,
                    bonusStatOn: activeItem.bonusStatOn(),
                    keys: statKeys,
                    maxCSP: tgd.DestinyMaxCSP[activeItem.bucketType],
                    extraStats: []
                };
                var itemStats, itemDef = _itemDefs[activeItem.id];
                if (itemDef && itemDef.stats) {
                    itemStats = _.map(itemDef.stats, function(obj, key) {
                        obj.name = _statDefs[key].statName;
                        return obj;
                    });
                }
                if (activeItem.weaponIndex > -1) {
                    statValues.keys = statValues.keys.concat(["Aim assistance", "Equip Speed", "Recoil direction", "Inventory Size"]);
                    _.each(statValues.keys, function(statName) {
                        var statObj = _.findWhere(itemStats, {
                            name: statName
                        });
                        if (statObj) {
                            var label = statObj.name;
                            if (statName == "Recoil direction")
                                label = "Recoil";
                            else if (statName == "Aim assistance")
                                label = "Aim Assist";
                            else if (statName == "Inventory Size")
                                label = "Inventory";
                            statValues.stats[label] = {
                                base: statObj.value,
                                value: statObj.value
                            };
                            if (_.has(activeItem.stats, statObj.name)) {
                                statValues.stats[label].value = activeItem.stats[statObj.name];
                            }
                            if (statObj.minimum > 0 && statObj.maximum > 0) {
                                statValues.stats[label].minMax = statObj.minimum + "/" + statObj.maximum;
                            }
                        }
                    });
                } else if (activeItem.armorIndex > -1) {
                    var statDetails;
                    if (activeItem.primaryStat() == 3) {
                        statValues.extraStats = [{
                            label: "Stat Roll",
                            value: _.pluck(activeItem.rolls, 'bonusOn').join(", ")
                        }];
                    } else {
                        var isItemLeveled = activeItem.hasUnlockedStats;
                        var itemCSP = activeItem.primaryValues.CSP;
                        var currentBonusPoints = activeItem.primaryValues.currentBonus;
                        var maxBonusPoints = activeItem.primaryValues.maxLightBonus;

                        if (!isItemLeveled) {
                            itemCSP = itemCSP + "<span class='font-smaller-2'>(" + (itemCSP + currentBonusPoints) + ")</span>";
                        }

                        var maxStatRoll = tgd.DestinyMaxCSP[activeItem.bucketType];
                        var maxBaseCSP = maxStatRoll - maxBonusPoints;

                        var futureMaxCSP = activeItem.primaryValues.predictedCSP.slice(0);

                        var statsDetails = itemCSP + " out of " + maxStatRoll;

                        var qualityValues, qualityDetails;

                        var qualityPercentage = activeItem.maxLightPercent();
                        if (futureMaxCSP.length == 1) {
                            futureMaxCSP = futureMaxCSP[0];
                            var futureBaseCSP = futureMaxCSP - maxBonusPoints;

                            if (activeItem.tierType >= 5) {
                                if (futureMaxCSP != itemCSP) {
                                    statValues.extraStats.push({
                                        label: "Infusible&nbsp;to",
                                        value: _.template('<%- futureMaxCSP %> out of <%- maxStatRoll %>')({
                                            futureMaxCSP: futureMaxCSP,
                                            maxStatRoll: maxStatRoll
                                        })
                                    });
                                }
                            }
                            qualityValues = {
                                percent: qualityPercentage,
                                futureBaseCSP: futureBaseCSP,
                                maxBaseCSP: maxBaseCSP
                            };
                        } else {
                            futureMaxCSP = futureMaxCSP.reverse();
                            if (activeItem.tierType >= 5) {
                                var extraRowDetails = _.template('<%- futureMaxCSP %> out of <%- maxStatRoll %>')({
                                    futureMaxCSP: futureMaxCSP.join("-"),
                                    maxStatRoll: maxStatRoll
                                });
                                statValues.extraStats.push({
                                    label: "Infusible&nbsp;to",
                                    value: extraRowDetails
                                });
                            }
                            var futureBaseCSPs = _.map(futureMaxCSP, function(csp) {
                                return csp - maxBonusPoints;
                            });
                            var maxLightPercents = _.uniq(_.map(futureBaseCSPs, function(fbc) {
                                return Math.round((fbc / maxBaseCSP) * 100);
                            }));
                            qualityValues = {
                                percent: maxLightPercents.length == 1 ? qualityPercentage : maxLightPercents.join("-"),
                                futureBaseCSP: futureBaseCSPs.join("-"),
                                maxBaseCSP: maxBaseCSP
                            };
                        }

                        statValues.extraStats.push({
                            label: "Stats Total",
                            value: statsDetails
                        });

                        if (activeItem.tierType >= 5 && activeItem.statPerks.length > 0) {
                            qualityDetails = _.template("<%- percent %>% <span class='font-smaller-2'>(<%- futureBaseCSP %> out of <%- maxBaseCSP %>)</span>")(qualityValues);
                            statValues.extraStats.push({
                                label: "Quality",
                                value: qualityDetails,
                                className: activeItem.tierType >= 5 ? activeItem.cspClass() + "Text" : ""
                            });
                        }
                    }
                }
                console.log(statValues);
                var statsTemplate = tgd.statsTemplate(statValues);
                if (stats.length === 0) {
                    $content.find(".destt-desc").after(statsTemplate);
                    stats = $content.find(".destt-stat");
                } else {
                    stats.html(statsTemplate);
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
            $content.find(".stat-bar-empty").addClass("mobile");
        }
        //console.log($content.html());
        callback($content.html());
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
                _.each(character.items(), function(armor) {
                    if (armor.armorIndex > -1) {
                        var itemStats = _.reduce(armor.stats, function(memo, stat, name) {
                            if (stat > 0) memo.push(name);
                            return memo;
                        }, []);
                        var hasStats = (activeStats.length == 2) ? _.intersection(itemStats, activeStats).length == 2 : _.intersection(itemStats, activeStats).length > 0;
                        armor.isFiltered(hasStats);
                    }
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
            } else if (type === 5) {
                sReportURL = "http://towerghostfordestiny.com/index.php/tower-vendor-rolls/";
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
            tgd.localLog(weaponType, "weapon type: " + type);
            self.weaponFilter(type);
        };
    };
    this._setArmorFilter = function() {
        self.toggleBootstrapMenu();
        self.activeView(2);
        var armorType = this;
        tgd.localLog("armor type: " + armorType);
        self.armorFilter(armorType);
    };
    this.setArmorFilter = function(armorType) {
        return this._setArmorFilter.bind(armorType);
    };
    this.setLockState = function() {
        var state = this.toString();
        if (self.lockedState() != "" && self.lockedState() == state) {
            state = "";
        }
        self.lockedState(state);
    }
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
        console.time("new profile");
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
                console.timeEnd("new profile");
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

    this.toggleBootstrapMenu = function() {
        if ($(".navbar-toggle").hasClass("collapsed") === false) {
            $(".navbar-toggle").click();
        }
    };

    this.refreshButton = function() {
        self.toggleBootstrapMenu();
        self.refresh();
    };

    this.logout = function() {
        self.bungie.logout(function() {
            //window.location.reload();
        });
    };

    this.refresh = function() {
        if (self.bungie.gamertag()) {
            tgd.autoRefreshTime = (new Date()).getTime();
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
                    tgd.localLog(result);
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
            tgd.localLog("refresh handler enabled");
            self.refreshInterval = setInterval(function() {
                tgd.localLog("refreshing");
                self.refresh();
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
            //console.log(bucketSizes);
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
                	console.log(type + " " + maxHeight);
                	console.log(type + " " + maxProfilesHeight);
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
            var loadoutKeys = ["name", "ids", "generics", "characterId"];
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
                    _results = _.sortBy(_.map(_results, function(loadout) {
                        loadout.ids = _.isArray(loadout.ids) ? loadout.ids : [loadout.ids];
                        loadout.generics = _.isArray(loadout.generics) ? loadout.generics : [loadout.generics];
                        loadout.equipIds = _.isEmpty(loadout.equipIds) ? [] : loadout.equipIds;
                        loadout.equipIds = _.isArray(loadout.equipIds) ? loadout.equipIds : [loadout.equipIds];
                        console.log("loadout", loadout.name, loadout);
                        return new tgd.Loadout(loadout);
                    }), function(l) {
                        return l.characterId();
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
                /*try {
                    if (results && results.maxCSP) {
                        if (results.maxCSP.indexOf(",") > -1 && results.maxCSP.split(",").length == 7) {
                            tgd.DestinyMaxCSP = _.object(_.map(results.maxCSP.split(","), function(value, index) {
                                return [_.sortBy(tgd.DestinyArmorPieces)[index], parseInt(value)];
                            }));
                        }
                    }
                } catch (e) {
                    console.log(e);
                }*/
                var destinyMaxCSP = tgd.sum(tgd.DestinyMaxCSP);
                var destinyMaxBonusPoints = tgd.sum(_.map(tgd.DestinyMaxCSP, function(value, bucket) {
                    return tgd.bonusStatPoints(tgd.DestinyArmorPieces.indexOf(bucket), tgd.DestinyLightCap);
                }));
                tgd.maxTierPossible = Math.floor(destinyMaxCSP / tgd.DestinySkillTier);
                tgd.maxTierPointsPossible = tgd.maxTierPossible * tgd.DestinySkillTier;
                var minAvgPercentNeeded = ((tgd.maxTierPointsPossible - destinyMaxBonusPoints) / (destinyMaxCSP - destinyMaxBonusPoints)) * 100;
                app.minAvgPercentNeeded(Math.round(minAvgPercentNeeded * 100) / 100);
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
        //tgd.localLog(characterStatus);

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
        //tgd.localLog("Each character needs " + itemSplit + " " + description);

        /* calculate how much to increment/decrement each character */
        _.each(characterStatus, function(c) {
            c.needed = itemSplit - c.current;
        });
        //tgd.localLog(characterStatus);

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
            //tgd.localLog("all items normalized as best as possible");
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
            //tgd.localLog("[Surplus (" + surplusCharacter.character.classType + ")] current: " + surplusCharacter.current + ", needed: " + surplusCharacter.needed);

            shortageCharacter.needed = shortageCharacter.needed - amountTransferred;
            shortageCharacter.current = shortageCharacter.current + amountTransferred;
            //tgd.localLog("[Shortage (" + shortageCharacter.character.classType + ")] current: " + shortageCharacter.current + ", needed: " + shortageCharacter.needed);
        };

        var nextTransfer = function(callback) {
            var surplusCharacter = getNextSurplusCharacter();
            var shortageCharacter = getNextShortageCharacter();

            if ((typeof surplusCharacter === "undefined") || (typeof shortageCharacter === "undefined")) {
                //tgd.localLog("all items normalized as best as possible");
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
                //tgd.localLog("surplusCharacter is shortageCharacter!?");
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

            //tgd.localLog("Attempting to transfer " + description + " (" + amountToTransfer + ") from " +
            //surplusCharacter.character.id + " (" + surplusCharacter.character.classType + ") to " +
            //shortageCharacter.character.id + " (" + shortageCharacter.character.classType + ")");

            if (surplusCharacter.character.id == "Vault") {
                //tgd.localLog("surplus is vault");
                surplusItem.transfer("Vault", shortageCharacter.character.id, amountToTransfer, function() {
                    adjustStateAfterTransfer(surplusCharacter, shortageCharacter, amountToTransfer);
                    nextTransfer(callback);
                });
            } else if (shortageCharacter.character.id == "Vault") {
                //tgd.localLog("shortage is vault");
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
        //tgd.localLog("normalizeAll(" + bucketType + ")");

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
            console.log("defaultAction", arguments);
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
            tgd.localLog("getting device locale internally");
            navigator.globalization.getPreferredLanguage(function(a) {
                if (a && a.value && a.value.indexOf("-") > -1) {
                    var value = a.value.split("-")[0];
                    if (_.pluck(tgd.languages, 'code').indexOf(value) > -1) {
                        tgd.localLog("internal locale is " + value);
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

    this.setGlobalItems = function() {
        var armorType = this.toString();
        console.log("armorType", armorType);
        if (self.globalItems.indexOf(armorType) > -1) {
            self.globalItems.remove(armorType);
        } else {
            self.globalItems.push(armorType);
        }
    };

    var subscriptions = [],
        remainingInterval;

    this.transferFarmItems = function(targetCharacterId, items) {
        //console.log("transferFarmItems", targetCharacterId, items);
        if (tgd.transferringFarmItems) return;
        var farmItemCounts = self.farmItemCounts();
        var itemsToTransfer = _.object(_.map(self.farmItems(), function(itemType) {
            var filteredItems = _.sortBy(_.filter(_.filter(items, tgd.farmItemFilters[itemType]), function(item) {
                return item.characterId() != targetCharacterId;
            }), 'tierType');
            var bucketKey = targetCharacterId == "Vault" ? "actualBucketType" : "bucketType";
            var spaceAvailable = _.countBy(_.findWhere(self.characters(), {
                id: targetCharacterId
            }).items(), bucketKey);
            return [itemType, _.filter(filteredItems, function(item) {
                var slotsAvailable = spaceAvailable[item[bucketKey]];
                var maxSpaceAvailable = 0;
                if (targetCharacterId == "Vault") {
                    maxSpaceAvailable = _.findWhere(tgd.DestinyLayout, {
                        array: item.actualBucketType
                    }).counts[0];
                } else {
                    maxSpaceAvailable = _.has(tgd.DestinyBucketSizes, item.bucketType) ? tgd.DestinyBucketSizes[item.bucketType] : 10;
                }
                if (slotsAvailable < maxSpaceAvailable) {
                    console.log(targetCharacterId, item.bucketType, slotsAvailable, maxSpaceAvailable);
                    spaceAvailable[item[bucketKey]]++;
                    return true;
                } else {
                    return false;
                }
            })];
        }));
        console.log("itemsToTransfer", itemsToTransfer);
        if (targetCharacterId == "Vault") {
            _.each(itemsToTransfer, function(filteredItems, itemType) {
                console.log("itemType", itemType, filteredItems);
                farmItemCounts[itemType] = (farmItemCounts[itemType] || 0) + filteredItems.length;
            });
        }
        self.farmItemCounts(farmItemCounts);
        itemsToTransfer = _.flatten(_.map(itemsToTransfer));
        if (itemsToTransfer.length === 0) {
            return;
        }
        var adhoc = new tgd.Loadout(itemsToTransfer, true);
        var msa = adhoc.transfer(targetCharacterId, true);
        if (msa.length > 0) {
            tgd.autoTransferStacks = true;
            tgd.transferringFarmItems = true;
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
        /*var sortedItems = _.groupBy(items, 'actualBucketType'),
            allSectionsFull = false;
        // detect the quantity amounts, keep track of which sections are full, if all sections full then disable farmMode 
        _.each(tgd.DestinyLayout, function(layout) {
            var group = sortedItems[layout.array];
            if (group && group.length == layout.counts[0] && self.farmMode() === true && self.farmTarget() == "Vault") {
                var warning_msg = "Disabling Farm Mode for full section: " + layout.name;
                tgd.localLog(warning_msg);
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
        if (allSectionsFull) {
            self.farmMode(false);
        }*/
    };


    this.farmModeHandler = function(isEnabled) {
        if (isEnabled === true) {
            if (self.doRefresh() === false) {
                self.doRefresh(true);
            }
            if (_.has(window, 'plugins') && _.has(window.plugins, 'insomnia')) {
                window.plugins.insomnia.keepAwake()
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
                    //console.log("sub for ", character.id, " towards ", self.farmTarget());
                    subscriptions.push(character.items.subscribe(self.farmItemHandler));
                    self.farmItemHandler(character.items());
                }
            });
        } else {
            if (_.has(window, 'plugins') && _.has(window.plugins, 'insomnia')) {
                window.plugins.insomnia.allowSleepAgain()
            }
            tgd.transferringFarmItems = false;
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
            //globalItems also needs to be an array attached to localStorage
            var storedObj = new tgd.StoreObj("globalItems");
            savedSelections = storedObj.read();
            self.globalItems(_.isArray(savedSelections) ? savedSelections : savedSelections.split(","));
            self.globalItems.subscribe(function(newValues) {
                storedObj.write(newValues);
            });
        }

        self.farmMode.subscribe(self.farmModeHandler);
        self.padBucketHeight.subscribe(self.redraw);
        self.refreshHandler();

        if (!window.isStaticBrowser) {
            //This makes it so that the viewport width behaves like android/ios browsers
            if (isWindowsPhone) {
                var msViewportStyle = document.createElement("style");
                msViewportStyle.appendChild(document.createTextNode("@-ms-viewport{width:auto!important}"));
                document.getElementsByTagName("head")[0].appendChild(msViewportStyle);
            }

            var dragAndDropEnabled = self.padBucketHeight() === true && self.dragAndDrop() === true;
            ko.bindingHandlers.sortable.isEnabled = dragAndDropEnabled;
            ko.bindingHandlers.draggable.isEnabled = dragAndDropEnabled;
        }
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
        self.activeUser.subscribe(function(user) {
            if (_.has(user, 'user')) {
                self.search();
            }
        });
        self.bungie = new tgd.bungie(self.activeUser);
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
}