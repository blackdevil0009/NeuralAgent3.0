set sh = WScript.CreateObject("WScript.Shell")
sh.run "cmd.exe /c ssh -o StrictHostKeyChecking=no root@148.230.66.181"
WScript.Sleep 2000
sh.SendKeys "Devil@2007~"
WScript.Sleep 2000
