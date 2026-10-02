cd D:\wamp64\www\TuaVois\server

Get-ChildItem Env:*proxy* $env:HTTP_PROXY = $null,$env:HTTPS_PROXY = $null,$env:ALL_PROXY = $null,$env:NO_PROXY = "localhost,127.0.0.1", npm config delete proxy
npm config delete https-proxy

npx prisma -v
npx prisma generate