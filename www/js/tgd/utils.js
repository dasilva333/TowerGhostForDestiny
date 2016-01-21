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
}