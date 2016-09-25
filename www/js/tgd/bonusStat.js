tgd.DestinyCornRatio = -11.98 / 0.1617;
tgd.calculateInfusedStats = function(initial_defense, initial_stat, bucketType) {
    var finalStats = [];
    var target_defense = 350; //temp hack until I can figure out the real solution
    if (initial_defense == target_defense || initial_defense < 200) return [initial_stat, initial_stat];
    var newStats = Math.min(tgd.DestinyMaxCSP[bucketType] - tgd.bonusStatPoints(tgd.DestinyArmorPieces.indexOf(bucketType), target_defense), parseInt(initial_stat * ((target_defense + tgd.DestinyCornRatio) / (initial_defense + tgd.DestinyCornRatio))));

    return [newStats, newStats];
    /*    var maxStatValueInitial = tgd.infusionStats[initial_defense - 200];
    var maxStatValueFinal = tgd.infusionStats[target_defense - 200];
    var max_stat = Math.floor((maxStatValueFinal / maxStatValueInitial) * (initial_stat + 1.0));
    var min_stat = Math.floor((maxStatValueFinal / maxStatValueInitial) * (initial_stat));

    finalStats.push(max_stat);
    finalStats.push(min_stat);
    return finalStats;*/
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