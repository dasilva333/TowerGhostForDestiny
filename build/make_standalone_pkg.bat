cd ..\www
mkdir temp
mkdir temp\www
cp assets temp\www -R
cp css temp\www -R
cp js temp\www -R
cp data temp\www -R
cp scripts temp\www -R
cp lib temp -R
cp index.html temp\www
cp bootstrap.json temp\www
copy icon.png temp
copy ..\package_nw.json temp\package.json
cd ..\build\nwjs