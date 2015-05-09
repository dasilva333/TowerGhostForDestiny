rmdir branch
mkdir branch
cd ..\www
copy index.html ..\build\branch\
copy config.xml ..\build\branch\
mkdir ..\build\branch\scripts\
copy scripts\ ..\build\branch\scripts\
mkdir ..\build\branch\assets\
copy assets\ ..\build\branch\assets\
mkdir ..\build\branch\js\
copy js\ ..\build\branch\js\
mkdir ..\build\branch\data\
copy data\*.js ..\build\branch\data\
mkdir ..\build\branch\css\
copy css\ ..\build\branch\css\
mkdir ..\build\branch\res\icon\%1
copy res\icon\%1\ ..\build\branch\res\icon\%1
mkdir ..\build\branch\res\screen\%1
copy res\screen\%1\ ..\build\branch\res\screen\%1
cd ..\build
xcopy branch ..\..\branches\%1\www\ /E /Y
rd /s /q branch