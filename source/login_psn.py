import getpass
import logging
import json 
import requests


session = requests.Session()
 
def login(username, password):
    BUNGIE_SIGNIN_URI = "https://www.bungie.net/en/User/SignIn/Psnid"
    PSN_OAUTH_URI = "https://auth.api.sonyentertainmentnetwork.com/login.do"
 
    logging.info("Logging in...")
 
     # Create requests Session.
   
 
    # Get JSESSIONID cookie.
    # We follow the redirection just in case the URI ever changes.
    get_jessionid = requests.get(BUNGIE_SIGNIN_URI, allow_redirects=True)
    jsessionid0 = get_jessionid.history[1].cookies["JSESSIONID"]
 
    # Post credentials and pass the JSESSIONID cookie.
    # We get a new JSESSIONID cookie.
    post = requests.post(
        PSN_OAUTH_URI,
        data={"j_username": username, "j_password": password},
        cookies={"JSESSIONID": jsessionid0},
        allow_redirects=False
    )
    if "authentication_error" in post.headers["location"]:
        logging.warning("Invalid credentials")
    jsessionid1 = post.cookies["JSESSIONID"]
 
    # Follow the redirect from the previous request passing in the new
    # JSESSIONID cookie. This gets us the x-np-grant-code to complete
    # the sign-in with Bungie.
    get_grant_code = requests.get(
        post.headers["location"],
        allow_redirects=False,
        cookies={"JSESSIONID": jsessionid1}
    )
    grant_code = get_grant_code.headers["x-np-grant-code"]
 
    # Finish our sign-in with Bungie using the grant code.
    auth_cookies = requests.get(BUNGIE_SIGNIN_URI,
                                params={"code": grant_code})
 
    # Save the cookies indicating we've signed in to our session
    session.headers["X-API-Key"] = "ecde0f0dd63045399a46764891111647"  # Use your own API Key
    session.headers["x-csrf"] = auth_cookies.cookies["bungled"]
    session.cookies.update({
        "bungleatk": auth_cookies.cookies["bungleatk"],
        "bungled": auth_cookies.cookies["bungled"]
    })

   
 
if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
 
    username = None
    password = None
 
    while not username:
        username = raw_input("Enter Username: ")
    while not password:
       password = getpass.getpass("Enter Password: ")
 
    login(username, password)
    user = session.get("https://www.bungie.net/Platform/User/GetBungieNetUser/").json()['Response']
    player = session.get("https://www.bungie.net/Platform/Destiny/SearchDestinyPlayer/2/%s" % user["psnId"]).json()['Response']
    playerAccount = session.get("https://www.bungie.net/Platform/Destiny/TigerPSN/Account/%s/" % player[0]['membershipId']).json()['Response']['data']
   
    spacer = "============================================="
    print spacer
    print ("Player: %s\t# Characters: %s" % (user['psnId'], len(playerAccount['characters'])))    
    print spacer

            