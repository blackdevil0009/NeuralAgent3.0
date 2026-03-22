import urllib.request
import re

url = "https://vaidyamedx.in"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')
js_files = re.findall(r'src="(/static/js/[^"]+\.js)"', html)

for js_file in js_files:
    js_url = url + js_file
    js_content = urllib.request.urlopen(urllib.request.Request(js_url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')
    matches = re.findall(r'https?://api\.vaidyamedx\.in', js_content)
    if matches:
        print("FOUND:", set(matches))
