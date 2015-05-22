var _collections = {
    "exoticWeapons": [
        135862170,
        119482464,
        3164616407,
        3490486525,
        119482466,
        135862171,
        119482465,
        3164616405,
        3164616404,
        1389842217,
        346443849,
        2809229973,
        2681212685,
        3118679308,
        3118679309,
        346443851,
        346443850,
        1389842216,
        2344494718,
        3191797830,
        3191797831,
        1274330687,
        1274330686,
        3705198528,
        3399255907,
        2344494719,
        1557422751,
        2612834019
    ],
    "vaultWeapons": [
        3074713346,
        3892023023,
        1603229152,
        2149012811,
        1267053937,
        892741686,
        3695068318,
        152628833,
        3807770941
    ],
    "crotaWeapons": [
        4144666151,
        4252504452,
        868574327,
        437329200,
        560601823,
        3615265777,
        1267147308,
        788203480,
        2361858758
    ],
    "ironWeapons": [
        2775854838,
        1998842327,
        1487387187,
        337037804,
        367695658,
        160095218,
        1221909933,
        2853794413,
        805224273
    ],
    "exoticArmor": [
        144553854,
        144553855,
        144553853,
        499191786,
        499191787,
        78421062,
        94883184,
        4146057409,
        921478195,
        2994845057,
        2994845058,
        2994845059,
        2272644374,
        2272644375,
        4132383826,
        3577254054,
        2591213943,
        104781337,
        2771018502,
        2771018500,
        2771018501,
        1398023010,
        1398023011,
        2335332317,
        3455371673,
        287395896,
        2927156752,
        1611580929,
        2449500440,
        909225554,
        838933125,
        1619609940,
        1865771870,
        813361818,
        838428205,
        3050633443
    ],
    "vaultArmor": [
        1096028869,
        3833808556,
        1835128980,
        1698410142,
        2237496545,
        2147998057,
        3367833896,
        3851493600,
        2504856474,
        774963973,
        2486746566,
        4079606241,
        1883484055,
        3267664569,
        991704636
    ],
    "crotaArmor": [
        1311326450,
        1261228341,
        1736102875,
        186143053,
        4253790216,
        1898281764,
        2450884227,
        1462595581,
        3786747679,
        1349707258,
        2477121987,
        3009953622,
        3148626578,
        3549968172,
        2339580799
    ],
    "ironArmor": [
        2452629279,
        2413349891,
        2810850918,
        1063666591,
        1312172922,
        1556318808,
        1448055471,
        1914248812,
        1846030075,
        189873545,
        1737847390,
        925496553,
        391890850,
        1157862961,
        2314015087
    ],
    "poeArmor": [
        2884887211,
        4007053294,
        1165567642,
        2887970516,
        2303881503,
        3661659402,
        2662103142,
        2221235552,
        3620910776,
        4013007887,
        3660153609,
        3910621915
    ],
    "poeWeapons": [
        270944925,
        3093674677,
        1548878642,
        2235712584,
        190731588,
        391452304,
        2763938995,
        3772051159,
        1409833631
    ],
    "queensWeapons": [
        3667595457,
        67230518,
        3974515892,
        1040188249,
        1128241783,
        1356058856,
        1610242900,
        1163110499,
        4026257891
    ],
    "tooArmor": [
        2573091812,
        595116867,
        2520286397,
        590944735,
        4171787962,
        3348229560,
        1496660239,
        3387472393,
        3637940699,
        2785395614,
        1777045417,
        2847788648,
        3863421728,
        2558361306,
        254918725,
        595116866,
        2520286396,
        590944734,
        1496660238,
        3387472392,
        3637940698,
        2847788649,
        3863421729,
        2558361307
    ],
    "tooWeapons": [
        120524974,
        1768925825,
        1283021733,
        1550781862,
        3327140886,
        2217778941,
        2911036427,
        73994448,
        3028978726
    ]
};
_collectionsFix = {
    "exoticWeapons": [],
    "vaultWeapons": [],
    "crotaWeapons": [],
    "ironWeapons": [1488311144, 1244530683, 1451703869, 3244859508, 996787434, 3800763760, 3547540843, 2135112796, 2266591883],
    /* 300 ATK: Fusion,Sniper,Shotgun,LMG,Rocket,Scout,Hand Cannon,Pulse */
    "exoticArmor": [],
    "vaultArmor": [],
    "crotaArmor": [],
    "ironArmor": [2239662500, 3161248318, 1312172923, 1063666590, 2020019240, 391890851, 1846030074, 1556318809, 2898884242, 2369983328, 2902070748, 2020019241, 541785999, 3451716861, 2559980950, 2898884243, 3470167972, 3275079860, 3034481789, 3477470986, 1571566214, 2902070749, 3470167973, 1448055470, 3034481788, 2413349890, 1571566215]
};

function report() {

    function completeFilter(item) {
        return item.isGridComplete;
    }

    var _completed = [],
        _collected = [];
    app.characters().forEach(function(character) {
        ['weapons', 'armor'].forEach(function(list) {
            var items = character[list]();
            _collected = _collected.concat(_.pluck(items, 'id'));
            _completed = _completed.concat(_.pluck(_.filter(items, completeFilter), 'id'));
        })
    });

    var collection = [];
    var hashArray = [];

    for (var c in _collections) {
        collection[c] = {
            completed: [],
            collected: [],
            missing: []
        };
        for (var i in _collections[c]) {
            i = _collections[c][i];
            if (_completed.indexOf(i) != -1) {
                hashArray.push(2);
                collection[c].completed.push(i);
            } else if (_collected.indexOf(i) != -1) {
                hashArray.push(1);
                collection[c].collected.push(i);
            } else {
                hashArray.push(0);
                collection[c].missing.push(i);
            }
        }
    }

    this.de = function() {
        return 'http://destinyexotics.com/?share=' + LZString.compressToBase64(hashArray.join(''));
    }

    this.buildHTML = function() {
        var e, has, missing;
        for (var c in collection) {
            e = document.getElementById(c);
            done = e.querySelector('.done');
            has = e.querySelector('.has');
            missing = e.querySelector('.missing');
            done.innerHTML = '';
            has.innerHTML = '';
            missing.innerHTML = '';

            for (var h in collection[c].completed) {
                done.innerHTML += ('<p>' + _itemDefs[collection[c].completed[h]].name + '</p>');
            }
            for (var h in collection[c].collected) {
                has.innerHTML += ('<p>' + _itemDefs[collection[c].collected[h]].name + '</p>');
            }
            for (var h in collection[c].missing) {
                missing.innerHTML += ('<p>' + _itemDefs[collection[c].missing[h]].name + '</p>');
            }
        }
    }
}