import paramiko
import os
import sys

host = '148.230.66.181'
user = 'root'
password = 'Devil@2007'
pub_key_path = os.path.expanduser('~/.ssh/id_rsa_vps.pub')

try:
    with open(pub_key_path, 'r') as f:
        pub_key = f.read().strip()
        
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password)
    
    # execute
    stdin, stdout, stderr = client.exec_command(f'mkdir -p ~/.ssh && echo "{pub_key}" >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys')
    
    # Check output
    err = stderr.read().decode('utf-8')
    if err:
        print(f"Error: {err}")
    else:
        print("Key added successfully!")
    client.close()
except Exception as e:
    print(f"Failed to copy key: {e}")
