tgd.showLoading = function(callback) {
    $("body").css("cursor", "progress");
    setTimeout(function() {
        callback();
        setTimeout(function() {
            $("body").css("cursor", "default");
        }, 10);
    }, 600);
};

tgd.innerCartesianProductOf = function(subSets) {
    var out = [];
    for (var i0 = 0; i0 < 2; i0++) {
        for (var i1 = 0; i1 < 2; i1++) {
            for (var i2 = 0; i2 < 2; i2++) {
                for (var i3 = 0; i3 < 2; i3++) {
                    for (var i4 = 0; i4 < 2; i4++) {
                        for (var i5 = 0; i5 < 2; i5++) {
                            for (var i6 = 0; i6 < 2; i6++) {
                                out.push([subSets[0][i0], subSets[1][i1], subSets[2][i2], subSets[3][i3], subSets[4][i4], subSets[5][i5], subSets[6][i6]]);
                            }
                        }
                    }
                }
            }
        }
    }
    return out;
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
    var tmp = {
        "Intellect": 0,
        "Discipline": 0,
        "Strength": 0
    };
    for (var i = 0, len = arrItems.length; i < len; i++) {
        var item;
        if (arrItems[i].activeRoll) {
            item = arrItems[i].activeRoll;
        } else {
            item = arrItems[i].stats;
        }
        if (_.has(item, 'Intellect')) {
            tmp["Intellect"] += item["Intellect"];
            tmp["Discipline"] += item["Discipline"];
            tmp["Strength"] += item["Strength"];
        }
    }
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
};