import paramiko
import os
import sys

host = '148.230.66.181'
user = 'root'
key_path = os.path.expanduser('~/.ssh/id_rsa_vps')

local_path = r'd:\NeuralAgent3.0\temp_backend\ai\brain.py'
remote_path = '/root/backend/ai/brain.py'

print("Connecting to VPS...")
try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, key_filename=key_path, timeout=10)
    
    print("Uploading brain.py via SFTP...")
    sftp = client.open_sftp()
    sftp.put(local_path, remote_path)
    sftp.close()
    
    print("Restarting backend service...")
    stdin, stdout, stderr = client.exec_command('systemctl restart backend')
    
    # Check output
    err = stderr.read().decode('utf-8')
    if err:
        print(f"Error restarting service: {err}")
    else:
        print("Backend service restarted successfully!")
        
    client.close()
except Exception as e:
    print(f"Failed to deploy: {e}")
