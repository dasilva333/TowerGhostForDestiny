var bungie = (function(cookieString, complete) {
    var self = this;

    var _token,
        id = 0,
        active,
        domain = 'bungie.net',
        url = 'https://www.' + domain + '/',
        apikey = '5cae9cdee67a42848025223b4e61f929'; //this one is linked to dasilva333

    this.bungled = "";
    this.systemIds = {};
    this.requests = {};

    // private methods
    function _getAllCookies(callback) {
        if (chrome && chrome.cookies && chrome.cookies.getAll) {
            chrome.cookies.getAll({
                domain: '.' + domain
            }, function() {
                callback.apply(null, arguments);
            });
        } else if (isNWJS) {
            require("nw.gui").Window.get().cookies.getAll({}, function(a, b) {
                callback.apply(null, arguments);
            });
        } else {
            callback([]);
            return BootstrapDialog.alert("You must enable cookie permissions in Chrome before loading TGD");
        }
    }

    function readCookie(cname) {
        //tgd.localLog("trying to read cookie passed " + savedCookie);
        var name = cname + "=";
        var ca = (cookieString || "").toString().split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        //tgd.localLog("found no match");
        return "";
    }

    this.requestCookie = function(callback) {
        tgd.localLog("sending request-cookie-from-ps");
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent("request-cookie-from-ps", true, true, {});
        document.documentElement.dispatchEvent(event);
        self.requestCookieCB = callback;
    }

    this.getCookie = function(name, callback) {
        if (isChrome) {
            _getAllCookies(function(cookies) {
                var c = null;
                for (var i = 0, l = cookies.length; i < l; ++i) {
                    if (cookies[i].name === name) {
                        c = cookies[i];
                        break;
                    }
                }
                callback(c ? c.value : null);
            });
        } else if (!isChrome && !isMobile) {
            self.requestCookie(callback);
        } else {
            callback(readCookie('bungled'));
        }
    }

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
    }

    this.request = function(opts) {
        if (opts.route.indexOf("http") == -1)
            opts.route = url + "Platform" + opts.route;

        var data;
        if (opts.payload) {
            data = JSON.stringify(opts.payload);
        }

        $.ajax({
            url: opts.route,
            type: opts.method,
            headers: {
                'X-API-Key': apikey,
                'x-csrf': self.bungled
            },
            beforeSend: function(xhr) {
                /* for some reason this crashes on iOS 9 and causes ajax requests to return status code 0 after a location.reload,
				IOS 9 detection has provded difficult, disabling this for all IOS users until I can figure out a better fix
				*/
                if (isMobile && typeof cookieString == "string" && isIOS == false) {
                    _.each(cookieString.split(";"), function(cookie) {
                        try {
                            xhr.setRequestHeader('Cookie', cookie);
                        } catch (e) {}
                    });
                }
            },
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
                        opts.complete(obj, response);
                    }
                } else {
                    self.retryRequest(opts);
                }
            }
        });
    }

    this.vault = function(callback) {
        self.request({
            route: '/Destiny/' + active.type + '/MyAccount/Vault/',
            method: 'GET',
            complete: callback
        });
    }

    this.logout = function(callback) {
        self.request({
            route: url + 'en/User/SignOut',
            method: 'GET',
            complete: callback
        });
    }
    this.login = function(callback) {
        tgd.localLog("bungie.login");
        self.request({
            route: url,
            method: "GET",
            complete: callback
        });
    }
    this.getUrl = function() {
        return url;
    }

    this.setsystem = function(type) {
        active = self.systemIds.xbl;
        if (type === 'PSN')
            active = self.systemIds.psn;
    }
    this.getMemberId = function() {
        return membershipId;
    }
    this.gamertag = function() {
        return active.id;
    }
    this.system = function() {
        return systemIds;
    }

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
                } else if (res == undefined) {
                    callback({
                        error: 'no response'
                    })
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
    }
    this.account = function(callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/',
            method: 'GET',
            complete: callback
        });
    }
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
    }
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
    }
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
        })
    }

    this.getAccountSummary = function(callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/Summary/',
            method: 'GET',
            complete: callback
        });
    }
    this.getItemDetail = function(characterId, instanceId, callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/Character/' + characterId +
                '/Inventory/' + instanceId,
            method: 'GET',
            complete: callback
        });
    }
    this.inventory = function(characterId, callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/Character/' + characterId +
                '/Inventory/',
            method: 'GET',
            complete: callback
        });
    }
    this.character = function(characterId, callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership +
                '/Character/' + characterId,
            method: 'GET',
            complete: callback
        });
    }
    this.search = function(activeSystem, callback) {
        this.setsystem(activeSystem);
        if (active && active.type) {
            if (typeof active.membership == "undefined") {
                self.request({
                    route: '/Destiny/' + active.type + '/Stats/GetMembershipIdByDisplayName/' + active.id + '/',
                    method: 'GET',
                    complete: function(membership) {
                        if (membership > 0) {
                            //tgd.localLog('error finding bungie account!', membership)
                            active.membership = membership;
                            self.account(callback);
                        } else {
                            callback({
                                error: true
                            })
                            return;
                        }

                    }
                });
            } else {
                self.account(callback);
            }
        }
    }

    this.account = function(callback) {
        tgd.localLog(active.type + " log request to " + JSON.stringify(active.membership));
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + active.membership + '/',
            method: 'GET',
            complete: callback
        });
    }

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
    }

    this.init = function() {
        if (!isChrome && !isMobile) {
            $.ajaxSetup({
                xhr: function() {
                    return firefoxXHR();
                },
            });
            window.addEventListener("response-cookie-from-cs", function(event) {
                tgd.localLog("response-cookie-from-cs: " + event.detail);
                self.requestCookieCB(event.detail);
            });
        }
        tgd.localLog("bungie.init");
        self.login(function() {
            tgd.localLog("bungie.login.complete, now getCookie");
            self.getCookie('bungled', function(token) {
                tgd.localLog("bungied started with token " + token);
                self.bungled = token;
                complete(token);
            });
        });
    }


    this.init();
});