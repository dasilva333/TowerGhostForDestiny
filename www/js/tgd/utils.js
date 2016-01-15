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

tgd.sum = _.memoize(function(arr) {
    return _.reduce(arr, function(memo, num) {
        return memo + num;
    }, 0);
});

tgd.average = _.memoize(function(arr) {
    return _.reduce(arr, function(memo, num) {
        return memo + num;
    }, 0) / arr.length;
});