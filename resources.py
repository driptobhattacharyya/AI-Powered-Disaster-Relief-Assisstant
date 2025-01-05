import requests
from flask import request
from main import app

@app.route('/api/resources', methods=['GET'])
def get_resources():
    latitude = request.args.get('lat')
    longitude = request.args.get('lon')
    query = request.args.get('query', 'shelter')
    
    url = f"https://atlas.microsoft.com/search/poi/json"
    params = {
        "api-version": "1.0",
        "query": query,
        "lat": latitude,
        "lon": longitude,
        "radius": 5000,
        "subscription-key": "551kCyW9q2Ipw4XZEULUrJ0KOK7Cc3tiFXIbMIDLaW7zrxEJMgWoJQQJ99ALACYeBjF7GlPQAAAgAZMP3Y8d"
    }
    response = requests.get(url, params=params)
    print(response.json())
    return response.json()
