define(["knockout", "text!./home.html", "bungie", "tgd"], function(ko, homeTemplate, bungie, tgd) {

  function HomeViewModel(route) {
	var self = this;
	
	this.tgd = tgd;
    this.message = ko.observable('Welcome to Tower Ghost For Destiny!');
	this.activeView = ko.observable(1);
	this.searchKeyword = ko.observable();
    this.orderedCharacters = ko.computed(function() {
        return bungie.characters().sort(function(a, b) {
            return a.order() - b.order();
        });
    });	
	
	this.xsColumn = ko.computed(new tgd.StoreObj("xsColumn"));
    this.smColumn = ko.computed(new tgd.StoreObj("smColumn"));
    this.mdColumn = ko.computed(new tgd.StoreObj("mdColumn"));
    this.lgColumn = ko.computed(new tgd.StoreObj("lgColumn"));
	this.columnMode = ko.computed(function() {
        return "col-xs-" + self.xsColumn() + " col-sm-" + self.smColumn() + " col-md-" + self.mdColumn() + " col-lg-" + self.lgColumn();
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
