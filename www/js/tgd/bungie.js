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
    this.active = {};
    this.bungled = "";
    this.systemIds = {};
    this.requests = {};
    this.accessToken = ko.pureComputed(new tgd.StoreObj("accessToken"));
    this.refreshToken = ko.pureComputed(new tgd.StoreObj("refreshToken"));

    this.loginWithCode = function(code, cb) {
        self.getAccessTokensFromCode(code, function() {
            self.user(function(user) {
                app.activeUser(user);
                if (cb) cb();
            });
        });
    };

    this.openBungieWindow = function(type) {
        return function(cb) {
            window.ref = window.open(bungieAuthURL, "authWindow", "width=600,height=600");
            if (isMobile) {
                ref.addEventListener('loadstop', function(event) {
                    if (event.url.match("oauth.cfm")) {
                        var code = event.url.split("=")[1];
                        ref.close();
                        self.loginWithCode(code, cb);
                    }
                });
            } else {
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
        if (result && result.ErrorCode && result.ErrorCode != 1) {
            BootstrapDialog.alert(result.Message + " - " + JSON.stringify(result.MessageData))
        }
        if (result && result.accessToken && result.accessToken.value) {
            self.accessToken("Bearer " + result.accessToken.value);
        }
        if (result && result.refreshToken && result.refreshToken.value) {
            self.refreshToken(result.refreshToken.value);
        }
    }

    this.getAccessTokensFromRefreshToken = function(callback) {
        self.request({
            route: "/App/GetAccessTokensFromRefreshToken/",
            method: "POST",
            payload: {
                refreshToken: self.refreshToken()
            },
            complete: function(result) {
                if (result && result.ErrorCode && result.ErrorCode == 5) {
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
                self.processTokens(result);
                callback();
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
        /*self.request({
            route: '/Destiny/' + self.active.type + '/MyAccount/Vault/',
            method: 'GET',
            complete: callback
        });*/
    };

    this.logout = function(callback) {
        self.request({
            route: url + 'en/User/SignOut',
            method: 'GET',
            complete: callback
        });
    };

    this.getUrl = function() {
        return url;
    };

    this.setsystem = function(type) {
        self.active = self.systemIds.xbl;
        if (type === 'PSN')
            self.active = self.systemIds.psn;
    };

    this.getMemberId = function() {
        return membershipId;
    };

    this.gamertag = function() {
        return self.active ? self.active.id : null;
    };

    this.system = function() {
        return systemIds;
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

                self.systemIds.xbl = {
                    id: res.gamerTag,
                    type: 1
                };
                self.systemIds.psn = {
                    id: res.psnId,
                    type: 2
                };

                self.active = self.systemIds.xbl;

                if (res.psnId)
                    self.active = self.systemIds.psn;

                callback(res);
            }
        });
    };

    this.account = function(callback) {
        self.request({
            route: '/Destiny/' + self.active.type +
                '/Account/' + self.active.membership +
                '/',
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
            route: '/Destiny/' + self.active.type +
                '/Account/' + self.active.membership +
                '/Summary/',
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
        self.request({
            route: '/Destiny/' + self.active.type +
                '/Account/' + self.active.membership +
                '/Character/' + characterId +
                '/Inventory/',
            method: 'GET',
            complete: callback
        });
    };

    this.character = function(characterId, callback) {
        self.request({
            route: '/Destiny/' + self.active.type +
                '/Account/' + self.active.membership +
                '/Character/' + characterId + '/',
            method: 'GET',
            complete: callback
        });
    };

    this.search = function(activeSystem, callback) {
        this.setsystem(activeSystem);
        if (self.active && self.active.type) {
            if (typeof self.active.membership == "undefined") {
                self.request({
                    route: '/Destiny/' + self.active.type + '/Stats/GetMembershipIdByDisplayName/' + self.active.id + '/',
                    method: 'GET',
                    complete: function(membership) {
                        if (membership > 0) {
                            //tgd.localLog('error finding bungie account!', membership);
                            self.active.membership = membership;
                            self.account(callback);
                        } else {
                            callback({
                                error: true
                            });
                            return;
                        }

                    }
                });
            } else {
                self.account(callback);
            }
        }
    };

    this.account = function(callback) {
        tgd.localLog(self.active.type + " log request to " + JSON.stringify(self.active.membership));
        self.request({
            route: '/Destiny/' + self.active.type +
                '/Account/' + self.active.membership + '/',
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
        console.log("self.accessToken()", self.accessToken());
        if (_.isEmpty(self.accessToken())) {
            complete({
                "code": 99,
                "error": "Please sign-in to continue."
            });
        } else {
            self.user(function(user) {
                complete(user);
            });
        }
    };


    this.init();
});