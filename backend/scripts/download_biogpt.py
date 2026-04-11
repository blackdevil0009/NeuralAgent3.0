import os
from huggingface_hub import hf_hub_download

def download_biogpt():
    print("--- BioGPT Model Downloader ---")
    
    # Path relative to backend/
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'BioGPT-main'))
    checkpoint_dir = os.path.join(base_dir, 'checkpoints', 'Pre-trained-BioGPT')
    
    os.makedirs(checkpoint_dir, exist_ok=True)
    
    print(f"Downloading BioGPT weights to: {checkpoint_dir}...")
    
    files_to_download = [
        "pytorch_model.bin",
        "config.json",
        "vocab.json",
        "merges.txt"
    ]
    
    for filename in files_to_download:
        print(f"Fetching {filename}...")
        try:
            path = hf_hub_download(
                repo_id="microsoft/biogpt",
                filename=filename,
                local_dir=checkpoint_dir,
                local_dir_use_symlinks=False
            )
            # For the local direct code, we might need to rename pytorch_model.bin to checkpoint.pt
            if filename == "pytorch_model.bin":
                import shutil
                shutil.copy(path, os.path.join(checkpoint_dir, "checkpoint_last.pt"))
                print(f"  [DONE] Linked to checkpoint_last.pt")
                
            print(f"  [DONE] {filename} ready.")
        except Exception as e:
            print(f"  [ERROR] Failed to download {filename}: {e}")

    print("\nDownload process complete. Run check_ai.py to verify.")

if __name__ == "__main__":
    download_biogpt()
