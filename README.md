![TowerGhostForDestiny](http://i.imgur.com/GUVISBH.png)

To get started, check out <http://dasilva333.github.io/TowerGhostForDestiny/>!

## Table of contents

- [Store Install Instructions](#store-install-instructions)
- [Current Features Supported](#current-features-supported)
- [Screenshot Running on IOS](#screenshot-running-on-ios)
- [Features Incoming](#features-incoming)
- [Known Issues](#known-issues)
- [Troubleshooting](#troubleshooting)
- [Mobile Install](#mobile-install)
- [Download Files](#download-files)
- [Manual Chrome Install Instructions](#manual-chrome-install-instructions)
- [Manual Firefox Install Instructions](#manual-firefox-install-instructions)
- [Editing CSS](#editing-css)
- [Contributing](#contributing)
- [Project Powered](#project-powered-by)

##Store Install Instructions

- [Tower Ghost in Chrome Store](https://chrome.google.com/webstore/detail/tower-ghost-for-destiny/gdjndlpockopgjbonnfdmkcmkcikjhge)
- [Tower Ghost in Firefox Store](https://addons.mozilla.org/en-us/firefox/addon/tower-ghost-for-destiny/)
- [Tower Ghost in Amazon Store](http://www.amazon.com/gp/product/B00VQYLURG)
- [Tower Ghost in Google Play Store](https://play.google.com/store/apps/details?id=com.richardpinedo.towerghostfordestiny)
- [Tower Ghost in Windows Phone Store](http://www.windowsphone.com/en-us/store/app/destiny-item-viewer/f98e5060-3464-419c-b83d-14300714a676)

##Current Features Supported

- Equipping items & transferring items across characters
- Filter by Perk Name, Description, Gun Name [Screenshot](http://i.imgur.com/qGNNduy.png)
- Filter by gun progress (Maxed (gold border), Full XP, Missing XP)
- Filter by burn (Kinetic, Arc, Solar, Void)
- Filter by weapon type (Scout, Auto, Hand Cannon, etc...)
- Filter by Tier (Exotic, Legendary, Rare, etc...) [Screenshot](http://i.imgur.com/BZkdB12.png)
- Auto Refresh Toggle, Custom set seconds [Screenshot](http://i.imgur.com/Tk6pwcr.png)
- DestinyDB tooltips now display personal perks attached to your weapon [Screenshot](http://i.imgur.com/UH8AvGq.png)
- Personal primary stats in transfer popup [Screenshot](http://i.imgur.com/hjLrO9i.png)
- DestinyExotics integration and more [Screenshot](http://i.imgur.com/jl3j1ZM.png)
- Inline stat values on the item icons [Screenshot](http://i.imgur.com/gMpnHIh.png)
    
##Screenshot Running on IOS

- [Weapons View](http://i.imgur.com/Sbe7qt2.png)
- [Login Prompt](http://i.imgur.com/xzrpKxV.png)
- [Menu Toolbar](http://i.imgur.com/T9xI80E.png)
- [Transfer Popup](http://i.imgur.com/odUJb7s.png)

##Features Incoming

- Drag & Drop Items
- Cloud based Loadouts

##Known Issues

- Moving materials/consumables causing splits/merges is still buggy
- DestinyExotics doesn't recognize certain weapons you might have
- Mobile app has problems logging in
- Visit the [Issues](https://github.com/dasilva333/TowerGhostForDestiny/issues) for more information
- Keyboard hides away for some users

##Troubleshooting 

Xbox & PSN Support now available, the app should prompt you to log in with Bungie.net using XBL or PSN credentials [Screenshot](http://i.imgur.com/xzrpKxV.png) if you don't see that message then go to Settings > Log in XBL/PSN and click Done when complete. After clicking Done the items should load automatically give it a few seconds to load, if the page doesn't load after sign in then try Settings > Refresh Items. Good luck guys and remember this is still a beta build.
Keyboard Disappears? Go to Settings and disable Loadstop Listener, log in, enable it back in, and log in again.

##Mobile Install

Recent Information for each mobile platform found here:
http://www.reddit.com/r/DestinyTheGame/comments/31p69l/tower_ghost_for_destiny_formerly_known_as_destiny/

##Download Files

You can find the latest download for each platform here:

https://github.com/dasilva333/TowerGhostForDestiny/tree/div-movile-dist/

##Manual Chrome Install Instructions

- Go to Settings
- Go to Extensions
- Tick Developer Mode
- Load Unpacked Extensions
- Point it to the directory where you unzipped the tower_ghost.zip (found in Downloads section)

##Manual Firefox Install Instructions

- Go to Tools
- Go to Add-ons
- Find the button that says "Install addon from file"
- Point it to the tower_ghost.xpi (found in Downloads section) file

##Editing CSS

- Go to the build directory of the project (`cd build`)
- First you need to make sure you have Node.js
	- Run `npm install -g grunt-cli`
	- Run `npm install -g grunt-init`
- Run `npm install`
- Run `bower install`
- Run `grunt dev` to watch the `/www/scss` folder to build the scss changes

**NOTE!** If you make changes to the SCSS, you need to run `grunt prod` before you put in your PR, so it has a production build of the SCSS (aka, no source maps)

##Contributing

Please read through our [contributing guidelines](CONTRIBUTING.md).

##Project Powered By

<img src="http://towerghostfordestiny.com/browserstack.png">