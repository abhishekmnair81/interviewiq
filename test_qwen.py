import os
from openai import OpenAI

def test_qwen_omni():
    api_key = os.environ.get("DASHSCOPE_API_KEY", "sk-xxx")
    base_url = os.environ.get("QWEN_BASE_URL", "https://workspace-id.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1")
    
    if api_key == "sk-xxx" or "workspace-id" in base_url:
        print("Please set DASHSCOPE_API_KEY and QWEN_BASE_URL in your environment, or edit this script with real values.")
        print("Continuing with placeholders (expect this to fail with 401/404).")
    
    print(f"Connecting to Qwen Omni via {base_url}...")
    
    client = OpenAI(
        api_key=api_key,
        base_url=base_url
    )
    
    try:
        completion = client.chat.completions.create(
            model="qwen2.5-omni-7b",
            messages=[{"role": "user", "content": "Hello, Alex. Are you ready for the interview?"}],
            modalities=["text", "audio"],
            audio={"voice": "Chelsie", "format": "wav"},
            stream=True,
            stream_options={"include_usage": True},
        )
        
        print("\n[STREAM STARTED]")
        for chunk in completion:
            if chunk.choices:
                delta = chunk.choices[0].delta
                if delta.content:
                    print(f"Text: {delta.content}", end="", flush=True)
                if hasattr(delta, 'audio') and delta.audio and hasattr(delta.audio, 'data'):
                    # The audio data is base64 encoded
                    print(f" | [Audio Chunk size: {len(delta.audio.data)}]", end="", flush=True)
            else:
                print(f"\n[USAGE] {chunk.usage}")
        
        print("\n[STREAM COMPLETE]")
        
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    test_qwen_omni()
