tgd.bungie = (function(complete) {
    var self = this;

    var _token,
        id = 0,
        domain = 'bungie.net',
        url = 'https://www.' + domain + '/',
        bungieAuthURL, apikey;

    if (isChrome) {
        bungieAuthURL = "https://www.bungie.net/en/Application/Authorize/10702";
        apikey = '0eec3b0ba89c428889317df467094570';
    } else if (isIOS) {
        bungieAuthURL = "https://www.bungie.net/en/Application/Authorize/10718";
        apikey = '58f06666813243f082b5ffff307b34fd';
    }

    this.savedUsers = ko.observableArray();
    this.activeUser = ko.observable();
    this.accessToken = ko.pureComputed(new tgd.StoreObj("accessToken"));
    this.refreshToken = ko.pureComputed(new tgd.StoreObj("refreshToken"));

    this.loginWithCode = function(code, cb) {
        self.getAccessTokensFromCode(code, function(tokens) {
            self.user(function(user) {
                self.savedUsers.push({
                    user: user,
                    tokens: tokens,
                    isDefault: true
                });
                self.activeUser(user);
                if (cb) cb(user);
            });
        });
    };

    this.openBungieWindow = function(type) {
        return function(cb) {

            if (isMobile) {
                /*ref.addEventListener('loadstop', function(event) {
                    if (event.url.match("oauth.cfm")) {
                        var code = event.url.split("=")[1];
                        ref.close();
                        self.loginWithCode(code, cb);
                    }
                });*/
                window.open(bungieAuthURL, '_system');
            } else {
                window.ref = window.open(bungieAuthURL, "authWindow", "width=600,height=600");
                // Create IE + others compatible event handler
                var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
                var eventer = window[eventMethod];
                var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";
                // Listen to message from child window
                eventer(messageEvent, function(e) {
                    var code = e.data;

                    self.loginWithCode(code, cb);

                }, false);
            }
        };
    };

    this.retryRequest = function(opts) {
        if (opts.retries) {
            if (opts.retries > 3) {
                opts.complete({
                    error: 'network error:' + this.status
                }, response);
            } else {
                opts.retries++;
                setTimeout(function() {
                    self.request(opts);
                }, 1000 * opts.retries);
            }
        } else {
            opts.retries = 0;
            setTimeout(function() {
                self.request(opts);
            }, 2000);
        }
    };

    this.request = function(opts) {
        if (opts.route.indexOf("http") == -1)
            opts.route = url + "Platform" + opts.route;

        var data;
        if (opts.payload) {
            data = JSON.stringify(opts.payload);
        }
        var headers = {
            'X-API-Key': apikey
        };
        if (self.accessToken() != "") {
            headers["Authorization"] = self.accessToken();
        }
        $.ajax({
            url: opts.route,
            type: opts.method,
            headers: headers,
            data: data,
            complete: function(xhr, status) {
                tgd.localLog("ajax complete");
                var response;
                if (xhr.status >= 200 && xhr.status <= 409) {
                    try {
                        response = JSON.parse(xhr.responseText);
                    } catch (e) {
                        //tgd.localLog("error parsing responseText: " + xhr.responseText);
                    }
                    if (response && response.ErrorCode && (response.ErrorCode == 36 || response.ErrorCode == 1652 || response.ErrorCode == 1651)) {
                        self.retryRequest(opts);
                    } else {
                        var obj = response;
                        if (typeof obj == "object" && "Response" in obj)
                            obj = response.Response;
                        console.log("obj", obj);
                        if (obj && obj.ErrorCode && obj.ErrorCode == 99) {
                            self.getAccessTokensFromRefreshToken(function() {
                                if (self.accessToken() == "") {
                                    self.openBungieWindow(function() {
                                        self.retryRequest(opts);
                                    })();
                                } else {
                                    self.retryRequest(opts);
                                }
                            });
                        } else {
                            opts.complete(obj, response);
                        }
                    }
                } else {
                    self.retryRequest(opts);
                }
            }
        });
    };

    this.processTokens = function(result) {
        /* if refresh token or access token is invalid this needs to be determined  and set the values to blank */
        var tokens = {};
        if (result && result.ErrorCode && result.ErrorCode != 1) {
            BootstrapDialog.alert(result.Message + " - " + JSON.stringify(result.MessageData))
        }
        if (result && result.accessToken && result.accessToken.value) {
            tokens.accessToken = "Bearer " + result.accessToken.value;
            self.accessToken(tokens.accessToken);
        }
        if (result && result.refreshToken && result.refreshToken.value) {
            tokens.refreshToken = result.refreshToken.value;
            self.refreshToken(tokens.refreshToken);
        }
        return tokens;
    }

    this.getAccessTokensFromRefreshToken = function(callback) {
        self.request({
            route: "/App/GetAccessTokensFromRefreshToken/",
            method: "POST",
            payload: {
                refreshToken: self.refreshToken()
            },
            complete: function(result) {
                if (result && result.ErrorCode && (result.ErrorCode == 5 || result.ErrorCode == 2107)) {
                    self.accessToken("");
                    self.refreshToken("");
                    callback();
                } else {
                    self.processTokens(result);
                    callback();
                }
            }
        });
    };

    this.getAccessTokensFromCode = function(code, callback) {
        self.request({
            route: "/App/GetAccessTokensFromCode/",
            method: "POST",
            payload: {
                code: code
            },
            complete: function(result) {
                var tokens = self.processTokens(result);
                callback(tokens);
            }
        });
    };

    this.getVendorData = function(characterId, vendorId, callback) {
        self.request({
            route: '/Destiny/' + self.active.type +
                '/MyAccount/' +
                '/Character/' + characterId +
                '/Vendor/' + vendorId + '/Metadata/',
            method: 'GET',
            complete: callback
        });
    };

    this.vault = function(callback) {
        self.request({
            route: '/Destiny/' + self.active.type + '/MyAccount/Vault/',
            method: 'GET',
            complete: callback
        });
    };

    this.logout = function() {
        _.each(self.savedUsers(), function(u) {
            u.isDefault = false;
        });
        self.activeUser({});
    };

    this.getUrl = function() {
        return url;
    };

    this.user = function(callback) {
        self.request({
            route: '/User/GetBungieNetUser/',
            method: 'GET',
            complete: function(res, response) {
                if (response && response.ErrorCode && response.ErrorCode > 1) {
                    callback({
                        error: response.Message,
                        code: response.ErrorCode
                    });
                    return;
                } else if (typeof res == "undefined") {
                    callback({
                        error: 'no response'
                    });
                    return;
                }
                var user = {};
                user.user = {
                    displayName: res.displayName,
                    membershipId: res.membershipId
                };
                user.systems = [];

                if (!_.isEmpty(res.gamerTag)) {
                    user.systems.push({
                        system: 'xbl',
                        id: res.gamerTag,
                        type: 1,
                        preferred: false
                    });
                }
                if (!_.isEmpty(res.psnId)) {
                    user.systems.push({
                        system: 'psn',
                        id: res.psnId,
                        type: 2,
                        preferred: false
                    });
                }
                user.systems[0].preferred = true;
                callback(user);
            }
        });
    };

    this.account = function(callback) {
        self.request({
            route: '/Destiny/' + self.active.type + '/Account/' + self.active.membership + '/',
            method: 'GET',
            complete: callback
        });
    };

    this.setlockstate = function(characterId, itemId, state, callback) {
        self.request({
            route: '/Destiny/SetLockState/',
            method: 'POST',
            payload: {
                membershipType: self.active.type,
                characterId: characterId,
                itemId: itemId,
                state: state
            },
            complete: callback
        });
    };

    this.transfer = function(characterId, itemId, itemHash, amount, toVault, callback) {
        self.request({
            route: '/Destiny/TransferItem/',
            method: 'POST',
            payload: {
                characterId: characterId,
                membershipType: self.active.type,
                itemId: itemId,
                itemReferenceHash: itemHash,
                stackSize: amount,
                transferToVault: toVault
            },
            complete: callback
        });
    };

    this.equip = function(characterId, itemId, callback) {
        self.request({
            route: '/Destiny/EquipItem/',
            method: 'POST',
            payload: {
                membershipType: self.active.type,
                characterId: characterId,
                itemId: itemId
            },
            complete: callback
        });
    };

    this.getAccountSummary = function(callback) {
        self.request({
            route: '/Destiny/' + self.active.type + '/Account/' + self.active.membership + '/Summary/',
            method: 'GET',
            complete: callback
        });
    };

    this.getItemDetail = function(characterId, instanceId, callback) {
        self.request({
            route: '/Destiny/' + self.active.type +
                '/Account/' + self.active.membership +
                '/Character/' + characterId +
                '/Inventory/' + instanceId + '/',
            method: 'GET',
            complete: callback
        });
    };

    this.inventory = function(characterId, callback) {
        var system = _.findWhere(self.activeUser().user.systems, {
            preferred: true
        });
        self.request({
            route: '/Destiny/' + system.type + '/Account/' + system.membership + '/Character/' + characterId + '/Inventory/',
            method: 'GET',
            complete: callback
        });
    };

    this.character = function(characterId, callback) {
        self.request({
            route: '/Destiny/' + self.active.type + '/Account/' + self.active.membership + '/Character/' + characterId + '/',
            method: 'GET',
            complete: callback
        });
    };

    this.search = function(activeSystem, callback) {
        var system = _.findWhere(self.activeUser().user.systems, {
            preferred: true
        });
        if (system && system.membership) {
            self.account(callback);
        } else {
            self.request({
                route: '/Destiny/' + system.type + '/Stats/GetMembershipIdByDisplayName/' + system.id + '/',
                method: 'GET',
                complete: function(membership) {
                    if (membership > 0) {
                        system.membership = membership;
                        self.savedUsers(self.savedUsers());
                        self.account(callback);
                    } else {
                        callback({
                            error: true
                        });
                    }
                }
            });
        }
    };

    this.account = function(callback) {
        var system = _.findWhere(self.activeUser().user.systems, {
            preferred: true
        });
        self.request({
            route: '/Destiny/' + system.type + '/Account/' + system.membership + '/',
            method: 'GET',
            complete: callback
        });
    };

    this.flattenItemArray = function(buckets) {
        var items = [];
        if (_.isArray(buckets)) {
            buckets.forEach(function(bucket) {
                bucket.items.forEach(function(item) {
                    items.push(item);
                });
            });
        } else {
            Object.keys(buckets).forEach(function(bucketName) {
                buckets[bucketName].forEach(function(bucket) {
                    bucket.items.forEach(function(item) {
                        item.bucketName = bucketName;
                        items.push(item);
                    });
                });
            });
        }
        return items;
    };

    this.init = function() {
        var usersCache = new tgd.StoreObj("savedUsers");
        self.savedUsers.subscribe(function(users) {
            usersCache.write(JSON.stringify(users));
        });
        self.activeUser.subscribe(function(activeUser) {
            self.accessToken(activeUser && activeUser.tokens ? activeUser.tokens.accessToken : "");
            self.refreshToken(activeUser && activeUser.tokens ? activeUser.tokens.refreshToken : "");
            //app.activeUser(activeUser);
        });
        var savedUsers = usersCache.read();
        if (!_.isEmpty(savedUsers)) {
            self.savedUsers(JSON.parse(savedUsers));
        }
        if ($.isPlainObject(self.savedUsers())) {
            self.savedUsers([self.savedUsers()]);
        }
        var defaultUser = _.findWhere(self.savedUsers(), {
            isDefault: true
        });
        console.log("defaultUser", defaultUser);
        if (tgd && tgd.bungieCode) {
            self.loginWithCode(tgd.bungieCode, complete);
        } else if (_.isEmpty(self.savedUsers())) {
            complete({
                "code": 99,
                "error": "Please sign-in to continue."
            });
        } else if (defaultUser) {
            console.log("using default", complete.toString());
            self.activeUser(defaultUser);
            self.user(function(bngUser) {
                complete(bngUser);
            });
        } else {
            complete({
                "code": 999,
                "users": self.savedUsers()
            });
        }
    };


    this.init();
});