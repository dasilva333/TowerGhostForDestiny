tgd.infusionStats = [34.5588, 34.7389, 34.919, 35.0991, 35.2792, 35.4593, 35.6394, 35.8195, 35.9996, 36.1797, 36.3598, 36.5399, 36.72, 36.9001, 37.0802, 37.2603, 37.4404, 37.6205, 37.8006, 37.9807, 38.1608, 38.3409, 38.521, 38.7011, 38.8812, 39.0613, 39.2414, 39.4215, 39.6016, 39.7817, 39.9618, 40.1419, 40.322, 40.5021, 40.6822, 40.8623, 41.0424, 41.2225, 41.4026, 41.5827, 41.7628, 41.9429, 42.123, 42.3031, 42.4832, 42.6633, 42.8434, 43.0235, 43.2036, 43.3837, 43.5638, 43.7439, 43.924, 44.1041, 44.2842, 44.4643, 44.6444, 44.8245, 45.0046, 45.1847, 45.3648, 45.5449, 45.725, 45.9051, 46.0852, 46.2653, 46.4454, 46.6255, 46.8056, 46.9857, 47.1658, 47.3459, 47.526, 47.7061, 47.8862, 48.0663, 48.2464, 48.4265, 48.6066, 48.7867, 48.9668, 49.1469, 49.327, 49.5071, 49.6872, 49.8673, 50.0474, 50.2275, 50.4076, 50.5877, 50.7678, 50.9479, 51.128, 51.3081, 51.4882, 51.6683, 51.8484, 52.0285, 52.2086, 52.3887, 52.555, 52.8096, 53.0642, 53.3188, 53.5734, 53.828, 54.0826, 54.3372, 54.5918, 54.8464, 55.101, 55.3556, 55.6102, 55.8648, 56.1194, 56.374, 56.6286, 56.8832, 57.1378, 57.3924, 57.647, 57.9016, 58.1562, 58.4108, 58.6654, 58.92, 59.1746, 59.4292, 59.6838, 59.9384, 60.193, 60.4476, 60.7022, 60.9568, 61.2114, 61.466];

tgd.calculateInfusedStats = function(initial_defense, initial_stat) {
    var finalStats = [];
    var target_defense = tgd.DestinyLightCap;
    if (initial_defense == target_defense || initial_defense < 200) return [initial_stat];

    var maxStatValueInitial = tgd.infusionStats[initial_defense - 200];
    var maxStatValueFinal = tgd.infusionStats[target_defense - 200];
    var max_stat = Math.floor((maxStatValueFinal / maxStatValueInitial) * (initial_stat + 1.0));
    var min_stat = Math.floor((maxStatValueFinal / maxStatValueInitial) * (initial_stat));

    finalStats.push(max_stat);
    finalStats.push(min_stat);
    return finalStats;
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