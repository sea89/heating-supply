$url = "https://github.com/superfly/flyctl/releases/latest/download/flyctl_Windows_x86_64.zip"
$out = "C:\Users\robin\Downloads\superpowers-5.1.0\heating-supply-app\tools\flyctl.zip"
Write-Host "Downloading..."
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
Write-Host "Downloaded"