:: TO download SDK: https://ftp.mozilla.org/pub/mozilla.org/labs/jetpack/jetpack-sdk-latest.zip
call ".\addon-sdk-1.17\bin\activate"
cd ..\www
mkdir temp
mkdir temp\data
cp assets temp\data -R
cp css temp\data -R
cp js temp\data -R
cp data temp\data -R
cp lib temp -R
cp index.html temp\data
cp bootstrap.json temp\data
copy icon.png temp
copy ..\build\package_firefox.json temp\package.json
cd ..\build
cfx xpi --pkgdir=..\www\temp