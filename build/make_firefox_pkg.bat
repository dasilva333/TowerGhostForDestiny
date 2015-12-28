:: TO download SDK: https://ftp.mozilla.org/pub/mozilla.org/labs/jetpack/jetpack-sdk-latest.zip
call ".\addon-sdk-1.17\bin\activate"
cd ..\www
mkdir temp
mkdir temp\data
mkdir temp\data\resources\
cp lib temp -R
cp data temp/data -R
cp assets temp/data -R
rmdir temp\data\data\definitions /S /Q
cp lib/firefox.js temp/data/resources/firefox.js
cp icon.png temp
cp ../build/package_firefox.json temp/package.json
cd ..\build
cfx xpi --pkgdir=..\www\temp  --update-link https://example.com/addon/latest --update-url https://example.com/addon/update_rdf