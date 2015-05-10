call "make_firefox_pkg.bat"
timeout 1
rd /s /q ..\www\temp
call "make_chrome_pkg.bat"
move /Y tower_ghost.xpi ..\..\branches\div-movile-dist\tower_ghost.xpi
move /Y tower_ghost.zip ..\..\branches\div-movile-dist\tower_ghost.zip