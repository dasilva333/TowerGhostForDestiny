tgd.bungie = (function(complete) {
    var self = this;

    var _token,
        id = 0,
        active,
        bungieAuthURL = "https://www.bungie.net/en/Application/Authorize/10702",
        domain = 'bungie.net',
        url = 'https://www.' + domain + '/',
        apikey = '0eec3b0ba89c428889317df467094570'; //this one is linked to Tower Ghost for Destiny

    this.bungled = "";
    this.systemIds = {};
    this.requests = {};
    this.accessToken = ko.pureComputed(new tgd.StoreObj("accessToken"));
    this.refreshToken = ko.pureComputed(new tgd.StoreObj("refreshToken"));

    this.openBungieWindow = function(type) {
        return function() {
            window.ref = window.open(bungieAuthURL, "authWindow", "width=600,height=600");
            // Create IE + others compatible event handler
            var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
            var eventer = window[eventMethod];
            var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";
            // Listen to message from child window
            eventer(messageEvent, function(e) {

                var code = e.data;

                console.log("code", code);

                self.getAccessTokensFromCode(code, function() {
                    console.log("finished loading");
                });

            }, false);
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
                        /* if (access token is expired){
                            self.getAccessTokensFromRefreshToken(function(){
                                self.retryRequest(opts);
                            });
                        } else {
                            opts.complete(obj, response);
                        }                        
                        */                            
                        opts.complete(obj, response);
                    }
                } else {
                    self.retryRequest(opts);
                }
            }
        });
    };

    this.processTokens = function(result){
        /* if refresh token or access token is invalid this needs to be determined  and set the values to blank */
        
        if ( result && result.accessToken && result.accessToken.value ){
            self.accessToken("Bearer " + result.accessToken.value);
        }
        if ( result && result.refreshToken && result.refreshToken.value ){
            self.refreshToken(result.refreshToken.value);
        }
    }
    
    this.getAccessTokensFromRefreshToken = function(callback){
        self.request({
            route: "/App/GetAccessTokensFromRefreshToken/",
            method: "POST",
            payload: {
                refreshToken: self.refreshToken
            },
            complete: function(result) {
                self.processTokens(result);
                callback();                   
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
            route: '/Destiny/' + active.type +
                '/MyAccount/' +
                '/Character/' + characterId +
                '/Vendor/' + vendorId + '/Metadata/',
            method: 'GET',
            complete: callback
        });
    };

    this.vault = function(callback) {
        self.request({
            route: '/Destiny/' + active.type + '/MyAccount/Vault/',
            method: 'GET',
            complete: callback
        });
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
        active = self.systemIds.xbl;
        if (type === 'PSN')
            active = self.systemIds.psn;
    };

    this.getMemberId = function() {
        return membershipId;
    };

    this.gamertag = function() {
        return active ? active.id : null;
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

                active = self.systemIds.xbl;

                if (res.psnId)
                    active = self.systemIds.psn;

                callback(res);
            }
        });
    };

    this.account = function(callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
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
                membershipType: active.type,
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
                membershipType: active.type,
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
                membershipType: active.type,
                characterId: characterId,
                itemId: itemId
            },
            complete: callback
        });
    };

    this.getAccountSummary = function(callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/Summary/',
            method: 'GET',
            complete: callback
        });
    };

    this.getItemDetail = function(characterId, instanceId, callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/Character/' + characterId +
                '/Inventory/' + instanceId + '/',
            method: 'GET',
            complete: callback
        });
    };

    this.inventory = function(characterId, callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/Character/' + characterId +
                '/Inventory/',
            method: 'GET',
            complete: callback
        });
    };

    this.character = function(characterId, callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/Character/' + characterId + '/',
            method: 'GET',
            complete: callback
        });
    };

    this.search = function(activeSystem, callback) {
        this.setsystem(activeSystem);
        if (active && active.type) {
            if (typeof active.membership == "undefined") {
                self.request({
                    route: '/Destiny/' + active.type + '/Stats/GetMembershipIdByDisplayName/' + active.id + '/',
                    method: 'GET',
                    complete: function(membership) {
                        if (membership > 0) {
                            //tgd.localLog('error finding bungie account!', membership);
                            active.membership = membership;
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
        tgd.localLog(active.type + " log request to " + JSON.stringify(active.membership));
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership + '/',
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
        if ( self.accessToken() == "" ){
            complete({
                "code": 99,
                "error": "Please sign-in to continue."
            });
        } else {
            self.user(function(user){
                complete(user);
            });
        }        
    };


    this.init();
});