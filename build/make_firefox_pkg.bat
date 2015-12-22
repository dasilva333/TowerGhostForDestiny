:: TO download SDK: https://ftp.mozilla.org/pub/mozilla.org/labs/jetpack/jetpack-sdk-latest.zip
call ".\addon-sdk-1.17\bin\activate"
cd ..\www
mkdir temp
mkdir temp\data
cp assets temp\data -R
cp data temp\data -R
rmdir temp\data\data\definitions /S /Q
cp js temp\data -R
del temp\data\js\extras\buy.js /Q
mkdir temp\data\resources\
cp resources\base.css temp\data\resources\base.css
cp resources\tower_ghost.css temp\data\resources\tower_ghost.css
cp resources\bootstrap.js temp\data\resources\bootstrap.js
mkdir temp\data\resources\en\
cp resources\en\definitions.json temp\data\resources\en\definitions.json -R
cp lib\firefox.js temp\data\resources\firefox.js
cp lib temp -R
cp index.html temp\data
cp bootstrap.json temp\data
copy icon.png temp
copy ..\build\package_firefox.json temp\package.json
cd ..\build
cfx xpi --pkgdir=..\www\temp