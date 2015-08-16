var bungie = (function(cookieString, complete) {
    var self = this;

    var _token,
        id = 0,
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
        //console.log("trying to read cookie passed " + savedCookie);
        var name = cname + "=";
        var ca = (cookieString || "").toString().split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        //console.log("found no match");
        return "";
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
        } 
		else if (!isChrome && !isMobile) {
			console.log("sent getCookie request");
			var event = document.createEvent('CustomEvent');
			event.initCustomEvent("request-cookie", true, true, {});
			document.documentElement.dispatchEvent(event);
			setTimeout(function(){
				callback("firefox");
			}, 5000);
		}
		else {
            callback(readCookie('bungled'));
        }
    }

    this.request = function(opts) {
        if (opts.route.indexOf("http") == -1)
            opts.route = url + "Platform" + opts.route;

        var data;
        if (opts.payload)
            data = JSON.stringify(opts.payload);

        if (isChrome || isMobile) {
            $.ajax({
                url: opts.route,
                type: opts.method,
                headers: {
                    'X-API-Key': apikey,
                    'x-csrf': self.bungled
                },
                beforeSend: function(xhr) {
                    if (isMobile && typeof cookieString == "string") {
                        _.each(cookieString.split(";"), function(cookie) {
                            try {
                                xhr.setRequestHeader('Cookie', cookie);
                            } catch (e) {}
                        });
                    }
                },
                data: data,
                complete: function(xhr, status) {
                    var response;
                    try {
                        response = JSON.parse(xhr.responseText);
                    } catch (e) {
                        //console.log("error parsing responseText: " + xhr.responseText);
                    }
                    if (xhr.status >= 200 && xhr.status < 400) {
                        if (response && response.ErrorCode && response.ErrorCode === 36) {
                            setTimeout(function() {
                                self.request(opts);
                            }, 1000);
                        } else {
                            var obj = response;
                            if (typeof obj == "object" && "Response" in obj)
                                obj = response.Response;
                            opts.complete(obj, response);
                        }
                    } else {
                        opts.complete({
                            error: 'network error:' + this.status
                        }, response);
                    }
                }
            });
        }
        //This piece is for Firefox
        else {
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent("request-message", true, true, {
                id: ++id,
                opts: opts
            });
            self.requests[id] = opts;
            document.documentElement.dispatchEvent(event);
        }
    }

    this.logout = function(callback) {
        self.request({
            route: url + 'en/User/SignOut',
            method: 'GET',
            complete: callback
        });
    }
    this.login = function(callback) {
        self.request({
            route: url + "en/User/Profile",
            method: "GET",
            complete: callback
        });
    }
    this.getUrl = function() {
        return url;
    }

    this.setsystem = function(type) {
        active = self.systemIds.xbl
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
                '/Account/' + membershipId +
                '/Summary/',
            method: 'GET',
            complete: callback
        });
    }
    this.getItemDetail = function(characterId, instanceId, callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + membershipId +
                '/Character/' + characterId +
                '/Inventory/' + instanceId,
            method: 'GET',
            complete: callback
        });
    }
    this.inventory = function(characterId, callback) {
        self.request({
            route: '/Destiny/' + active.type +
                '/Account/' + membershipId +
                '/Character/' + characterId +
                '/Inventory/',
            method: 'GET',
            complete: callback
        });
    }

    this.search = function(activeSystem, callback) {
        this.setsystem(activeSystem);
        if (active && active.type) {
            self.request({
                route: '/Destiny/' + active.type + '/Stats/GetMembershipIdByDisplayName/' + active.id + '/',
                method: 'GET',
                complete: function(membership) {
                    if (membership == 0) {
                        //console.log('error finding bungie account!', membership)
                        callback({
                            error: true
                        })
                        return;
                    }
                    membershipId = membership;
                    self.request({
                        route: '/Destiny/' + active.type +
                            '/Account/' + membership + '/',
                        method: 'GET',
                        complete: callback
                    });
                }
            });
        }
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
			var event = document.createEvent('CustomEvent');
			event.initCustomEvent("request-cookie", true, true, {});
			document.documentElement.dispatchEvent(event);
			
            window.addEventListener("message", function(event) {
                console.log("received a firefox response");
                var reply = event.data;
				var response;
				try {
                	response = JSON.parse(reply.response);
				} catch(e) {
					response = reply.response;
				}
                var opts = self.requests[reply.id];
                if (response.ErrorCode === 36) {
                    console.log("throttle retrying");
                    opts.route = opts.route.replace(url + "Platform", '');
                    setTimeout(function() {
                        self.requests[id + 1] = opts;
                        self.request(opts);
                    }, 1000);
                } else {
                    try {
                        console.log("calling complete for id " + reply.idclea);
                        opts.complete(response.Response, response);
                        /* for some unknown reason window.postMessage is causing this to execute twice */
                        delete self.requests[reply.id];
                    } catch (e) {
                        //console.log(e);
                    }
                }
            }, false);
        }
		
        self.login(function() {
            self.getCookie('bungled', function(token) {
                self.bungled = token;
                tgd.localLog("bungied started with token " + token);
                complete(token);
            });
        });
    }


    this.init();
});