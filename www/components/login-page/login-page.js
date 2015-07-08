define(['knockout', 'text!./login-page.html', "bungie", "tgd"],  function(ko, templateMarkup, bungie, tgd) {

  function LoginPage(params) {
	//TODO remove this after debugging is complete
	window.login = this;
	window.bungie = bungie;
	var self = this;
	
	
	this.optionsPlatform = ko.computed(new tgd.StoreObj("optionsPlatform"));
	this.checkRememberFlag = function(){
		if (self.rememberMe() == ""){
			localStorage.setItem("inputEmail","");
			localStorage.setItem("inputPassword","");
		}
		else {
			localStorage.setItem("inputEmail",self.inputEmail());
			localStorage.setItem("inputPassword",self.inputPassword());
		}
	}
	this.inputEmail = ko.computed(new tgd.StoreObj("inputEmail", null, self.checkRememberFlag));
	this.inputPassword = ko.computed(new tgd.StoreObj("inputPassword", null, self.checkRememberFlag));
	this.rememberMe = ko.computed(new tgd.StoreObj("rememberMe","true", self.checkRememberFlag));
	this.openBungieWindow = function(type){
		return bungie.openWindow(type);
	}
	this.responseHandler = function(isAuth){
		if (isAuth == false){
			alert("Authentication error");
		}			
	}
	this.submitLogin = function(form){
		bungie.directLogin( self.inputEmail(), self.inputPassword(), self.optionsPlatform(), self.responseHandler);
		return false;
	}
	
	if (bungie.loggedOut == false){
		if (self.inputEmail() != "" && self.inputPassword() != ""){
			bungie.directLogin( self.inputEmail(), self.inputPassword(), self.optionsPlatform(), self.responseHandler);
		}
		else {
			bungie.checkLogin(self.responseHandler);
		}	
	}

  }

  // This runs when the component is torn down. Put here any logic necessary to clean up,
  // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
  LoginPage.prototype.dispose = function() { };
  
  return { viewModel: LoginPage, template: templateMarkup };

});
