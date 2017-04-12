rmdir branch
mkdir branch
cd ..\www
copy index.html ..\build\branch\
copy bootstrap.json ..\build\branch\
node ..\build\applyCurrentVersion.js %1
copy ..\build\config_%1_versioned.xml ..\build\branch\config.xml
del ..\build\config_%1_versioned.xml
mkdir ..\build\branch\assets\
copy assets\ ..\build\branch\assets\
mkdir ..\build\branch\data\
xcopy data\* ..\build\branch\data\ /E /Y
rmdir ..\build\branch\data\definitions /S /Q
mkdir ..\build\branch\resources\
mkdir ..\build\branch\resources\en\
copy resources\ ..\build\branch\resources\
copy resources\en\ ..\build\branch\resources\en\
del ..\build\branch\resources\*.map
mkdir ..\build\branch\res\icon\%1
copy res\icon\%1\ ..\build\branch\res\icon\%1
mkdir ..\build\branch\res\screen\%1
copy res\screen\%1\ ..\build\branch\res\screen\%1
cd ..\build
rd /s /q ..\..\branches\%1\www\data\common\
xcopy branch ..\..\branches\%1\www\ /E /Y
rd /s /q branch
echo '%1'