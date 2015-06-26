define(["knockout", "text!./home.html", "bungie"], function(ko, homeTemplate, bungie) {

  function HomeViewModel(route) {
	var self = this;
	window.bungie = bungie;
    this.message = ko.observable('Welcome to Tower Ghost For Destiny!');
	this.activeView = ko.observable(1);
	this.searchKeyword = ko.observable();
    this.orderedCharacters = ko.computed(function() {
        return bungie.characters().sort(function(a, b) {
            return a.order() - b.order();
        });
    });	
	
	if (bungie.isLoggedIn() == true){
		self.message("Logged in as " + bungie.activeUser().id);
	}
  }

  HomeViewModel.prototype.doSomething = function() {
    this.message('You invoked doSomething() on the viewmodel.');
  };

  return { viewModel: HomeViewModel, template: homeTemplate };

});
