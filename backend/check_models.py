import os
import httpx
from dotenv import load_dotenv

load_dotenv()
key = os.environ.get("NVIDIA_API_KEY", "").strip("'\"")
base_url = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").strip("'\"")

c = httpx.Client(verify=False)
r = c.get(f"{base_url}/models", headers={"Authorization": f"Bearer {key}"})
data = r.json()
print([m.get("id") for m in data.get("data", []) if 'llama3' in m.get("id", "").lower() or 'llama-3' in m.get("id", "").lower()])
