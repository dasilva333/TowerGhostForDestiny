tgd.calculateBestSets = function(items) {
    var combos = tgd.cartesianProductOf(_.map(items, function(item) {
        return _.map(item.futureRolls, function(roll) {
            var itemClone = _.clone(item);
            itemClone.activeRoll = roll;
            return itemClone;
        });
    }));
    var scoredCombos = _.map(combos, function(items) {
        var tmp = tgd.joinStats(items);
        var sortedKeys = _.sortBy(_.keys(tmp));
        var combo = {
            set: items,
            stats: tmp,
            statValues: _.map(sortedKeys, function(name) {
                return tmp[name];
            }).join("/"),
            statTiers: _.map(sortedKeys, function(name) {
                return name.substring(0, 3) + " T" + Math.floor(tmp[name] / tgd.DestinySkillTier);
            }).join(" "),
            score: tgd.sum(_.map(tmp, function(value, key) {
                var result = Math.floor(value / tgd.DestinySkillTier);
                return result > 5 ? 5 : result;
            })) + (tgd.sum(_.values(tmp)) / 1000),
            perks: _.filter(
                _.flatten(
                    _.map(items, function(item) {
                        return _.map(item.perks, function(perk) {
                            perk.bucketType = item.bucketType;
                            return perk;
                        });
                    })
                ),
                function(perk) {
                    return (perk.active === true && perk.bucketType != "Class Items" && _.intersection(tgd.weaponTypes, perk.name.split(" ")).length > 0) || (perk.active === true && perk.bucketType == "Helmet" && perk.isExclusive == -1 && perk.isInherent === false);
                }
            )
        };
        combo.similarityScore = _.values(_.countBy(_.map(_.filter(combo.perks, function(perk) {
            return perk.bucketType != "Class Items" && perk.bucketType != "Helmet";
        }), function(perk) {
            return _.intersection(tgd.weaponTypes, perk.name.split(" "))[0];
        })));
        combo.similarityScore = (3 / combo.similarityScore.length) + tgd.sum(combo.similarityScore);
        return combo;
    });
    var highestScore = Math.floor(_.max(_.pluck(scoredCombos, 'score')));
    //console.log("highestScore", highestScore);
    var bestSets = _.uniq(_.filter(scoredCombos, function(combo) {
        return combo.score >= highestScore;
    }), false, function(combo) {
        return combo.statTiers;
    });
    return bestSets;
};

tgd.armorSelection = function(groups) {
    var self = this;

    self.groups = groups;

    self.armorGroups = ko.observableArray();

    self.armorGroups(_.map(groups, function(items, bucketType) {
        return new tgd.armorGroup(bucketType, items, self.armorGroups);
    }));

    self.selectedItems = ko.computed(function() {
        return _.map(self.armorGroups(), function(group) {
            return group.selectedItem();
        });
    });
    self.unleveledBucketTypes = ko.computed(function() {
        return _.pluck(_.filter(self.selectedItems(), function(item) {
            return item.getValue("Light") != tgd.DestinyLightCap;
        }), 'bucketType').join(", ");
    });

    self.combinedStatPoints = ko.computed(function() {
        return tgd.sum(_.map(self.selectedItems(), function(item) {
            return item.getValue("MaxLightCSP");
        }));
    });
    self.bestSets = ko.computed(function() {
        var bestSets = tgd.calculateBestSets(self.selectedItems());
        return bestSets;
    });
    self.firstSet = ko.computed(function() {
        return _.first(self.bestSets());
    });
    self.statTiers = ko.computed(function() {
        return _.map(self.bestSets(), function(combo) {
            return combo.statTiers;
        }).join(", ");
    });
}

tgd.armorGroup = function(bucketType, items, groups) {
    var self = this;

    self.bucketType = bucketType;

    var selectedIndex = 0;

    self.selectedItem = ko.observable();

    self.items = _.map(items, function(item, index) {
        return new tgd.armorItem(item, self.selectedItem, groups);
    });

    self.selectedItem(self.items[selectedIndex]);
}

tgd.armorItem = function(item, selectedItem, groups) {
    var self = this
    _.extend(self, item);
    var isSelected = ko.computed(function() {
        return self == selectedItem();
    });
    var isDisabled = ko.computed(function() {
        /* this filter will get an array of selectedItems, concat self, calculate the best statTiers given all the futureRolls available, determine if that fits the maxTierPointsPossible */
        var items = _.map(groups(), function(group) {
            return group.bucketType == self.bucketType ? self : group.selectedItem();
        });
        var bestSets = tgd.calculateBestSets(items);
        return _.filter(bestSets, function(combo) {
            return Math.floor(combo.score) >= tgd.maxTierPossible;
        }).length == 0;
    });
    self.css = ko.computed(function() {
        return (isSelected() ? "selected" : "not-selected") + " " + (isDisabled() ? "disabled" : "not-disabled");
    });
    this.select = function() {
        if (isDisabled()) {
            BootstrapDialog.alert("This item cannot be selected to maintain the max tier: " + tgd.maxTierPossible);
        } else {
            selectedItem(self);
        }
    }
}