$file = 'H:\ьіп\landing\pc-shop\index.html'
$content = Get-Content $file -Raw

# GPU image mappings
$content = $content -replace 'images/components/rtx-5090\.png', 'images/components/nvidia_rtx_5090_23c99cc315.png'
$content = $content -replace 'images/components/rtx-5080\.png', 'images/components/RTX-5080-Front-Custom-1456x1092.png'
$content = $content -replace 'images/components/rtx-5070\.png', 'images/components/5070-Front.avif'
$content = $content -replace 'images/components/rtx-5060\.png', 'images/components/4060.asus.png'
$content = $content -replace 'images/components/rtx-4090\.png', 'images/components/geforce-rtx-4090-product-photo-001-850px.png'
$content = $content -replace 'images/components/rtx-4080-super\.png', 'images/components/4080-super.webp'
$content = $content -replace 'images/components/rtx-4070-super\.png', 'images/components/4070 superpng.png'
$content = $content -replace 'images/components/rtx-4070\.png', 'images/components/4070 .asus.png'
$content = $content -replace 'images/components/rtx-4060-ti\.png', 'images/components/4060ti.png'
$content = $content -replace 'images/components/rtx-4060\.png', 'images/components/4060.asus.png'

# CPU image mappings
$content = $content -replace 'images/components/i9-14900k\.png', 'images/components/Core-i9-14900K-Processor.png'
$content = $content -replace 'images/components/i7-14700k\.png', 'images/components/714700k.png'
$content = $content -replace 'images/components/i5-14600k\.png', 'images/components/514600k.png'

# AMD CPU mappings
$content = $content -replace 'images/components/ryzen-9-7950x\.png', 'images/components/jybyv80qbpj87poh9mjt0j3r58xrnyp6.png'

$content | Set-Content $file -Encoding UTF8
Write-Host "Image paths updated successfully!"
