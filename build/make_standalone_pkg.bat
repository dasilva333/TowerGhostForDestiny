cd ..\www
mkdir temp
mkdir temp\www
cp assets temp\www -R
cp resources temp\www -R
cp data temp\www -R
cp index.html temp\www
cp bootstrap.json temp\www
copy icon.png temp
copy ..\build\package_nw.json temp\package.json
cd ..\build\nwjs