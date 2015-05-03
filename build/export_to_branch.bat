rmdir branch
mkdir branch
cd ..\www
copy index.html ..\build\branch\
copy config.xml ..\build\branch\
mkdir ..\build\branch\scripts\
copy scripts\ ..\build\branch\scripts\
mkdir ..\build\branch\js\
copy js\ ..\build\branch\js\
mkdir ..\build\branch\data\
copy data\*.js ..\build\branch\data\
mkdir ..\build\branch\css\
copy css\ ..\build\branch\css\
cd ..\build
xcopy branch ..\..\branches\%1\www\ /E /Y
