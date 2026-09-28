import requests
import json

url = "https://onecompiler.com/api/v1/run?access_token=oc_453x6kywy_453x6kyxk_25966740e37a81e5cfceb595a13871a80dcaa90263b65329"
headers = {
    "X-API-Key": "oc_453x6kywy_453x6kyxk_25966740e37a81e5cfceb595a13871a80dcaa90263b65329",
    "Content-Type": "application/json"
}
payload = {
    "language": "python",
    "stdin": "",
    "files": [
        {
            "name": "main.py",
            "content": "print('hello world')"
        }
    ]
}

response = requests.post(url, headers=headers, json=payload)
print(response.status_code)
print(response.text)
