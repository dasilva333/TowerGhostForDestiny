try {

	function bungie(cookieString) {
		//console.log("bungie constructed w " + cookieString);
		
	  // private vars
	  var domain = 'bungie.net',
		url = 'https://www.bungie.net/',
		apikey = '5cae9cdee67a42848025223b4e61f929', //this one is linked to dasilva333
		systemIds = {},
		membershipId = 0,
		characterIds = [],
		savedCookie = cookieString,
		active = {id: 'loading'};
	
	  if (!isChrome && !isMobile){
		var _token, id = 0;
		window.requests = {};  
		window.addEventListener("message", function(event) {
			//console.log("received a firefox response");
			try {
				var reply = event.data;
				//console.log(reply);
				var response = JSON.parse(reply.response);
				var opts = requests[reply.id];			
				if(response.ErrorCode === 36){ 
					//console.log("throttle retrying"); 
					opts.route = opts.route.replace(url + "Platform",''); 
					setTimeout(function () { requests[id+1] = opts; _request(opts); }, 1000); 
				}
		        else { opts.complete(response.Response, response); }			
			}catch(e){
				console.log(e);
			}		
		}, false);  
	  }
	
	  // private methods
	  function _getAllCookies(callback) {
	  	if (isChrome){
			chrome.cookies.getAll({ domain: '.' + domain }, function(){
		      callback.apply(null, arguments);
		    });	
		}    
	  }
	
	  function readCookie(cname) {
	  		//console.log("trying to read cookie passed " + savedCookie);
		    var name = cname + "=";
		    var ca = savedCookie.toString().split(';');
		    for(var i=0; i<ca.length; i++) {
		        var c = ca[i];
		        while (c.charAt(0)==' ') c = c.substring(1);
		        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
		    }
			//console.log("found no match");
		    return "";
		} 
	
	  function _getCookie(name, callback) {
	  	if (isChrome){
		    _getAllCookies(function(cookies){
		      var c = null;
		      for(var i = 0, l = cookies.length; i < l; ++i){
		        if(cookies[i].name === name){
		          c = cookies[i];
		          break;
		        }
		      }
		      callback(c ? c.value : null);
		    });	
		}
		else {
			callback(readCookie('bungled'));
		}
	  }
	
	  function _getToken(callback) {
	    _getCookie('bungled', function(token) {
	      callback(token);
	    });
	  }
	
	  var maxRetries = 3;
		function retryRequest(opts){
			//console.log("retrying request");
			if (opts && opts.tries && opts.tries == maxRetries){
				opts.complete({error: 'connection error'}); 
			}
			else {
				opts.tries = (opts.tries || 0);
				opts.tries++;
				_request(opts);
			}
		}
			
	  function _request(opts) {
	  	//This is for Mobile platform/Chrome
		//console.log("received a _request");
	  	if (isChrome || isMobile){
			//console.time("XMLHttpRequest"); 
			var r = new XMLHttpRequest();
		    r.open(opts.method, url + "Platform" + opts.route, true);
		    r.setRequestHeader('X-API-Key', apikey);
		    r.onload = function() {
			  var response = this.response;
			  //console.timeEnd("XMLHttpRequest"); 
			  try {
			  	response = JSON.parse(this.response);
			  }catch(e){}		  
		      if (this.status >= 200 && this.status < 400) {	        		
			        if(response.ErrorCode === 36){ setTimeout(function () { _request(opts); }, 1000); }
			        else { opts.complete(response.Response, response); }			
		      } 
			  else {
		       	    opts.complete({error: 'network error:' + this.status}, response);
		      }
		    };
		
			r.timeout = (30 * 1000);
			r.ontimeout = function(){ retryRequest(opts) };
		    r.onerror = function(){ retryRequest(opts) };
		
		    _getToken(function(token) {
			  //console.log("_getToken finished with " + token);
		      if(token != null) {
		        r.withCredentials = true;
		        r.setRequestHeader('x-csrf', token);
				if (opts.payload){
					r.send(JSON.stringify(opts.payload));
				}
		        else {
					r.send();
				}
		      } else {
		        opts.complete({"code": 99, "error": "Please sign-in to continue."});
		      }
		    });	
		}
		//This piece is for Firefox
		else {
			//console.log("sending firefox request");
			var event = document.createEvent('CustomEvent');
			opts.route = url + "Platform" + opts.route;
			event.initCustomEvent("request-message", true, true, { id: ++id, opts: opts });
			requests[id] = opts;
			document.documentElement.dispatchEvent(event);	
		}
	  }
	
	  // privileged methods
	  this.setsystem = function(type) {
	    active = systemIds.xbl
	    if(type === 'PSN')
	      active = systemIds.psn;
	  }
	  this.gamertag = function() {
	    return active.id;
	  }
	  this.system = function() {
	    return systemIds;
	  }
	
	  this.user = function(callback) {
	    _request({
	      route: '/User/GetBungieNetUser/',
	      method: 'GET',
	      complete: function(res, response) {
			if (response && response.ErrorCode && response.ErrorCode > 1){			
				callback({error: response.Message, code: response.ErrorCode});
	         	return;
			}
			else if (res == undefined) {			
	          callback({error: 'no response'})
	          return;
			}
	
	        systemIds.xbl = {id: res.gamerTag, type: 1};
	        systemIds.psn = {id: res.psnId, type: 2};
	
	        active = systemIds.xbl;
	
	        if(res.psnId)
	          active = systemIds.psn;
	
	        callback(res);
	      }
	    });
	  }
	  this.search = function(activeSystem, callback) {
		if ( _.isUndefined(active.type) ){
			return BootstrapDialog.alert("Please sign in before attempting to refresh");
		}	  
	  	this.setsystem(activeSystem);
	    _request({
	      route: '/Destiny/' + active.type + '/Stats/GetMembershipIdByDisplayName/' + active.id + '/',
	      method: 'GET',
	      complete: function(membership) {
	        if(membership == 0) {
	          //console.log('error finding bungie account!', membership)
	          callback({error: true})
	          return;
	        }
			membershipId = membership;
	        _request({
	          route: '/Destiny/Tiger' + (active.type == 1 ? 'Xbox' : 'PSN') +
	                  '/Account/' + membership + '/',
	          method: 'GET',
	          complete: callback
	        });
	      }
	    });
	  }
	  this.vault = function(callback) {
	    _request({
	      route: '/Destiny/' + active.type + '/MyAccount/Vault/',
	      method: 'GET',
	      complete: callback
	    });
	  }
	  this.inventory = function(characterId, callback) {
	    _request({
	      route: '/Destiny/' + active.type +
	              '/Account/' + membershipId +
	              '/Character/' + characterId +
	              '/Inventory/',
	      method: 'GET',
	      complete: callback
	    });
	  }
	  this.transfer = function(characterId, itemId, itemHash, amount, toVault, callback) {
	    _request({
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
	    _request({
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
	  // this function works and returns a behemoth response. very useful/scary.
	  // .equipResults for more information on item equip messages
	  // .character.inventory.buckets -useful to resync data maybe?
	  // .summary - useful if we want to update character level/emblem/etc
	  this.equipall = function(characterId, itemIds, callback) {
	    _request({
	      route: '/Destiny/EquipItems/',
	      method: 'POST',
	      payload: {
	        membershipType: active.type,
	        characterId: characterId,
	        itemIds: itemIds
	      },
	      complete: callback
	    })
	  }
	  this.getUrl = function(){
	  	return url;
	  }
	}

}catch(e){
	console.log(e.toString());
}