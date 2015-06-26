define(['knockout', 'jquery', 'tgd_strings'], function (ko, $, strings) {
  var tk_i18n = function() {
    var self = this;

    self.activeLocale = ko.observable("en");
    self.locale = ko.observable(strings[self.activeLocale()]);

    self.setLocale = function(locale) {
	  self.locale(strings[locale]);
      self.activeLocale(locale);
    }
  }

  var i18n = new tk_i18n();

  ko.bindingHandlers.tk_i18n = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
      var data = valueAccessor();

      if(data instanceof Object)
      {
        var defaultData = $.extend({
          text: '',
          sufix: '',
          prefix: ''
        }, data);
        $(element).text(i18n.locale()[defaultData.text] + defaultData.sufix);
      }
      else
      {
        $(element).text(i18n.locale()[data]);
      }
    },
    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
      var data = valueAccessor();

      if(data instanceof Object)
      {
        var defaultData = $.extend({
          text: '',
          sufix: '',
          prefix: ''
        }, data);
        $(element).text(defaultData.prefix + i18n.locale()[defaultData.text] + defaultData.sufix);
      }
      else
      {
        $(element).text(i18n.locale()[data]);
      }
    }
  };

  if (!String.prototype.format) {
    String.prototype.format = function() {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function(match, number) {
        return typeof args[number] != 'undefined'
          ? args[number]
          : match
        ;
      });
    };
  }

  return i18n;
});
