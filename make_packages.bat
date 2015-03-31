call "make_firefox_pkg.bat"
timeout 1
rd /s /q www\temp
call "make_chrome_pkg.bat"