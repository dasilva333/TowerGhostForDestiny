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

##Download Files

You can find the latest download for each platform here:

http://towerghostfordestiny.com/index.php/downloads/

##Install Instructions

Latest help & FAQ support found here: 

http://towerghostfordestiny.com/index.php/support/

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
