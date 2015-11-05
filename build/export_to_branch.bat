rmdir branch
mkdir branch
cd ..\www
copy index.html ..\build\branch\
copy manifest.json ..\build\branch\
copy config.xml ..\build\branch\
mkdir ..\build\branch\scripts\
copy scripts\ ..\build\branch\scripts\
mkdir ..\build\branch\assets\
copy assets\ ..\build\branch\assets\
mkdir ..\build\branch\js\
xcopy js\* ..\build\branch\js\ /E /Y
mkdir ..\build\branch\data\
xcopy data\* ..\build\branch\data\ /E /Y
mkdir ..\build\branch\css\
copy css\ ..\build\branch\css\
mkdir ..\build\branch\res\icon\%1
copy res\icon\%1\ ..\build\branch\res\icon\%1
mkdir ..\build\branch\res\screen\%1
copy res\screen\%1\ ..\build\branch\res\screen\%1
cd ..\build
xcopy branch ..\..\branches\%1\www\ /E /Y
rd /s /q branch