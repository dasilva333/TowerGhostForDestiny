# Contributing and Collaborating

If you would like to contribute to the project simply submit a *Pull Request* for your changes. This requires you to have a Github account to complete this process, you may also contribute in the discussion board on Reddit if you'd like to leave any feedback, suggestions, ideas or anything that is not considered a bug:

<http://www.reddit.com/r/towerghostfordestiny>

You may also request access to a chat room used to collaborate and discuss some of the more involved interactions, visit the link below for further instructions on how to participate.

<https://github.com/dasilva333/TowerGhostForDestiny/wiki/Slack-Group-Cha>t
Thanks to @bluetidepro

## Pull requests

Good pull requests—patches, improvements, new features—are a fantastic help. They should remain focused in scope and avoid containing unrelated commits.

*Please ask first* before embarking on any significant pull request (e.g. implementing features, refactoring code, porting to a different language), otherwise you risk spending a lot of time working on something that the project's developers might not want to merge into the project.

### Pull Request Step by step instructions:

1. Checkout my project on Github
https://github.com/dasilva333/TowerGhostForDestiny/
2. Click Fork on the top right corner to make a copy of my project for yourself
3. Use Git or SVN to checkout your project to begin the changes
4. Follow the manual install instructions to get the package running for your system/browser
http://towerghostfordestiny.com/index.php/support
5. After testing your changes, commit them back to your branch.
6. Submit a new pull request https://github.com/dasilva333/TowerGhostForDestiny/compare/

That's it, if done correctly I should be able to just automatically accept your changes and test them before including them in the next version of TGD.

### Testing your changes

Tower Ghost users an auto update manifest system that allows it to be updated automatically online, if you are making changes to the app you are going to want to make sure Auto Updates is disabled, you may verify you are running the local code and not auto update code by running console.log(Manifest.root) it should return "./" to indicate the code is running locally. Once you've made a change to the code it is nessecary to compile the project to test your changes as explained below.

1. open a command line shell
2. browse to the project's root directory
3. cd into the build folder
4. make sure you have NodeJS and NPM installed
5. run the command: *npm install*
6. after that is finished you may run one of the two commands:
7. If you are making changes to the definitions files you need to run: *grunt prod*
8. If you are making changes to templates/js/css you need to simply run: *grunt*
9. After the grunt task has finished executing you may return to your browser (app) Chrome and refresh the page to see your changes on the page.

Note: Please do not submit pull requests to changes in the *resources/* folder, running this grunt task will modify and alter those files however make sure to revert those changes and only commit the changes made to the js, css, or templates folder.

Second Note: If you are making changes to templates you need to run the grunt command every time you want to see your changes, however if you're only making changes to js/css files you only need to run the grunt command once to switch the manifest from the compiled resources to the locally available ones.

Thank you

## Other ways to contribute

- package the project for Windows Store (.appx package)
- Create a new splash screen for the mobile app
- Update all the icons/resources for the mobile apps to make sure they are consistent
- Maintain the Sets items and making sure they are up to date and include everything it should
- Browse through the code for the keyword: TODO and get those fixed
- Filter for issues marked *Help Wanted* or *Bug* in the my issues page <https://github.com/dasilva333/TowerGhostForDestiny/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22>
