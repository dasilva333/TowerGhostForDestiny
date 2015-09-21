ECHO web2exe-win.exe --output_dir standalone_output -app-name "Tower Ghost for Destiny" --resizable --export-to {linux-x32,windows-x64,windows-x32,mac-x32,mac-x64,linux-x64} --export-dir export_dir --download-dir nwjs --main ..\..\www\temp\ --nw-version 0.12.1
cd output\Tower Ghost for Destiny\linux-x32
"C:\Program Files\WinRAR\WinRAR.exe" a -r ..\..\..\..\..\..\branches\div-movile-dist\tgd-linux-x32.zip .
cd ..\..\..\output\Tower Ghost for Destiny\linux-x64
"C:\Program Files\WinRAR\WinRAR.exe" a -r ..\..\..\..\..\..\branches\div-movile-dist\tgd-linux-x64.zip .
cd ..\..\..\output\Tower Ghost for Destiny\mac-x32
"C:\Program Files\WinRAR\WinRAR.exe" a -r ..\..\..\..\..\..\branches\div-movile-dist\tgd-mac-x32.zip .
cd ..\..\..\output\Tower Ghost for Destiny\mac-x64
"C:\Program Files\WinRAR\WinRAR.exe" a -r ..\..\..\..\..\..\branches\div-movile-dist\tgd-mac-x64.zip .
cd ..\..\..\output\Tower Ghost for Destiny\windows-x32
"C:\Program Files\WinRAR\WinRAR.exe" a -r ..\..\..\..\..\..\branches\div-movile-dist\tgd-windows-x32.zip .
cd ..\..\..\output\Tower Ghost for Destiny\windows-x64
"C:\Program Files\WinRAR\WinRAR.exe" a -r ..\..\..\..\..\..\branches\div-movile-dist\tgd-windows-x64.zip .
cd ..\..\..
rmdir /S /Q output
rmdir /s /q ..\..\www\temp