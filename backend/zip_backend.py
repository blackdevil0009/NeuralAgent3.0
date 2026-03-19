import os
import zipfile

def zip_backend():
    zipf = zipfile.ZipFile('backend.zip', 'w', zipfile.ZIP_DEFLATED)
    for root, dirs, files in os.walk('.'):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in ['venv', '__pycache__', '.pytest_cache', '.git']]
        for file in files:
            if file == 'backend.zip' or file.endswith('.pyc') or file == '.env':
                continue
            file_path = os.path.join(root, file)
            zipf.write(file_path, os.path.relpath(file_path, '.'))
    zipf.close()
    print("backend.zip created successfully.")

if __name__ == '__main__':
    zip_backend()
