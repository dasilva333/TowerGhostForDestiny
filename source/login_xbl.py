import requests
import re
 
exp_urlpost = r'urlPost:\'(https://.*?)\''
exp_ppft = r'<input type="hidden" name="PPFT" id=".*" value="(.*?)"/>'
 
url_signin = 'https://www.bungie.net/en/User/SignIn/Xuid?bru=%252f'
 
apikey = 'ecde0f0dd63045399a46764891111647'
liveuser = 'h4rdc0r3g4m3r@hotmail.com'
livepass = 'Richard333'
 
s = requests.Session()
 
r = s.get(url_signin)
url_post = re.findall(exp_urlpost, r.content.decode())

if len(url_post) == 0:
	print("Invalid response detected")
else:
	url_post = url_post[0];
	print(url_post)

	ppft = re.findall(exp_ppft, r.content.decode())[0]
	payload = { 'login': liveuser, 'passwd': livepass, 'PPFT': ppft }
	r = s.post(url_post, data = payload)
	 
	apiheaders = {'X-API-Key': apikey, 'x-csrf': s.cookies.get_dict()['bungled']}
	 
	r = s.get('https://www.bungie.net/Platform/Destiny/1/MyAccount/Vault/', headers=apiheaders).json()
	
	print(r)
