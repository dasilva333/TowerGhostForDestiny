define(['knockout', 'text!./items.html', 'tgd', 'bungie', './perksTemplate.js'], function(ko, templateMarkup, tgd, bungie, perksTemplate) {

  function Items(params) {
  	var self = this;
	
  	this.tgd = tgd;
	
    this.tooltipsEnabled = ko.computed(new tgd.StoreObj("tooltipsEnabled", "true", function(newValue) {
        $ZamTooltips.isEnabled = newValue;
    }));
	
	this.renderCallback = function(context, content, element, callback) {
        if (element) lastElement = element
        var instanceId = $(lastElement).attr("instanceId"),
            activeItem, $content = $("<div>" + content + "</div>");
        bungie.characters().forEach(function(character) {
            ['weapons', 'armor'].forEach(function(list) {
                var item = _.findWhere(character[list](), {
                    '_id': instanceId
                });
                if (item) activeItem = item;
            });
        });
        if (activeItem) {
            /* Title using locale */
            $content.find("h2.destt-has-icon").text(activeItem.description);
            /* Type using locale */
            $content.find("h3.destt-has-icon").text(activeItem.typeName);
            /* Description using locale */
            $content.find(".destt-desc").text(activeItem.itemDescription);
            /* Damage Colors */
            if ($content.find("[class*='destt-damage-color-']").length == 0 && activeItem.damageType > 1) {
                var burnIcon = $("<div></div>").addClass("destt-primary-damage-" + activeItem.damageType);
                $content.find(".destt-primary").addClass("destt-damage-color-" + activeItem.damageType).prepend(burnIcon);
            }
            /* Weapon Perks (Pre-HoW) */
            if (activeItem.perks && $content.find(".destt-talent").length == 1 && $content.find(".destt-talent-description").text().indexOf("Year 1")) {
                $content.find(".destt-talent").replaceWith(perksTemplate({
                    perks: activeItem.perks
                }));
            }
            /* Weapon Perks (Post-HoW) */
            else if (activeItem.perks && $content.find(".destt-talent").length == 0) {
                $content.find(".destt-info").prepend(perksTemplate({
                    perks: activeItem.perks
                }));
            }
            /* Armor Perks */
            else if (activeItem.perks && tgd.DestinyArmorPieces.indexOf(activeItem.bucketType) > -1 && self.tierType !== 6) {
                $content.find(".destt-talent").replaceWith(perksTemplate({
                    perks: activeItem.perks
                }));
            }
            /* Armor Stats */
            var stats = $content.find(".destt-stat");
            if (activeItem.stats && stats.length > 0) {
                stats.html(
                    stats.find(".stat-bar").map(function(index, stat) {
                        var $stat = $("<div>" + stat.outerHTML + "</div>"),
                            label = $stat.find(".stat-bar-label"),
                            labelText = $.trim(label.text());
                        if (labelText in activeItem.stats) {
                            label.text(labelText + ": " + activeItem.stats[labelText]);
                            $stat.find(".stat-bar-static-value").text(" Min/Max: " + $stat.find(".stat-bar-static-value").text());
                        }
                        return $stat.html();
                    }).get().join("")
                );
            }
            $content.find(".destt-primary-min").html(activeItem.primaryStat);
        } else {
            //remove the "Emblem" title from the image issue #31
            if ($content.find(".fhtt-emblem").length > 0) {
                $content.find("span").remove();
            }
        }
        var width = $(window).width();
        //this fixes issue #35 makes destinydb tooltips fit on a mobile screen
        if (width < 340) {
            $content.find(".fhtt.des").css("width", (width - 15) + "px");
            $content.find(".stat-bar-empty").css("width", "125px");
        }
        callback($content.html());
    }
		
	window.zam_tooltips = {
	    addIcons: false,
	    colorLinks: false,
	    renameLinks: false,
	    renderCallback: self.renderCallback,
	    isEnabled: self.tooltipsEnabled()
	};
	require(['./components/items/tooltips.js'], function(){ console.log("dash loaded") });
  }

  // This runs when the component is torn down. Put here any logic necessary to clean up,
  // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
  Items.prototype.dispose = function() { };
  
  return { viewModel: Items, template: templateMarkup };

});
