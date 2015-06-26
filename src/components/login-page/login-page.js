define(['knockout', 'text!./login-page.html',"login", "tk_i18n", "fastclick"], function(ko, templateMarkup, login, il8n) {

  function LoginPage(params) {
	this.openBungieWindow = function(type) {
	    return function() {
	        var loop;
	        if (isChrome || isMobile) {
	            window.ref = window.open('https://www.bungie.net/en/User/SignIn/' + type + "?bru=%252Fen%252FUser%252FProfile", '_blank', 'location=yes');
	        } else {
	            window.ref = window.open('about:blank');
	            window.ref.opener = null;
	            window.ref.open('https://www.bungie.net/en/User/SignIn/' + type, '_blank', 'toolbar=0,location=0,menubar=0');
	        }
	        if (isMobile) {
	            ref.addEventListener('loadstop', function(event) {
	                self.readBungieCookie(ref, loop);
	            });
	            ref.addEventListener('exit', function() {
	                if (_.isEmpty(self.bungie_cookies)) {
	                    self.readBungieCookie(ref, loop);
	                }
	            });
	        } else {
	            clearInterval(loop);
	            loop = setInterval(function() {
	                if (window.ref.closed) {
	                    clearInterval(loop);
	                    if (!isMobile && !isChrome) {
	                        BootstrapDialog.alert("Please wait while Firefox acquires your arsenal");
	                        var event = document.createEvent('CustomEvent');
	                        event.initCustomEvent("request-cookie", true, true, {});
	                        document.documentElement.dispatchEvent(event);
	                        setTimeout(function() {
	                            console.log("loadData");
	                            self.loadData();
	                        }, 5000);
	                    } else {
	                        self.loadData();
	                    }
	                }
	            }, 100);
	        }
	    }
	}
  }

  // This runs when the component is torn down. Put here any logic necessary to clean up,
  // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
  LoginPage.prototype.dispose = function() { };
  
  return { viewModel: LoginPage, template: templateMarkup };

});
