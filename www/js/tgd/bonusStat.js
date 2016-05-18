tgd.calculateStatRoll = function(item, targetLight, withBonus) {
    var currentLight = item.primaryValues.Default;
    var isItemLeveled = item.hasUnlockedStats;
    //console.log("isItemLeveled", isItemLeveled);
    var currentBonus = tgd.bonusStatPoints(item.armorIndex, currentLight);
    var targetBonus = tgd.bonusStatPoints(item.armorIndex, targetLight);
    //console.log("currentLight is " + currentLight + " bonus is " + currentBonus);
    //console.log("formula", item.getValue("All"), (isItemLeveled ? currentBonus : 0), targetLight / currentLight);
    //this has been proven to be too inaccurate over a large different in light value with an error margin of up to 8 points
    //var newStats = (item.getValue("All") - (isItemLeveled ? currentBonus : 0)) * targetLight / currentLight;
    //this formulas has also proven to not be as accurate as the corn ratio
    //var newStats = (item.getValue("All") - (isItemLeveled ? currentBonus : 0)) + (((targetLight - currentLight) * tgd.DestinyInfusionRates[item.bucketType]) * 2);
    var newStats = (item.getValue("All") - (isItemLeveled ? currentBonus : 0)) * ((targetLight + tgd.DestinyCornRatio) / (currentLight + tgd.DestinyCornRatio));
    //console.log("newStats", newStats);
    var finalStat = newStats + (withBonus ? targetBonus : 0);
    //console.log("Stat at " + targetLight + " is " + finalStat);
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
};